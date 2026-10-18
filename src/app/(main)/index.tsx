import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import {
  ArrowRight,
  Barcode,
  Camera,
  Images,
  MessageSquareText,
  NotebookPen,
  Repeat2,
  Sparkles,
  Plus,
} from 'lucide-react-native';
import { useApp } from '../../state/AppProvider';
import { dailyTotal, localDay, Meal, newMeal, totalCarbs, uid } from '../../lib/model';
import { photos, sampleMeal } from '../../lib/samples';
import { colors as c, fonts as f, gradients, radius, shadow } from '../../lib/theme';
import { analysisUrl } from '../../lib/analysis';
import { Card, FoodPhoto, IconButton, SectionTitle, Type } from '../../components/ui';
import { TextLink } from '../../components/Shell';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MemoryCard } from '../../components/MemoryCard';
import { usePhotoActions } from '../../components/usePhotoActions';
import { PressableScale } from '../../components/PressableScale';
import { CountUp } from '../../components/kit';

// A soft progress ring for a personal reference; past 100% it simply stays full.
function Ring({ progress, size = 84 }: { progress: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} accessibilityElementsHidden style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={c.lime}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${length} ${length}`}
          strokeDashoffset={length * (1 - Math.min(1, progress))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Type style={{ fontFamily: f.displayBold, fontSize: 16, color: c.white }}>
        {Math.round(progress * 100)}%
      </Type>
    </View>
  );
}

// Meals you eat again and again, most recent first — one tap logs them exactly as before.
function repeatable(meals: Meal[]) {
  const seen = new Set<string>();
  return meals.filter((meal) => {
    const key = meal.title.trim().toLowerCase();
    if (meal.source === 'sample' || !key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function SnapScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const split = width >= 1180;
  const mobile = width < 600;
  const { meals, settings, setDraft, tap, notify } = useApp();
  const { pick, accept, busy } = usePhotoActions();
  const [permission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [focused, setFocused] = useState(false);
  const [taking, setTaking] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        setReady(false);
      };
    }, []),
  );
  const live = mobile && permission?.granted && focused;
  const today = meals.filter(
    (m) => m.source !== 'sample' && localDay(m.createdAt) === localDay(new Date()),
  );
  const grams = dailyTotal(meals);
  const demo = (kind: 'bowl' | 'toast' | 'berries' = 'bowl') => {
    tap();
    setDraft(sampleMeal(kind));
    router.navigate('/review');
  };
  const manual = () => {
    tap();
    setDraft(newMeal());
    router.navigate('/review');
  };
  const again = (meal: Meal) => {
    tap();
    const fresh = newMeal(meal.photo);
    setDraft({
      ...meal,
      id: fresh.id,
      createdAt: fresh.createdAt,
      mealType: fresh.mealType,
      reviewed: false,
      items: meal.items.map((item) => ({ ...item, id: uid() })),
    });
    router.navigate('/review');
  };
  const repeats = repeatable(meals).slice(0, 3);
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
  const quick = [
    ...(analysisUrl
      ? [
          {
            label: 'Barcode',
            icon: Barcode,
            onPress: () => {
              tap();
              router.navigate({ pathname: '/capture', params: { mode: 'barcode' } });
            },
          },
          {
            label: 'Describe',
            icon: MessageSquareText,
            onPress: () => {
              tap();
              router.navigate('/describe');
            },
          },
        ]
      : []),
    { label: 'Type it', icon: NotebookPen, onPress: manual },
    { label: 'Sample', icon: Sparkles, onPress: () => demo() },
  ];
  const todayCard = (
    <View style={s.today}>
      <LinearGradient
        colors={[...gradients.night]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.glow} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ flex: 1 }}>
          <Type kind="eyebrow" style={{ color: c.lime }}>
            Today
          </Type>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
            <CountUp value={grams} decimals={1} style={s.todayValue} />
            <Type style={{ fontSize: 20, color: 'rgba(255,255,255,0.6)', fontFamily: f.display }}>
              g
            </Type>
          </View>
          <Type style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13, marginTop: 2 }}>
            carbs across {today.length} {today.length === 1 ? 'meal' : 'meals'}
            {settings.goal !== null ? ` · ${settings.goal} g reference` : ''}
          </Type>
        </View>
        {settings.goal !== null && <Ring progress={grams / settings.goal} />}
      </View>
      <View style={s.todayFoot}>
        <Type style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>
          Only saved meals count. Samples never do.
        </Type>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Your rhythm"
          onPress={() => router.navigate('/rhythm')}
          style={({ pressed }) => [s.todayLink, pressed && { opacity: 0.7 }]}
        >
          <Type style={{ color: c.white, fontSize: 12, fontFamily: f.bold }}>Your rhythm</Type>
          <ArrowRight size={14} color={c.white} />
        </Pressable>
      </View>
    </View>
  );
  const recent = meals.length
    ? meals.slice(0, 3).map((meal) => ({
        key: meal.id,
        meal,
        onPress: () => router.navigate(`/memory/${meal.id}`),
      }))
    : (['toast', 'berries'] as const).map((kind) => ({
        key: kind,
        meal: sampleMeal(kind),
        onPress: () => demo(kind),
      }));
  return (
    <>
      <View style={s.greetingRow}>
        <View style={{ flex: 1 }}>
          <Type kind="caption" style={{ marginBottom: 2 }}>
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </Type>
          <Type accessibilityRole="header" style={s.greeting}>
            {greeting}
            {settings.name ? `, ${settings.name}` : ''}
          </Type>
        </View>
      </View>
      <View style={{ flexDirection: split ? 'row' : 'column', gap: 24 }}>
        <View style={{ flex: split ? 2.2 : undefined }}>
          <View
            style={[
              s.preview,
              { height: mobile ? Math.max(380, height - insets.top - insets.bottom - 300) : 620 },
            ]}
          >
            {live ? (
              <CameraView
                ref={camera}
                style={{ flex: 1 }}
                facing="back"
                onCameraReady={() => setReady(true)}
                onMountError={() => {
                  setReady(false);
                  notify('The camera couldn’t start. You can import a photo instead.');
                }}
              />
            ) : (
              <FoodPhoto source={photos.bowl} style={StyleSheet.absoluteFill} />
            )}
            <LinearGradient
              colors={[
                'rgba(10,8,20,0.5)',
                'rgba(10,8,20,0)',
                'rgba(10,8,20,0)',
                'rgba(10,8,20,0.85)',
              ]}
              locations={[0, 0.3, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.previewTop}>
              <View style={s.previewBadge}>
                <View style={[s.liveDot, live && { backgroundColor: c.lime }]} />
                <Type style={s.previewBadgeText}>
                  {live ? 'YOUR PLATE, IN FOCUS' : 'CAMERA PREVIEW'}
                </Type>
              </View>
              <IconButton
                label="Try a sample snap"
                icon={Sparkles}
                onPress={() => demo()}
                variant="glass"
                size={42}
              />
            </View>
            <View pointerEvents="none" style={[s.frame, mobile && { left: 36, right: 36 }]}>
              {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
                <View
                  key={corner}
                  style={[
                    s.corner,
                    corner === 'tl' && {
                      left: 0,
                      top: 0,
                      borderTopWidth: 2.5,
                      borderLeftWidth: 2.5,
                      borderTopLeftRadius: 18,
                    },
                    corner === 'tr' && {
                      right: 0,
                      top: 0,
                      borderTopWidth: 2.5,
                      borderRightWidth: 2.5,
                      borderTopRightRadius: 18,
                    },
                    corner === 'bl' && {
                      left: 0,
                      bottom: 0,
                      borderBottomWidth: 2.5,
                      borderLeftWidth: 2.5,
                      borderBottomLeftRadius: 18,
                    },
                    corner === 'br' && {
                      right: 0,
                      bottom: 0,
                      borderBottomWidth: 2.5,
                      borderRightWidth: 2.5,
                      borderBottomRightRadius: 18,
                    },
                  ]}
                />
              ))}
            </View>
            <View pointerEvents="none" style={s.previewHint}>
              <Type style={s.previewTitle}>
                {live ? 'Center your plate.' : 'Snap it. Know it.'}
              </Type>
              <Type style={s.previewSub}>
                {live
                  ? 'Natural light helps the estimate.'
                  : 'One photo turns into carbs, calories and a memory.'}
              </Type>
            </View>
            <View style={s.cameraControls}>
              <IconButton
                label="Import a food photo"
                icon={Images}
                onPress={() => void pick()}
                disabled={busy || taking}
                variant="glass"
                size={52}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Snap a meal"
                accessibilityState={{ disabled: busy || taking || (!!live && !ready) }}
                disabled={busy || taking || (!!live && !ready)}
                onPress={() => void snap()}
                style={({ pressed }) => [
                  s.shutterOuter,
                  pressed && { transform: [{ scale: 0.93 }] },
                  (busy || taking) && { opacity: 0.5 },
                ]}
              >
                <View style={s.shutterInner}>
                  <Camera size={28} color={c.ink} strokeWidth={2} />
                </View>
              </Pressable>
              <IconButton
                label="Add carbs manually"
                icon={NotebookPen}
                onPress={manual}
                variant="glass"
                size={52}
              />
            </View>
          </View>
          <View style={s.quick}>
            {quick.map((action) => (
              <PressableScale
                key={action.label}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={action.onPress}
                style={s.quickButton}
                hoverStyle={{ backgroundColor: c.lavender }}
              >
                <action.icon size={16} color={c.purpleDeep} strokeWidth={2.2} />
                <Type style={s.quickText}>{action.label}</Type>
              </PressableScale>
            ))}
          </View>
          <Type kind="caption" style={{ textAlign: 'center', marginTop: 12, paddingHorizontal: 8 }}>
            {analysisUrl
              ? 'Photos are matched to USDA FoodData Central. A quick check tightens the estimate.'
              : 'AI estimates aren’t connected yet. Your photo can still be saved.'}
          </Type>
        </View>
        <View style={{ flex: split ? 1 : undefined, gap: 16, marginTop: split ? 0 : 8 }}>
          {todayCard}
          {!!repeats.length && (
            <Card>
              <SectionTitle
                title="Having it again?"
                subtitle="One tap logs a past meal with your corrections."
              />
              <View style={{ marginTop: 8 }}>
                {repeats.map((meal) => (
                  <PressableScale
                    key={meal.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Log ${meal.title} again`}
                    onPress={() => again(meal)}
                    scaleTo={0.98}
                    style={s.repeat}
                    hoverStyle={{ backgroundColor: c.surfaceAlt }}
                  >
                    <View style={s.repeatIcon}>
                      <Repeat2 size={15} color={c.purpleDeep} strokeWidth={2.2} />
                    </View>
                    <Type numberOfLines={1} style={{ flex: 1, fontFamily: f.medium, fontSize: 14 }}>
                      {meal.title}
                    </Type>
                    <Type style={{ fontFamily: f.displayBold, fontSize: 15 }}>
                      {totalCarbs(meal.items)}
                      <Type style={{ fontSize: 11, color: c.muted }}> g</Type>
                    </Type>
                    <Plus size={16} color={c.purple} strokeWidth={2.4} />
                  </PressableScale>
                ))}
              </View>
            </Card>
          )}
        </View>
      </View>
      <SectionTitle
        style={{ marginTop: 30, marginBottom: 14 }}
        title={meals.length ? 'Recent memories' : 'Try a sample memory'}
        subtitle={
          meals.length ? 'The moments you chose to keep.' : 'Your own story starts with a snap.'
        }
        action={
          <TextLink
            label={meals.length ? 'View all' : 'Open memories'}
            onPress={() => router.navigate('/memories')}
          />
        }
      />
      {mobile ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 14, paddingRight: 20, paddingBottom: 8 }}
          style={{ marginHorizontal: -20, paddingHorizontal: 20 }}
        >
          {recent.map(({ key, meal, onPress }) => (
            <MemoryCard key={key} meal={meal} compact onPress={onPress} style={{ width: 250 }} />
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take your first snap"
            onPress={() => router.navigate('/capture')}
            style={[s.addMemory, { width: 150, height: 190 }]}
          >
            <View style={s.addCircle}>
              <Plus size={22} color={c.white} strokeWidth={2.4} />
            </View>
            <Type style={{ fontFamily: f.bold, fontSize: 13, marginTop: 12, textAlign: 'center' }}>
              New snap
            </Type>
          </Pressable>
        </ScrollView>
      ) : (
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {recent.map(({ key, meal, onPress }) => (
            <MemoryCard key={key} meal={meal} compact onPress={onPress} />
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take your first snap"
            onPress={() => router.navigate('/capture')}
            style={[s.addMemory, { flex: 1, minHeight: 190 }]}
          >
            <View style={s.addCircle}>
              <Plus size={22} color={c.white} strokeWidth={2.4} />
            </View>
            <Type style={{ fontFamily: f.bold, fontSize: 14, marginTop: 14 }}>
              Make a new memory
            </Type>
            <Type kind="caption" style={{ marginTop: 3 }}>
              Something delicious awaits.
            </Type>
          </Pressable>
        </View>
      )}
    </>
  );
}

const s = StyleSheet.create({
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 18,
    marginTop: 6,
  },
  greeting: { fontFamily: f.displayBold, fontSize: 28, lineHeight: 33, letterSpacing: -1 },
  preview: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: c.night,
    ...shadow.card,
  },
  previewTop: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(10,8,20,0.42)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  previewBadgeText: { fontSize: 10, color: c.white, fontFamily: f.bold, letterSpacing: 1.4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  frame: { position: 'absolute', top: 76, bottom: 170, left: 60, right: 60 },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: 'rgba(255,255,255,0.9)' },
  previewHint: { position: 'absolute', bottom: 112, left: 22, right: 22, gap: 3 },
  previewTitle: {
    fontFamily: f.displayBold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.8,
    color: c.white,
  },
  previewSub: { color: 'rgba(255,255,255,0.72)', fontSize: 13, lineHeight: 18 },
  cameraControls: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  shutterOuter: {
    width: 82,
    height: 82,
    padding: 5,
    borderRadius: 41,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  shutterInner: {
    flex: 1,
    backgroundColor: c.white,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quick: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  quickButton: {
    flexGrow: 1,
    flexBasis: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: c.white,
    ...shadow.soft,
  },
  quickText: { fontFamily: f.bold, fontSize: 13, color: c.ink },
  today: {
    borderRadius: radius.lg,
    padding: 22,
    overflow: 'hidden',
    ...shadow.card,
  },
  glow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -70,
    top: -90,
    backgroundColor: 'rgba(107,78,246,0.45)',
  },
  todayValue: {
    fontFamily: f.displayBold,
    fontSize: 56,
    lineHeight: 62,
    letterSpacing: -2.6,
    color: c.white,
  },
  todayFoot: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  todayLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  repeat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 8,
    marginHorizontal: -8,
    borderRadius: radius.md,
  },
  repeatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMemory: {
    borderRadius: radius.lg,
    backgroundColor: c.lavender,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  addCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: c.purple,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.purple,
  },
});
