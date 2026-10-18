import React, { useCallback, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Barcode, Camera, Images, SwitchCamera, X, Zap, ZapOff } from 'lucide-react-native';
import { usePhotoActions } from '../components/usePhotoActions';
import { Button, IconButton, Segmented, Type } from '../components/ui';
import { useApp } from '../state/AppProvider';
import { colors as c, fonts as f, radius } from '../lib/theme';
import { analysisUrl, lookupBarcode } from '../lib/analysis';
import { itemFromProduct, newMeal } from '../lib/model';

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
        <IconButton label="Close camera" icon={X} onPress={close} variant="dark" />
        <Type style={s.title}>{barcode ? 'Scan a barcode' : 'Snap a meal'}</Type>
        <IconButton
          label={torch ? 'Turn flash off' : 'Turn flash on'}
          icon={torch ? ZapOff : Zap}
          onPress={() => setTorch(!torch)}
          variant="dark"
          color={torch ? c.lime : c.white}
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
            <LinearGradient
              pointerEvents="none"
              colors={[
                'rgba(10,8,20,0.35)',
                'rgba(10,8,20,0)',
                'rgba(10,8,20,0)',
                'rgba(10,8,20,0.6)',
              ]}
              locations={[0, 0.25, 0.7, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={barcode ? s.barcodeFrame : s.frame}>
              {barcode ? (
                <View style={[s.laser, lookingUp ? { backgroundColor: c.lime } : null]} />
              ) : (
                (['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
                  <View
                    key={corner}
                    style={[
                      s.corner,
                      corner === 'tl' && {
                        left: 0,
                        top: 0,
                        borderTopWidth: 3,
                        borderLeftWidth: 3,
                        borderTopLeftRadius: 20,
                      },
                      corner === 'tr' && {
                        right: 0,
                        top: 0,
                        borderTopWidth: 3,
                        borderRightWidth: 3,
                        borderTopRightRadius: 20,
                      },
                      corner === 'bl' && {
                        left: 0,
                        bottom: 0,
                        borderBottomWidth: 3,
                        borderLeftWidth: 3,
                        borderBottomLeftRadius: 20,
                      },
                      corner === 'br' && {
                        right: 0,
                        bottom: 0,
                        borderBottomWidth: 3,
                        borderRightWidth: 3,
                        borderBottomRightRadius: 20,
                      },
                    ]}
                  />
                ))
              )}
            </View>
            <View style={s.hint}>
              <Type
                style={{ color: c.white, fontSize: 13, fontFamily: f.medium, textAlign: 'center' }}
              >
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
            <Camera size={40} color={c.white} strokeWidth={1.3} />
            <Type kind="title" style={{ color: c.white, textAlign: 'center', marginTop: 22 }}>
              Add a meal photo
            </Type>
            <Type
              style={{
                color: 'rgba(255,255,255,0.65)',
                textAlign: 'center',
                maxWidth: 280,
                marginTop: 12,
              }}
            >
              Allow camera access to photograph your meal.
            </Type>
            <Button
              label={
                permission?.canAskAgain === false ? 'Open camera settings' : 'Let’s open the camera'
              }
              icon={Camera}
              variant="primary"
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
              style={{ marginTop: 24 }}
            />
            <Type
              kind="caption"
              style={{ marginTop: 16, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}
            >
              {analysisUrl
                ? 'Snaps automatically scan with the AI service. Review and edit the results.'
                : 'Your photos stay on this device. Photo estimates aren’t connected yet.'}
            </Type>
          </View>
        )}
      </View>
      {analysisUrl && (
        <View style={{ marginTop: 16 }}>
          <Segmented
            label="Capture mode"
            dark
            value={mode}
            onChange={(key) => {
              tap();
              setMode(key);
            }}
            options={[
              { key: 'photo', label: 'Photo', icon: Camera },
              { key: 'barcode', label: 'Barcode', icon: Barcode },
            ]}
          />
        </View>
      )}
      {barcode ? (
        <View style={s.typed}>
          <TextInput
            accessibilityLabel="Type a barcode"
            placeholder="Or type the barcode digits"
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="number-pad"
            value={typedCode}
            onChangeText={(value) => setTypedCode(value.replace(/\D/g, '').slice(0, 14))}
            onSubmitEditing={() => typedCode.length >= 8 && void lookup(typedCode)}
            style={s.typedInput}
          />
          <Button
            label="Look up"
            variant="primary"
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
            variant="dark"
            size={52}
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
            variant="dark"
            size={52}
          />
        </View>
      )}
      <Type
        kind="caption"
        style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.45)',
          paddingBottom: 12,
          paddingHorizontal: 18,
        }}
      >
        {barcode
          ? 'Product data from USDA Branded Foods and Open Food Facts.'
          : analysisUrl
            ? 'Snap · auto-scan · quick check · save'
            : 'Snap · review · save a little moment'}
      </Type>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: c.night },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: { color: c.white, fontFamily: f.displayBold, fontSize: 19, letterSpacing: -0.4 },
  camera: {
    flex: 1,
    marginHorizontal: 12,
    borderRadius: radius.xl,
    overflow: 'hidden',
    minHeight: 250,
    maxWidth: 900,
    width: '94%',
    alignSelf: 'center',
    backgroundColor: c.nightSoft,
  },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  frame: { position: 'absolute', top: '14%', left: '9%', right: '9%', bottom: '16%' },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: 'rgba(255,255,255,0.92)' },
  hint: {
    position: 'absolute',
    bottom: 22,
    alignSelf: 'center',
    backgroundColor: 'rgba(10,8,20,0.55)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 52,
    paddingVertical: 18,
  },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: radius.lg,
    justifyContent: 'center',
  },
  laser: { height: 2, marginHorizontal: 14, backgroundColor: '#FF7A94', borderRadius: 1 },
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
    height: 50,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: c.white,
    fontFamily: f.medium,
    fontSize: 15,
  },
});
