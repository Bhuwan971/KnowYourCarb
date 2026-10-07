import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowUpRight, Clock3 } from 'lucide-react-native';
import { Meal, sourceLabel, totalCarbs } from '../lib/model';
import { colors as c, fonts as f } from '../lib/theme';
import { FoodPhoto, Type, Chip } from './ui';
export function MemoryCard({
  meal,
  onPress,
  compact = false,
}: {
  meal: Meal;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${meal.title}`}
      onPress={onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        s.card,
        (pressed || hovered) && { transform: [{ translateY: -3 }], borderColor: '#D3C6F2' },
      ]}
    >
      <View style={[s.photo, compact && { height: 148 }]}>
        <FoodPhoto uri={meal.photo} style={{ width: '100%', height: '100%' }} />
        <View style={{ position: 'absolute', left: 12, top: 12 }}>
          <Chip color="rgba(255,255,255,0.92)" textColor={c.ink}>
            {meal.source === 'sample' ? 'SAMPLE' : meal.mealType.toUpperCase()}
          </Chip>
        </View>
        <View style={s.grams}>
          <Type style={{ fontFamily: f.displayBold, fontSize: 22, lineHeight: 27 }}>
            {totalCarbs(meal.items)}
            <Type style={{ fontSize: 13 }}>g</Type>
          </Type>
          <Type style={{ fontSize: 9, lineHeight: 13, color: c.muted }}>total carbs</Type>
        </View>
      </View>
      <View style={s.info}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <Type numberOfLines={1} style={{ fontFamily: f.bold, fontSize: 14, flex: 1 }}>
            {meal.title}
          </Type>
          <ArrowUpRight size={15} color={c.muted} />
        </View>
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 6 }}>
          <Clock3 size={11} color={c.muted} />
          <Type kind="small" style={{ fontSize: 11 }}>
            {meal.source === 'sample'
              ? 'Try a little memory'
              : new Date(meal.createdAt).toLocaleTimeString([], {
                  hour: 'numeric',
                  minute: '2-digit',
                })}{' '}
            · {sourceLabel[meal.source]}
          </Type>
        </View>
      </View>
    </Pressable>
  );
}
const s = StyleSheet.create({
  card: {
    borderRadius: 21,
    borderColor: c.line,
    borderWidth: 1,
    backgroundColor: c.white,
    overflow: 'hidden',
    flex: 1,
  },
  photo: { height: 210, backgroundColor: c.lavender },
  grams: {
    position: 'absolute',
    bottom: 13,
    right: 13,
    backgroundColor: c.white,
    borderRadius: 13,
    paddingVertical: 7,
    paddingHorizontal: 13,
    alignItems: 'center',
  },
  info: { padding: 15 },
});
