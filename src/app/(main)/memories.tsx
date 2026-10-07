import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Camera, Search, SlidersHorizontal, UtensilsCrossed } from 'lucide-react-native';
import { useApp } from '../../state/AppProvider';
import { colors as c, fonts as f } from '../../lib/theme';
import { dailyTotal, localDay, Meal } from '../../lib/model';
import { PageHeading } from '../../components/Shell';
import { Button, Chip, Type } from '../../components/ui';
import { MemoryCard } from '../../components/MemoryCard';
import { Mascot } from '../../components/Mascot';
export default function MemoriesScreen() {
  const { meals } = useApp();
  const width = useWindowDimensions().width;
  const columns = width >= 1350 ? 3 : width >= 680 ? 2 : 1;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All memories');
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
      (filter === 'All memories' ||
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
      year: 'numeric',
    });
  };
  return (
    <>
      <PageHeading
        eyebrow="THE MOMENTS YOU KEEP ✦"
        title="A little collection of good things."
        subtitle="Your photos, your portions, your story. All right here."
        action={
          width >= 650 ? (
            <Button label="New snap" icon={Camera} onPress={() => router.navigate('/capture')} />
          ) : undefined
        }
      />
      <View style={s.tools}>
        <View style={s.search}>
          <Search size={18} color={c.muted} />
          <TextInput
            accessibilityLabel="Search memories"
            placeholder="Find a meal, a food, a little moment…"
            placeholderTextColor={c.muted}
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, fontFamily: f.regular, fontSize: 13, color: c.ink, height: 48 }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
          <SlidersHorizontal size={16} color={c.muted} style={{ marginRight: 4 }} />
          {['All memories', 'Today', 'This week', 'Samples'].map((label) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: filter === label }}
              key={label}
              onPress={() => setFilter(label)}
              style={[
                s.filter,
                filter === label && { backgroundColor: c.lavender, borderColor: '#D5C9EE' },
              ]}
            >
              <Type
                style={{
                  fontFamily: f.medium,
                  fontSize: 12,
                  color: filter === label ? c.purple : c.muted,
                }}
              >
                {label}
              </Type>
            </Pressable>
          ))}
        </View>
      </View>
      {!filtered.length ? (
        <View style={s.empty}>
          <View style={s.emptyCircle}>
            <Mascot size={125} happy />
          </View>
          <Chip icon={UtensilsCrossed} color={c.lime} textColor="#5A6E3F">
            ROOM FOR SOMETHING GOOD
          </Chip>
          <Type kind="title" style={{ textAlign: 'center', marginTop: 20 }}>
            {meals.length ? 'No little matches yet.' : 'Your first memory starts here.'}
          </Type>
          <Type style={{ maxWidth: 340, textAlign: 'center', color: c.muted, marginTop: 11 }}>
            {meals.length
              ? 'Try another search or filter. Your other memories are still here.'
              : 'Breakfast, that perfect lunch, a snack on the go. Give your next bite a little place to stay.'}
          </Type>
          <Button
            label={meals.length ? 'Show all memories' : 'Take your first snap'}
            icon={meals.length ? undefined : Camera}
            onPress={() => {
              if (meals.length) {
                setSearch('');
                setFilter('All memories');
              } else router.navigate('/capture');
            }}
            style={{ marginTop: 25 }}
          />
        </View>
      ) : (
        <View style={{ gap: 28 }}>
          {Array.from(grouped.entries()).map(([date, entries]) => (
            <View key={date}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 15,
                }}
              >
                <Type style={{ fontFamily: f.displayBold, fontSize: 23 }}>{dateTitle(date)}</Type>
                <Type kind="small">
                  {entries.length} {entries.length === 1 ? 'memory' : 'memories'} ·{' '}
                  {dailyTotal(meals, new Date(`${date}T12:00:00`))} g logged
                </Type>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
                {entries.map((meal) => (
                  <View
                    key={meal.id}
                    style={{ width: columns === 1 ? '100%' : columns === 2 ? '48%' : '31.8%' }}
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
  tools: { gap: 15, marginBottom: 29 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 17,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 15,
    backgroundColor: c.white,
  },
  filter: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.line,
  },
  empty: { paddingVertical: 55, alignItems: 'center' },
  emptyCircle: {
    width: 172,
    height: 172,
    borderRadius: 86,
    backgroundColor: '#F0EBFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
});
