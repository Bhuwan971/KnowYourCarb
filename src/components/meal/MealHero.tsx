import React, { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
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
import { colors as c, fonts as f, radius } from '../../lib/theme';
import { Card, FoodPhoto, Type } from '../ui';
import { PressableScale } from '../PressableScale';
import { confidenceMeta, ConfidencePill, NumberValue, RangeBar, sourceOf } from '../kit';

export function MealHero({ meal }: { meal: Meal }) {
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
        <NumberValue
          value={Number.isFinite(total) ? total : null}
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
      {meal.photo && (
        <View style={[s.photo, { height: wide ? 260 : 200 }]}>
          <FoodPhoto uri={meal.photo} style={StyleSheet.absoluteFill} />
        </View>
      )}
      {sticker}
      <Card padding={0} style={s.macros}>
        {[
          { label: 'Calories', value: calories, unit: 'kcal', decimals: 0 },
          { label: 'Protein', value: totalNutrient(meal.items, 'protein'), unit: 'g', decimals: 1 },
          { label: 'Fat', value: totalNutrient(meal.items, 'fat'), unit: 'g', decimals: 1 },
          { label: 'Fiber', value: totalNutrient(meal.items, 'fiber'), unit: 'g', decimals: 1 },
        ].map((macro) => (
          <View key={macro.label} style={s.macro}>
            <Type kind="caption" style={{ fontSize: 11 }}>
              {macro.label}
            </Type>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <NumberValue value={macro.value} decimals={macro.decimals} style={s.macroValue} />
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
        aria-expanded={open}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
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
        <View style={{ gap: 12, paddingTop: 12 }}>
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
        </View>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  photo: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: c.lavender,
  },
  sticker: {
    paddingVertical: 8,
    gap: 2,
    alignSelf: 'flex-start',
  },
  total: { fontFamily: f.displayBold, fontSize: 42, lineHeight: 48, letterSpacing: -2 },
  totalUnit: { fontFamily: f.display, fontSize: 20, color: c.muted },
  macros: { flexDirection: 'row', overflow: 'hidden' },
  macro: { flex: 1, paddingVertical: 14, paddingHorizontal: 10, gap: 2 },
  macroValue: { fontFamily: f.displayBold, fontSize: 18, lineHeight: 23, letterSpacing: -0.4 },
  howHead: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  nutrients: { gap: 2, backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 12 },
  nutrient: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
});
