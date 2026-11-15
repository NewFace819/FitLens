# FitLens Mobile App

Mobile client for FitLens. **Stack: React Native 0.88 + TypeScript, Android only** (decided 2026-11-14). iOS is out of scope.

Status: **Workouts** (list, workout detail with editing) and **Plan** screens: create/rename/delete a workout, change sets and reps, reorder, add and remove exercises (editing a routine makes your own copy); build a week from a few answers, add/remove/mark-done sessions, change a session's day and 24-hour time, copy a week, built on the same pure-JS models as the browser prototype. Not yet run on a device or emulator (this machine has no Android SDK); covered by Jest tests that render the screens. See `docs/PROJECT_STATE.md`.

## How it is organised

- `App.tsx`: loads saved data, then shows the two tabs.
- `src/core/`: `appStore.ts` builds the store from the shared models in `../prototype` (`workout-model.js`, `schedule-model.js`, `draft-model.js`, `shared/*`; one source of truth for logic, Metro is told to read that folder in `metro.config.js`). `persistentStorage.ts` keeps a synchronous in-memory copy (the models expect `localStorage`-style calls) and writes through to AsyncStorage.
- `src/screens/`, `src/ui/`: the screens and small shared components.
- `__tests__/`, `test-utils/`: Jest tests and a fake storage backend.

Not done yet: drag-and-drop, adapting a workout to time/equipment, profile, history, reminders.

## Requirements

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

Other scripts: `npm test` (18 tests, no emulator needed), `npm run lint`, `npx tsc --noEmit`.

## Architecture Highlights
- **On-Device Vision:** Pose estimation (MediaPipe) runs locally on the phone's RAM. On React Native this needs a native Android module or a camera frame-processor plugin; approach not chosen yet.
- **Local Storage:** SQLite for offline workout caching and streak tracking.
- **Privacy:** Zero video retention; only joint angles and rep statistics are transmitted.
