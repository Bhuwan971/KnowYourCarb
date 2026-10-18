import React, { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown } from 'lucide-react-native';
import {
  Meal,
  mealConfidence,
  nutrientFields,
  totalCalories,
  totalCarbs,
  totalCarbsRange,
  totalNutrient,
} from '../../lib/model';
import { colors as c, fonts as f, gradients, radius, shadow } from '../../lib/theme';
import { Card, Chip, FoodPhoto, Type } from '../ui';
import { Mascot } from '../Mascot';
import { PressableScale } from '../PressableScale';
import { confidenceMeta, ConfidencePill, CountUp, RangeBar, sourceOf } from '../kit';

export function MealHero({ meal, revealed }: { meal: Meal; revealed: boolean }) {
  const wide = useWindowDimensions().width >= 800;
  const total = totalCarbs(meal.items);
  const calories = totalCalories(meal.items);
  const range = totalCarbsRange(meal.items);
  const confidence = mealConfidence(meal.items);
  const estimated = meal.source === 'ai';
  const sticker = (
    <View style={s.sticker}>
      <Type kind="eyebrow" style={{ color: c.muted, fontSize: 10 }}>
        {estimated ? 'Estimated carbs' : 'Total carbs'}
      </Type>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <CountUp
          value={Number.isFinite(total) ? total : null}
          from={revealed ? 0 : undefined}
          decimals={1}
          prefix={estimated ? '≈' : ''}
          style={s.total}
        />
        <Type style={s.totalUnit}> g</Type>
      </View>
      {range && range.max - range.min >= 1 && Number.isFinite(total) && (
        <View style={{ gap: 2, minWidth: 150 }}>
          <RangeBar min={range.min} max={range.max} value={total} scale={range.max * 1.15} />
          <Type kind="caption" style={{ fontSize: 11 }}>
            likely {range.min}–{range.max} g
          </Type>
        </View>
      )}
    </View>
  );
  return (
    <View style={{ gap: 14 }}>
      {meal.photo ? (
        <View style={[s.photo, { height: wide ? 420 : 310 }]}>
          <FoodPhoto uri={meal.photo} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={[...gradients.photoBottom]}
            style={[StyleSheet.absoluteFill, { top: '45%' }]}
          />
          <View style={s.photoChip}>
            <Chip color="rgba(255,255,255,0.94)" textColor={c.ink}>
              {meal.mealType.toUpperCase()}
            </Chip>
          </View>
          <View style={s.stickerSpot}>{sticker}</View>
        </View>
      ) : (
        <View style={s.plain}>
          <Mascot size={70} happy />
          <View style={{ flex: 1 }}>{sticker}</View>
        </View>
      )}
      <Card padding={0} style={s.macros}>
        {[
          { label: 'Calories', value: calories, unit: 'kcal', decimals: 0 },
          { label: 'Protein', value: totalNutrient(meal.items, 'protein'), unit: 'g', decimals: 1 },
          { label: 'Fat', value: totalNutrient(meal.items, 'fat'), unit: 'g', decimals: 1 },
          { label: 'Fiber', value: totalNutrient(meal.items, 'fiber'), unit: 'g', decimals: 1 },
        ].map((macro, i) => (
          <View key={macro.label} style={[s.macro, i > 0 && s.macroDivider]}>
            <Type kind="caption" style={{ fontSize: 11 }}>
              {macro.label}
            </Type>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <CountUp value={macro.value} decimals={macro.decimals} style={s.macroValue} />
              {macro.value !== null && (
                <Type kind="caption" style={{ fontSize: 11 }}>
                  {' '}
                  {macro.unit}
                </Type>
              )}
            </View>
          </View>
        ))}
      </Card>
      {confidence && <HowWeKnow meal={meal} level={confidence} />}
    </View>
  );
}

function HowWeKnow({
  meal,
  level,
}: {
  meal: Meal;
  level: NonNullable<ReturnType<typeof mealConfidence>>;
}) {
  const [open, setOpen] = useState(false);
  const usda = meal.items.filter((i) => i.nutritionBasis === 'reference').length;
  const labels = meal.items.filter((i) => i.nutritionBasis === 'label').length;
  const guesses = meal.items.filter((i) => i.nutritionBasis === 'estimate').length;
  const summary = [
    usda && `${usda} matched to USDA`,
    labels && `${labels} from a label`,
    guesses && `${guesses} AI ${guesses === 1 ? 'guess' : 'guesses'}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Card padding={14}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="How this estimate was made"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        scaleTo={0.99}
        style={s.howHead}
      >
        <ConfidencePill level={level} />
        <Type kind="caption" style={{ flex: 1 }} numberOfLines={1}>
          {summary}
        </Type>
        <ChevronDown
          size={16}
          color={c.muted}
          strokeWidth={2.4}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </PressableScale>
      {open && (
        <Animated.View entering={FadeIn.duration(160)} style={{ gap: 12, paddingTop: 12 }}>
          <Type style={{ fontSize: 13, lineHeight: 20 }}>{confidenceMeta[level].explain}</Type>
          {meal.items.map((item) => (
            <View key={item.id} style={{ gap: 2 }}>
              <Type style={{ fontSize: 13, fontFamily: f.bold }}>
                {item.name || 'Unnamed food'}
              </Type>
              <Type kind="caption">{sourceOf(item).detail}</Type>
            </View>
          ))}
          {meal.uncertainty && <Type kind="caption">{meal.uncertainty}</Type>}
          <Type kind="caption">
            Nutrition for matched foods comes from USDA FoodData Central; the amount is still read
            from your photo, so ranges are assumptions, not measured accuracy. Sugar and fiber are
            included in total carbs. — means unknown.
          </Type>
          <View style={s.nutrients}>
            {nutrientFields
              .filter(({ key }) => !['protein', 'fat', 'fiber'].includes(key))
              .map(({ key, label, unit }) => {
                const value = totalNutrient(meal.items, key);
                return (
                  <View key={key} style={s.nutrient}>
                    <Type style={{ fontSize: 13, color: c.inkSoft }}>{label}</Type>
                    <Type style={{ fontSize: 13, fontFamily: f.bold }}>
                      {value === null ? '—' : `${value} ${unit}`}
                    </Type>
                  </View>
                );
              })}
          </View>
        </Animated.View>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  photo: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: c.lavender,
    ...shadow.card,
  },
  photoChip: { position: 'absolute', top: 16, left: 16 },
  stickerSpot: { position: 'absolute', left: 16, right: 16, bottom: 16, alignItems: 'flex-end' },
  sticker: {
    padding: 14,
    paddingHorizontal: 18,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.96)',
    gap: 2,
    alignSelf: 'flex-start',
    ...shadow.float,
  },
  total: { fontFamily: f.displayBold, fontSize: 46, lineHeight: 52, letterSpacing: -2 },
  totalUnit: { fontFamily: f.display, fontSize: 20, color: c.muted },
  plain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: radius.xl,
    backgroundColor: c.lavender,
  },
  macros: { flexDirection: 'row', overflow: 'hidden' },
  macro: { flex: 1, paddingVertical: 14, paddingHorizontal: 14, gap: 2 },
  macroDivider: { borderLeftWidth: 1, borderLeftColor: c.line },
  macroValue: { fontFamily: f.displayBold, fontSize: 18, lineHeight: 23, letterSpacing: -0.4 },
  howHead: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  nutrients: { gap: 2, backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 12 },
  nutrient: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
});
