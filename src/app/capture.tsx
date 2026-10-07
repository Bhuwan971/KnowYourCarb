import React, { useCallback, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Camera, Images, SwitchCamera, X, Zap, ZapOff } from 'lucide-react-native';
import { usePhotoActions } from '../components/usePhotoActions';
import { Button, IconButton, Type } from '../components/ui';
import { Mascot } from '../components/Mascot';
import { useApp } from '../state/AppProvider';
import { colors as c, fonts as f } from '../lib/theme';
import { analysisUrl } from '../lib/analysis';
export default function CaptureScreen() {
  const [permission, request] = useCameraPermissions();
  const ref = useRef<CameraView>(null);
  const [focused, setFocused] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState(false);
  const [ready, setReady] = useState(false);
  const [taking, setTaking] = useState(false);
  const { busy, pick, accept } = usePhotoActions();
  const { notify, tap } = useApp();
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        setReady(false);
      };
    }, []),
  );
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const snap = async () => {
    if (!ready || taking || busy) return;
    setTaking(true);
    tap();
    try {
      const image = await ref.current?.takePictureAsync({ quality: 0.85 });
      if (image) await accept(image.uri);
    } catch {
      notify('Couldn’t take this photo. Try again or import one.');
    } finally {
      setTaking(false);
    }
  };
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <View style={s.top}>
        <IconButton
          label="Close camera"
          icon={X}
          onPress={close}
          color={c.white}
          style={s.darkButton}
        />
        <Type style={{ color: c.white, fontFamily: f.displayBold, fontSize: 21 }}>
          a little snap.
        </Type>
        <IconButton
          label={torch ? 'Turn flash off' : 'Turn flash on'}
          icon={torch ? ZapOff : Zap}
          onPress={() => setTorch(!torch)}
          color={c.white}
          style={s.darkButton}
          disabled={!permission?.granted || Platform.OS === 'web'}
        />
      </View>
      <View style={s.camera}>
        {permission?.granted && focused ? (
          <>
            <CameraView
              ref={ref}
              style={StyleSheet.absoluteFill}
              facing={facing}
              enableTorch={torch}
              onCameraReady={() => setReady(true)}
              onMountError={() => {
                setReady(false);
                notify('The camera is unavailable. Import a photo to keep going.');
              }}
            />
            <View pointerEvents="none" style={s.frame}>
              <View style={s.crossH} />
              <View style={s.crossV} />
            </View>
            <View style={s.hint}>
              <Type style={{ color: c.white, fontSize: 12 }}>
                Center your plate. Natural light helps.
              </Type>
            </View>
          </>
        ) : (
          <View style={s.permission}>
            <Mascot size={110} />
            <Type kind="title" style={{ color: c.white, textAlign: 'center', marginTop: 20 }}>
              Your food, in focus.
            </Type>
            <Type style={{ color: '#BCB4CA', textAlign: 'center', maxWidth: 280, marginTop: 13 }}>
              Let Carbsy use your camera to turn your next bite into a little memory.
            </Type>
            <Button
              label={
                permission?.canAskAgain === false ? 'Open camera settings' : 'Let’s open the camera'
              }
              icon={Camera}
              onPress={() => {
                if (permission?.canAskAgain === false) {
                  if (Platform.OS === 'web')
                    notify('Allow camera access in your browser’s site settings, then reload.');
                  else void Linking.openSettings();
                } else
                  void request().catch(() =>
                    notify('Camera permission couldn’t be requested. Try importing a photo.'),
                  );
              }}
              style={{ marginTop: 23 }}
            />
            <Type kind="small" style={{ marginTop: 16, color: '#AAA1BA' }}>
              {analysisUrl
                ? 'Snaps automatically scan with the AI service. Review and edit the results.'
                : 'Your photos stay on this device. Photo estimates aren’t connected yet.'}
            </Type>
          </View>
        )}
      </View>
      <View style={s.controls}>
        <IconButton
          label="Import a food photo"
          icon={Images}
          onPress={() => void pick()}
          disabled={busy || taking}
          style={s.darkButton}
          color={c.white}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          accessibilityState={{ disabled: !ready || busy || taking }}
          disabled={!ready || busy || taking}
          onPress={() => void snap()}
          style={({ pressed }) => [
            s.shutter,
            (!ready || busy || taking) && { opacity: 0.4 },
            pressed && { transform: [{ scale: 0.93 }] },
          ]}
        >
          <View style={s.shutterInside} />
        </Pressable>
        <IconButton
          label="Flip camera"
          icon={SwitchCamera}
          onPress={() => {
            setReady(false);
            setFacing(facing === 'back' ? 'front' : 'back');
          }}
          disabled={!permission?.granted || taking || busy}
          style={s.darkButton}
          color={c.white}
        />
      </View>
      <Type
        kind="small"
        style={{ textAlign: 'center', color: '#BCB4CA', paddingBottom: 12, paddingHorizontal: 18 }}
      >
        {analysisUrl ? 'Snap. Auto-scan. Edit & save.' : 'Snap. Review. Save a little moment.'}
      </Type>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#201B2C' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  darkButton: { backgroundColor: '#393143' },
  camera: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 24,
    overflow: 'hidden',
    minHeight: 250,
    maxWidth: 900,
    width: '97%',
    alignSelf: 'center',
  },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  frame: {
    position: 'absolute',
    top: '15%',
    left: '8%',
    right: '8%',
    bottom: '15%',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossH: { width: 24, height: 1, backgroundColor: 'rgba(255,255,255,0.6)', position: 'absolute' },
  crossV: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.6)', position: 'absolute' },
  hint: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    backgroundColor: 'rgba(30,23,40,0.65)',
    padding: 12,
    borderRadius: 20,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 55,
    paddingVertical: 16,
  },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: c.white,
    padding: 5,
  },
  shutterInside: { flex: 1, backgroundColor: c.white, borderRadius: 35 },
});
