# Android squat camera (DO2 / DO3)

## Decision: native CameraX + MediaPipe Pose Landmarker

The app is Android-only and already has native integrations. CameraX owns the
preview/lifecycle; MediaPipe runs on the analysis worker; React Native receives
only 33 normalized landmarks, visibility, frame dimensions and a timestamp.
No WebView, remote scripts, microphone, image recording, frame files or video
uploads. The preview is a real camera surface, not the old SVG illustration.

A WebView prototype would reuse MediaPipe JS, but would add a second rendering
and permission lifecycle. The native option keeps that lifecycle with Android
and does not depend on network/CDN access during a session. This is an
implementation decision, not a claim of measured performance on physical devices.

Primary references:
- https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker
- https://developer.android.com/media/camera/camerax/analyze
- https://developer.android.com/media/camera/camerax/preview

## Build

`npm ci` in mobile; then `npm run android` with Android SDK and a compatible JDK.
Gradle downloads Pose Landmarker Lite float16 revision 1 from Google's official
model bucket on the first build, checks SHA-256
`59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`, and bundles
it from app/build/generated/poseAssets. The model is a generated build asset,
not a committed binary. Subsequent runtime use works offline.

Pinned Android libraries: CameraX 1.4.2 and MediaPipe tasks-vision 0.10.35.
No additional npm camera package is used. Reinstall the APK after native changes;
Metro refresh alone cannot register the native view.

## Counter integration

rep-counter.ts, its tests and angle fixtures are reused unchanged from PR #15
(feature/rep-counter), which was merged into main on 2026-11-28. Do not implement a second
angle counter. Native pixels stay in RAM; JS calls kneeAngle() then
SquatCounter.update() through CameraSession.

Preview does not count. Start resets the session count; Pause/Resume and camera
switch preserve completed reps and discard a half-finished rep. Reset requires
confirmation. Backgrounding, leaving the screen or closing it releases capture
and pauses counting. Lost legs and out-of-frame joints do not create reps.

Supported exercises: squat, bodyweight-squat, goblet-squat, chair-squat,
barbell-squat. Other IDs show an unsupported state. This counts repetitions;
it does not evaluate form or diagnose pain.

Camera route and App.tsx are unchanged. Done returns cameraReps to an existing
previous Workout route via setParams, then goes back. It does not create or save
workout history; that remains with the workout owner. Opening Camera directly
from Home also works and returns to Home when done.

## Manual acceptance

1. Open Home -> Camera setup. Decline permission: app remains usable. Enable or
   open Settings after permanent denial: camera opens after permission is granted.
2. Keep the whole leg visible from the side. Confirm camera preview, live
   landmarks, a knee angle and ready state; Start stays disabled without a pose.
3. Start, squat down and stand up: one completed cycle should add one rep.
   Pause at the bottom and resume standing: no rep should be added.
4. Switch cameras / background and return / leave and reopen: capture releases
   and no unseen movement should finish a rep.
5. Done from Workout should return the count; from Home it simply goes back.

An emulator can verify permission flow, preview/inference startup, no-pose/error
handling and lifecycle. Its virtual room camera is not a person doing squats.
A real Android phone and side-view movement are still required to validate live
rep accuracy and record the requested DO3 video demo. Do not report a fixture
replay as a real-camera demonstration.

## Verification on 2026-11-24

- Android debug APK built and installed on Pixel 7 API 37 x86_64 emulator.
- Camera permission screen, rear virtual-room preview, front emulated preview,
  and MediaPipe no-pose frames verified. Start stays disabled and count stays 0.
- Backgrounding detached both CameraX use cases and logged CameraDevice.onClosed;
  returning reopened capture and restored the no-pose UI.
- Fixed asynchronous PreviewView child layout to prevent a black surface/timeouts
  inside React Native. No FitLensCamera inference exception or app crash observed.
- TypeScript, camera ESLint and all 29 Jest suites / 275 tests passed; prototype
  regression suite passed 55 tests. The bundled model SHA-256 matches the pin.
- Physical-device performance, real squat accuracy, Workout return-count manual
  acceptance and the real-person demo video remain unverified. Emulator coverage
  does not substitute for those checks. The emulator debug APK contains x86_64 only.

## Standalone phone test APK

From mobile/android on Windows:

```powershell
.\gradlew.bat :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
```

Output: app/build/outputs/apk/release/app-release.apk. This variant bundles Hermes
JavaScript and the pose model, so it does not need Metro or a development PC at
runtime. It targets ARM64 Android phones. Current repository release signing uses
the development key: this is an internal test APK, not a production store release.
Enable camera permission after installing. Physical-device execution and squat
accuracy remain unverified until a phone is available.

The camera branch was synchronized with main 3d9da8d on 2026-11-28, including
PR #47 Workout camera hand-off. Device-only acceptance remains open in #37/#39.

## Main integration check on 2026-11-28

- Synced main 3d9da8d (including PR #15 counter and PR #47 camera hand-off).
- Typecheck, camera ESLint and all 39 Jest suites / 350 tests pass; prototype
  regression suite passes 65 tests. Training and foundation scripts also pass.
- Screen tests verify Done sets cameraReps on the existing Workout route without
  overwriting its other params; Back and Done-from-Home never write a count there.
- Existing training integration covers filling a set, preserving kg, explicit
  Complete set, durable Finish and reading the count after rehydration.
- Phone-only acceptance in #37/#39 is still open. Fallback #38 is conditional on
  the 2 December go/no-go decision; no manual/fake count is substituted here.
