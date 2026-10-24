# FitLens data contract

These JSON Schema files define the data every part of FitLens shares, whatever framework each part uses:

| File | What it describes | Written by | Read by |
|---|---|---|---|
| `profile.v1.json` | The user profile: body, goal, equipment, injuries, weekly availability | Onboarding form | Plan generator, UI |
| `plan.v1.json` | One weekly workout plan | Plan generator | UI, reminders, rep counter, progress/avatar |

**Do not edit these files by hand.** The source of truth is `poc/plan_generator/models.py`. After changing it, run `python export_schemas.py` in `poc/plan_generator`. Run `python export_schemas.py --check` before committing to make sure the schemas are up to date.

## Using them in another framework
Generate typed classes from the schema instead of writing them by hand, for example with [quicktype](https://quicktype.io):

```bash
npx quicktype -s schema schemas/plan.v1.json -o Plan.ts --lang typescript
```

The same command with `--lang dart`, `kotlin`, `swift` or `python` covers Flutter, Android, iOS and Python. The JSON can be stored as-is in Firestore, MongoDB, Supabase/Postgres (as a `jsonb` column) or SQLite on the phone.

## Conventions
- **Field names** are `snake_case`.
- **Weekdays** are ISO numbers: `1` = Monday … `7` = Sunday. The UI turns them into names in the user's language.
- **Times of day** are `"HH:MM"` (24-hour, local). **Timestamps** are ISO 8601 with a timezone, e.g. `2026-10-24T20:07:01+07:00`.
- **Units:** durations are in seconds unless the name says otherwise (`estimated_minutes`, `minutes_per_session`), weights are in kg, heights are in cm.
- **Fixed choices** (goal, level, equipment, body area, exercise id) are short lowercase ids from a closed list. The user's own words go in a separate `*_note` field.
- **`schema_version`** is in every top-level object. A breaking change means a new version (`plan.v2.json`), and old data keeps validating against v1.
- **Derived data isn't stored.** For example, rest days aren't stored in the plan: they're whatever days have no session.

## Key fields
- `availability.busy`: a list of `{weekday, start?, end?}`. Leaving out `start`/`end` means the whole day. The planner currently treats any busy slot as the whole day. The times are kept so time-of-day scheduling can use them later.
- `exercise.target`: per set, either `{"type": "reps", "min", "max"}` or `{"type": "time", "seconds"}`. Together with `sets` and `per_side`, this is what the rep counter and progress tracking compare against.
- `exercise.exercise_id`: links an exercise to the catalog of movements the app can recognise (`squat`, `push_up`, `lunge`, `plank`, …), or `null`. The camera rep counter uses it to pick the right counter.
- `plan.generator`: which model and prompt version produced the plan, for comparing prompt versions.
