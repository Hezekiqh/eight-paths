import { reloadAppAsync } from 'expo';
import { File, Paths } from 'expo-file-system';
import * as ScreenOrientation from 'expo-screen-orientation';
import type { ViewStyle } from 'react-native';

import { DEFAULT_THEME, THEMES, isThemeId, type Theme, type ThemeId } from './palettes';

export { THEMES, type ThemeId } from './palettes';

const THEME_FILE = 'theme.txt';

/**
 * The player's theme, read synchronously at startup so every StyleSheet below
 * and in the screens is built with it. Changing theme saves the choice and
 * reloads the app (see setTheme); anything unreadable falls back to Scroll.
 */
function readThemeId(): ThemeId {
  try {
    const file = new File(Paths.document, THEME_FILE);
    if (file.exists) {
      const id = file.textSync().trim();
      if (isThemeId(id)) return id;
    }
  } catch {
    // No file system (tests, web): use the default.
  }
  return DEFAULT_THEME;
}

export const THEME_ID = readThemeId();
export const theme: Theme = THEMES[THEME_ID];
export const colors = theme.colors;
/** Each class's colour for this theme. */
export const classColors = theme.classColors;

/** Resolves once the phone reports portrait, or after `timeoutMs` regardless. */
async function untilPortrait(timeoutMs = 1500): Promise<void> {
  const portrait = (o: ScreenOrientation.Orientation) =>
    o === ScreenOrientation.Orientation.PORTRAIT_UP || o === ScreenOrientation.Orientation.PORTRAIT_DOWN;
  if (portrait(await ScreenOrientation.getOrientationAsync())) return;
  await new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      sub.remove();
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    const sub = ScreenOrientation.addOrientationChangeListener((e) => {
      if (portrait(e.orientationInfo.orientation)) done();
    });
  });
}

/**
 * Saves `id` and restarts the app's code so every screen picks it up. The
 * picker lives on the sideways Objectives tab, and restarting mid-rotation
 * draws the new app at the sideways size, so it waits until the phone is
 * upright and the rotation has settled.
 */
export async function setTheme(id: ThemeId): Promise<void> {
  if (id === THEME_ID) return;
  new File(Paths.document, THEME_FILE).write(id);
  await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  await untilPortrait();
  await new Promise((resolve) => setTimeout(resolve, 350));
  await reloadAppAsync('Theme changed');
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Pixel corners: nearly square everywhere. */
export const radius = {
  sm: 0,
  md: 2,
  lg: 3,
  pill: 2,
} as const;

/**
 * Pixel faces for flavour, the system font for reading. Headings, titles and
 * numbers are Jersey 10, whose digits stay readable at every size (it runs
 * small, so its sizes are about 1.3× a system font's). Body text is SF Pro:
 * pixel fonts blur below their native size. DotGothic16 is kept for dialogue
 * boxes, only ever at 16 (its pixel grid) and never italic. The lore scroll
 * is written in old book faces: IM Fell English, headed in MedievalSharp.
 */
export const fonts = {
  regular: 'System',
  medium: 'System',
  semibold: 'Jersey10_400Regular',
  bold: 'Jersey10_400Regular',
  dialogue: 'DotGothic16_400Regular',
  ancient: 'IMFellEnglish_400Regular',
  ancientItalic: 'IMFellEnglish_400Regular_Italic',
  medieval: 'MedievalSharp_400Regular',
} as const;

/** Frame thickness for windows and buttons. */
export const FRAME = 3;

/**
 * A retro dialogue window: card fill, a thick frame and a hard, unblurred
 * drop shadow, all in the current theme's colours.
 */
export const windowStyle = {
  backgroundColor: colors.card,
  borderWidth: FRAME,
  borderColor: colors.frame,
  borderRadius: radius.lg,
  shadowColor: colors.shadow,
  shadowOpacity: 1,
  shadowRadius: 0,
  shadowOffset: { width: 4, height: 4 },
} satisfies ViewStyle;
