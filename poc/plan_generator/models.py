"""FitLens data contract v1: the user profile and the workout plan.

These Pydantic models are the single source of truth. export_schemas.py turns them into
JSON Schema files in /schemas, which any framework (Flutter, React Native, Kotlin, a backend...)
can generate its own types from. Conventions are documented in /schemas/README.md.
"""

from datetime import datetime
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

# ---------- Shared building blocks ----------

Weekday = Annotated[int, Field(ge=1, le=7, description="ISO weekday: 1 = Monday ... 7 = Sunday.")]
ClockTime = Annotated[str, Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$",
                                 description="24-hour local time, HH:MM.")]
WEEKDAY_NAMES = {1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday",
                 5: "Friday", 6: "Saturday", 7: "Sunday"}

Goal = Literal["general_fitness", "build_muscle", "lose_fat", "endurance", "mobility"]
ExperienceLevel = Literal["beginner", "intermediate", "advanced"]
Equipment = Literal["bodyweight", "dumbbells", "kettlebell", "resistance_band", "pull_up_bar",
                    "bench", "jump_rope", "yoga_mat"]
BodyArea = Literal["neck", "shoulder_left", "shoulder_right", "elbow_left", "elbow_right",
                   "wrist_left", "wrist_right", "upper_back", "lower_back", "hip_left", "hip_right",
                   "knee_left", "knee_right", "ankle_left", "ankle_right"]
# Exercises the app can recognise (camera rep counter, progress stats). Anything else is null.
ExerciseId = Literal["squat", "push_up", "lunge", "plank", "glute_bridge", "jumping_jack",
                     "crunch", "mountain_climber"]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


# ---------- Profile (input, filled by the onboarding form) ----------

class Limitation(Strict):
    area: BodyArea
    note: str = Field("", description="The user's own words, e.g. 'pain when bending it back'.")


class BusySlot(Strict):
    weekday: Weekday
    start: ClockTime | None = Field(None, description="Omit start and end for the whole day.")
    end: ClockTime | None = None

    @model_validator(mode="after")
    def _times_valid(self) -> Self:
        if (self.start is None) != (self.end is None):
            raise ValueError("give both start and end, or neither (= whole day)")
        if self.start is not None and self.start >= self.end:
            raise ValueError("start must be before end")
        return self


class Availability(Strict):
    days_per_week: int = Field(ge=1, le=7)
    minutes_per_session: int = Field(ge=10, le=180)
    busy: list[BusySlot] = []


class Profile(Strict):
    schema_version: Literal[1] = 1
    age: int = Field(ge=13, le=100)
    sex: Literal["male", "female", "other"]
    height_cm: float = Field(gt=0)
    weight_kg: float = Field(gt=0)
    goal: Goal
    goal_note: str = ""
    experience_level: ExperienceLevel
    equipment: list[Equipment] = Field(min_length=1)
    equipment_note: str = ""
    training_location: str = ""
    limitations: list[Limitation] = []
    availability: Availability


# ---------- Plan (output) ----------

class RepsTarget(Strict):
    type: Literal["reps"]
    min: int = Field(ge=1)
    max: int = Field(ge=1, description="Same as min for a fixed number of reps.")


class TimeTarget(Strict):
    type: Literal["time"]
    seconds: int = Field(ge=1)


class Exercise(Strict):
    name: str
    exercise_id: ExerciseId | None = Field(
        description="Catalog id if this is that movement or a close variation, else null.")
    sets: int = Field(ge=1)
    target: RepsTarget | TimeTarget = Field(description="Per set.")
    per_side: bool = Field(description="True if the target is done for each side/leg/arm.")
    rest_seconds: int = Field(ge=0)
    form_tip: str


class SessionDraft(Strict):
    """A session as the LLM writes it: no day, because code picks the days."""
    title: str = Field(description="Short session title, e.g. 'Lower body & core'. No day name.")
    estimated_minutes: int = Field(ge=1)
    warmup: list[str]
    exercises: list[Exercise]
    cooldown: list[str]


class PlanDraft(Strict):
    """What Gemini is forced to return."""
    title: str
    summary: str
    sessions: list[SessionDraft]
    progression_tips: list[str]
    safety_note: str


class Session(SessionDraft):
    weekday: Weekday


class Generator(Strict):
    model: str
    prompt_version: str


class Plan(Strict):
    schema_version: Literal[1] = 1
    created_at: datetime
    generator: Generator
    title: str
    summary: str
    schedule_note: str | None = Field(None, description="Message about the schedule, e.g. too few free days.")
    sessions: list[Session]
    progression_tips: list[str]
    safety_note: str
