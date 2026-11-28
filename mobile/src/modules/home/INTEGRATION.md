# Home, mascot, activity and camera integration

Ported onto main 77423aa. App.tsx and shared/routes.ts are unchanged from main.
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
  and targetReps. It is still the original illustrated UI, not DO2/DO3 rep tracking.

No Nutrition/Chat routes. No writes to other module owners' keys. No new navigator.
Workouts/Plan/Rhythm/Reminders/Welcome remain the implementations on main.

Steps is sample data. Profile/Insights/Workout/History/Recap stay at main's current
implementation. Camera technology selection and actual squat counting are separate
new tasks and are not included in this migration. Legacy branch-only colon-key
activity storage is not imported; its records remain on the device under that key.


Mascot display follow-up (2026-11-28): saved expressions are displayed for 24 hours,
then resolve to neutral `waiting`. A timer and foreground refresh update mounted
Home. This does not clear the stored event, history, pain flags or Plan adjustment.
`noteActivityMood(date)` is used only after a successful Home activity save: past
logs leave today's expression alone; recent concerned/tired/exhausted expressions
are preserved. The public setMascotMood(mood) contract and Tu's conservative
soreness/tightness mapping are unchanged. The 24-hour window is a display choice,
not an assertion that the user has recovered.
