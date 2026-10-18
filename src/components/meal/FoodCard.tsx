import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ChevronDown, Info, Minus, Plus, Trash2 } from 'lucide-react-native';
import { FoodItem, nutrientFields, round, withIdentity, withPortionWeight } from '../../lib/model';
import { portionChoices, quantityText, selectedChoice } from '../../lib/portions';
import { colors as c, fonts as f, radius, shadow } from '../../lib/theme';
import { Field, IconButton, Type } from '../ui';
import { PressableScale } from '../PressableScale';
import { ConfidencePill, CountUp, SourcePill, sourceOf } from '../kit';

// Portions step in exact quarters; one-decimal rounding would turn 1.25 into 1.3.
const quarter = (value: number) => Math.round(value * 4) / 4;
const parse = (value: string) => (value.trim() ? Number(value.replace(',', '.')) : undefined);
// Typing a number replaces database values with the person's own: detach from the match.
const typed = {
  nutritionBasis: undefined,
  referenceId: undefined,
  referenceDescription: undefined,
  fdcId: undefined,
  dataset: undefined,
  nutritionPer100g: undefined,
  carbsRange: undefined,
  confidence: undefined,
  checks: [],
  alternatives: undefined,
} satisfies Partial<FoodItem>;

export function Chips({
  options,
  selected,
  onPick,
  label,
}: {
  options: { key: string; label: string; detail?: string }[];
  selected: string | null;
  onPick: (key: string) => void;
  label: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={s.chips}>
      {options.map((option) => {
        const active = option.key === selected;
        return (
          <PressableScale
            key={option.key}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={option.detail ? `${option.label}, ${option.detail}` : option.label}
            onPress={() => onPick(option.key)}
            style={[s.chip, active && s.chipActive]}
            hoverStyle={!active && { backgroundColor: c.lavender }}
          >
            <Type style={[s.chipText, active && { color: c.white }]}>{option.label}</Type>
            {option.detail && (
              <Type style={[s.chipDetail, active && { color: 'rgba(255,255,255,0.72)' }]}>
                {option.detail}
              </Type>
            )}
          </PressableScale>
        );
      })}
    </View>
  );
}

export function identityOptions(item: FoodItem) {
  return [
    { key: item.name, label: item.name, detail: `${item.carbs} g` },
    ...(item.alternatives ?? []).map((alt) => ({
      key: alt.name,
      label: alt.name,
      detail: `${alt.carbs} g`,
    })),
  ];
}

export function FoodCard({
  item,
  index,
  expanded,
  onToggle,
  onChange,
  onRemove,
  tap,
}: {
  item: FoodItem;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (next: FoodItem) => void;
  onRemove: () => void;
  tap: () => void;
}) {
  const [moreNutrients, setMoreNutrients] = useState(false);
  const choices = portionChoices(item);
  const eaten = item.carbs * item.servings;
  const source = sourceOf(item);
  const patch = (values: Partial<FoodItem>) => onChange({ ...item, ...values });
  const name = item.name.trim() || `Food ${index + 1}`;
  return (
    <View style={[s.card, expanded && s.cardOpen]}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${Number.isFinite(eaten) ? round(eaten) : 'unknown'} grams of carbs. ${expanded ? 'Hide' : 'Edit'} details`}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        scaleTo={0.99}
        style={s.head}
      >
        <View style={{ flex: 1, gap: 6 }}>
          <Type numberOfLines={expanded ? 3 : 1} style={s.name}>
            {name}
          </Type>
          <View style={s.metaRow}>
            <SourcePill item={item} />
            {item.confidence && <ConfidencePill level={item.confidence} compact />}
          </View>
          <Type kind="small" numberOfLines={1}>
            {item.portion}
            {item.portionGrams && item.portion.replace(/\s/g, '') !== `${round(item.portionGrams)}g`
              ? ` · ${round(item.portionGrams)} g`
              : ''}
            {item.servings !== 1 && Number.isFinite(item.servings)
              ? ` · ×${quantityText(item.servings)}`
              : ''}
          </Type>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <CountUp
              value={Number.isFinite(eaten) ? round(eaten) : null}
              decimals={1}
              style={s.carbs}
            />
            <Type style={s.unit}> g</Type>
          </View>
          <Type kind="small" style={{ fontSize: 11 }}>
            carbs
          </Type>
          <View style={[s.chevron, expanded && { backgroundColor: c.ink }]}>
            <ChevronDown
              size={14}
              color={expanded ? c.white : c.muted}
              strokeWidth={2.4}
              style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
            />
          </View>
        </View>
      </PressableScale>
      <View style={s.stepRow}>
        <Type kind="small">Portions eaten</Type>
        <View style={s.stepper}>
          <IconButton
            label={`Less of ${name}`}
            icon={Minus}
            onPress={() => {
              tap();
              patch({ servings: Math.max(0.25, quarter((item.servings || 1) - 0.25)) });
            }}
            disabled={item.servings <= 0.25}
            variant="plain"
            size={34}
            style={s.stepButton}
          />
          <Type style={s.stepValue}>
            {Number.isFinite(item.servings) ? quantityText(item.servings) : '—'}
          </Type>
          <IconButton
            label={`More of ${name}`}
            icon={Plus}
            onPress={() => {
              tap();
              patch({ servings: Math.min(100, quarter((item.servings || 1) + 0.25)) });
            }}
            variant="plain"
            size={34}
            style={s.stepButton}
          />
        </View>
      </View>
      {expanded && (
        <Animated.View entering={FadeIn.duration(160)} style={{ gap: 16, paddingTop: 4 }}>
          {!!item.alternatives?.length && (
            <View style={{ gap: 8 }}>
              <Type kind="label">What is it exactly?</Type>
              <Chips
                label={`What is ${name}`}
                options={identityOptions(item)}
                selected={item.name}
                onPick={(key) => {
                  const alt = item.alternatives?.find((a) => a.name === key);
                  if (!alt) return;
                  tap();
                  onChange(withIdentity(item, alt));
                }}
              />
            </View>
          )}
          {!!choices.length && (
            <View style={{ gap: 8 }}>
              <Type kind="label">How much?</Type>
              <Chips
                label={`How much ${name}`}
                options={choices.map((choice) => ({
                  key: choice.key,
                  label: choice.label,
                  detail: `${choice.grams} g`,
                }))}
                selected={selectedChoice(item, choices)}
                onPick={(key) => {
                  const choice = choices.find((option) => option.key === key);
                  if (!choice) return;
                  tap();
                  onChange(choice.apply());
                }}
              />
            </View>
          )}
          {!!item.checks?.length && (
            <View style={s.note}>
              <Info size={15} color={c.butterInk} strokeWidth={2.2} />
              <View style={{ flex: 1, gap: 4 }}>
                {item.checks.map((check) => (
                  <Type key={check} style={{ fontSize: 12, lineHeight: 18, color: c.butterInk }}>
                    {check}
                  </Type>
                ))}
              </View>
            </View>
          )}
          <Type kind="small">{source.detail}</Type>
          <TextInput
            accessibilityLabel={`Food ${index + 1} name`}
            placeholder="Food name"
            placeholderTextColor={c.faint}
            value={item.name}
            onChangeText={(value) => patch({ name: value })}
            maxLength={100}
            style={s.input}
          />
          <Field
            label={`Food ${index + 1} portion`}
            value={item.portion}
            onChangeText={(portion) => patch({ portion })}
            placeholder="e.g. ½ cup or 100 g"
            maxLength={80}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field
              inline
              label={`Food ${index + 1} carbs (g / portion)`}
              keyboardType="decimal-pad"
              value={Number.isFinite(item.carbs) ? String(item.carbs) : ''}
              onChangeText={(value) => patch({ ...typed, carbs: parse(value) ?? NaN })}
              placeholder="Carbs in grams"
            />
            {item.portionGrams !== undefined && (
              <Field
                inline
                label={`Food ${index + 1} weight (g)`}
                keyboardType="decimal-pad"
                value={Number.isFinite(item.portionGrams) ? String(item.portionGrams) : ''}
                onChangeText={(value) => {
                  const grams = parse(value);
                  if (grams !== undefined && Number.isFinite(grams) && grams > 0)
                    onChange({ ...withPortionWeight(item, grams), checks: [] });
                }}
              />
            )}
          </View>
          <Field
            label={`Food ${index + 1} calories (kcal / portion)`}
            keyboardType="decimal-pad"
            value={Number.isFinite(item.calories) ? String(item.calories) : ''}
            onChangeText={(value) => patch({ ...typed, calories: parse(value) })}
            placeholder="Optional · from a scan or nutrition label"
          />
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`More nutrients for food ${index + 1}`}
            accessibilityState={{ expanded: moreNutrients }}
            onPress={() => setMoreNutrients(!moreNutrients)}
            style={{ minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' }}
          >
            <Type style={{ fontSize: 13, color: c.purple, fontFamily: f.bold }}>
              More nutrients {moreNutrients ? '−' : '+'}
            </Type>
          </PressableScale>
          {moreNutrients && (
            <View style={{ gap: 12 }}>
              {nutrientFields.map(({ key, label, unit }) => (
                <Field
                  key={key}
                  label={`Food ${index + 1} ${label.toLowerCase()} (${unit} / portion)`}
                  keyboardType="decimal-pad"
                  value={Number.isFinite(item[key]) ? String(item[key]) : ''}
                  placeholder="Unknown · add from a label"
                  onChangeText={(value) => patch({ ...typed, [key]: parse(value) })}
                />
              ))}
            </View>
          )}
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Remove food ${index + 1}`}
            onPress={onRemove}
            style={s.remove}
          >
            <Trash2 size={15} color={c.error} strokeWidth={2.2} />
            <Type style={{ fontSize: 13, color: c.error, fontFamily: f.bold }}>Remove food</Type>
          </PressableScale>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
    backgroundColor: c.white,
    ...shadow.soft,
  },
  cardOpen: { ...shadow.card },
  head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  name: { fontFamily: f.bold, fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  carbs: { fontFamily: f.displayBold, fontSize: 26, lineHeight: 31, letterSpacing: -1 },
  unit: { fontFamily: f.display, fontSize: 14, color: c.muted },
  chevron: {
    marginTop: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: c.line,
    paddingTop: 10,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.pill,
    padding: 3,
  },
  stepButton: { backgroundColor: c.white, ...shadow.soft },
  stepValue: { fontFamily: f.bold, fontSize: 15, minWidth: 40, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: 13,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: c.ink },
  chipText: { fontFamily: f.bold, fontSize: 13, lineHeight: 17, color: c.ink },
  chipDetail: { fontSize: 11, lineHeight: 14, color: c.muted },
  note: {
    flexDirection: 'row',
    gap: 9,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: c.butter,
  },
  input: {
    fontFamily: f.bold,
    fontSize: 15,
    color: c.ink,
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: 15,
    backgroundColor: c.surfaceAlt,
  },
  remove: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 40,
  },
});
