import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Camera, Heart, Images, Wheat } from 'lucide-react-native';
import { useApp } from '../../state/AppProvider';
import { dailyTotal, localDay, round, totalCarbs } from '../../lib/model';
import { colors as c, fonts as f } from '../../lib/theme';
import { PageHeading, TextLink } from '../../components/Shell';
import { Button, Chip, Type } from '../../components/ui';
import { Mascot } from '../../components/Mascot';
export default function RhythmScreen() {
  const { meals, settings } = useApp();
  const mobile = useWindowDimensions().width < 650;
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - 6 + index);
    return {
      date,
      carbs: dailyTotal(meals, date),
      count: meals.filter((m) => m.source !== 'sample' && localDay(m.createdAt) === localDay(date))
        .length,
    };
  });
  const logged = meals.filter(
    (m) => m.source !== 'sample' && days.some((d) => localDay(d.date) === localDay(m.createdAt)),
  );
  const total = round(logged.reduce((sum, meal) => sum + totalCarbs(meal.items), 0));
  const activeDays = days.filter((day) => day.count > 0).length;
  const max = Math.max(50, ...days.map((d) => d.carbs), settings.goal || 0);
  return (
    <>
      <PageHeading
        eyebrow="YOUR EVERYDAY, A LITTLE CLEARER ✦"
        title="Find your own little rhythm."
        subtitle="A gentle look at what you’ve logged. Every day is a new day."
      />
      <View style={{ flexDirection: mobile ? 'column' : 'row', gap: 18, marginBottom: 23 }}>
        {[
          {
            title: 'Carbs logged this week',
            value: `${total}`,
            unit: 'g',
            icon: Wheat,
            color: c.lavender,
          },
          {
            title: 'Little meals remembered',
            value: `${logged.length}`,
            unit: 'snaps',
            icon: Images,
            color: c.lime,
          },
          {
            title: 'Days with a little clarity',
            value: `${activeDays}`,
            unit: 'of 7',
            icon: Heart,
            color: c.pink,
          },
        ].map((item) => (
          <View key={item.title} style={s.stat}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View style={[s.icon, { backgroundColor: item.color }]}>
                <item.icon size={17} color={c.ink} />
              </View>
              <Type kind="small">{item.title}</Type>
            </View>
            <Type
              style={{ fontFamily: f.displayBold, fontSize: 39, lineHeight: 47, marginTop: 16 }}
            >
              {item.value} <Type style={{ fontSize: 16, color: c.muted }}>{item.unit}</Type>
            </Type>
          </View>
        ))}
      </View>
      <View style={s.chart}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <View>
            <Type style={{ fontFamily: f.displayBold, fontSize: 23 }}>
              Your last seven little days
            </Type>
            <Type kind="small" style={{ marginTop: 5 }}>
              Total carbs logged each day · grams
            </Type>
          </View>
          <Chip color={c.lime} textColor="#5A6E3F">
            ONE DAY AT A TIME
          </Chip>
        </View>
        <View
          accessibilityLabel={`Daily carb totals: ${days.map((d) => `${d.date.toLocaleDateString([], { weekday: 'long' })} ${d.carbs} grams`).join(', ')}`}
          style={s.plot}
        >
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${i * 25}%`,
                  height: 1,
                  backgroundColor: '#EEEAF2',
                }}
              />
            ))}
            {settings.goal !== null && (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: `${(settings.goal / max) * 100}%`,
                  borderTopWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: '#B9A5DA',
                }}
              />
            )}
          </View>
          {days.map((day, i) => (
            <View key={localDay(day.date)} style={s.day}>
              <Type
                style={{
                  fontFamily: f.bold,
                  fontSize: 12,
                  color: day.count ? c.purple : c.muted,
                  marginBottom: 7,
                }}
              >
                {day.carbs}
              </Type>
              <View
                style={[
                  s.bar,
                  {
                    height: Math.max(5, (day.carbs / max) * 180),
                    backgroundColor: i === 6 ? c.purple : day.count ? '#CFC0F0' : '#EAE6EF',
                  },
                ]}
              />
              <Type
                style={{
                  fontSize: 12,
                  color: i === 6 ? c.purple : c.muted,
                  marginTop: 12,
                  fontFamily: i === 6 ? f.bold : f.regular,
                }}
              >
                {day.date.toLocaleDateString([], { weekday: 'short' })}
              </Type>
            </View>
          ))}
        </View>
        <Type kind="small" style={{ textAlign: 'center', marginTop: 17 }}>
          Only saved meals are included. Samples and unlogged food aren’t counted.
        </Type>
        {settings.goal !== null && (
          <Type kind="small" style={{ textAlign: 'center', color: c.purple }}>
            Dashed line: your personal reference of {settings.goal} g.
          </Type>
        )}
      </View>
      <View style={s.gentle}>
        <Mascot size={95} happy />
        <View style={{ flex: 1 }}>
          <Type style={{ fontFamily: f.displayBold, fontSize: 23 }}>
            You’re more than a number.
          </Type>
          <Type style={{ color: '#756D86', fontSize: 13, marginTop: 6 }}>
            Your journal is here to help you notice, remember, and feel a little more informed.
          </Type>
          <TextLink label="Make your space yours" onPress={() => router.navigate('/settings')} />
        </View>
      </View>
      {!logged.length && (
        <Button
          label="Snap something delicious"
          icon={Camera}
          onPress={() => router.navigate('/capture')}
          style={{ alignSelf: 'center', marginTop: 22 }}
        />
      )}
    </>
  );
}
const s = StyleSheet.create({
  stat: {
    flex: 1,
    backgroundColor: c.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.line,
    padding: 23,
  },
  icon: { width: 33, height: 33, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chart: {
    backgroundColor: c.white,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: c.line,
    padding: 25,
  },
  plot: {
    height: 239,
    marginTop: 39,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
  },
  day: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: {
    width: '50%',
    maxWidth: 61,
    minWidth: 18,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  gentle: {
    marginTop: 23,
    backgroundColor: '#EDE6F8',
    borderRadius: 22,
    padding: 25,
    flexDirection: 'row',
    gap: 23,
    alignItems: 'center',
  },
});
