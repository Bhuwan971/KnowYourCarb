import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Flame, Images, Wheat } from 'lucide-react-native';
import { useApp } from '../../state/AppProvider';
import { dailyTotal, localDay, round, totalCarbs } from '../../lib/model';
import { colors as c, fonts as f, gradients, radius, shadow } from '../../lib/theme';
import { PageHeading, TextLink } from '../../components/Shell';
import { Button, Card, Chip, Type } from '../../components/ui';
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
  const average = activeDays ? round(total / activeDays) : 0;
  const max = Math.max(50, ...days.map((d) => d.carbs), settings.goal || 0);
  const plotHeight = 180;
  const stats = [
    { title: 'This week', value: `${total}`, unit: 'g carbs', icon: Wheat, hero: true },
    { title: 'Per active day', value: `${average}`, unit: 'g avg', icon: Flame, hero: false },
    {
      title: 'Meals saved',
      value: `${logged.length}`,
      unit: `${activeDays} of 7 days`,
      icon: Images,
      hero: false,
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="Your everyday, a little clearer"
        title="Your rhythm"
        subtitle="A gentle look at what you’ve logged. Every day is a new day."
      />
      <View style={{ flexDirection: mobile ? 'column' : 'row', gap: 14, marginBottom: 16 }}>
        {stats.map((item) => (
          <View key={item.title} style={[s.stat, item.hero && s.statHero]}>
            {item.hero && (
              <LinearGradient
                colors={[...gradients.purple]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View style={[s.icon, item.hero && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <item.icon size={16} color={item.hero ? c.white : c.purpleDeep} strokeWidth={2.2} />
              </View>
              <Type kind="small" style={item.hero && { color: 'rgba(255,255,255,0.8)' }}>
                {item.title}
              </Type>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 14 }}>
              <Type style={[s.statValue, item.hero && { color: c.white }]}>{item.value}</Type>
              <Type
                style={{
                  fontSize: 13,
                  fontFamily: f.medium,
                  color: item.hero ? 'rgba(255,255,255,0.75)' : c.muted,
                }}
              >
                {item.unit}
              </Type>
            </View>
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
          <Chip color={c.limeSoft} textColor={c.limeInk}>
            ONE DAY AT A TIME
          </Chip>
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
                  {day.count ? (
                    <LinearGradient
                      colors={today ? [...gradients.purple] : [c.lavenderDeep, c.lavender]}
                      style={StyleSheet.absoluteFill}
                    />
                  ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.line }]} />
                  )}
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
      <View style={s.gentle}>
        <Mascot size={88} happy />
        <View style={{ flex: 1 }}>
          <Type kind="heading">You’re more than a number.</Type>
          <Type kind="small" style={{ marginTop: 5 }}>
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
    borderRadius: radius.lg,
    padding: 20,
    overflow: 'hidden',
    ...shadow.card,
  },
  statHero: { ...shadow.purple },
  statValue: { fontFamily: f.displayBold, fontSize: 38, lineHeight: 44, letterSpacing: -1.6 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  gentle: {
    marginTop: 16,
    backgroundColor: c.lavender,
    borderRadius: radius.lg,
    padding: 22,
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
});
