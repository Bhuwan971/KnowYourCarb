import React from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useFonts } from 'expo-font';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';
import { AppProvider, useApp } from '../state/AppProvider';
import { colors as c, radius, shadow } from '../lib/theme';
import { LogoMark } from '../components/Mascot';
import { Button, Type } from '../components/ui';

function Toast() {
  const { toast } = useApp();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 110 + insets.bottom,
        left: 24,
        right: 24,
        alignItems: 'center',
      }}
    >
      <Animated.View
        entering={FadeInDown.duration(220)}
        exiting={FadeOutDown.duration(180)}
        accessibilityRole="alert"
        style={{
          backgroundColor: c.ink,
          paddingHorizontal: 20,
          paddingVertical: 13,
          borderRadius: radius.pill,
          maxWidth: 440,
          ...shadow.float,
        }}
      >
        <Type style={{ color: c.white, fontSize: 13, lineHeight: 18, textAlign: 'center' }}>
          {toast}
        </Type>
      </Animated.View>
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
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
      {children}
    </View>
  );
}

function Routes() {
  const { ready, storageError, retry } = useApp();
  if (!ready)
    return (
      <Centered>
        <LogoMark size={64} />
        <ActivityIndicator color={c.purple} />
      </Centered>
    );
  if (storageError)
    return (
      <Centered>
        <LogoMark size={64} />
        <Type style={{ textAlign: 'center', maxWidth: 320 }}>{storageError}</Type>
        <Button label="Retry opening journal" onPress={retry} />
      </Centered>
    );
  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(main)" />
        <Stack.Screen name="capture" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="describe" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="review" options={{ animation: 'fade' }} />
        <Stack.Screen name="memory/[id]" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <Toast />
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
        <Centered>
          <LogoMark size={64} />
        </Centered>
      )}
    </SafeAreaProvider>
  );
}
