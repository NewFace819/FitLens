# Training foundation — npdwuy

This folder and the sibling `history/history-model.ts` belong to Đức Huy.
This is an isolated foundation, not a wired React Native feature.

- History types match the fields in Tu's `feature/rhythm-checkin` placeholder.
- Pure history helpers validate untrusted reads, filter history and select last sets.
- `contracts.ts` describes existing reader/review APIs; use Tu's Review type.
- Supply the shared date validator; do not create another date/enum/catalog module.
- Preserve same-day newest-first source order. Precise completion timestamps still
  need agreement; random IDs must not be treated as chronological information.
- No changes to Hai's workouts/schedule or Tu's check-in/shared storage.

## Training interactions

`training-model.ts` implements the domain-only part of the current prototype:

- Create drafts using exercise IDs and set/rest counts supplied by a workout adapter.
- Edit/complete/undo sets; completed sets must be undone before editing.
- Use explicit zero kg for bodyweight; blank values cannot complete a set.
- Validate kg 0–1000 and integer reps 1–999, matching prototype input bounds.
- Enter rest when another set remains; pause/resume preserves work/rest phase.
- Advance to the next exercise without marking skipped sets as performed.
- Finish early or stop because of pain; both lock further workout changes.
- Export only completed sets into the existing history shape.

`createTraining` returns null for invalid plans. `transitionTraining` returns
`{ok, state}` and a reason on rejection. State is readonly and transitions do not
mutate it. Only use states created by this model; raw storage requires a future
restore adapter. These APIs do not claim a save succeeded: terminal state must be
kept until the completion orchestrator confirms persistence. A normal finish
without performed sets exports an empty array; deciding whether to save belongs
to that orchestrator (the current prototype skips empty ordinary completions).

Rest is a phase, not a running clock yet. No background/resume timing policy is
introduced here. The history reader's nullable kg shape is preserved separately
from validation of newly completed sets.

## Verify locally

From the repository root, with Node 22.13 or later supporting type stripping:

```sh
node --experimental-strip-types --test mobile/src/modules/history/history-model.test.mjs mobile/src/modules/training/training-model.test.mjs
```

This runs 20 domain tests, not an Android build. Standalone strict typechecking:

```sh
npm exec --yes --package=typescript@5.9.3 --call "tsc --strict --noEmit --target ES2022 --module commonjs mobile/src/modules/history/history-model.ts mobile/src/modules/training/contracts.ts mobile/src/modules/training/training-model.ts"
```

The compiler is resolved in npm's cache, not added as a repository dependency.
The current checkout does not contain the team's React Native toolchain.

## Integration boundaries

Choose the common integration branch before wiring UI, navigation or persistence.
Keep the existing `history.ts` public facade when integrating with Tu's imports;
delegate its read logic to these helpers after adapting the shared date type.
Do not replace his Review schema or seed entrypoints.

Next integrate the model, active-session persistence, timer and UI.
Completion must persist history before marking the schedule done and navigating
to check-in. Agree on durable-write acknowledgement first: Tu's current storage
write confirms the cache and persists asynchronously. Review replacement,
completion retry deduplication and same-day ordering need integration tests.

Tu's current Review includes both numeric score and derived shared feedback enum;
reuse that type rather than defining another review schema in this module.
