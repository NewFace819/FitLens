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

## Files

- `prompts/workout_plan_v1.md`: the system prompt. Edit this to change how the coach behaves, and bump the version for big changes.
- `profiles/`: sample user profiles. Use made-up data only, because Google may use free-tier prompts to improve its products.
- `generate_plan.py`: loads the profile and prompt, calls Gemini with a JSON schema, then validates and renders the result.
