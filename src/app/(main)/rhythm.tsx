import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { useApp } from '../../state/AppProvider';
import { dailyTotal, localDay, round, totalCarbs } from '../../lib/model';
import { colors as c, fonts as f } from '../../lib/theme';
import { PageHeading } from '../../components/Shell';
import { Button, Card, Type } from '../../components/ui';

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
  const average = activeDays ? round(total / activeDays) : 0;
  const max = Math.max(50, ...days.map((d) => d.carbs), settings.goal || 0);
  const plotHeight = 180;
  const stats = [
    { title: 'This week', value: `${total}`, unit: 'g carbs' },
    { title: 'Daily average', value: `${average}`, unit: 'g / active day' },
    {
      title: 'Meals saved',
      value: `${logged.length}`,
      unit: `${activeDays} of 7 days`,
    },
  ];
  return (
    <>
      <PageHeading title="Rhythm" />
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
        {stats.map((item) => (
          <View key={item.title} style={s.stat}>
            <Type kind="caption">{item.title}</Type>
            <Type style={[s.statValue, mobile && { fontSize: 28, lineHeight: 36 }]}>
              {item.value}
            </Type>
            <Type kind="caption">{item.unit}</Type>
          </View>
        ))}
      </View>
      <Card padding={22}>
        <View style={s.chartHead}>
          <View style={{ flex: 1 }}>
            <Type kind="heading">Last seven days</Type>
            <Type kind="caption" style={{ marginTop: 3 }}>
              Carbs logged each day, in grams
            </Type>
          </View>
        </View>
        <View
          accessibilityLabel={`Daily carb totals: ${days.map((d) => `${d.date.toLocaleDateString([], { weekday: 'long' })} ${d.carbs} grams`).join(', ')}`}
          style={s.plot}
        >
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { bottom: 30 }]}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${i * 33.3}%`,
                  height: 1,
                  backgroundColor: c.line,
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
                  borderTopWidth: 1.5,
                  borderStyle: 'dashed',
                  borderColor: c.purpleGlow,
                }}
              />
            )}
          </View>
          {days.map((day, i) => {
            const today = i === 6;
            const h = Math.max(6, (day.carbs / max) * plotHeight);
            return (
              <View key={localDay(day.date)} style={s.day}>
                <Type
                  style={{
                    fontFamily: f.bold,
                    fontSize: 11,
                    color: day.count ? c.ink : c.faint,
                    marginBottom: 6,
                  }}
                >
                  {day.carbs}
                </Type>
                <View style={[s.bar, { height: h }]}>
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      { backgroundColor: day.count ? (today ? c.purple : c.lavenderDeep) : c.line },
                    ]}
                  />
                </View>
                <View style={[s.dayLabel, today && { backgroundColor: c.ink }]}>
                  <Type
                    style={{
                      fontSize: 11,
                      color: today ? c.white : c.muted,
                      fontFamily: today ? f.bold : f.medium,
                    }}
                  >
                    {day.date.toLocaleDateString([], { weekday: 'short' }).slice(0, 2)}
                  </Type>
                </View>
              </View>
            );
          })}
        </View>
        <Type kind="caption" style={{ textAlign: 'center', marginTop: 16 }}>
          Only saved meals are included. Samples and unlogged food aren’t counted.
          {settings.goal !== null ? ` Dashed line: your reference of ${settings.goal} g.` : ''}
        </Type>
      </Card>
      {!logged.length && (
        <Button
          label="Log a meal"
          icon={Camera}
          onPress={() => router.navigate('/capture')}
          style={{ alignSelf: 'center', marginTop: 22 }}
        />
      )}
    </>
  );
}

const s = StyleSheet.create({
  stat: { flex: 1, gap: 4, paddingVertical: 12 },
  statValue: { fontFamily: f.display, fontSize: 36, lineHeight: 44, letterSpacing: -1.2 },
  chartHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  plot: {
    height: 240,
    marginTop: 26,
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 6,
  },
  day: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: {
    width: '58%',
    maxWidth: 48,
    minWidth: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  dayLabel: {
    marginTop: 10,
    minWidth: 30,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
});
