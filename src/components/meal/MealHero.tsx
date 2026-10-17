import React, { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
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
import { colors as c, fonts as f } from '../../lib/theme';
import { Chip, FoodPhoto, Type } from '../ui';
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
      <Type kind="small" style={s.stickerLabel}>
        {estimated ? 'ESTIMATED CARBS' : 'TOTAL CARBS'}
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
        <View style={{ gap: 3, minWidth: 150 }}>
          <RangeBar min={range.min} max={range.max} value={total} scale={range.max * 1.15} />
          <Type kind="small" style={{ fontSize: 11 }}>
            likely {range.min}–{range.max} g
          </Type>
        </View>
      )}
    </View>
  );
  return (
    <View style={{ gap: 14 }}>
      {meal.photo ? (
        <View style={[s.photo, { height: wide ? 420 : 300 }]}>
          <FoodPhoto uri={meal.photo} style={StyleSheet.absoluteFill} />
          <View style={s.photoChip}>
            <Chip color="rgba(255,255,255,0.95)" textColor={c.ink}>
              {meal.mealType}
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
      <View style={s.macros}>
        {[
          { label: 'Calories', value: calories, unit: 'kcal', decimals: 0 },
          { label: 'Protein', value: totalNutrient(meal.items, 'protein'), unit: 'g', decimals: 1 },
          { label: 'Fat', value: totalNutrient(meal.items, 'fat'), unit: 'g', decimals: 1 },
          { label: 'Fiber', value: totalNutrient(meal.items, 'fiber'), unit: 'g', decimals: 1 },
        ].map((macro) => (
          <View key={macro.label} style={{ flex: 1, gap: 1 }}>
            <Type kind="small" style={{ fontSize: 11 }}>
              {macro.label}
            </Type>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <CountUp value={macro.value} decimals={macro.decimals} style={s.macroValue} />
              {macro.value !== null && <Type kind="small"> {macro.unit}</Type>}
            </View>
          </View>
        ))}
      </View>
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
    <View style={s.how}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="How this estimate was made"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        scaleTo={0.99}
        style={s.howHead}
      >
        <ConfidencePill level={level} />
        <Type kind="small" style={{ flex: 1 }} numberOfLines={1}>
          {summary}
        </Type>
        <ChevronDown
          size={16}
          color={c.muted}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </PressableScale>
      {open && (
        <Animated.View entering={FadeIn.duration(160)} style={{ gap: 10, paddingTop: 4 }}>
          <Type style={{ fontSize: 13, lineHeight: 20 }}>{confidenceMeta[level].explain}</Type>
          {meal.items.map((item) => (
            <View key={item.id} style={{ gap: 2 }}>
              <Type style={{ fontSize: 13, fontFamily: f.bold }}>
                {item.name || 'Unnamed food'}
              </Type>
              <Type kind="small">{sourceOf(item).detail}</Type>
            </View>
          ))}
          {meal.uncertainty && <Type kind="small">{meal.uncertainty}</Type>}
          <Type kind="small">
            Nutrition for matched foods comes from USDA FoodData Central; the amount is still read
            from your photo, so ranges are assumptions, not measured accuracy. Sugar and fiber are
            included in total carbs. — means unknown.
          </Type>
          <View style={{ gap: 6 }}>
            {nutrientFields
              .filter(({ key }) => !['protein', 'fat', 'fiber'].includes(key))
              .map(({ key, label, unit }) => {
                const value = totalNutrient(meal.items, key);
                return (
                  <View key={key} style={s.nutrient}>
                    <Type style={{ fontSize: 13 }}>{label}</Type>
                    <Type style={{ fontSize: 13 }}>
                      {value === null ? '—' : `${value} ${unit}`}
                    </Type>
                  </View>
                );
              })}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  photo: { borderRadius: 28, overflow: 'hidden', backgroundColor: c.lavender },
  photoChip: { position: 'absolute', top: 18, left: 18 },
  stickerSpot: { position: 'absolute', left: 16, right: 16, bottom: 16, alignItems: 'flex-end' },
  sticker: {
    padding: 15,
    paddingHorizontal: 17,
    borderRadius: 22,
    backgroundColor: '#FAF8F0',
    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
    gap: 2,
    alignSelf: 'flex-start',
  },
  stickerLabel: { fontSize: 10, letterSpacing: 1.3, fontFamily: f.bold, lineHeight: 14 },
  total: { fontFamily: f.displayBold, fontSize: 46, lineHeight: 52, letterSpacing: -1.6 },
  totalUnit: { fontFamily: f.display, fontSize: 21, color: c.muted },
  plain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 26,
    backgroundColor: c.lavender,
  },
  macros: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: c.line,
  },
  macroValue: { fontFamily: f.bold, fontSize: 18, lineHeight: 24 },
  how: {
    padding: 12,
    borderRadius: 18,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.line,
  },
  howHead: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  nutrient: { flexDirection: 'row', justifyContent: 'space-between' },
});
