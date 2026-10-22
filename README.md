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

## Projects & Structure

```
FitLens/
├── mobile/                 # Mobile client app (Flutter / React Native)
├── backend/                # Backend API & safety router (FastAPI)
├── poc/
│   └── plan_generator/     # Proof of concept: Gemini weekly workout plan generator
├── docs/                   # System Blueprint, architecture, and meeting slides
│   └── reference/          # Course reports, data design notes, and security slide deck
└── .githooks/              # Shared git hooks (blocks committed secrets & .env files)
```

## Branch & Pull Request (PR) Workflow

To keep the repository clean and avoid merge conflicts, all team members follow these rules:

### 1. Branching Convention
Never commit directly to `main`. Create a feature branch from latest `main`:
- `feature/<short-desc>`: New features (e.g. `feature/camera-pose`, `feature/chat-coach`)
- `fix/<short-desc>`: Bug fixes (e.g. `fix/api-timeout`)
- `docs/<short-desc>`: Documentation, architecture, slides (e.g. `docs/blueprint-v1`)

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### 2. Commit Guidelines
- Write concise, descriptive commit messages in English or Vietnamese (e.g., `feat: add pose angle calculation`, `docs: update system blueprint`).
- Verify pre-commit hook passes: secrets and `.env` files must NEVER be committed.

### 3. Pull Request (PR) Process
1. Push branch to GitHub: `git push -u origin feature/your-feature-name`
2. Open a PR into `main`.
3. Provide a brief summary of:
   - What changed
   - How to test / verify
4. At least one teammate review or self-check before merging. Keep PRs small and focused.

