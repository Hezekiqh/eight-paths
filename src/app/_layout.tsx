import { DotGothic16_400Regular } from '@expo-google-fonts/dotgothic16';
import { IMFellEnglish_400Regular, IMFellEnglish_400Regular_Italic } from '@expo-google-fonts/im-fell-english';
import { Jersey10_400Regular, useFonts } from '@expo-google-fonts/jersey-10';
import { MedievalSharp_400Regular } from '@expo-google-fonts/medievalsharp';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ErrorScreen } from '@/components/error-screen';
import { Intro } from '@/components/intro';
import { useGameStore } from '@/store';
import { useHydrated } from '@/store/hooks';
import { useSession } from '@/store/session';
import { colors, theme } from '@/theme';

SplashScreen.preventAutoHideAsync();

/** Any screen that throws shows this instead of a blank screen. */
export { ErrorScreen as ErrorBoundary };

const navTheme = {
  ...(theme.dark ? DarkTheme : DefaultTheme),
  colors: {
    ...(theme.dark ? DarkTheme : DefaultTheme).colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

/** A bottom sheet sized to its content, for lore about a class or companion. */
const sheetOptions = {
  presentation: 'formSheet',
  sheetAllowedDetents: 'fitToContents',
  sheetGrabberVisible: true,
  sheetCornerRadius: 24,
  contentStyle: { backgroundColor: colors.card },
} as const;

export default function RootLayout() {
  const hydrated = useHydrated();
  const onboarded = useGameStore((s) => s.player !== null);
  // If the font fails to load, carry on with the system font rather than a blank screen.
  const [fontsLoaded, fontError] = useFonts({
    DotGothic16_400Regular,
    Jersey10_400Regular,
    IMFellEnglish_400Regular,
    IMFellEnglish_400Regular_Italic,
    MedievalSharp_400Regular,
  });
  const ready = hydrated && (fontsLoaded || fontError !== null);
  // The story intro plays over everything each time the app starts.
  const introDone = useSession((s) => s.introDone);
  const finishIntro = useSession((s) => s.finishIntro);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // The app is upright, whichever way the phone was held when it opened (the intro played sideways
  // otherwise); only the World's game and its quest board turn sideways, and they lock that themselves.
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navTheme}>
        <StatusBar style={theme.dark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="quest-editor" options={{ presentation: 'modal' }} />
            <Stack.Screen name="all-quests" options={{ presentation: 'modal' }} />
            <Stack.Screen name="reorder-quests" options={{ presentation: 'modal' }} />
            <Stack.Screen name="change-class" options={{ presentation: 'modal' }} />
            <Stack.Screen name="goal-editor" options={{ presentation: 'modal' }} />
            <Stack.Screen name="quest-board" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            <Stack.Screen name="social" options={{ presentation: 'modal' }} />
            <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
            <Stack.Screen name="drop-odds" options={{ presentation: 'modal' }} />
            <Stack.Screen name="keeper-stats" options={{ presentation: 'modal' }} />
            <Stack.Screen
              name="keeper-call"
              options={{ presentation: 'transparentModal', animation: 'fade', gestureEnabled: false }}
            />
            <Stack.Screen name="friend/[code]" options={{ animation: 'none' }} />
            <Stack.Screen name="auth-callback" options={{ animation: 'none' }} />
          </Stack.Protected>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          <Stack.Screen name="backup" options={{ presentation: 'modal' }} />
          <Stack.Screen name="class/[dimension]" options={sheetOptions} />
          <Stack.Screen name="stat/[dimension]" options={sheetOptions} />
          <Stack.Screen name="companion/[id]" options={sheetOptions} />
          <Stack.Screen
            name="reveal/[id]"
            options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }}
          />
        </Stack>
        {!introDone && <Intro onDone={finishIntro} />}
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
