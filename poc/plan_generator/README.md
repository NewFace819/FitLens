# Plan generator (PoC)

Proof of concept: send one user profile to a free LLM (Google Gemini) and get back one readable weekly workout schedule.

## Run

1. Get a free API key at <https://aistudio.google.com/apikey>.
2. Copy `.env.example` to `.env` and paste the key into `GEMINI_API_KEY`.
3. From this folder:

   ```bash
   python -m venv .venv
   .venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
   pip install -r requirements.txt
   python generate_plan.py profiles/sample_beginner.json
   ```

The schedule prints to the console, and both the readable `.md` and the raw `.json` are saved in `outputs/`.

To test every profile at once, run `python run_tests.py`. It prints PASS/FAIL per profile and writes `outputs/test_report.html` (open it in a browser) and `outputs/test_report.md` (paste it into the tracker).

## How busy days work

The **code** picks the training days (`pick_training_days`): only free days, spread as evenly as possible. Gemini only writes the content of each session, so it can't put a session on a busy day. `check_plan` then double-checks the result: no clashes, the right number of days, and every session within the time limit. If a check fails, the script asks Gemini once more with the problems listed.

## Data format

Profiles and plans follow the shared data contract in [`/schemas`](../../schemas/README.md), which covers ISO weekdays, structured exercise targets and exercise ids. `models.py` is the source of truth. After changing it, run `python export_schemas.py`. Gemini gets the same JSON Schema, so its output matches the contract.

## Files

- `models.py`: the data contract (profile and plan models).
- `export_schemas.py`: writes `models.py` out to `/schemas/*.json`. The `--check` flag verifies they're up to date.
- `prompts/workout_plan_v2.md`: the system prompt. Edit this to change how the coach behaves, and bump the version for big changes. The version is saved in each plan's `generator.prompt_version`.
- `profiles/`: sample user profiles. Use made-up data only, because Google may use free-tier prompts to improve its products.
- `generate_plan.py`: picks the days, calls Gemini with the plan schema, then checks and renders the result.
- `run_tests.py`: runs all profiles and builds the test report.
