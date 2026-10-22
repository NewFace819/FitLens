# FitLens Backend API

This directory is reserved for the backend service (FastAPI / Express).

## Responsibilities
- **API Gateway:** Authentication via HTTPS + JWT.
- **Safety Filter & Router:** Rule-based interceptor for pain reports and medical safety.
- **LLM Boundary:** Pseudonymization filter that strips PII before querying Gemini.
- **Data Persistence:** Database queries with strict row-level security (`WHERE user_id = :auth_id`).
