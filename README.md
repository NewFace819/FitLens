# FitLens

An AI virtual personal trainer app for students and young people. Team project for CSC10014 (Group_01).

## First-time setup (every teammate)

After cloning, run this once in the repo folder:

```bash
git config core.hooksPath .githooks
```

This turns on the shared pre-commit check. It blocks commits that include a `.env` file or anything that looks like an API key (Gemini, Groq, OpenRouter, private keys).

## Secrets

- API keys live **only** in `.env` files, which git ignores. Each folder that needs keys has a `.env.example` template: copy it to `.env` and fill it in.
- Never paste a key into code, a `.env.example`, an issue, or chat.
- If a key ever gets committed or pushed, **revoke it right away** (for Gemini: aistudio.google.com/apikey) and make a new one. Deleting the commit isn't enough, because the key stays in git history and may already have been copied.

## Projects

- [`poc/plan_generator/`](poc/plan_generator/README.md): proof of concept that turns a user profile into a weekly workout plan using the Gemini free tier.
