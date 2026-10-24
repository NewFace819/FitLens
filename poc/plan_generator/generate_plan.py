"""PoC: turn one user profile into one weekly workout plan using the Gemini free tier.

Code decides WHEN to train (busy days can never be picked); the LLM only decides WHAT to do.

Usage: python generate_plan.py [profiles/sample_beginner.json]
"""

import json
import os
import sys
from datetime import datetime
from itertools import combinations
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import errors, types
from pydantic import BaseModel, Field

HERE = Path(__file__).parent
PROMPT_FILE = HERE / "prompts" / "workout_plan_v1.md"
DEFAULT_PROFILE = HERE / "profiles" / "sample_beginner.json"
OUTPUT_DIR = HERE / "outputs"
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# What Gemini is forced to return. Sessions carry no day names: the days are chosen by code.
class Exercise(BaseModel):
    name: str
    sets: int
    reps_or_duration: str
    rest_seconds: int
    form_tip: str


class Session(BaseModel):
    focus: str = Field(description="Short session title, e.g. 'Lower body & core'. No day name.")
    estimated_minutes: int
    warmup: list[str]
    exercises: list[Exercise]
    cooldown: list[str]


class SessionPlan(BaseModel):
    plan_name: str
    summary: str
    sessions: list[Session]
    progression_tips: list[str]
    safety_note: str


# The final plan the app shows: the LLM's sessions placed on the days code picked.
class TrainingDay(Session):
    day: str


class WorkoutPlan(BaseModel):
    plan_name: str
    summary: str
    weekly_schedule: list[TrainingDay]
    busy_days: list[str]
    rest_days: list[str]
    schedule_note: str
    progression_tips: list[str]
    safety_note: str


def pick_training_days(busy_days: list[str], days_per_week: int) -> tuple[list[str], str]:
    """Pick training days from the free days, spread as evenly as possible around the week.

    Returns the chosen days (Monday-first order) and a note for the user ("" if none needed).
    """
    busy = {d.strip().capitalize() for d in busy_days}
    unknown = busy - set(WEEKDAYS)
    if unknown:
        raise ValueError(f"Unknown day name(s) in busy_days: {sorted(unknown)}")
    free = [i for i, day in enumerate(WEEKDAYS) if day not in busy]
    if not free:
        raise ValueError("Every day is marked busy, so there is no day left to train.")

    if days_per_week >= len(free):
        note = ""
        if days_per_week > len(free):
            free_text = "1 free day" if len(free) == 1 else f"{len(free)} free days"
            note = (f"You asked for {days_per_week} training days but only have {free_text}, "
                    f"so the plan trains on every free day.")
        return [WEEKDAYS[i] for i in free], note

    def gaps(combo: tuple[int, ...]) -> list[int]:
        # Days between consecutive sessions, wrapping from Sunday back to Monday.
        return [(combo[(k + 1) % len(combo)] - combo[k]) % 7 or 7 for k in range(len(combo))]

    # Best = largest smallest gap (avoid back-to-back days), then the most even gaps.
    # max() keeps the first best combination, i.e. the earliest days in the week.
    best = max(combinations(free, days_per_week),
               key=lambda c: (min(gaps(c)), -sum(g * g for g in gaps(c))))
    return [WEEKDAYS[i] for i in best], ""


def check_plan(plan: WorkoutPlan, profile: dict) -> list[str]:
    """Return a list of problems with the plan (empty list = plan is OK)."""
    problems = []
    busy = {d.strip().capitalize() for d in profile.get("busy_days", [])}
    days = [d.day for d in plan.weekly_schedule]
    expected = min(profile["days_per_week"], 7 - len(busy))

    if clashes := [d for d in days if d in busy]:
        problems.append(f"session(s) on busy day(s): {', '.join(clashes)}")
    if len(days) != expected:
        problems.append(f"{len(days)} training days instead of {expected}")
    if bad := [d for d in days if d not in WEEKDAYS]:
        problems.append(f"invalid day name(s): {', '.join(bad)}")
    if len(set(days)) != len(days):
        problems.append("the same day is used twice")
    limit = profile["minutes_per_session"]
    if long := [f"{d.day} ({d.estimated_minutes} min)" for d in plan.weekly_schedule
                if d.estimated_minutes > limit]:
        problems.append(f"session(s) longer than {limit} min: {', '.join(long)}")
    return problems


def make_client() -> tuple[genai.Client, str]:
    load_dotenv(HERE / ".env")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        sys.exit("GEMINI_API_KEY is not set. Copy .env.example to .env and paste your key.")
    # Free tier often returns 429/503 briefly, so retry a few times with backoff before giving up.
    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(
            retry_options=types.HttpRetryOptions(attempts=5, initial_delay=2)
        ),
    )
    return client, os.getenv("GEMINI_MODEL", "gemini-3.8-flash")


def generate_plan(client: genai.Client, model: str, profile: dict) -> tuple[WorkoutPlan, list[str]]:
    """Generate a plan; if it fails check_plan, retry once with the problems as feedback.

    Returns the plan and any problems that remain after the retry.
    """
    busy_days = [d.strip().capitalize() for d in profile.get("busy_days", [])]
    days, note = pick_training_days(busy_days, profile["days_per_week"])
    day_list = "\n".join(f"- Session {i}: {day}" for i, day in enumerate(days, 1))
    message = (
        f"The training days are fixed. Write exactly {len(days)} sessions, in this order:\n"
        f"{day_list}\n\nUser profile:\n{json.dumps(profile, indent=2)}"
    )

    feedback = ""
    for _ in range(2):
        response = client.models.generate_content(
            model=model,
            contents=message + feedback,
            config=types.GenerateContentConfig(
                system_instruction=PROMPT_FILE.read_text(encoding="utf-8"),
                response_mime_type="application/json",
                response_schema=SessionPlan,
                temperature=0.4,
            ),
        )
        draft = SessionPlan.model_validate_json(response.text)
        plan = WorkoutPlan(
            plan_name=draft.plan_name,
            summary=draft.summary,
            weekly_schedule=[TrainingDay(day=day, **s.model_dump())
                             for day, s in zip(days, draft.sessions)],
            busy_days=busy_days,
            rest_days=[d for d in WEEKDAYS if d not in days],
            schedule_note=note,
            progression_tips=draft.progression_tips,
            safety_note=draft.safety_note,
        )
        problems = check_plan(plan, profile)
        if len(draft.sessions) != len(days):
            problems.append(f"model wrote {len(draft.sessions)} sessions instead of {len(days)}")
        if not problems:
            break
        feedback = "\n\nYour previous answer had these problems. Fix them:\n- " + "\n- ".join(problems)
    return plan, problems


def to_markdown(plan: WorkoutPlan) -> str:
    lines = [f"# {plan.plan_name}", "", plan.summary, ""]
    if plan.schedule_note:
        lines += [f"> Note: {plan.schedule_note}", ""]
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
    lines += [f"**Busy days:** {', '.join(plan.busy_days) or 'none'}", ""]
    lines += [f"**Rest days:** {', '.join(plan.rest_days)}", ""]
    lines += ["## How to progress", *[f"- {tip}" for tip in plan.progression_tips], ""]
    lines += [f"> {plan.safety_note}", ""]
    return "\n".join(lines)


def save_plan(plan: WorkoutPlan, stem: str) -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    (OUTPUT_DIR / f"{stem}.md").write_text(to_markdown(plan), encoding="utf-8")
    (OUTPUT_DIR / f"{stem}.json").write_text(plan.model_dump_json(indent=2), encoding="utf-8")


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    client, model = make_client()

    profile_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PROFILE
    profile = json.loads(profile_path.read_text(encoding="utf-8"))

    print(f"Generating plan for {profile_path.name} with {model}...\n")
    try:
        plan, problems = generate_plan(client, model, profile)
    except errors.APIError as e:
        if e.code == 429:
            sys.exit("Rate-limited by the free tier. Wait a minute and try again.")
        sys.exit(f"Gemini API error {e.code}: {e.message}")

    print(to_markdown(plan))
    stem = f"plan_{datetime.now():%Y%m%d_%H%M%S}"
    save_plan(plan, stem)
    print(f"Saved to outputs/{stem}.md and outputs/{stem}.json")
    if problems:
        sys.exit("WARNING, plan still has problems: " + "; ".join(problems))


if __name__ == "__main__":
    main()
