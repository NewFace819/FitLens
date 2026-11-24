# npdwuy Training handoff — 2026-11-19

## Status and branch dependency

Head branch: `feature/npdwuy-training`. Review base: `main`, which already
includes Hải's Workout/Plan implementation from PR #9. PR #8 carries forward
the Training changes, including both browser QA commits.

## Scope and entry points

Đức Huy / npdwuy owns active Training and History/Review persistence.
Đỗ Huy owns Home, mascot, Activities and camera UI; these are different people.

- Workout detail → Start workout passes `{ workout }` to `Workout`.
- Planned-session editor → Start workout passes `{ session }`.
- Home → Start or resume workout provides recovery and direct selection.
- Workout → CheckIn → Recap uses the same completed-history ID. History reopens any saved recap.
- Rhythm's check-in shortcut reopens the latest unreviewed result.

The data path is owner workout/catalog → immutable training snapshot → completed
sets → History → calendar completion → CheckIn → Review. A later edit to the
original workout must not alter an active snapshot. Targets, including ranges or
time labels, are informational; recorded sets still require explicit kg/reps.
Rest defaults to each workout item's rest; a supplied override applies to all items.

Read [README.md](README.md) for behavior and file responsibilities. Key files:
`training-model.ts`, `session-model.ts`, `training-service.ts`,
`../history/history-repository.ts`, `../../shared/storage.ts`,
`../../screens/workout.tsx` and `../../screens/training-set-row.tsx`.

## Cross-owner APIs to review

| Boundary | Additions and compatibility |
| --- | --- |
| Shared storage | `updateDurable`, `writeDurable`, `storageReady`; existing sync `read`/`write` remain. `write` acknowledges cache only. Durable APIs await device persistence. |
| Hải / schedule | `getSession`, `markSessionDoneDurable`; uses the existing pure JS schedule model, with a queued storage snapshot for completion. Old APIs remain. |
| Tu / CheckIn | `submitCheckInDurable` and the screen's saving/error state; old `submitCheckIn` remains. Exercise/count summaries now reflect performed sets. |
| npdwuy / History | Stable `history.ts` facade and seed function; `saveHistory`, `appendReviewDurable`; legacy `appendReview` is synchronous and may throw on rejected writes. Review uses Tu's type/parser. |
| Navigation | Existing typed `Workout` route and optional start callbacks on Workout/Plan screens. |

No backend, pose engine or duplicate camera implementation is included.
The data contract is still a draft: affected owners must review these boundaries,
especially pain-stop calendar semantics and durable acknowledgement.

## Persistence invariants — preserve when modifying

- One active snapshot at `fitlens.active-training`, envelope version 1. Its ID is
  the history ID. Never create a new ID to retry the same completion.
- Finish order: durable terminal checkpoint → history → calendar done → clear
  active checkpoint → navigate. Retrying repeats idempotent steps. Missing/deleted
  calendar references preserve history and allow check-in with a notice.
- A conflicting payload for an existing history ID is rejected. Two genuine
  workouts on the same day have separate IDs and separate records.
- `completedAt` is optional for reading legacy history but required for new
  completions. It orders same-day results; legacy ties retain source order.
- Only completed sets enter history. Empty normal Finish creates no history and
  leaves the calendar unchanged. Empty pain-stop keeps a flagged history and marks
  its calendar session done under the existing draft policy.
- Explicit pause freezes both clocks; background time otherwise counts. Clock
  ticks render time, not repeated storage writes. Accepted edits/actions checkpoint.
- A process killed before persistence acknowledgement can restore only the last
  acknowledged snapshot; never claim unsaved edits survive process death.
- Invalid/newer active data is retained and rejected for overwrite. There is no
  dedicated repair UI yet; do not silently reset user data to work around it.
- History/Review survive deletion of their original workout/calendar references.
- The shared queue serializes writes. Legacy cache publications and reset/removal
  revisions prevent stale in-flight saves from republishing old cache state.

## Verified evidence

On implementation commit `5bf87af`, local checks passed:

| Check | Result |
| --- | --- |
| `npm run typecheck` in mobile | PASS |
| `node node_modules/eslint/bin/eslint.js . --quiet` in mobile | PASS (no errors; not a claim of zero baseline warnings) |
| `npm run test:foundation` in mobile | 23/23 |
| `npm run test:training` in mobile | 31/31 |
| `node node_modules/jest/bin/jest.js --runInBand` in mobile | 46/46, 9 suites |
| `npm test` in prototype | 55/55 |
| Android Metro production JS bundle | PASS; not an APK/device test |

[GitHub Actions push run 44483120444](https://github.com/NewFace819/FitLens/actions/runs/44483120444)
also completed successfully for `5bf87af`. The Mobile verification workflow runs
typecheck, lint, foundation, Training/domain, Jest and Android JS bundling. The
separate prototype suite was run locally; it is not a step in that workflow.

Tests cover failures at every completion persistence boundary, retry/reload,
duplicate completion, same-revision conflicts, corrupted/future storage, failed
hydration, reset during writes, ordered bridge removal, custom workout snapshots,
planned-rest defaults, owner start callbacks, delayed CheckIn saves and UI recovery.
React renderer/native mocks are not evidence of device layout or OS lifecycle correctness.

### Browser QA on `db954e4` (2026-11-22)

Tested the seven mobile screens with sample data through React Native Web and the
Training flow in the HTML prototype. All 11 mobile workout templates opened.
Browser checks covered set validation and undo, rest and pause, resuming a
session, discarding and finishing, scheduled completion, editing and saving
check-ins, workout editing, weekly planning, rhythm goals and reminder settings.
With simulated storage, a paused session recovered after reload. Injected
checkpoint, Finish and check-in write failures recovered on retry. Retrying
Finish produced one history entry.

| Finding | Reproduction |
| --- | --- |
| Mobile Training silently opens an active workout in place of the selected workout. | Start Upper Body, return to Home, then open Workouts → Lower Body → Start workout. Training shows Upper Body without a prompt. |
| Mobile Training cannot record duration for timed exercises. | Start A fresh-air walk. Its first exercise targets 5 min per set, but the editor accepts only kg and whole-number reps. Entering `5:00` leaves Complete set disabled. |
| The HTML prototype can lose completed sets after a pain stop. | Complete a set, select I feel pain → Back to stopped session, then leave without opening check-in. No history entry appears. Starting the workout again shows zero completed sets. |
| The mobile Rhythm shortcut still opens a placeholder. | Select Your rhythm → Browse workouts. A coming-soon alert appears even though the Home → Workouts route works. |

TypeScript, the Android Metro production JS bundle and all 155 automated tests
passed. Lint passed after filtering the Windows-generated `desktop.ini` from the
local `eslint-plugin-jest` rule directory enumeration. Browser persistence and
dialogs used adapters. Android lifecycle, camera and OS notifications still
require native verification.

### Regression checks after the fixes

- Training asks before replacing a different active workout. Resuming preserves
  the logged sets. Invalid selections, stale revisions and failed replacement
  writes leave the previous checkpoint intact.
- Timed sets accept seconds or `m:ss`, store actual duration in history and reuse
  it after reload. Previously recorded rep-based sets keep their original values.
- Rhythm opens Workouts. The prototype saves a stopped result before opening
  check-in and keeps one history entry when the stopped page reloads.

All four browser reproductions passed after the fixes. Automated suites passed
23 foundation tests, 34 Training and persistence tests, 48 Jest tests and 55
prototype tests. Native Android acceptance remains open.

## Android and owner-review checklist

1. Read repository instructions and inspect current Git status before changing
   anything. Preserve unrelated user files (`desktop.ini`, `scan-output`, personal
   architecture review). Never use `git add .` in this checkout.
2. Inspect PR checks on the current head, not only the historical green run above.
   Address concrete failures and review comments without weakening assertions.
3. On an Android-capable environment, use the project's supported JDK/toolchain.
   This machine had JDK 11, no SDK/ADB; native acceptance has NOT passed. At this
   checkpoint Gradle declares build-tools 37.0.0, compileSdk 37, targetSdk 36,
   NDK 27.1.12297006 and Kotlin 2.2.0. Read current build files before setup; do not
   downgrade versions merely to make the build pass.
4. Build APK and run the native smoke checklist in README. Record device/API,
   commands, tested commit and results. Check keyboard/back navigation/layout,
   working/rest/paused background transitions, kill/relaunch after acknowledged
   saves, free/scheduled Finish, pain-stop, last-time and duplicate-free retry.
5. Review additive APIs with Hải, Tu and shared navigation/storage owners. Decide
   whether native testing must precede ready-for-review versus final merge.
6. Integrate Workout with Đỗ Huy's rep result once implemented. Main has the
   Camera setup screen. Preserve the active snapshot when returning; camera
   must not create a separate completion record.

## User's working rule

Budget 30% implementation / 70% checking; small changes and meaningful verification.
Record actual code/check effort from the next slice. Earlier work has substantial
test evidence but no complete timing ledger, so do not claim an exactly measured
30/70 ratio. Do not rerun unchanged checks just to inflate the ratio.
The user requested commit/push and a PR when the work is done or the context/token
budget approaches 20% remaining. Keep this handoff current at each checkpoint.
