# FitLens

> **Living document.** The concept, scope and stack are still moving fast. Treat everything below as current direction, not a spec. When something here conflicts with the code or with what the team says in the conversation, trust the code / the team and suggest updating this file.

## What it is

FitLens is a mobile app that acts as an **AI virtual personal trainer**. The goal is to do what a real PT does, at an "OK" level, for students and young people who can't afford or don't have access to one.

Current core ideas (any of these may change):

- **Camera-based coaching** – the user exercises in front of the phone camera; the app gives feedback on form/reps.
- **Personalized training plan** – workout schedule adapted to the user's goals, level and progress.
- **Nutrition guidance** – meal suggestions/plans that fit the training goal.
- **Reminders & accountability** – nudges to keep the user on schedule.
- **Chat with the trainer** – an LLM-powered conversational coach.
- **Growing avatar** – a virtual avatar representing the user that gets stronger (not bigger) as they keep training.

## Context

- University team project (course CSC10014, Group_01), 5 members.
- Graded mainly on **completion** and **creativity**; we also want the workflow to feel like a real industry project (clean repo, reviews, docs).
- Milestones: **Proposal & PoC** around week 5, **MVP** at end of term.

## Constraints

- **Free AI APIs / free tiers only** – no paid services.
- Small team, one term → prefer simple, working solutions over ambitious ones.
- Fitness and nutrition advice must stay general and safe; never present output as medical advice.

## Tech stack

_TBD – fill in once decided (mobile framework, backend, AI/LLM provider, pose-estimation approach, database)._

- **App language:** English.
- **LLM (PoC):** Google Gemini API free tier, `gemini-3.8-flash` (see `poc/plan_generator/`). Free-tier prompts may be used by Google to improve its products, so never send real personal data on the free tier.
- **Data contract:** profile and plan formats are JSON Schemas in `schemas/` (generated from `poc/plan_generator/models.py`); see `schemas/README.md` for conventions.

## Repo layout

- `schemas/` – shared data contract (JSON Schema), framework-neutral.
- `poc/` – proofs of concept (`plan_generator/`: LLM workout plans).

## How to work in this repo

- Ask before making large architectural decisions; many things are not settled.
- Keep changes small and focused; explain the "why" in commit/PR descriptions.
- Secrets go only in gitignored `.env` files (with a committed `.env.example` template); never hardcode keys. The `.githooks/pre-commit` hook enforces this once enabled with `git config core.hooksPath .githooks`.
- If a feature described above doesn't exist yet, don't assume its design – ask or propose options.
