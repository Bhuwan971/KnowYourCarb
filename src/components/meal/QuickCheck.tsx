import React from 'react';
import { StyleSheet, View } from 'react-native';
import { FoodItem, withIdentity } from '../../lib/model';
import { portionChoices, selectedChoice } from '../../lib/portions';
import { colors as c, fonts as f, radius } from '../../lib/theme';
import { Type } from '../ui';
import { PressableScale } from '../PressableScale';
import { Chips, identityOptions } from './FoodCard';

export type Question = { item: FoodItem; kind: 'identity' | 'portion' };

// Ask about what moves the carb total most: identity (diet vs regular) beats amount.
export function nextQuestion(items: FoodItem[], asked: Set<string>): Question | null {
  const width = (item: FoodItem) =>
    item.carbsRange ? (item.carbsRange.max - item.carbsRange.min) * item.servings : 0;
  const swing = (item: FoodItem) =>
    Math.max(0, ...(item.alternatives ?? []).map((a) => Math.abs(a.carbs - item.carbs))) *
    item.servings;
  const questions: (Question & { weight: number })[] = [];
  for (const item of items) {
    if (item.alternatives?.length && swing(item) >= 5 && !asked.has(`${item.id}:identity`))
      questions.push({ item, kind: 'identity', weight: swing(item) + 1000 });
    if (
      item.confidence &&
      item.confidence !== 'high' &&
      width(item) >= 6 &&
      !asked.has(`${item.id}:portion`) &&
      portionChoices(item).length
    )
      questions.push({ item, kind: 'portion', weight: width(item) });
  }
  return questions.sort((a, b) => b.weight - a.weight)[0] ?? null;
}

export function QuickCheck({
  question,
  answered,
  onAnswer,
  onSkip,
}: {
  question: Question | null;
  answered: number;
  onAnswer: (next: FoodItem, key: string) => void;
  onSkip: (key: string) => void;
}) {
  if (!question)
    return answered ? (
      <Type kind="caption">Portions updated. You can still edit each food below.</Type>
    ) : null;
  const { item, kind } = question;
  const key = `${item.id}:${kind}`;
  const choices = kind === 'portion' ? portionChoices(item) : [];
  return (
    <View key={key} style={s.card}>
      <View style={s.header}>
        <View style={s.badge}>
          <Type style={s.badgeText}>Quick check</Type>
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Skip this question"
          onPress={() => onSkip(key)}
          hitSlop={10}
        >
          <Type style={s.skip}>Skip</Type>
        </PressableScale>
      </View>
      <Type style={s.title}>
        {kind === 'identity' ? 'Which one is it?' : `How much ${item.name.toLowerCase()}?`}
      </Type>
      <Type kind="small" style={{ marginTop: -6, color: c.inkSoft }}>
        {kind === 'identity'
          ? `We read this as “${item.name}”. Look-alikes can differ a lot in carbs.`
          : item.carbsRange
            ? `This is the widest part of your estimate (${item.carbsRange.min}–${item.carbsRange.max} g).`
            : 'Picking the amount makes the carbs much more reliable.'}
      </Type>
      {kind === 'identity' ? (
        <Chips
          label={`What is ${item.name}`}
          options={identityOptions(item)}
          selected={null}
          onPick={(name) => {
            const alt = item.alternatives?.find((a) => a.name === name);
            onAnswer(alt ? withIdentity(item, alt) : item, key);
          }}
        />
      ) : (
        <Chips
          label={`How much ${item.name}`}
          options={choices.map((choice) => ({
            key: choice.key,
            label: choice.label,
            detail: `${choice.grams} g`,
          }))}
          selected={selectedChoice(item, choices)}
          onPick={(pick) => {
            const choice = choices.find((option) => option.key === pick);
            if (choice) onAnswer(choice.apply(), key);
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    gap: 12,
    padding: 18,
    borderRadius: radius.lg,
    backgroundColor: c.lavender,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  badgeText: { fontSize: 12, fontFamily: f.bold, color: c.purpleDeep },
  skip: { fontSize: 13, color: c.purpleDeep, fontFamily: f.bold, padding: 4 },
  title: { fontFamily: f.displayBold, fontSize: 20, lineHeight: 25, letterSpacing: -0.5 },
});
