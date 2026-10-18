import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  Barcode,
  Camera,
  ChevronDown,
  Images,
  MessageSquareText,
  NotebookPen,
  Sparkles,
  Utensils,
} from 'lucide-react-native';
import { useApp } from '../../state/AppProvider';
import { dailyTotal, localDay, newMeal, totalCarbs } from '../../lib/model';
import { sampleMeal } from '../../lib/samples';
import { colors as c, fonts as f, radius } from '../../lib/theme';
import { analysisUrl } from '../../lib/analysis';
import { Button, FoodPhoto, Type } from '../../components/ui';
import { TextLink } from '../../components/Shell';
import { usePhotoActions } from '../../components/usePhotoActions';

export default function SnapScreen() {
  const mobile = useWindowDimensions().width < 600;
  const { meals, settings, setDraft, tap, notify } = useApp();
  const { pick, accept, busy } = usePhotoActions();
  const [permission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [focused, setFocused] = useState(false);
  const [taking, setTaking] = useState(false);
  const [more, setMore] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        setReady(false);
        setMore(false);
      };
    }, []),
  );
  const live = mobile && permission?.granted && focused;
  const today = meals.filter(
    (m) => m.source !== 'sample' && localDay(m.createdAt) === localDay(new Date()),
  );
  const grams = dailyTotal(meals);
  const manual = () => {
    tap();
    setDraft(newMeal());
    router.navigate('/review');
  };
  const snap = async () => {
    tap();
    if (!live) {
      router.navigate('/capture');
      return;
    }
    if (!ready || taking || busy) return;
    setTaking(true);
    try {
      const photo = await camera.current?.takePictureAsync({ quality: 0.8 });
      if (photo) await accept(photo.uri);
    } catch {
      notify('Couldn’t take that snap. Please try again.');
    } finally {
      setTaking(false);
    }
  };
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const options = [
    {
      label: 'Type a meal',
      accessibilityLabel: 'Add carbs manually',
      icon: NotebookPen,
      onPress: manual,
    },
    ...(analysisUrl
      ? [
          {
            label: 'Scan a barcode',
            accessibilityLabel: 'Barcode',
            icon: Barcode,
            onPress: () => router.navigate({ pathname: '/capture', params: { mode: 'barcode' } }),
          },
          {
            label: 'Describe a meal',
            accessibilityLabel: 'Describe',
            icon: MessageSquareText,
            onPress: () => router.navigate('/describe'),
          },
        ]
      : []),
    {
      label: 'Try a sample',
      accessibilityLabel: 'Try a sample snap',
      icon: Sparkles,
      onPress: () => {
        tap();
        setDraft(sampleMeal('bowl'));
        router.navigate('/review');
      },
    },
  ];
  return (
    <View style={s.page}>
      <View style={s.greeting}>
        <Type kind="small">
          {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </Type>
        <Type accessibilityRole="header" kind="title">
          {greeting}
          {settings.name ? `, ${settings.name}` : ''}
        </Type>
      </View>
      <View style={s.today}>
        <View style={{ flex: 1, gap: 4 }}>
          <Type kind="small">Carbs today</Type>
          <View style={s.totalRow}>
            <Type style={s.total}>{grams}</Type>
            <Type style={s.unit}>g</Type>
          </View>
        </View>
        <Type kind="small">
          {today.length} {today.length === 1 ? 'meal' : 'meals'} logged
        </Type>
      </View>
      {settings.goal !== null && (
        <Type kind="caption" style={{ marginTop: -12 }}>
          Your daily reference: {settings.goal} g
        </Type>
      )}
      <View style={s.capture}>
        {live ? (
          <View style={s.preview}>
            <CameraView
              ref={camera}
              style={StyleSheet.absoluteFill}
              facing="back"
              onCameraReady={() => setReady(true)}
              onMountError={() => {
                setReady(false);
                notify('The camera couldn’t start. You can import a photo instead.');
              }}
            />
          </View>
        ) : null}
        <Button
          label={live ? 'Snap a meal' : 'Take a photo'}
          icon={Camera}
          busy={busy || taking}
          disabled={!!live && !ready}
          onPress={() => void snap()}
        />
        <View style={s.secondaryActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Import a food photo"
            disabled={busy || taking}
            onPress={() => void pick()}
            style={({ pressed }) => [s.textAction, (pressed || busy || taking) && { opacity: 0.5 }]}
          >
            <Images size={16} color={c.inkSoft} strokeWidth={1.7} />
            <Type style={s.actionText}>Upload photo</Type>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More options"
            aria-expanded={more}
            accessibilityState={{ expanded: more, disabled: busy || taking }}
            disabled={busy || taking}
            onPress={() => setMore(!more)}
            style={({ pressed }) => [s.textAction, (pressed || busy || taking) && { opacity: 0.5 }]}
          >
            <Type style={s.actionText}>More options</Type>
            <ChevronDown
              size={15}
              color={c.muted}
              style={{ transform: [{ rotate: more ? '180deg' : '0deg' }] }}
            />
          </Pressable>
        </View>
        {more && (
          <View style={s.options}>
            {options.map(({ label, accessibilityLabel, icon: Icon, onPress }) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                onPress={onPress}
                style={({ pressed }) => [s.option, pressed && { opacity: 0.55 }]}
              >
                <Icon size={18} color={c.muted} strokeWidth={1.7} />
                <Type style={{ flex: 1, fontSize: 14 }}>{label}</Type>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      {!!meals.length && (
        <View style={s.recent}>
          <View style={s.recentHeading}>
            <Type kind="heading">Recent meals</Type>
            <TextLink label="View all" onPress={() => router.navigate('/memories')} />
          </View>
          {meals.slice(0, 3).map((meal) => (
            <Pressable
              key={meal.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${meal.title}`}
              onPress={() => router.navigate(`/memory/${meal.id}`)}
              style={({ pressed }) => [s.meal, pressed && { opacity: 0.55 }]}
            >
              <View style={s.thumbnail}>
                {meal.photo ? (
                  <FoodPhoto uri={meal.photo} />
                ) : (
                  <Utensils size={18} color={c.muted} />
                )}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Type numberOfLines={1} style={{ fontFamily: f.medium, fontSize: 14 }}>
                  {meal.title}
                </Type>
                <Type kind="caption">
                  {meal.source === 'sample'
                    ? 'Sample · excluded from totals'
                    : `${meal.mealType} · ${new Date(meal.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
                </Type>
              </View>
              <Type style={{ fontFamily: f.medium, fontSize: 15 }}>{totalCarbs(meal.items)} g</Type>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  page: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 24 },
  greeting: { gap: 6, marginTop: 8 },
  today: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 4 },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  total: { fontFamily: f.display, fontSize: 48, lineHeight: 54, letterSpacing: -2 },
  unit: { fontSize: 20, color: c.muted },
  capture: {
    paddingVertical: 8,
    gap: 8,
  },
  preview: {
    height: 240,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: c.night,
    marginBottom: 8,
  },
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  textAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
  actionText: { fontSize: 13, color: c.inkSoft, fontFamily: f.medium },
  options: { paddingTop: 6 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  recent: { gap: 4 },
  recentHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  meal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
