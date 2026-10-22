# FitLens Mobile App

This directory is reserved for the mobile application client (Flutter / React Native).

## Architecture Highlights
- **On-Device Vision:** Pose estimation (MediaPipe / ML Kit) runs locally on the phone's RAM.
- **Local Storage:** SQLite / Hive for offline workout caching and streak tracking.
- **Privacy:** Zero video retention; only joint angles and rep statistics are transmitted.
