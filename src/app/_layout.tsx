import React from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';
import { AppProvider, useApp } from '../state/AppProvider';
import { colors as c } from '../lib/theme';
import { LogoMark } from '../components/Mascot';
import { Button, Type } from '../components/ui';
function Routes() {
  const { ready, storageError, toast, retry } = useApp();
  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        <LogoMark size={60} />
        <ActivityIndicator color={c.purple} />
      </View>
    );
  if (storageError)
    return (
      <View
        style={{
          flex: 1,
          padding: 30,
          backgroundColor: c.bg,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        <LogoMark size={60} />
        <Type>{storageError}</Type>
        <Button label="Retry opening journal" onPress={retry} />
      </View>
    );
  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(main)" />
        <Stack.Screen name="capture" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="review" options={{ animation: 'fade' }} />
        <Stack.Screen name="memory/[id]" options={{ animation: 'slide_from_right' }} />
      </Stack>
      {toast && (
        <View
          pointerEvents="none"
          accessibilityRole="alert"
          style={{ position: 'absolute', bottom: 110, left: 24, right: 24, alignItems: 'center' }}
        >
          <View
            style={{
              backgroundColor: c.ink,
              paddingHorizontal: 22,
              paddingVertical: 14,
              borderRadius: 16,
              maxWidth: 420,
            }}
          >
            <Type style={{ color: c.white, fontSize: 13 }}>{toast}</Type>
          </View>
        </View>
      )}
    </>
  );
}
export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {loaded || error ? (
        <AppProvider>
          <Routes />
        </AppProvider>
      ) : (
        <View
          style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}
        >
          <LogoMark size={64} />
        </View>
      )}
    </SafeAreaProvider>
  );
}
