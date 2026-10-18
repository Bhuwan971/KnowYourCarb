import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors as c, fonts as f, radius } from '../lib/theme';
import { FoodPhoto, Type } from './ui';

export function Scanner({ photo, prompt }: { photo?: string; prompt?: string }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 20_000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <View style={s.wrap}>
      {prompt ? (
        <View style={s.quote}>
          <Type style={s.quoteText}>“{prompt}”</Type>
        </View>
      ) : (
        <View style={s.photo}>
          <FoodPhoto uri={photo} style={StyleSheet.absoluteFill} />
        </View>
      )}
      <View accessibilityRole="progressbar" accessibilityLabel="Analyzing meal" style={s.status}>
        <ActivityIndicator color={c.purple} />
        <Type kind="heading">{prompt ? 'Working it out…' : 'Reading your plate…'}</Type>
      </View>
      <Type kind="small" style={{ textAlign: 'center' }}>
        Estimating foods, portions and nutrition.
      </Type>
      {slow && (
        <Type kind="caption" style={{ textAlign: 'center', marginTop: 8 }}>
          Still working. Slower photo services can take up to a minute.
        </Type>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 10,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  photo: {
    height: 250,
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 14,
  },
  quote: {
    width: '100%',
    padding: 24,
    borderRadius: radius.lg,
    backgroundColor: c.surfaceAlt,
    marginBottom: 14,
  },
  quoteText: { fontFamily: f.medium, fontSize: 18, lineHeight: 26, color: c.inkSoft },
  status: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 44 },
});
