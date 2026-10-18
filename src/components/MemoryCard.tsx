import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Utensils } from 'lucide-react-native';
import { Meal, totalCarbs } from '../lib/model';
import { colors as c, fonts as f, radius } from '../lib/theme';
import { FoodPhoto, Type } from './ui';
import { PressableScale } from './PressableScale';

export function MemoryCard({
  meal,
  onPress,
  style,
}: {
  meal: Meal;
  onPress: () => void;
  style?: React.ComponentProps<typeof View>['style'];
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Open ${meal.title}`}
      onPress={onPress}
      style={[s.card, style]}
      hoverStyle={{ backgroundColor: c.surfaceAlt }}
    >
      <View style={s.photo}>
        {meal.photo ? (
          <FoodPhoto uri={meal.photo} />
        ) : (
          <Utensils size={22} color={c.muted} strokeWidth={1.5} />
        )}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Type numberOfLines={2} style={{ fontFamily: f.medium, fontSize: 15 }}>
          {meal.title}
        </Type>
        <Type kind="caption">
          {meal.source === 'sample'
            ? 'Sample · excluded from totals'
            : `${meal.mealType} · ${new Date(meal.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
        </Type>
      </View>
      <Type style={s.grams}>{totalCarbs(meal.items)} g</Type>
    </PressableScale>
  );
}
const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 96,
    paddingVertical: 16,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: c.surfaceAlt,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grams: { fontFamily: f.medium, fontSize: 16 },
});
