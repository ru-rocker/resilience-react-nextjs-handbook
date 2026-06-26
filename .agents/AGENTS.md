# Workspace Rules — Resilience React Next.js Handbook

This workspace contains strict guardrails for frontend services. The agent must always adhere to the rules outlined in `GEMINI.md` and follow the architectural guidelines in `architecture.md`.

## Critical Instructions
1. **Always read `GEMINI.md` and `architecture.md`**: Before suggesting or editing code, ensure you are fully aligned with the frontend resilience rules.
2. **Resilience Audit**: Every response containing code changes must start with a Frontend Resilience Audit as detailed in `GEMINI.md`.
3. **Verify Dependencies**: Do not introduce new libraries, SDKs, or telemetry tools without checking `package.json` and asking the developer first.
