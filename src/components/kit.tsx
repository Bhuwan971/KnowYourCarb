import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, StyleSheet, TextStyle, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { BadgeCheck, Barcode, Database, PencilLine, Sparkles, Tag } from 'lucide-react-native';
import { Confidence, FoodItem } from '../lib/model';
import { colors as c, fonts as f } from '../lib/theme';
import { Type } from './ui';

const ease = (t: number) => 1 - Math.pow(1 - t, 4);
// A number that settles into its new value. Only re-renders itself; instant with reduced motion.
export function CountUp({
  value,
  decimals = 0,
  style,
  from,
  duration = 650,
  prefix = '',
}: {
  value: number | null;
  decimals?: number;
  style?: StyleProp<TextStyle>;
  from?: number;
  duration?: number;
  prefix?: string;
}) {
  const reduced = useReducedMotion();
  const target = value ?? NaN;
  const [shown, setShown] = useState(() => (Number.isFinite(from) ? from! : target));
  const last = useRef(shown);
  useEffect(() => {
    if (!Number.isFinite(target) || reduced || !Number.isFinite(last.current)) {
      last.current = target;
      setShown(target);
      return;
    }
    const start = last.current;
    if (start === target) return;
    const begin = Date.now();
    let frame: number;
    const tick = () => {
      const t = Math.min(1, (Date.now() - begin) / duration);
      const next = start + (target - start) * ease(t);
      last.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced, duration]);
  const factor = 10 ** decimals;
  return (
    <Type style={style}>
      {Number.isFinite(shown) ? `${prefix}${Math.round(shown * factor) / factor}` : '—'}
    </Type>
  );
}

export const confidenceMeta: Record<
  Confidence,
  { label: string; short: string; color: string; ink: string; explain: string }
> = {
  high: {
    label: 'Solid estimate',
    short: 'Solid',
    color: c.lime,
    ink: c.limeInk,
    explain: 'A database match with a clear, countable portion.',
  },
  medium: {
    label: 'Good guess',
    short: 'Good guess',
    color: c.butter,
    ink: c.butterInk,
    explain: 'Matched food, but the amount is estimated from the photo.',
  },
  low: {
    label: 'Rough guess',
    short: 'Rough',
    color: c.pink,
    ink: c.pinkInk,
    explain: 'The food or amount is hard to tell. A quick check helps a lot.',
  },
};

export function ConfidencePill({
  level,
  compact = false,
}: {
  level: Confidence;
  compact?: boolean;
}) {
  const meta = confidenceMeta[level];
  return (
    <View
      accessibilityLabel={`Confidence: ${meta.label}`}
      style={[kit.pill, { backgroundColor: meta.color }]}
    >
      <View style={[kit.dot, { backgroundColor: meta.ink }]} />
      <Type style={[kit.pillText, { color: meta.ink }]}>{compact ? meta.short : meta.label}</Type>
    </View>
  );
}

export function sourceOf(item: FoodItem) {
  if (item.barcode)
    return { label: 'Barcode', icon: Barcode, detail: item.sourceName ?? 'Product database' };
  if (item.nutritionBasis === 'label')
    return { label: 'Label', icon: Tag, detail: item.sourceName ?? 'Read from a nutrition label' };
  if (item.nutritionBasis === 'reference')
    return {
      label: 'USDA',
      icon: Database,
      detail: item.referenceDescription
        ? `USDA ${item.dataset === 'sr' ? 'SR Legacy' : 'FNDDS'} · ${item.referenceDescription}`
        : 'USDA FoodData Central',
    };
  if (item.nutritionBasis === 'estimate')
    return { label: 'AI guess', icon: Sparkles, detail: 'Estimated by the AI, no database match' };
  return { label: 'You', icon: PencilLine, detail: 'Entered by you' };
}

export function SourcePill({ item }: { item: FoodItem }) {
  const source = sourceOf(item);
  const Icon = source.label === 'USDA' ? BadgeCheck : source.icon;
  return (
    <View style={[kit.pill, { backgroundColor: '#F3F0F7' }]} accessibilityLabel={source.detail}>
      <Icon size={11} color={c.inkSoft} strokeWidth={2} />
      <Type style={[kit.pillText, { color: c.inkSoft }]}>{source.label}</Type>
    </View>
  );
}

// The plausible carb interval as a bar, with the estimate marked. Wider bar, rougher guess.
export function RangeBar({
  min,
  max,
  value,
  scale,
  tint = c.purple,
}: {
  min: number;
  max: number;
  value: number;
  scale: number;
  tint?: string;
}) {
  const at = (n: number) =>
    `${Math.max(0, Math.min(100, (n / Math.max(scale, 1)) * 100))}%` as const;
  return (
    <View accessibilityLabel={`Likely between ${min} and ${max} grams`} style={kit.rangeTrack}>
      <View
        style={[
          kit.rangeFill,
          {
            left: at(min),
            width: `${Math.max(2, ((max - min) / Math.max(scale, 1)) * 100)}%`,
            backgroundColor: tint,
          },
        ]}
      />
      <View style={[kit.rangeMark, { left: at(value), borderColor: tint }]} />
    </View>
  );
}

const kit = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, lineHeight: 15, fontFamily: f.bold },
  rangeTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: c.lavender,
    overflow: 'visible',
    marginVertical: 4,
  },
  rangeFill: { position: 'absolute', top: 0, bottom: 0, borderRadius: 4, opacity: 0.35 },
  rangeMark: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    marginLeft: -8,
    borderRadius: 8,
    borderWidth: 3,
    backgroundColor: c.white,
  },
});
