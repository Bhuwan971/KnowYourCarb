import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Camera, Search, X } from 'lucide-react-native';
import { useApp } from '../../state/AppProvider';
import { colors as c, fonts as f, radius, shadow } from '../../lib/theme';
import { dailyTotal, localDay, Meal } from '../../lib/model';
import { PageHeading } from '../../components/Shell';
import { Button, Chip, Type } from '../../components/ui';
import { MemoryCard } from '../../components/MemoryCard';
import { Mascot } from '../../components/Mascot';

const filters = ['All', 'Today', 'This week', 'Samples'] as const;
type Filter = (typeof filters)[number];

export default function MemoriesScreen() {
  const { meals } = useApp();
  const width = useWindowDimensions().width;
  const columns = width >= 1350 ? 3 : width >= 680 ? 2 : 1;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [focused, setFocused] = useState(false);
  const now = new Date();
  const oldest = new Date(now);
  oldest.setDate(now.getDate() - 6);
  oldest.setHours(0, 0, 0, 0);
  const filtered = meals.filter((meal) => {
    const matches = `${meal.title} ${meal.items.map((i) => i.name).join(' ')} ${meal.note}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return (
      matches &&
      (filter === 'All' ||
        (filter === 'Today' && localDay(meal.createdAt) === localDay(now)) ||
        (filter === 'This week' &&
          new Date(meal.createdAt) >= oldest &&
          new Date(meal.createdAt) <= now) ||
        (filter === 'Samples' && meal.source === 'sample'))
    );
  });
  const grouped = new Map<string, Meal[]>();
  filtered.forEach((meal) => {
    const day = localDay(meal.createdAt);
    grouped.set(day, [...(grouped.get(day) || []), meal]);
  });
  const dateTitle = (date: string) => {
    if (date === localDay(now)) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date === localDay(yesterday)) return 'Yesterday';
    return new Date(`${date}T12:00:00`).toLocaleDateString([], {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };
  return (
    <>
      <PageHeading
        eyebrow="The moments you keep"
        title="Memories"
        subtitle="Your photos, your portions, your story. All right here."
        action={
          width >= 650 ? (
            <Button label="New snap" icon={Camera} onPress={() => router.navigate('/capture')} />
          ) : undefined
        }
      />
      <View style={s.tools}>
        <View style={[s.search, focused && s.searchFocused]}>
          <Search size={18} color={focused ? c.purple : c.muted} strokeWidth={2.2} />
          <TextInput
            accessibilityLabel="Search memories"
            placeholder="Find a meal, a food, a note…"
            placeholderTextColor={c.faint}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{ flex: 1, fontFamily: f.medium, fontSize: 15, color: c.ink, height: 52 }}
          />
          {!!search && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setSearch('')}
              hitSlop={8}
            >
              <X size={16} color={c.muted} />
            </Pressable>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {filters.map((label) => {
            const active = filter === label;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={label}
                onPress={() => setFilter(label)}
                style={({ pressed }) => [
                  s.filter,
                  active && { backgroundColor: c.ink },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Type
                  style={{
                    fontFamily: f.bold,
                    fontSize: 13,
                    color: active ? c.white : c.inkSoft,
                  }}
                >
                  {label}
                </Type>
              </Pressable>
            );
          })}
        </View>
      </View>
      {!filtered.length ? (
        <View style={s.empty}>
          <View style={s.emptyCircle}>
            <Mascot size={120} happy />
          </View>
          <Chip color={c.limeSoft} textColor={c.limeInk}>
            ROOM FOR SOMETHING GOOD
          </Chip>
          <Type kind="title" style={{ textAlign: 'center', marginTop: 18 }}>
            {meals.length ? 'No little matches yet.' : 'Your first memory starts here.'}
          </Type>
          <Type kind="small" style={{ maxWidth: 340, textAlign: 'center', marginTop: 10 }}>
            {meals.length
              ? 'Try another search or filter. Your other memories are still here.'
              : 'Breakfast, that perfect lunch, a snack on the go. Give your next bite a little place to stay.'}
          </Type>
          <Button
            label={meals.length ? 'Show all memories' : 'Take your first snap'}
            icon={meals.length ? undefined : Camera}
            variant={meals.length ? 'secondary' : 'primary'}
            onPress={() => {
              if (meals.length) {
                setSearch('');
                setFilter('All');
              } else router.navigate('/capture');
            }}
            style={{ marginTop: 24 }}
          />
        </View>
      ) : (
        <View style={{ gap: 30 }}>
          {Array.from(grouped.entries()).map(([date, entries]) => (
            <View key={date}>
              <View style={s.dayRow}>
                <Type kind="heading">{dateTitle(date)}</Type>
                <View style={s.dayTotal}>
                  <Type style={{ fontFamily: f.displayBold, fontSize: 14, color: c.purpleDeep }}>
                    {dailyTotal(meals, new Date(`${date}T12:00:00`))} g
                  </Type>
                  <Type kind="caption" style={{ color: c.purpleDeep }}>
                    · {entries.length} {entries.length === 1 ? 'memory' : 'memories'}
                  </Type>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                {entries.map((meal) => (
                  <View
                    key={meal.id}
                    style={{ width: columns === 1 ? '100%' : columns === 2 ? '48.5%' : '32%' }}
                  >
                    <MemoryCard meal={meal} onPress={() => router.navigate(`/memory/${meal.id}`)} />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

const s = StyleSheet.create({
  tools: { gap: 14, marginBottom: 28 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: c.white,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...shadow.soft,
  },
  searchFocused: { borderColor: c.purple },
  filter: {
    paddingHorizontal: 15,
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: c.white,
    ...shadow.soft,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  dayTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.lavender,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  empty: { paddingVertical: 50, alignItems: 'center' },
  emptyCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: c.lavender,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
});
