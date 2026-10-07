import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  Camera,
  Images,
  NotebookPen,
  UtensilsCrossed,
  MoveLeft,
  Plus,
} from 'lucide-react-native';
import { useApp } from '../../state/AppProvider';
import { dailyTotal, localDay, newMeal } from '../../lib/model';
import { photos, sampleMeal } from '../../lib/samples';
import { colors as c, fonts as f } from '../../lib/theme';
import { analysisUrl } from '../../lib/analysis';
import { Chip, FoodPhoto, IconButton, Type } from '../../components/ui';
import { TextLink } from '../../components/Shell';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MemoryCard } from '../../components/MemoryCard';
import { usePhotoActions } from '../../components/usePhotoActions';

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
  const greeting =
    new Date().getHours() < 12
      ? 'Good morning'
      : new Date().getHours() < 17
        ? 'Good afternoon'
        : 'Good evening';
  return (
    <>
      <View style={s.greetingRow}>
        <Type accessibilityRole="header" style={s.greeting}>
          {greeting}
          {settings.name ? `, ${settings.name}` : ''}
        </Type>
        {!mobile && (
          <Type kind="small">
            {new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </Type>
        )}
      </View>
      <View style={{ flexDirection: split ? 'row' : 'column', gap: 25 }}>
        <View style={{ flex: split ? 2.2 : undefined }}>
          <View style={s.cameraCard}>
            <View
              style={[
                s.preview,
                { height: mobile ? Math.max(360, height - insets.top - insets.bottom - 250) : 640 },
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
                colors={['rgba(0,0,0,0.28)', 'transparent', 'rgba(20,20,20,0.75)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={s.previewTop}>
                <View style={s.previewBadge}>
                  <View style={[s.greenDot, { backgroundColor: c.lime }]} />
                  <Type
                    style={{ fontSize: 10, color: c.white, fontFamily: f.bold, letterSpacing: 1.4 }}
                  >
                    {live ? 'YOUR PLATE, IN FOCUS' : 'CAMERA PREVIEW'}
                  </Type>
                </View>
                <IconButton
                  label="Try a sample snap"
                  icon={UtensilsCrossed}
                  onPress={() => demo()}
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}
                  color={c.white}
                />
              </View>
              <View pointerEvents="none" style={[s.frame, mobile && { left: 33, right: 33 }]}>
                {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
                  <View
                    key={corner}
                    style={[
                      s.corner,
                      corner === 'tl' && {
                        left: 0,
                        top: 0,
                        borderTopWidth: 2,
                        borderLeftWidth: 2,
                        borderTopLeftRadius: 15,
                      },
                      corner === 'tr' && {
                        right: 0,
                        top: 0,
                        borderTopWidth: 2,
                        borderRightWidth: 2,
                        borderTopRightRadius: 15,
                      },
                      corner === 'bl' && {
                        left: 0,
                        bottom: 0,
                        borderBottomWidth: 2,
                        borderLeftWidth: 2,
                        borderBottomLeftRadius: 15,
                      },
                      corner === 'br' && {
                        right: 0,
                        bottom: 0,
                        borderBottomWidth: 2,
                        borderRightWidth: 2,
                        borderBottomRightRadius: 15,
                      },
                    ]}
                  />
                ))}
              </View>
              <View pointerEvents="none" style={s.previewBottom}>
                <Type style={{ color: c.white, fontSize: 12, textAlign: 'center' }}>
                  {live ? 'Center your food in the frame' : 'Open the camera or import a photo'}
                </Type>
              </View>
              <View style={s.cameraControls}>
                <IconButton
                  label="Import a food photo"
                  icon={Images}
                  onPress={() => void pick()}
                  disabled={busy || taking}
                  style={s.controlButton}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Snap a meal"
                  accessibilityState={{ disabled: busy || taking || (!!live && !ready) }}
                  disabled={busy || taking || (!!live && !ready)}
                  onPress={() => void snap()}
                  style={({ pressed }) => [
                    s.shutterOuter,
                    pressed && { transform: [{ scale: 0.94 }] },
                    (busy || taking) && { opacity: 0.5 },
                  ]}
                >
                  <View style={s.shutterInner}>
                    <Camera size={26} color={c.white} strokeWidth={1.8} />
                  </View>
                </Pressable>
                <IconButton
                  label="Add carbs manually"
                  icon={NotebookPen}
                  onPress={manual}
                  style={s.controlButton}
                />
              </View>
            </View>
          </View>
          <Type kind="small" style={{ textAlign: 'center', marginTop: 10, paddingHorizontal: 8 }}>
            {analysisUrl
              ? 'AI estimates calories & carbs. Review, then save.'
              : 'AI estimates aren’t connected yet. Your photo can still be saved.'}
          </Type>
          <View style={s.sampleLink}>
            <UtensilsCrossed size={16} color={c.purple} />
            <Type kind="small">Just looking around?</Type>
            <Pressable
              accessibilityRole="button"
              onPress={() => demo()}
              accessibilityLabel="Try a sample snap"
            >
              <Type style={{ fontSize: 12, fontFamily: f.bold, color: c.purple }}>
                Try a sample snap →
              </Type>
            </Pressable>
          </View>
        </View>
        <View style={{ flex: split ? 1 : undefined, gap: 18 }}>
          <View style={s.todayCard}>
            <View style={s.sectionRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[s.greenDot, { backgroundColor: c.purple }]} />
                <Type style={{ fontFamily: f.bold, fontSize: 15 }}>Your day, so far</Type>
              </View>
              <Chip color="#F3F0F7" textColor={c.muted}>
                TODAY
              </Chip>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 14 }}>
              <Type
                style={{
                  fontFamily: f.displayBold,
                  fontSize: 62,
                  lineHeight: 73,
                  letterSpacing: -3,
                }}
              >
                {grams}
              </Type>
              <Type style={{ fontSize: 22, color: c.muted, fontFamily: f.display }}>g</Type>
            </View>
            <Type kind="small">total carbs logged</Type>
            {settings.goal !== null && (
              <View style={{ marginTop: 16, gap: 6 }}>
                <View style={{ height: 7, borderRadius: 7, backgroundColor: c.lavender }}>
                  <View
                    style={{
                      height: 7,
                      borderRadius: 7,
                      backgroundColor: c.purple,
                      width: `${Math.min(100, (grams / settings.goal) * 100)}%`,
                    }}
                  />
                </View>
                <Type kind="small">
                  Your reference: {settings.goal} g · {Math.round((grams / settings.goal) * 100)}%
                  logged
                </Type>
              </View>
            )}
            <View style={s.todayFoot}>
              <Type kind="small">
                {today.length} {today.length === 1 ? 'meal' : 'meals'} saved
              </Type>
              <TextLink label="Your rhythm" onPress={() => router.navigate('/rhythm')} />
            </View>
          </View>
        </View>
      </View>
      <View style={[s.sectionRow, { marginTop: 25, marginBottom: 14 }]}>
        <View>
          <Type style={{ fontFamily: f.displayBold, fontSize: 22 }}>
            {meals.length ? 'Your little food memories' : 'Every bite has a little story'}
          </Type>
          <Type kind="small" style={{ marginTop: 2 }}>
            {meals.length
              ? 'The moments you chose to keep.'
              : 'A few sample memories. Your own story starts with a snap.'}
          </Type>
        </View>
        <TextLink
          label={meals.length ? 'View all' : 'Open memories'}
          onPress={() => router.navigate('/memories')}
        />
      </View>
      <View style={{ flexDirection: mobile ? 'column' : 'row', gap: 17 }}>
        {meals.length
          ? meals
              .slice(0, 3)
              .map((meal) => (
                <MemoryCard
                  key={meal.id}
                  meal={meal}
                  compact
                  onPress={() => router.navigate(`/memory/${meal.id}`)}
                />
              ))
          : (['toast', 'berries'] as const).map((kind) => (
              <MemoryCard key={kind} meal={sampleMeal(kind)} compact onPress={() => demo(kind)} />
            ))}
        {!mobile && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take your first snap"
            onPress={() => router.navigate('/capture')}
            style={s.addMemory}
          >
            <View style={s.addCircle}>
              <Plus size={22} color={c.purple} />
            </View>
            <Type style={{ fontFamily: f.bold, fontSize: 14, marginTop: 15 }}>
              Make a little memory
            </Type>
            <Type kind="small" style={{ marginTop: 3 }}>
              Something delicious awaits.
            </Type>
            <ArrowRight size={18} color={c.purple} style={{ marginTop: 13 }} />
          </Pressable>
        )}
      </View>
      {mobile && (
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 7,
            marginTop: 18,
          }}
        >
          <MoveLeft size={14} color={c.muted} />
          <Type kind="small">Swipe left for your memories</Type>
        </View>
      )}
    </>
  );
}
const s = StyleSheet.create({
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  greeting: { fontFamily: f.displayBold, fontSize: 23, lineHeight: 30, flexShrink: 1 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#AEC477' },
  cameraCard: {
    backgroundColor: c.white,
    borderRadius: 26,
    padding: 6,
    borderWidth: 1,
    borderColor: c.line,
  },
  preview: { borderRadius: 20, overflow: 'hidden', backgroundColor: c.lavender },
  previewTop: {
    position: 'absolute',
    top: 18,
    left: 19,
    right: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewBadge: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  frame: { position: 'absolute', top: 73, bottom: 155, left: 57, right: 57 },
  corner: { position: 'absolute', width: 26, height: 26, borderColor: 'rgba(255,255,255,0.85)' },
  previewBottom: { position: 'absolute', bottom: 120, left: 20, right: 20 },
  cameraControls: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 17,
  },
  controlButton: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    width: 50,
    height: 50,
    borderRadius: 17,
  },
  shutterOuter: {
    width: 86,
    height: 86,
    padding: 5,
    borderRadius: 43,
    borderWidth: 1.5,
    borderColor: c.white,
  },
  shutterInner: {
    flex: 1,
    backgroundColor: c.purple,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 13,
    flexWrap: 'wrap',
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  todayCard: {
    backgroundColor: c.white,
    borderRadius: 23,
    padding: 23,
    borderWidth: 1,
    borderColor: c.line,
  },
  todayFoot: {
    borderTopWidth: 1,
    borderTopColor: c.line,
    marginTop: 21,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addMemory: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#DCD4EA',
    borderStyle: 'dashed',
    borderRadius: 21,
    backgroundColor: '#F4F0FA',
    minHeight: 212,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  addCircle: {
    width: 43,
    height: 43,
    borderRadius: 16,
    backgroundColor: '#E8DFF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
