"""PoC: turn one user profile into one weekly workout plan using the Gemini free tier.

Usage: python generate_plan.py [profiles/sample_beginner.json]
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import errors, types
from pydantic import BaseModel

HERE = Path(__file__).parent
PROMPT_FILE = HERE / "prompts" / "workout_plan_v1.md"
DEFAULT_PROFILE = HERE / "profiles" / "sample_beginner.json"
OUTPUT_DIR = HERE / "outputs"


# Output schema. Gemini is forced to return JSON matching this, so the app can render it later.
class Exercise(BaseModel):
    name: str
    sets: int
    reps_or_duration: str
    rest_seconds: int
    form_tip: str


class TrainingDay(BaseModel):
    day: str
    focus: str
    estimated_minutes: int
    warmup: list[str]
    exercises: list[Exercise]
    cooldown: list[str]


class WorkoutPlan(BaseModel):
    plan_name: str
    summary: str
    weekly_schedule: list[TrainingDay]
    rest_days: list[str]
    progression_tips: list[str]
    safety_note: str


def generate_plan(client: genai.Client, model: str, profile: dict) -> WorkoutPlan:
    response = client.models.generate_content(
        model=model,
        contents="Create a weekly workout plan for this user profile:\n\n"
        + json.dumps(profile, indent=2),
        config=types.GenerateContentConfig(
            system_instruction=PROMPT_FILE.read_text(encoding="utf-8"),
            response_mime_type="application/json",
            response_schema=WorkoutPlan,
            temperature=0.4,
        ),
    )
    return WorkoutPlan.model_validate_json(response.text)


def to_markdown(plan: WorkoutPlan) -> str:
    lines = [f"# {plan.plan_name}", "", plan.summary, ""]
    for day in plan.weekly_schedule:
        lines += [f"## {day.day}: {day.focus} (~{day.estimated_minutes} min)", ""]
        lines += ["**Warm-up**", *[f"- {item}" for item in day.warmup], ""]
        lines += ["**Workout**"]
        for i, ex in enumerate(day.exercises, 1):
            lines.append(
                f"{i}. **{ex.name}**: {ex.sets} x {ex.reps_or_duration}, rest {ex.rest_seconds}s"
            )
            lines.append(f"   - Tip: {ex.form_tip}")
        lines += ["", "**Cool-down**", *[f"- {item}" for item in day.cooldown], ""]
    lines += [f"**Rest days:** {', '.join(plan.rest_days)}", ""]
    lines += ["## How to progress", *[f"- {tip}" for tip in plan.progression_tips], ""]
    lines += [f"> {plan.safety_note}", ""]
    return "\n".join(lines)


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    load_dotenv(HERE / ".env")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        sys.exit("GEMINI_API_KEY is not set. Copy .env.example to .env and paste your key.")
    model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

    profile_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PROFILE
    profile = json.loads(profile_path.read_text(encoding="utf-8"))

    print(f"Generating plan for {profile_path.name} with {model}...\n")
    try:
        # Free tier often returns 429/503 briefly, so retry a few times with backoff before giving up.
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(
                retry_options=types.HttpRetryOptions(attempts=5, initial_delay=2)
            ),
        )
        plan = generate_plan(client, model, profile)
    except errors.APIError as e:
        if e.code == 429:
            sys.exit("Rate-limited by the free tier. Wait a minute and try again.")
        sys.exit(f"Gemini API error {e.code}: {e.message}")

    markdown = to_markdown(plan)
    print(markdown)

    OUTPUT_DIR.mkdir(exist_ok=True)
    stem = f"plan_{datetime.now():%Y%m%d_%H%M%S}"
    (OUTPUT_DIR / f"{stem}.md").write_text(markdown, encoding="utf-8")
    (OUTPUT_DIR / f"{stem}.json").write_text(plan.model_dump_json(indent=2), encoding="utf-8")
    print(f"Saved to outputs/{stem}.md and outputs/{stem}.json")


if __name__ == "__main__":
    main()
