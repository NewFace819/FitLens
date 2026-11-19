# FitLens UI prototype

Interactive mobile UI prototype for the FitLens student project. It is an HTML/CSS/JavaScript design study exploring daily activity tracking, adaptive workout scheduling, and post-workout reflection.

## Project status & team scope (2026-11-14 update)

- **Active features:** Daily Home and activity overview, Steps daylight sun curve, Workout library, weekly Plan generation, active workout set tracking, post-workout reflection/heatmap, and Profile/Account sheet.
- **Dropped / Historical modules:** Nutrition planning and trainer chat were dropped from the project scope on 2026-11-14. Files such as `food.html` and `chat.html` remain in this prototype solely as historical compatibility artifacts so existing navigation links do not break.
- **Media provenance:** Local food photographs with unverified licensing have been excluded from the repository. Only original public-safe vector placeholders in `assets/food/demo/` are preserved.

## View locally

1. Open a terminal in this `prototype/` folder.
2. Start a local HTTP server:
   ```bash
   python -m http.server 8000 --bind 127.0.0.1
   ```
3. Open `http://127.0.0.1:8000/` (redirects to `home.html`) in Chrome or Edge.
4. Press F12, toggle the device simulation toolbar, and select **Responsive, 390 × 844** at 100% zoom.

## Key screens

- **Today (Home):** `home.html` — weekly schedule, Today's activity bento (steps, workout time, completed sets), and Account sheet.
- **Home demo & workbench:** `home-demo.html` — state switcher and appearance controls outside the phone frame.
- **Steps:** `steps.html` — hourly activity daylight sun and progress trend.
- **Workouts & Plan:** `workouts.html`, `plan.html`, `setup-plan.html` — exercise library, weekly routine draft, and reminder previews.
- **Workout Active & Review:** `workout-details.html`, `workout-active.html`, `workout-review.html` — set logger, rest timer, volume calculation, and muscle heatmap.
- **Camera study:** `camera-setup.html` — illustrated UI concept for form check (camera hardware is not accessed).
- **Onboarding:** `welcome.html`, `profile-setup.html` — initial profile setup and permission preview flows.

## Prototype limits

- **Storage:** Client-side only (`localStorage` and `sessionStorage`). No backend server or user account sync.
- **Sensors & Integrations:** Health data, step counting, push notifications, and camera rep counting are illustrative sample designs and do not communicate with hardware sensors or live AI services.
- **Typography:** Nunito and Lora fonts are included under their SIL Open Font License (OFL) in `assets/fonts/`. Platform typography uses standard system font stacks (`-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif`) instead of proprietary SF Pro OTF.
