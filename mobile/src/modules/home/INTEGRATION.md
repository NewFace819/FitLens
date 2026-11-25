# Home, mascot, activity and camera integration

Home migration started on main 77423aa; camera work is rebased onto main 95df1d8. App.tsx and shared/routes.ts are unchanged from main.
The existing Home route imports screens/dev-hub.tsx, now the real Home screen.

- Home reads getWeekSchedule/getNextSession/getWorkout, getHistory and getRhythm.
  Start workout opens the registered Workout route with {session}; future sessions
  open Plan. Updates follow the shared storage subscription.
- Steps and Log activity open local Home modals, requiring no additional routes.
- modules/activity/activity.ts owns fitlens.activities using the shared synchronous
  cache API and {v,data} envelope. Exports getActivities, saveActivity, removeActivity.
  Activity fields use durationSec, shared ActivityType, dates and ac- IDs.
- modules/mascot/mascot.ts remains the canonical getMascotMood/setMascotMood API
  used by Tu. MascotView subscribes to that shared mood instead of a second store.
- modules/home/index.ts exports renderActivitySection(props) and ActivitySection
  for Hải to embed in Workouts. This native API returns a React element (no DOM
  element argument). Pass onLog to show its button; ActivityForm accepts date/save.
- screens/camera.tsx replaces the registered Camera placeholder; accepts exerciseId
  and targetReps. DO2/DO3 now use native CameraX + MediaPipe and the PR #15
  squat counter. See ../camera/README.md for lifecycle, build and test limits.

No Nutrition/Chat routes. No writes to other module owners' keys. No new navigator.
Workouts/Plan/Rhythm/Reminders/Welcome remain the implementations on main.

Steps is sample data. Profile/Insights/Workout/History/Recap stay at main's current
implementation. Live squat accuracy still needs physical-device validation.
Legacy branch-only colon-key
activity storage is not imported; its records remain on the device under that key.
