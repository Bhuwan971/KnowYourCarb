import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { Check, Database, Ruler, ScanLine, Sparkles } from 'lucide-react-native';
import { colors as c, fonts as f, radius, shadow } from '../lib/theme';
import { FoodPhoto, Type } from './ui';
import { Mascot } from './Mascot';

// The server really works in this order: identify, size portions, then match USDA records.
const stages = [
  { icon: Sparkles, text: 'Spotting each food' },
  { icon: Ruler, text: 'Sizing up portions' },
  { icon: Database, text: 'Checking USDA FoodData Central' },
];

export function Scanner({
  photo,
  prompt,
  sample = false,
}: {
  photo?: string;
  prompt?: string;
  sample?: boolean;
}) {
  const reduced = useReducedMotion();
  // Measure real elapsed time; interval ticks drift when the app is throttled or backgrounded.
  const [started] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setElapsed((Date.now() - started) / 1000), 1000);
    return () => clearInterval(timer);
  }, [started]);
  const stage = sample
    ? Math.min(2, Math.floor(elapsed / 0.7))
    : elapsed < 5
      ? 0
      : elapsed < 11
        ? 1
        : 2;
  return (
    <View style={s.wrap}>
      {prompt ? (
        <View style={s.quote}>
          <Type style={s.quoteText}>“{prompt}”</Type>
        </View>
      ) : (
        <View style={s.photo}>
          <FoodPhoto uri={photo} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(19,16,32,0.32)' }]} />
          {!reduced && <Animated.View style={[s.scanline, sweep]} />}
          <View style={s.badge}>
            <ScanLine size={15} color={c.white} strokeWidth={2.2} />
            <Type style={{ color: c.white, fontSize: 12, fontFamily: f.bold }}>
              {sample ? 'Trying a sample snap' : 'Estimating your carbs'}
            </Type>
          </View>
        </View>
      )}
      <Animated.View style={[{ marginTop: 24 }, !reduced && hop]}>
        <Mascot size={76} happy />
      </Animated.View>
      <Type
        kind="title"
        style={{ fontSize: 26, lineHeight: 31, marginTop: 12, textAlign: 'center' }}
      >
        {prompt ? 'Working it out…' : 'Reading your plate…'}
      </Type>
      <View style={s.stages}>
        {stages.map(({ icon: Icon, text }, i) => {
          const done = i < stage;
          const current = i === stage;
          return (
            <View key={text} style={[s.stage, i > stage && { opacity: 0.4 }]}>
              <View
                style={[
                  s.stageIcon,
                  current && { backgroundColor: c.purple },
                  done && { backgroundColor: c.limeSoft },
                ]}
              >
                {done ? (
                  <Check size={14} color={c.limeInk} strokeWidth={3} />
                ) : (
                  <Icon size={14} color={current ? c.white : c.muted} strokeWidth={2.2} />
                )}
              </View>
              <Type style={{ fontSize: 14, fontFamily: current ? f.bold : f.medium }}>{text}</Type>
            </View>
          );
        })}
      </View>
      {elapsed >= 20 && (
        <Type kind="caption" style={{ marginTop: 14, textAlign: 'center' }}>
          Still working. Slower photo services can take up to a minute.
        </Type>
      )}
    </View>
  );
}
// Reanimated CSS animations live outside StyleSheet.create, which rejects keyframes on web.
// Constant motion: linear, looping back and forth across the photo.
const sweep = {
  animationName: {
    from: { transform: [{ translateY: 25 }] },
    to: { transform: [{ translateY: 300 }] },
  },
  animationDuration: '1450ms',
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
  animationTimingFunction: 'ease-in-out',
} as ViewStyle;
const hop = {
  animationName: {
    from: { transform: [{ translateY: 0 }, { rotate: '-5deg' }] },
    to: { transform: [{ translateY: -8 }, { rotate: '5deg' }] },
  },
  animationDuration: '650ms',
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
  animationTimingFunction: 'ease-in-out',
} as ViewStyle;
const s = StyleSheet.create({
  wrap: { alignItems: 'center', padding: 24, width: '100%', maxWidth: 540, alignSelf: 'center' },
  photo: {
    height: 330,
    width: '100%',
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.card,
  },
  quote: {
    width: '100%',
    padding: 24,
    borderRadius: radius.xl,
    backgroundColor: c.lavender,
  },
  quoteText: { fontFamily: f.display, fontSize: 19, lineHeight: 27, color: c.inkSoft },
  scanline: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: c.lime,
    boxShadow: '0 0 28px 8px rgba(217,245,106,0.5)',
  },
  badge: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(19,16,32,0.6)',
  },
  stages: { gap: 10, marginTop: 20, alignSelf: 'center' },
  stage: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stageIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.lavender,
  },
});
