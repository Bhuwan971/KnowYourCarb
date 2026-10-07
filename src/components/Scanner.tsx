import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, View } from 'react-native';
import { ScanLine } from 'lucide-react-native';
import { colors as c, fonts as f } from '../lib/theme';
import { FoodPhoto, Type } from './ui';
import { Mascot } from './Mascot';
export function Scanner({ photo, sample = false }: { photo?: string; sample?: boolean }) {
  const [progress] = useState(() => new Animated.Value(0));
  const [bounce] = useState(() => new Animated.Value(0));
  const [reduced, setReduced] = useState(true);
  const [step, setStep] = useState(0);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduced);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (reduced) return;
    const scan = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1450,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 1450,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    const hop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 650,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 650,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    scan.start();
    hop.start();
    return () => {
      scan.stop();
      hop.stop();
    };
  }, [reduced, progress, bounce]);
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => (s + 1) % 3), 1300);
    const slowTimer = setTimeout(() => setSlow(true), 15_000);
    return () => {
      clearInterval(timer);
      clearTimeout(slowTimer);
    };
  }, []);
  return (
    <View style={s.wrap}>
      <View style={s.photo}>
        <FoodPhoto uri={photo} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(31,24,45,0.28)' }]} />
        <Animated.View
          style={[
            s.scanline,
            {
              transform: [
                {
                  translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [25, 285] }),
                },
              ],
            },
          ]}
        />
        <View style={s.badge}>
          <ScanLine size={17} color={c.white} />
          <Type style={{ color: c.white, fontSize: 12 }}>
            {sample ? 'Trying a sample snap' : 'Estimating calories & carbs'}
          </Type>
        </View>
      </View>
      <Animated.View
        style={{
          marginTop: 23,
          transform: [
            { translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) },
            { rotate: bounce.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] }) },
          ],
        }}
      >
        <Mascot size={80} happy />
      </Animated.View>
      <Type style={{ fontFamily: f.displayBold, fontSize: 26, marginTop: 13 }}>
        Reading your plate…
      </Type>
      <Type kind="small" style={{ marginTop: 9 }}>
        {slow
          ? 'Still waiting for your estimate. You can review manually below.'
          : 'Identifying foods, portions and nutrition'}
      </Type>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 18 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              width: step === i ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: step === i ? c.purple : '#D9D0EB',
            }}
          />
        ))}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { alignItems: 'center', padding: 24, width: '100%', maxWidth: 540, alignSelf: 'center' },
  photo: { height: 330, width: '100%', borderRadius: 30, overflow: 'hidden' },
  scanline: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: '#DDF2A4',
    boxShadow: '0 0 25px 7px rgba(221,242,164,0.45)',
  },
  badge: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    borderRadius: 20,
    padding: 12,
    backgroundColor: 'rgba(36,28,49,0.65)',
  },
});
