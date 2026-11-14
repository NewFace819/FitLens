# FitLens Mobile (Android · React Native + Expo)

Expo SDK 58, React Native 0.88, TypeScript, Expo Router. UI follows Thông's design snapshots (`design/ui-snapshots/2026-10-28/`). Data follows `docs/design/DATA_CONTRACT.md`.

> ⚠️ `docs/PROJECT_STATE.md` on `main` says **RN CLI**, while this branch uses **Expo**. The team must pick one before merging. Expo runs on a phone through Expo Go without Android Studio or JDK 17.

## Run it

```bash
cd mobile
npm install
npm start          # scan the QR code with Expo Go on an Android phone (same Wi-Fi)
npm run typecheck  # tsc --noEmit
npm test           # pure-logic + contract tests (Node's built-in runner)
```

Sample data loads on first start (contract §8). The dev hub has "Reset sample data".

## Layout

```
src/
├── app/                 # Screens (Expo Router). Thin: call module functions only.
│   ├── index.tsx        # TEMPORARY dev hub until Home + dock (Đỗ Huy)
│   ├── rhythm.tsx       # Tu
│   ├── reminders.tsx    # Tu
│   └── check-in.tsx     # Tu  (?history=<HistoryEntry.id>)
├── shared/              # Contract §1, 2, 4, 8, 12 — everyone imports, nobody re-types
│   ├── constants.ts     # enums: Region, ExerciseFeedback, SessionStatus, …
│   ├── dates.ts         # YYYY-MM-DD, HH:mm, weekStartOf (Monday)
│   ├── ids.ts           # <prefix>-<random>
│   ├── storage.ts       # fitlens.<entity> = { v, data }; sync read/write over a hydrated cache
│   ├── storage-native.ts# AsyncStorage persistence
│   ├── routes.ts        # route names + fixed params
│   └── seed.ts          # calls each owner's seed
├── modules/             # One folder per owner. Pure TS, unit-tested, no React.
│   ├── rhythm/          # Tu: getRhythm, setWeeklyGoal, pauseRhythm, resumeRhythm
│   ├── checkin/         # Tu: Review shape, 1–10 feedback scale, submitCheckIn, load adjust
│   ├── reminders/       # Tu: getReminder, setReminder, notifications.ts (device)
│   ├── history/         # Đức Huy  ⚠️ placeholder
│   ├── workouts/        # Hải      ⚠️ placeholder
│   ├── profile/         # Thông    ⚠️ placeholder
│   └── mascot/          # Đỗ Huy   ⚠️ placeholder
└── ui/                  # theme, shared components, mascot faces, useStore()
```

Rules (from the contract):
- One owner writes each key. Everyone else calls the owner's functions.
- Contract functions are **synchronous**. Storage hydrates once at start-up, so `read`/`write` are sync and saving to the device happens in the background.
- Missing or broken data never crashes a screen; readers return defaults.
- The placeholder modules implement the contract signatures so Tu's screens work. Each owner replaces their own folder and keeps the signatures.

Tu's data details: `docs/design/RHYTHM_CHECKIN_REMINDER.md`.
