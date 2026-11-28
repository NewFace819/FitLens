# FitLens Mobile App

Mobile client for FitLens. **Stack: React Native 0.88 + TypeScript, Android only** (decided 2026-11-14). iOS is out of scope.

Status: React Native CLI project on the shared data layer from `docs/design/DATA_CONTRACT.md`.

- **Tu:** Rhythm, Reminders, Check-in.
- **Hải:** Workouts (list, detail with editing: rename, sets/reps, reorder, add/remove exercises; editing a routine makes your own copy) and Plan (build a week from a few answers, add/remove/mark-done sessions, change day and 24-hour time, copy a week). Built on the same pure-JS models as the browser prototype. Not done yet: drag-and-drop, adapting a workout to time/equipment.
- History, Profile, Mascot are placeholders.

Covered by Jest tests that render the screens. Not yet confirmed on a device or emulator by hand; see `docs/PROJECT_STATE.md`.

### Try the app without installing the Android SDK

GitHub builds an installable release APK (workflow *Android APK*, `.github/workflows/android-apk.yml`; it runs on pull requests that touch `mobile/` or `prototype/`, and on pushes to `main`).

1. On GitHub open the repo, then *Actions*, then the latest successful *Android APK* run (or the *Checks* tab of a pull request).
2. Under *Artifacts* download `fitlens-release-apk` and unzip it to get the `.apk`.
3. Copy it to an Android phone (Android 7 or newer) and open it. Android asks to allow installing from this source; allow it for the app you used to open the file.

It is built for real phones (`arm64-v8a`) and signed with the debug key, so it is for testing and demos only. For the emulator run the workflow by hand (*Run workflow*) with architectures `x86_64`. To change code and see it live you still need the full setup below.

## Requirements

- Node.js >= 22.11
- JDK 17 (JDK 22 is too new for the Android Gradle build; install 17 and point `JAVA_HOME` at it)
- Android Studio with Android SDK, and `ANDROID_HOME` set to the SDK folder
- An Android emulator or a phone with USB debugging

Guide: https://reactnative.dev/docs/set-up-your-environment (choose Android).

### Windows setup, step by step

What the build needs (from `android/build.gradle`): compile SDK **37**, build-tools **37.0.0**, NDK **27.1.12297006**. Gradle 9.4.1 downloads itself on the first build.

1. **Node.js 22 LTS** from nodejs.org. Check: `node -v` shows v22.11 or newer.
2. **JDK 17**: install *Microsoft Build of OpenJDK 17* or *Eclipse Temurin 17* (MSI). Then set the user variable `JAVA_HOME` to its folder, e.g. `C:\Program Files\Microsoft\jdk-17.x.x-hotspot`. Check in a new terminal: `java -version` shows 17.
3. **Android Studio** (latest). On first start choose *Standard* setup. Then *More Actions → SDK Manager*:
   - *SDK Platforms*: tick **Android 17 (API 37)** (needed to compile) and one image to run, e.g. **Android 16 (API 36)** with *Google APIs x86_64 system image* (tick *Show Package Details*).
   - *SDK Tools* (tick *Show Package Details*): **Android SDK Build-Tools 37.0.0**, **NDK (Side by side) 27.1.12297006**, **Android SDK Platform-Tools**, **Android Emulator**.
4. **Environment variables** (Start → "Edit environment variables for your account"):
   - `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`
   - Add to `Path`: `%LOCALAPPDATA%\Android\Sdk\platform-tools`
   - Open a new terminal and check: `adb --version`.
5. **A device**: either *Device Manager → Create device* (e.g. Pixel 8, API 36 image) and start it, or a phone with *Developer options → USB debugging* on. `adb devices` must list it.
6. **Run** (two terminals, in `mobile/`): `npm ci` once, then `npm start` and `npm run android`. The first build takes 10–20 minutes.

If it fails:
- *Unsupported class file major version* / Gradle errors about Java → `JAVA_HOME` is not JDK 17. Fix it and run `cd android && gradlew --stop`.
- *SDK location not found* → `ANDROID_HOME` is missing, or create `android/local.properties` with `sdk.dir=C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk` (this file is not committed).
- *Failed to install the app / no devices* → start the emulator first and check `adb devices`.
- Phone shows a red "Unable to load script" screen → run `adb reverse tcp:8081 tcp:8081` and reload, and make sure `npm start` is running.
- Very long path errors → keep the repo near the drive root (e.g. `C:\dev\FitLens`).

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
│   ├── dev-hub.tsx      # Home + dock (Đỗ Huy; merged in PR #10)
│   ├── rhythm.tsx       # Tu
│   ├── reminders.tsx    # Tu
│   ├── check-in.tsx     # Tu  (route 'CheckIn', param { history })
│   ├── welcome.tsx      # Thông
│   ├── WorkoutsScreen.tsx, WorkoutDetailScreen.tsx, PlanScreen.tsx  # Hải (store + callbacks as props)
│   ├── workouts-routes.tsx  # Hải: routes 'Workouts', 'WorkoutDetail', 'Plan' (navigation lives here)
│   └── placeholder.tsx + onboarding, profile, insights, workout, recap, history, camera  # stand-ins; each owner replaces their file
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
│   ├── mascot/          # Đỗ Huy: expressions and reactions
│   └── camera/          # Đỗ Huy: native pose stream + PR #15 squat counter
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
- **On-Device Vision (DO2, decided 2026-11-24):** native Android CameraX 1.4.2 + MediaPipe Pose Landmarker Lite (`tasks-vision` 0.10.35). CameraX owns permission/lifecycle/preview and a worker runs pose inference; React Native receives normalized landmarks and feeds the shared PR #15 squat counter. Chosen over a WebView to keep one Android camera lifecycle and bundle the model for offline use. No extra npm camera package or CDN is required. See [camera implementation and verification](src/modules/camera/README.md). Android emulator preview/inference and ARM64 APK build are verified; real-phone squat accuracy is still pending (#37).
- **Local Storage:** SQLite for offline workout caching and streak tracking.
- **Privacy:** Zero video retention. Camera pixels stay in RAM on the device; no camera frames, video or landmarks are uploaded. Only a confirmed rep count returns to the local Workout screen.
