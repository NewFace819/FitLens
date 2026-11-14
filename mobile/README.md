# FitLens Mobile (Android · React Native + Expo)

Expo SDK 58, React Native 0.88, TypeScript, Expo Router. UI follows Thông's design snapshots (`design/ui-snapshots/2026-10-28/` on branch `docs/ui-snapshot-2026-10-28`).

## Run it

```bash
cd mobile
npm install
npm start          # then scan the QR code with the Expo Go app on an Android phone
```

The phone and the computer must be on the same Wi-Fi. No Android Studio is needed for Expo Go. Local notifications work in Expo Go; remote push would need a development build.

```bash
npm run typecheck  # tsc --noEmit
npm test           # unit tests for the pure logic in src/domain (Node's built-in test runner)
```

## Layout

```
src/
├── app/            # Screens (Expo Router: every file is a route)
│   ├── _layout.tsx
│   ├── index.tsx       # TEMPORARY dev hub until Home + dock exist (Đỗ Huy)
│   ├── rhythm.tsx      # Your Rhythm: weekly goal, streak, pause (Tu)
│   ├── reminders.tsx   # Workout times + weekly notifications (Tu)
│   └── check-in.tsx    # Post-workout check-in (Tu)
├── domain/         # Pure logic, no React / storage. Unit tested.
│   ├── dates.ts
│   ├── rhythm.ts       # streak / weekly goal / pause rules
│   ├── checkin.ts      # review types, RPE levels, next-week adjustment hints
│   └── reminders.ts
├── data/           # AsyncStorage + device services
│   ├── storage.ts          # keys: fitlens:<name>:v<n>
│   ├── training-history.ts # PLACEHOLDER for Đức Huy (getHistory, appendReview…)
│   ├── sample-history.ts   # synthetic demo data
│   ├── rhythm-store.ts     # getRhythm() for Home / Insights
│   └── reminder-store.ts   # expo-notifications scheduling
└── ui/             # theme tokens, shared components, mascot faces
```

Rules of thumb: put logic in `domain/` (pure functions with tests), put storage and device APIs in `data/`, and keep screens thin. Domain files import each other with an explicit `.ts` extension so `node --test` can run them without a build step.

## Contracts with other modules

| Who | What Tu's code uses / provides |
|---|---|
| Đức Huy | Uses `getHistory()`, `getSession(id)`, `appendReview(review: SessionReview)` from `data/training-history.ts`. The current file is a placeholder with the agreed names; replace the implementation but keep the exports. Open the check-in with `router.push({ pathname: '/check-in', params: { sessionId } })`, and add `stopped: 'pain'` after a pain stop. |
| Hải | `suggestAdjustments(reviews)` in `domain/checkin.ts` returns `easier / keep / harder / swap` per exercise id from recent reviews, for next week's plan. |
| Thông / Đỗ Huy | `getRhythm()` in `data/rhythm-store.ts` returns status, `thisWeek` (done / goal), `streak`, `longestStreak` and `completedWeeks` for Home and Insights. After a check-in, `fitlens:last-check-in:v1` holds `{ mood }` for the mascot. |

Safety: the check-in shows a general "don't train through pain" note. The app never gives medical advice.
