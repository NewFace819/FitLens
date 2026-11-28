# Training — npdwuy

For team agents continuing this work, read [HANDOFF.md](HANDOFF.md) first for
branch dependencies, verified evidence, API boundaries and remaining acceptance gates.

Training uses the Workout and Plan screens on main. Open a workout or
a planned session → Start workout, or Home → Start or resume workout.
Custom workouts and template targets (including ranges/time labels) use the owner models.
Planned rest is used by default; entering a rest override applies it to every exercise.
Review this dependent branch against feature/mobile-workout-plan before main integration.

## Responsibilities

- training-model.ts: immutable set/exercise transitions, validation, performed sets.
- session-model.ts: clock, pause/rest, last-set application and strict snapshot restore.
- training-service.ts: resolve workout/session, persist one active workout and finish it.
- ../history/history.ts: stable public facade, including the existing seedHistory API.
- ../history/history-repository.ts: history and Review persistence; Review remains Tu's type.
- ../history/history-summary.ts: pure totals for History/Recap (volume = kg × reps per set, weeks, month).
- ../../screens/history.tsx, recap.tsx, history-stat.tsx: History grouped by week and the per-workout recap.
- ../../screens/workout.tsx and training-set-row.tsx: UI and save/retry state.
- camera-handoff.ts: which set opened Camera, and how a returned `cameraReps` fills it.

## Behavior and persistence

- Repetition sets require weight and reps. Enter 0 kg for bodyweight. Timed sets
  accept seconds or `m:ss` and store the performed `durationSec`.
- Targets are shown separately and never counted as performed reps.
- Add set creates an empty draft. Use last time fills unfinished rows by index.
  Different set counts do not add or delete rows; completed rows remain unchanged.
- Pause freezes workout and rest clocks. Background time counts unless explicitly
  paused. Rest reaching zero does not automatically complete a set. Backwards
  wall-clock changes cannot produce negative time; counting resumes once time
  catches up with the stored anchor.
- Every accepted edit/action checkpoints through durable storage. The UI reports
  pending/error instead of claiming a failed save is safe. A process killed before
  acknowledgement can recover only the last successfully written snapshot.
- Finish persists its terminal snapshot, then history, then marks the calendar
  session done through its owner API, then clears the active snapshot. All steps
  are retryable. Check-in receives the same history ID.
- An ordinary empty finish creates no history/check-in and does not mark the
  calendar done. A pain stop records stoppedByPain, including an empty set list,
  and marks the scheduled session done according to the existing draft contract.
- Deleting a calendar session does not discard the workout result. Check-in stays
  available with a notice that the calendar reference is missing.
- A failed save keeps the current screen state and last durable checkpoint. Invalid
  or newer stored snapshots are kept for recovery, not silently overwritten.
- Completion timestamps order same-day history; legacy entries without timestamps
  retain stable source order. Random IDs are never treated as timestamps.

- Camera: "Count reps with camera" on an unfinished rep set opens `Camera`.
  A returned `cameraReps` (1–999) fills that set's reps, keeps its kg and leaves
  it unfinished, so the user still confirms with Complete set. Zero or invalid
  counts show a message and change nothing. Timed sets, exercises the camera
  can't count (it counts squats, see `supportsSquat()`), and paused or finished
  workouts don't offer the camera. Manual entry always works.

## Compatibility additions requiring affected-owner review

Shared storage now provides updateDurable/writeDurable without changing read/write
signatures. Existing synchronous writes still acknowledge cache only. Writes are
serialized; durable callers await device acknowledgement. Failed hydration blocks
writes, and corrupt/newer envelopes cannot be overwritten implicitly.

Hải's module adds getSession and markSessionDoneDurable. Its old APIs remain.
Tu's module adds submitCheckInDurable; the screen uses it and reports success only
once the Review is saved. The old submitCheckIn/appendReview APIs remain for
compatibility. Check-in reports actual completed exercises/sets, not planned ones.

Active snapshots use fitlens.active-training. History adds optional completedAt
(UTC ISO string), leaving old records readable. Dates use shared date helpers.
No workout/session deletion cascades to history or reviews.

## Verification

From mobile after npm ci:

```sh
npm run typecheck
npm run lint -- --quiet
npm run test:foundation
npm run test:training
npm test -- --runInBand
```

The Node runner compiles real domain modules with the installed TypeScript before
running failure/recovery/contract tests. It also accepts TYPESCRIPT_TSC for an
existing compiler when dependencies are unavailable. Jest covers the real screen
and editor with mocked native visual primitives, plus existing app/module tests.
The CI workflow repeats these checks and creates the Android JavaScript bundle.

## Native smoke checklist (required before release)

- Build with the project's supported JDK and Android SDK/NDK versions.
- Free workout and scheduled workout: edit/complete/undo/add/skip → Finish → CheckIn → Recap.
- Pause during rest, background/foreground, and kill/relaunch with a saved checkpoint.
- Retry an injected save failure without duplicate history or lost performed sets.
- Use last time with a different set count; ordinary empty finish; pain stop.
- Check keyboard behavior, back navigation, accessibility and actual device layout.

JavaScript bundling and renderer tests do not replace this native smoke check.
Home opens Đỗ Huy's Camera setup screen. Workout can integrate measured reps
when that screen returns a real count.
