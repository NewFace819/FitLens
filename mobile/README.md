# FitLens Mobile App

Mobile client for FitLens. **Stack: React Native 0.88 + TypeScript, Android only** (decided 2026-11-14). iOS is out of scope.

Status: bare skeleton from `@react-native-community/cli` (default template screen). No FitLens features yet. See `docs/PROJECT_STATE.md`.

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

Other scripts: `npm test`, `npm run lint`.

## Architecture Highlights
- **On-Device Vision:** Pose estimation (MediaPipe) runs locally on the phone's RAM. On React Native this needs a native Android module or a camera frame-processor plugin; approach not chosen yet.
- **Local Storage:** SQLite for offline workout caching and streak tracking.
- **Privacy:** Zero video retention; only joint angles and rep statistics are transmitted.
