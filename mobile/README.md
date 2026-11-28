# FitLens Mobile App

Mobile client for FitLens. **Stack: React Native 0.88 + TypeScript, Android only** (decided 2026-11-14). iOS is out of scope.

Status: React Native CLI project on the shared data layer from `docs/design/DATA_CONTRACT.md`.

- **Tu:** Rhythm, Reminders, Check-in.
- **Hải:** Workouts (list, detail with editing: rename, sets/reps, reorder, add/remove exercises; editing a routine makes your own copy) and Plan (build a week from a few answers, add/remove/mark-done sessions, change day and 24-hour time, copy a week). Built on the same pure-JS models as the browser prototype. Not done yet: drag-and-drop, adapting a workout to time/equipment.
- Still placeholders: Onboarding (plan preferences) and Insights. See `docs/PROJECT_STATE.md` for the rest.

Every push to `main` builds an installable APK in CI (see "Get an APK without Android Studio"). Tu has run the reminders on an emulator; the rest is covered by Jest tests that render the screens. Nobody has recorded a full run on a phone yet.

## Get an APK without Android Studio

The `Android APK` workflow (`.github/workflows/android-apk.yml`) type-checks, runs the tests and builds a release APK on GitHub's servers. It takes about 6 minutes.

1. On GitHub open **Actions → Android APK** and pick the latest green run on `main` (or on your pull request).
2. Under **Artifacts** download `fitlens-release-apk` (a zip, kept for 14 days) and unzip it.
3. Install the `.apk` inside:
   - Phone: copy it over and open it (allow "install unknown apps"), or `adb install <file>.apk` with USB debugging on.
   - Emulator: `adb install <file>.apk`, but build it for the emulator first (next step).

The default build is `arm64-v8a`, which runs on real phones only. For an emulator, open **Actions → Android APK → Run workflow** and set `architectures` to `x86_64` (or `arm64-v8a,x86_64` for both).

The APK is signed with the committed debug keystore and bundles the JavaScript, so it needs no Metro server. It is for testing and demos, not the Play Store.

## Requirements (to build and run locally)

- Node.js >= 22.11
- JDK 17 (JDK 22 is too new for the Android Gradle build; install 17 and point `JAVA_HOME` at it)
- Android Studio with Android SDK, and `ANDROID_HOME` set to the SDK folder
- An Android emulator or a phone with USB debugging

Guide: https://reactnative.dev/docs/set-up-your-environment (choose Android).

## Run

```bash
cd mobile
npm install
npm start          # Metro dev server
npm run android    # in a second terminal, with emulator/phone connected
```

Other scripts: `npm test` (jest: domain + contract tests), `npm run lint`, `npx tsc --noEmit`.

Sample data loads on first start (contract §8). The temporary `Home` screen has "Reset sample data".

## Code layout

```
App.tsx                  # NavigationContainer + stack; hydrates storage, seeds sample data
src/
├── navigation.ts        # typed navigation helpers (React Navigation native stack)
├── screens/             # Thin screens: call module functions only
│   ├── dev-hub.tsx      # 'Home' — TEMPORARY until Home + dock (Đỗ Huy)
│   ├── rhythm.tsx       # Tu
│   ├── reminders.tsx    # Tu
│   ├── check-in.tsx     # Tu  (route 'CheckIn', param { history })
├── shared/              # Contract §1, 2, 4, 8, 12 — everyone imports, nobody re-types
│   ├── constants.ts     # enums: Region, ExerciseFeedback, SessionStatus, …
│   ├── dates.ts         # YYYY-MM-DD, HH:mm, weekStartOf (Monday)
│   ├── ids.ts           # <prefix>-<random>
│   ├── storage.ts       # fitlens.<entity> = { v, data }; sync read/write over a hydrated cache;
│   │                    #   localStorageView = the same cache shaped like localStorage (for ../prototype models)
│   ├── storage-native.ts# AsyncStorage persistence
│   ├── routes.ts        # route names + param list
│   └── seed.ts          # calls each owner's seed
├── modules/             # One folder per owner. Pure TS, unit-tested, no React.
│   ├── rhythm/          # Tu: getRhythm, setWeeklyGoal, pauseRhythm, resumeRhythm
│   ├── checkin/         # Tu: Review shape, 1–10 feedback scale, submitCheckIn, load adjust
│   ├── reminders/       # Tu: getReminder, setReminder, notifications.ts
│   ├── history/         # Đức Huy  ⚠️ placeholder
│   ├── workouts/        # Hải: store.ts binds ../prototype models (workout, schedule, draft, exercises)
│   │                    #   to shared storage; schedule.ts/exercises.ts = contract functions
│   ├── profile/         # Thông    ⚠️ placeholder
│   └── mascot/          # Đỗ Huy   ⚠️ placeholder
└── ui/                  # theme, shared components (components.tsx; parts.tsx for Hải's screens), mascot faces, useStore()
```

Rules (from the contract):
- Each key has one owner who writes it. Everyone else calls the owner's functions.
- Contract functions are **synchronous**. Storage hydrates once at start-up, then `read`/`write` are sync and saving to the device happens in the background.
- Missing or broken data never crashes a screen; readers return defaults.
- Hải's logic lives in `../prototype` (`workout-model.js`, `schedule-model.js`, `draft-model.js`, `shared/*`) so the browser prototype and the app share it; `metro.config.js` lets Metro read that folder.
- The placeholder modules implement the contract signatures so Tu's screens work. Each owner replaces their own folder and keeps the signatures; `contract.test.ts` catches signature drift.

## Native libraries

- `@react-navigation/native` + `native-stack` with `react-native-screens`. Android setup is done in `MainActivity.kt` (`RNScreensFragmentFactory`) and `AndroidManifest.xml` (`enableOnBackInvokedCallback="false"`), per React Navigation docs.
- `react-native-svg` (mascot faces), `@react-native-async-storage/async-storage` 2.2.
- **Notifications: `react-native-notify-kit` 10.10.1** (maintained Notifee fork, chosen 2026-11-20 by Tu). Adapter: `src/modules/reminders/notifykit-scheduler.ts`, plugged in at start-up in `App.tsx` with `setNotificationScheduler()`. Without a scheduler, `notifications.ts` falls back to *preview* mode.
  - Why this one: works in a bare RN CLI app with no Expo modules, built for the New Architecture (`newArchEnabled=true`), actively released. Risk: one maintainer; the API is Notifee's, so switching later only touches the adapter.
  - Not chosen: `expo-notifications` (adds Expo modules to the CLI app), `@notifee/react-native` (archived, last release Dec 2024).
  - Reminders use an inexact `SET_AND_ALLOW_WHILE_IDLE` alarm: may be a few minutes late, but needs no `SCHEDULE_EXACT_ALARM` permission (denied by default on Android 14+). The library's manifest adds `POST_NOTIFICATIONS` and `RECEIVE_BOOT_COMPLETED`.
  - Jest uses the library's own mock (`jest.setup.js`).

## Architecture Highlights
- **On-Device Vision:** Pose estimation (MediaPipe) runs locally on the phone's RAM. On React Native this needs a native Android module or a camera frame-processor plugin; approach not chosen yet.
- **Local Storage:** SQLite for offline workout caching and streak tracking.
- **Privacy:** Zero video retention; only joint angles and rep statistics are transmitted.
