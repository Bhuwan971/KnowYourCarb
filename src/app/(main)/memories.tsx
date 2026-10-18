import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Camera, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { useApp } from '../../state/AppProvider';
import { colors as c, fonts as f, radius, shadow } from '../../lib/theme';
import { dailyTotal, localDay, Meal } from '../../lib/model';
import { PageHeading } from '../../components/Shell';
import { Button, Type } from '../../components/ui';
import { MemoryCard } from '../../components/MemoryCard';

const filters = ['All', 'Today', 'This week', 'Samples'] as const;
type Filter = (typeof filters)[number];

export default function MemoriesScreen() {
  const { meals } = useApp();
  const width = useWindowDimensions().width;
  const columns = width >= 1000 ? 2 : 1;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [focused, setFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
        title="Memories"
        action={
          width >= 650 && meals.length ? (
            <Button label="New snap" icon={Camera} onPress={() => router.navigate('/capture')} />
          ) : undefined
        }
      />
      {!!meals.length && (
        <View style={s.tools}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={[s.search, { flex: 1 }, focused && s.searchFocused]}>
              <Search size={18} color={focused ? c.purple : c.muted} strokeWidth={2.2} />
              <TextInput
                accessibilityLabel="Search memories"
                placeholder="Search meals"
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Filter memories"
              aria-expanded={showFilters}
              accessibilityState={{ expanded: showFilters }}
              onPress={() => setShowFilters(!showFilters)}
              style={{
                minHeight: 48,
                minWidth: 44,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}
            >
              <SlidersHorizontal size={19} color={filter === 'All' ? c.muted : c.purple} />
              {filter !== 'All' && (
                <Type kind="caption" style={{ color: c.purple }}>
                  {filter}
                </Type>
              )}
            </Pressable>
          </View>
          {showFilters && (
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
          )}
        </View>
      )}
      {!filtered.length ? (
        <View style={s.empty}>
          <Type kind="title" style={{ textAlign: 'center', marginTop: 18 }}>
            {meals.length ? 'No meals found.' : 'No saved meals yet.'}
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
                  <View key={meal.id} style={{ width: columns === 1 ? '100%' : '48.5%' }}>
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
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: c.surfaceAlt,
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
});
