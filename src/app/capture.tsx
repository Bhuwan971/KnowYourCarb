import React, { useCallback, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Barcode, Camera, Images, SwitchCamera, X, Zap, ZapOff } from 'lucide-react-native';
import { usePhotoActions } from '../components/usePhotoActions';
import { Button, IconButton, Type } from '../components/ui';
import { Mascot } from '../components/Mascot';
import { useApp } from '../state/AppProvider';
import { colors as c, fonts as f } from '../lib/theme';
import { analysisUrl, lookupBarcode } from '../lib/analysis';
import { itemFromProduct, newMeal } from '../lib/model';
import { PressableScale } from '../components/PressableScale';
export default function CaptureScreen() {
  const [permission, request] = useCameraPermissions();
  const ref = useRef<CameraView>(null);
  const [focused, setFocused] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState(false);
  const [ready, setReady] = useState(false);
  const [taking, setTaking] = useState(false);
  const { busy, pick, accept } = usePhotoActions();
  const { notify, tap, setDraft, settings } = useApp();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'photo' | 'barcode'>(
    params.mode === 'barcode' ? 'barcode' : 'photo',
  );
  const [lookingUp, setLookingUp] = useState<string | null>(null);
  const [typedCode, setTypedCode] = useState('');
  // Scanners fire many times a second; only the first read of a code counts.
  const lastCode = useRef<{ code: string; at: number } | null>(null);
  const lookup = async (code: string) => {
    if (lookingUp) return;
    setLookingUp(code);
    if (settings.haptics && Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {});
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const product = await lookupBarcode(code, controller.signal);
      const meal = newMeal();
      const item = itemFromProduct(product);
      setDraft({ ...meal, title: item.name, items: [item], source: 'label' });
      router.replace('/review');
    } catch (e) {
      notify(
        controller.signal.aborted
          ? 'That lookup took too long. Try again or snap the label.'
          : e instanceof Error
            ? e.message
            : 'Couldn’t look up that barcode.',
      );
      setTimeout(() => setLookingUp(null), 1200);
    } finally {
      clearTimeout(timer);
    }
  };
  const scanned = ({ data }: BarcodeScanningResult) => {
    const code = data.replace(/\D/g, '');
    const now = Date.now();
    if (!/^\d{8,14}$/.test(code) || lookingUp) return;
    if (lastCode.current?.code === code && now - lastCode.current.at < 4000) return;
    lastCode.current = { code, at: now };
    void lookup(code);
  };
  const barcode = mode === 'barcode';
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
              barcodeScannerSettings={
                barcode ? { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] } : undefined
              }
              onBarcodeScanned={barcode && !lookingUp ? scanned : undefined}
              onCameraReady={() => setReady(true)}
              onMountError={() => {
                setReady(false);
                notify('The camera is unavailable. Import a photo to keep going.');
              }}
            />
            <View pointerEvents="none" style={barcode ? s.barcodeFrame : s.frame}>
              {barcode ? (
                <View style={[s.laser, lookingUp ? { backgroundColor: c.lime } : null]} />
              ) : (
                <>
                  <View style={s.crossH} />
                  <View style={s.crossV} />
                </>
              )}
            </View>
            <View style={s.hint}>
              <Type style={{ color: c.white, fontSize: 12, textAlign: 'center' }}>
                {lookingUp
                  ? `Looking up ${lookingUp}…`
                  : barcode
                    ? 'Line up the barcode on the package.'
                    : 'Center your plate. Natural light helps.'}
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
      {analysisUrl && (
        <View style={s.modes} accessibilityRole="tablist">
          {(
            [
              ['photo', 'Photo', Camera],
              ['barcode', 'Barcode', Barcode],
            ] as const
          ).map(([key, label, Icon]) => (
            <PressableScale
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === key }}
              accessibilityLabel={`${label} mode`}
              onPress={() => {
                tap();
                setMode(key);
              }}
              style={[s.mode, mode === key && s.modeActive]}
            >
              <Icon size={15} color={mode === key ? c.ink : '#BCB4CA'} />
              <Type
                style={{
                  fontSize: 13,
                  fontFamily: f.bold,
                  color: mode === key ? c.ink : '#BCB4CA',
                }}
              >
                {label}
              </Type>
            </PressableScale>
          ))}
        </View>
      )}
      {barcode ? (
        <View style={s.typed}>
          <TextInput
            accessibilityLabel="Type a barcode"
            placeholder="Or type the barcode digits"
            placeholderTextColor="#8E86A0"
            keyboardType="number-pad"
            value={typedCode}
            onChangeText={(value) => setTypedCode(value.replace(/\D/g, '').slice(0, 14))}
            onSubmitEditing={() => typedCode.length >= 8 && void lookup(typedCode)}
            style={s.typedInput}
          />
          <Button
            label="Look up"
            onPress={() => void lookup(typedCode)}
            disabled={typedCode.length < 8 || !!lookingUp}
            busy={!!lookingUp}
          />
        </View>
      ) : (
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
      )}
      <Type
        kind="small"
        style={{ textAlign: 'center', color: '#BCB4CA', paddingBottom: 12, paddingHorizontal: 18 }}
      >
        {barcode
          ? 'Product data from USDA Branded Foods and Open Food Facts.'
          : analysisUrl
            ? 'Snap. Auto-scan. Quick check. Save.'
            : 'Snap. Review. Save a little moment.'}
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
  barcodeFrame: {
    position: 'absolute',
    top: '34%',
    left: '10%',
    right: '10%',
    height: '24%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    justifyContent: 'center',
  },
  laser: { height: 2, marginHorizontal: 14, backgroundColor: '#FF8FA3', borderRadius: 1 },
  modes: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 4,
    padding: 4,
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: '#2D2639',
  },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    minHeight: 40,
  },
  modeActive: { backgroundColor: c.lime },
  typed: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  typedInput: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#393143',
    color: c.white,
    fontFamily: f.medium,
    fontSize: 15,
  },
});
