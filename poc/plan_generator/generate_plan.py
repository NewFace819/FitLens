"""PoC: turn one user profile into one weekly workout plan using the Gemini free tier.

Code decides WHEN to train (busy days can never be picked); the LLM only decides WHAT to do.
Input and output follow the data contract in models.py (JSON Schemas in /schemas).

Usage: python generate_plan.py [profiles/sample_beginner.json]
"""

import os
import sys
from datetime import datetime
from itertools import combinations
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import errors, types

from models import (WEEKDAY_NAMES, Exercise, Generator, Plan, PlanDraft, Profile, Session)

HERE = Path(__file__).parent
PROMPT_FILE = HERE / "prompts" / "workout_plan_v2.md"
DEFAULT_PROFILE = HERE / "profiles" / "sample_beginner.json"
OUTPUT_DIR = HERE / "outputs"


def busy_weekdays(profile: Profile) -> set[int]:
    # For now any busy slot blocks the whole day; time-of-day scheduling can use start/end later.
    return {slot.weekday for slot in profile.availability.busy}


def pick_training_days(busy: set[int], days_per_week: int) -> tuple[list[int], str | None]:
    """Pick ISO weekdays (1-7) from the free days, spread as evenly as possible around the week.

    Returns the chosen weekdays in order and a note for the user (None if not needed).
    """
    free = [d for d in WEEKDAY_NAMES if d not in busy]
    if not free:
        raise ValueError("Every day is marked busy, so there is no day left to train.")

    if days_per_week >= len(free):
        note = None
        if days_per_week > len(free):
            free_text = "1 free day" if len(free) == 1 else f"{len(free)} free days"
            note = (f"You asked for {days_per_week} training days but only have {free_text}, "
                    f"so the plan trains on every free day.")
        return free, note

    def gaps(combo: tuple[int, ...]) -> list[int]:
        # Days between consecutive sessions, wrapping from Sunday back to Monday.
        return [(combo[(k + 1) % len(combo)] - combo[k]) % 7 or 7 for k in range(len(combo))]

    # Best = largest smallest gap (avoid back-to-back days), then the most even gaps.
    # max() keeps the first best combination, i.e. the earliest days in the week.
    best = max(combinations(free, days_per_week),
               key=lambda c: (min(gaps(c)), -sum(g * g for g in gaps(c))))
    return list(best), None


def check_plan(plan: Plan, profile: Profile) -> list[str]:
    """Return a list of problems with the plan (empty list = plan is OK)."""
    problems = []
    busy = busy_weekdays(profile)
    days = [s.weekday for s in plan.sessions]
    expected = min(profile.availability.days_per_week, 7 - len(busy))

    if clashes := [WEEKDAY_NAMES[d] for d in days if d in busy]:
        problems.append(f"session(s) on busy day(s): {', '.join(clashes)}")
    if len(days) != expected:
        problems.append(f"{len(days)} training days instead of {expected}")
    if len(set(days)) != len(days):
        problems.append("the same day is used twice")
    limit = profile.availability.minutes_per_session
    if long := [f"{WEEKDAY_NAMES[s.weekday]} ({s.estimated_minutes} min)" for s in plan.sessions
                if s.estimated_minutes > limit]:
        problems.append(f"session(s) longer than {limit} min: {', '.join(long)}")
    for s in plan.sessions:
        if bad := [e.name for e in s.exercises if e.target.type == "reps" and e.target.min > e.target.max]:
            problems.append(f"{WEEKDAY_NAMES[s.weekday]}: rep range min > max for {', '.join(bad)}")
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


def generate_plan(client: genai.Client, model: str, profile: Profile) -> tuple[Plan, list[str]]:
    """Generate a plan; if it fails check_plan, retry once with the problems as feedback.

    Returns the plan and any problems that remain after the retry.
    """
    days, note = pick_training_days(busy_weekdays(profile), profile.availability.days_per_week)
    day_list = "\n".join(f"- Session {i}: {WEEKDAY_NAMES[d]}" for i, d in enumerate(days, 1))
    # The LLM doesn't need the timetable: the days are already fixed.
    profile_for_llm = profile.model_dump_json(indent=2, exclude={"schema_version": True,
                                                                 "availability": {"busy"}})
    message = (f"The training days are fixed. Write exactly {len(days)} sessions, in this order:\n"
               f"{day_list}\n\nUser profile:\n{profile_for_llm}")

    feedback = ""
    for _ in range(2):
        response = client.models.generate_content(
            model=model,
            contents=message + feedback,
            config=types.GenerateContentConfig(
                system_instruction=PROMPT_FILE.read_text(encoding="utf-8"),
                response_mime_type="application/json",
                response_json_schema=PlanDraft.model_json_schema(),
                temperature=0.4,
            ),
        )
        draft = PlanDraft.model_validate_json(response.text)
        plan = Plan(
            created_at=datetime.now().astimezone(),
            generator=Generator(model=model, prompt_version=PROMPT_FILE.stem),
            title=draft.title,
            summary=draft.summary,
            schedule_note=note,
            sessions=[Session(weekday=d, **s.model_dump()) for d, s in zip(days, draft.sessions)],
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


def format_target(ex: Exercise) -> str:
    """Human-readable sets x target, e.g. '3 x 10-12 reps per side' or '3 x 30 s'."""
    t = ex.target
    if t.type == "reps":
        amount = f"{t.min} reps" if t.min == t.max else f"{t.min}-{t.max} reps"
    else:
        amount = f"{t.seconds} s"
    return f"{ex.sets} x {amount}" + (" per side" if ex.per_side else "")


def to_markdown(plan: Plan) -> str:
    lines = [f"# {plan.title}", "", plan.summary, ""]
    if plan.schedule_note:
        lines += [f"> Note: {plan.schedule_note}", ""]
    for s in plan.sessions:
        lines += [f"## {WEEKDAY_NAMES[s.weekday]}: {s.title} (~{s.estimated_minutes} min)", ""]
        lines += ["**Warm-up**", *[f"- {item}" for item in s.warmup], ""]
        lines += ["**Workout**"]
        for i, ex in enumerate(s.exercises, 1):
            lines.append(f"{i}. **{ex.name}**: {format_target(ex)}, rest {ex.rest_seconds}s")
            lines.append(f"   - Tip: {ex.form_tip}")
        lines += ["", "**Cool-down**", *[f"- {item}" for item in s.cooldown], ""]
    lines += ["## How to progress", *[f"- {tip}" for tip in plan.progression_tips], ""]
    lines += [f"> {plan.safety_note}", ""]
    return "\n".join(lines)


def save_plan(plan: Plan, stem: str) -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    (OUTPUT_DIR / f"{stem}.md").write_text(to_markdown(plan), encoding="utf-8")
    (OUTPUT_DIR / f"{stem}.json").write_text(plan.model_dump_json(indent=2), encoding="utf-8")


def load_profile(path: Path) -> Profile:
    return Profile.model_validate_json(path.read_text(encoding="utf-8"))


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    client, model = make_client()

    profile_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PROFILE
    profile = load_profile(profile_path)

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
