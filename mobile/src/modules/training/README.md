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

## Verify locally

From the repository root, with Node 22.13 or later supporting type stripping:

```sh
node --experimental-strip-types --test mobile/src/modules/history/history-model.test.mjs
```

This runs domain tests only, not TypeScript typechecking or an Android build.
The current checkout does not contain the team's React Native toolchain.

## Integration boundaries

Choose the common integration branch before wiring UI, navigation or persistence.
Keep the existing `history.ts` public facade when integrating with Tu's imports;
delegate its read logic to these helpers after adapting the shared date type.
Do not replace his Review schema or seed entrypoints.

Next implement the training state model, active-session persistence, timer and UI.
Completion must persist history before marking the schedule done and navigating
to check-in. Agree on durable-write acknowledgement first: Tu's current storage
write confirms the cache and persists asynchronously. Review replacement,
completion retry deduplication and same-day ordering need integration tests.
