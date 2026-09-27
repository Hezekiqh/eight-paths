import { DotGothic16_400Regular } from '@expo-google-fonts/dotgothic16';
import { Jersey10_400Regular, useFonts } from '@expo-google-fonts/jersey-10';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ErrorScreen } from '@/components/error-screen';
import { useGameStore } from '@/store';
import { useHydrated } from '@/store/hooks';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

/** Any screen that throws shows this instead of a blank screen. */
export { ErrorScreen as ErrorBoundary };

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    primary: colors.grid,
  },
};

export default function RootLayout() {
  const hydrated = useHydrated();
  const onboarded = useGameStore((s) => s.player !== null);
  // If the font fails to load, carry on with the system font rather than a blank screen.
  const [fontsLoaded, fontError] = useFonts({ DotGothic16_400Regular, Jersey10_400Regular });
  const ready = hydrated && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="quest-editor" options={{ presentation: 'modal' }} />
            <Stack.Screen name="change-class" options={{ presentation: 'modal' }} />
          </Stack.Protected>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          <Stack.Screen name="backup" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="class/[dimension]"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: 'fitToContents',
              sheetGrabberVisible: true,
              sheetCornerRadius: 24,
              contentStyle: { backgroundColor: colors.card },
            }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
