# FitLens Android UI port

Based on `feature/update-ui-prototype` (21973db). React Native CLI 0.88,
Android only; this project does not use Expo Go.

```sh
npm install
npm start
# In another terminal, with Android SDK/JDK and emulator ready:
npm run android
```

## Đỗ Huy scope

- `src/HomeScreen.tsx`: weekly date selection, day stage, activity bento.
  `HomePlan[]` and `WorkoutMetric[]` are integration props for teammates.
- `src/mascot.tsx`: original mascot SVG states and `setMascotMood()`.
- `src/HomeScreen.tsx`: `renderActivitySection()` and `ActivitySection`.
- `src/activityModel.ts`, `ActivityScreen.tsx`: port of manual activity logging
  from `prototype/activity-model.js`, persisted via AsyncStorage instead of
  localStorage. Walking/running/cycling/swimming, date, duration, distance,
  ascent, effort and notes. No GPS or sensor capture.
- `src/CameraScreen.tsx`: original camera illustration, mirror/framing preview,
  sample weight/rep summary; Start Set is visual only, matching the prototype.
- `src/routes.ts`: shared routes and Today/Workouts/Plan/Insights dock.
- Nutrition and Chat have no routes in the mobile app.

Steps is a sample-data port. Workouts, Plan, Insights and Profile remain explicit
integration placeholders; Home receives empty schedule/workout inputs until those
modules are connected. Post-walk recap and full Account sheet are not ported yet.
No backend, camera access or pose detection is added. Native rendering still needs
visual comparison on Android; CSS blur/wave effects are approximated.

## Checks

`npm run typecheck`, `npm test -- --runInBand`.

Manual: select dates/weeks, log an activity and reopen app, inspect the activity
on its date, open all four tabs, open camera from Workouts, mirror/adjust/back.
