import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Meal, mealConfidence, mealSourceLabel, totalCarbs, totalCalories } from '../lib/model';
import { colors as c, fonts as f, gradients, radius, shadow } from '../lib/theme';
import { FoodPhoto, Type, Chip } from './ui';
import { PressableScale } from './PressableScale';
import { confidenceMeta } from './kit';

// A photo-first tile: the picture is the card, everything else floats on top of it.
export function MemoryCard({
  meal,
  onPress,
  compact = false,
  style,
}: {
  meal: Meal;
  onPress: () => void;
  compact?: boolean;
  style?: React.ComponentProps<typeof View>['style'];
}) {
  const calories = totalCalories(meal.items);
  const confidence = meal.source === 'sample' ? null : mealConfidence(meal.items);
  const when =
    meal.source === 'sample'
      ? 'Sample · tap to try'
      : `${new Date(meal.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · ${mealSourceLabel(meal)}`;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Open ${meal.title}`}
      onPress={onPress}
      scaleTo={0.98}
      style={[s.card, { height: compact ? 190 : 240 }, style]}
      hoverStyle={{ opacity: 0.94 }}
    >
      <FoodPhoto uri={meal.photo} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={[...gradients.photoTop]}
        style={[StyleSheet.absoluteFill, { height: 90 }]}
      />
      <LinearGradient
        colors={[...gradients.photoBottom]}
        style={[StyleSheet.absoluteFill, { top: '40%' }]}
      />
      <View style={s.top}>
        <Chip color="rgba(255,255,255,0.92)" textColor={c.ink}>
          {meal.source === 'sample' ? 'SAMPLE' : meal.mealType.toUpperCase()}
        </Chip>
        <View style={s.grams}>
          <Type style={s.gramsValue}>
            {totalCarbs(meal.items)}
            <Type style={{ fontSize: 12, fontFamily: f.display, color: c.muted }}>g</Type>
          </Type>
          {confidence && (
            <View
              accessibilityLabel={confidenceMeta[confidence].label}
              style={[s.dot, { backgroundColor: confidenceMeta[confidence].ink }]}
            />
          )}
        </View>
      </View>
      <View style={s.bottom}>
        <Type numberOfLines={1} style={s.title}>
          {meal.title}
        </Type>
        <Type numberOfLines={1} style={s.meta}>
          {when}
          {calories !== null ? ` · ${calories} kcal` : ''}
        </Type>
      </View>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: c.lavender,
    overflow: 'hidden',
    flex: 1,
    ...shadow.card,
  },
  top: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  grams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  gramsValue: { fontFamily: f.displayBold, fontSize: 17, lineHeight: 21, letterSpacing: -0.5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  bottom: { position: 'absolute', left: 16, right: 16, bottom: 14, gap: 2 },
  title: { fontFamily: f.bold, fontSize: 16, lineHeight: 21, color: c.white },
  meta: { fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.72)' },
});
