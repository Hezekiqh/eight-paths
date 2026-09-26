# Eight Paths

An iOS habit tracker dressed as an RPG. Every habit is a recurring quest for one of eight classes (Warrior, Noble, Mage, Cleric, Monk, Bard, Artificer, Ranger), each tied to a wellness dimension, and a daily radar chart shows how your party is growing. See [SPEC.md](SPEC.md) for the full spec.

Fully local: Expo + TypeScript, Zustand persisted to AsyncStorage. No backend, no accounts, no entitlements.

## Run it

```bash
npm install
npx expo start        # press i for the iOS simulator, or scan the QR code with Expo Go
```

## Checks

```bash
npm test              # game rules, store and radar geometry (Jest)
npx tsc --noEmit
npx expo lint
```

## Where things live

| Path | What |
| --- | --- |
| `src/game/` | Pure game rules: XP, levels, streaks, rest tokens, dimming, radar windows, reminder planning. Unit tested in `__tests__/`. |
| `src/store/` | Zustand store (`index.ts`), derived views (`selectors.ts`) and the hooks screens read from (`hooks.ts`). |
| `src/app/` | Expo Router screens: onboarding, the three tabs, quest editor, change class, class sheet. |
| `src/components/` | UI pieces, including the hand-rolled SVG radar in `radar/`. |
| `src/notifications/` | Schedules the evening nudge two weeks ahead, skipping days you've already played. |
| `plugins/` | Config plugin that strips the push entitlement `expo-notifications` adds (local notifications don't need it). |

## Ship to TestFlight

One-time setup (needs an Apple Developer account):

```bash
npx eas-cli@latest login
npx eas-cli@latest init          # links the project and writes its EAS project ID into app.json
```

Then, each release:

```bash
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --latest
```

The first build walks you through creating signing credentials and the App Store Connect app record. Build numbers are managed remotely and bump automatically. Export compliance is pre-answered (`usesNonExemptEncryption: false`).

To try a build on the simulator without Apple credentials: `npx eas-cli@latest build --platform ios --profile simulator`.

The bundle ID is `com.hezekiahhopkins.eightpaths`; change `ios.bundleIdentifier` in `app.json` before the first build if you want a different one.
