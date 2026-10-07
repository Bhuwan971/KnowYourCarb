import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  Camera,
  ImagePlus,
  PencilLine,
  Sparkles,
  Check,
  MoveLeft,
  ScanLine,
  Plus,
} from 'lucide-react-native';
import { useApp } from '../../state/AppProvider';
import { dailyTotal, localDay, newMeal } from '../../lib/model';
import { photos, sampleMeal } from '../../lib/samples';
import { colors as c, fonts as f } from '../../lib/theme';
import { Chip, FoodPhoto, IconButton, Type } from '../../components/ui';
import { Mascot } from '../../components/Mascot';
import { PageHeading, TextLink } from '../../components/Shell';
import { MemoryCard } from '../../components/MemoryCard';
import { usePhotoActions } from '../../components/usePhotoActions';

export default function SnapScreen() {
  const { width } = useWindowDimensions();
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
    if (!ready || taking) return;
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
      ? 'GOOD MORNING'
      : new Date().getHours() < 17
        ? 'HELLO, AFTERNOON'
        : 'HEY, GOOD EVENING';
  return (
    <>
      <PageHeading
        eyebrow={`${greeting}${settings.name ? `, ${settings.name.toUpperCase()}` : ''} ✦`}
        title="Good food. Less guesswork."
        subtitle="Snap your plate. Get a little clarity. Go enjoy your day."
        action={
          !mobile ? (
            <View style={s.dayBadge}>
              <View style={s.greenDot} />
              <Type kind="small" style={{ color: c.ink }}>
                {new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })} · A fresh
                little day
              </Type>
            </View>
          ) : undefined
        }
      />
      <View style={{ flexDirection: split ? 'row' : 'column', gap: 25 }}>
        <View style={{ flex: split ? 1.85 : undefined }}>
          <View style={s.cameraCard}>
            <View style={[s.preview, { height: mobile ? 350 : 368 }]}>
              {live ? (
                <CameraView
                  ref={camera}
                  style={{ flex: 1 }}
                  facing="back"
                  onCameraReady={() => setReady(true)}
                  onMountError={() =>
                    notify('The camera couldn’t start. You can import a photo instead.')
                  }
                />
              ) : (
                <FoodPhoto source={photos.bowl} style={StyleSheet.absoluteFill} />
              )}
              <LinearGradient
                colors={['rgba(0,0,0,0.24)', 'transparent', 'rgba(20,20,20,0.55)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={s.previewTop}>
                <View style={s.previewBadge}>
                  <View style={[s.greenDot, { backgroundColor: c.lime }]} />
                  <Type
                    style={{ fontSize: 10, color: c.white, fontFamily: f.bold, letterSpacing: 1.4 }}
                  >
                    {live ? 'YOUR PLATE, IN FOCUS' : 'A TASTE OF THE EXPERIENCE'}
                  </Type>
                </View>
                <IconButton
                  label="Try a sample snap"
                  icon={Sparkles}
                  onPress={() => demo()}
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 35, height: 35 }}
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
              {!live && (
                <View style={[s.sticker, mobile && { right: 20, top: 80 }]}>
                  <Sparkles size={15} color={c.purple} />
                  <Type style={{ fontFamily: f.displayBold, fontSize: 29, lineHeight: 35 }}>
                    40<Type style={{ fontSize: 16 }}>g</Type>
                  </Type>
                  <Type style={{ fontSize: 10, color: c.muted, lineHeight: 15 }}>
                    carbs · sample estimate
                  </Type>
                  <View
                    style={{ flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 5 }}
                  >
                    <Check size={11} color={c.purple} />
                    <Type style={{ fontSize: 9, color: c.purple }}>A little more clarity</Type>
                  </View>
                </View>
              )}
              <View style={s.previewBottom}>
                <Type
                  style={{
                    color: c.white,
                    fontFamily: f.displayBold,
                    fontSize: 23,
                    lineHeight: 28,
                  }}
                >
                  {'Your next bite,\na little brighter.'}
                </Type>
                <Type style={{ color: '#F0EFE8', fontSize: 11, marginTop: 7 }}>
                  {live
                    ? 'Center your food. Tap to snap.'
                    : 'One photo. A food memory that stays with you.'}
                </Type>
              </View>
            </View>
            <View style={s.cameraControls}>
              <IconButton
                label="Import a food photo"
                icon={ImagePlus}
                onPress={() => void pick()}
                disabled={busy || taking}
                style={s.controlButton}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Snap a meal"
                accessibilityState={{ disabled: busy || taking }}
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
                icon={PencilLine}
                onPress={manual}
                style={s.controlButton}
              />
            </View>
            <View style={s.controlLabels}>
              <Type kind="small">Import photo</Type>
              <Type style={{ fontSize: 12, fontFamily: f.bold }}>Snap a meal</Type>
              <Type kind="small">Add manually</Type>
            </View>
          </View>
          <View style={s.sampleLink}>
            <Sparkles size={14} color={c.purple} />
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
          <View style={s.tipCard}>
            <View style={{ flex: 1 }}>
              <Type style={{ fontFamily: f.displayBold, fontSize: 20, lineHeight: 26 }}>
                {'Small snaps.\nBig peace of mind.'}
              </Type>
              <Type kind="small" style={{ marginTop: 9, color: '#736B87' }}>
                Life’s for living, not counting every crumb.
              </Type>
            </View>
            <View style={{ transform: [{ rotate: '9deg' }], marginRight: -6 }}>
              <Mascot size={92} />
            </View>
          </View>
          <View style={s.howCard}>
            <Type style={{ fontFamily: f.bold, fontSize: 13, marginBottom: 14 }}>
              A little snap goes a long way
            </Type>
            {[
              { icon: Camera, title: 'Snap your food', text: 'Or pick a photo you already love.' },
              {
                icon: ScanLine,
                title: 'Review the little details',
                text: 'Check portions. Make it yours.',
              },
              {
                icon: Check,
                title: 'Save it. Get on with your day.',
                text: 'Your memories are a tap away.',
              },
            ].map((step, index) => (
              <View
                key={step.title}
                style={{
                  flexDirection: 'row',
                  gap: 11,
                  marginBottom: index === 2 ? 0 : 14,
                  alignItems: 'center',
                }}
              >
                <View style={s.stepIcon}>
                  <step.icon size={15} color={c.purple} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Type style={{ fontFamily: f.medium, fontSize: 12, lineHeight: 18 }}>
                    {step.title}
                  </Type>
                  <Type kind="small" style={{ fontSize: 10, lineHeight: 16 }}>
                    {step.text}
                  </Type>
                </View>
              </View>
            ))}
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
  dayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 25,
    paddingVertical: 9,
    paddingHorizontal: 13,
    backgroundColor: c.white,
  },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#AEC477' },
  cameraCard: {
    backgroundColor: c.white,
    borderRadius: 26,
    padding: 9,
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
  frame: { position: 'absolute', top: 73, bottom: 87, left: 57, right: 57 },
  corner: { position: 'absolute', width: 26, height: 26, borderColor: 'rgba(255,255,255,0.85)' },
  sticker: {
    position: 'absolute',
    right: 31,
    top: 88,
    backgroundColor: '#FBFAF3',
    paddingVertical: 12,
    paddingHorizontal: 17,
    borderRadius: 18,
    transform: [{ rotate: '7deg' }],
    boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
  },
  previewBottom: { position: 'absolute', bottom: 22, left: 24 },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 17,
  },
  controlButton: { backgroundColor: '#F4F1F8', width: 46, height: 46 },
  shutterOuter: {
    width: 70,
    height: 70,
    padding: 5,
    borderRadius: 35,
    borderWidth: 1.5,
    borderColor: c.purple,
  },
  shutterInner: {
    flex: 1,
    backgroundColor: c.purple,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 13,
    paddingTop: 6,
    paddingHorizontal: 6,
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
  tipCard: {
    backgroundColor: '#EBE4F7',
    borderRadius: 21,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  howCard: {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 21,
    padding: 20,
    backgroundColor: '#FDFCFA',
  },
  stepIcon: {
    width: 31,
    height: 31,
    borderRadius: 11,
    backgroundColor: '#EEE8F7',
    justifyContent: 'center',
    alignItems: 'center',
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
