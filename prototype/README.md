# FitLens UI prototype

Work-in-progress mobile UI prototype for the FitLens student project. It is an HTML/CSS/JavaScript design study, not the production mobile app.

## View locally

Run `python -m http.server 8000` in this folder and open `http://127.0.0.1:8000/`. Start at Home and stay in the same browser tab: some prototype state uses sessionStorage.

## Main screens

- Home -> Steps -> **post-walk-restored.html** -> Home
- Home / Workouts -> Setup plan -> weekly draft -> Reminders -> Home
- Workouts -> Workout details -> Workout active -> Workout review -> Home
- Workout details / Active -> optional Camera setup
- Workouts / Details -> Chat
- Home -> Food; Home -> Insights -> Monthly recap

The older post-walk implementation and visual experiments are deliberately excluded.

## Prototype limits

Camera setup does not capture video, count reps, or evaluate pose. Chat uses local sample replies. Reminders are previews and send no notifications. Workout and recap data are examples. Food has three sample recipes; this public snapshot uses original vector placeholders instead of temporary third-party photos. Two Home icons that had been traced from reference artwork were also replaced. Nunito and Lora fonts are included under their OFL licences in `assets/fonts/`.

For architecture and use cases, treat UI states and transitions as design intent. Confirm storage, notifications, AI, injury handling, and adaptive planning with the team before implementation.
