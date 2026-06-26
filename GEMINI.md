# GEMINI.md — Compact Frontend Resilience Guardrails

Use this file as the repository-level Gemini guardrail for frontend services. Keep it compact; the Confluence handbook remains the full human-readable reference.

## Dependency Verification Gate

Before writing resilience, telemetry, analytics, schema validation, rate limiting, bulkhead, or deployment-recovery code, inspect the repository configuration first:

- Check `package.json`, lockfiles, existing app structure, and framework configuration.
- Confirm whether the project uses Next.js App Router, React Router, or another routing model.
- Confirm whether validation, telemetry, analytics, and traffic-control libraries already exist.

If required telemetry frameworks, analytics SDKs, validation libraries, or resilience utilities are missing, halt and ask the developer for confirmation before adding platform telemetry blocks, SDK integrations, or new dependencies.

## Mandatory Rules

1. Contain UI failures locally. Use route-level and component-level error boundaries for critical or high-risk UI regions.
2. Validate all external API payloads at the data boundary before writing to state, cache, or rendered components.
3. Client retries must be bounded and limited to immutable/idempotent reads. Do not silently retry mutating flows. Implement retries using a utility (such as `fetchWithRetry`) that immediately halts retries on abort signals (`AbortError`), restricts retries strictly to transient server errors (HTTP >= 500) or network dropouts (skipping 4xx client errors), and employs exponential backoff.
4. Use purposeful loading states. Never leave users behind infinite spinners; transition to fallback, stale data, retry UI, or actionable error UI after exhaustion.
5. Preserve or generate trace/correlation identifiers. Forward trace IDs in headers (e.g. `X-Trace-Id`) through internal backend/proxy requests and telemetry events. Do NOT attach custom trace headers to third-party API requests to avoid CORS preflight (`OPTIONS`) blockages; instead, track them locally in client logs and boundaries.
6. Telemetry is conditional. Use existing telemetry services when present; otherwise ask before adding Sentry, Firebase, CleverTap, OpenTelemetry, or custom telemetry engines. Never create broken telemetry stubs.
7. Sanitize telemetry and logs. Do not send passwords, tokens, card data, full account numbers, sensitive payloads, or unnecessary personal data.
8. Use cache, ISR, stale-data, or client cache patterns only where business correctness allows staleness. Do not use stale data for strict confirmation or security-sensitive states.
9. Detect deployment asset or chunk-load failures and recover safely, typically by refreshing to the latest build when state loss is acceptable.
10. Rate-limit high-frequency browser flows and isolate critical API calls from optional/noisy calls using separate request budgets or concurrency lanes.
11. Keep metric and analytics labels low-cardinality. Do not use customer IDs, account numbers, request IDs, full URLs, raw exception messages, tokens, or sensitive values as labels.
12. Ask before introducing new libraries, SDKs, telemetry platforms, validation libraries, state libraries, traffic-control utilities, or framework-specific assumptions if they are absent from the repository.
13. Write resilient tests. Every core business flow or hooks logic must have associated tests that verify success, empty states, and API/network error fallback states. Mock network boundaries cleanly (e.g., using MSW or mock fetch handlers) to guarantee test reliability.

## Optional Reference Files

Create these only if the repository needs longer local context beyond this compact file:

- `architecture.md` — Frontend service layering, UI fault-isolation boundaries, data validation boundary, trace propagation model, cache/rendering strategy, deployment recovery model, and infrastructure-awareness patterns such as edge, gateway, CDN, or sidecar integration.

## Response Audit

Every code response must start with a Frontend Resilience Audit covering UI boundary isolation, payload validation, retry safety, trace/correlation propagation, telemetry dependency verification, privacy/sanitization, cache or deployment impact, rate-limit/bulkhead impact, and test coverage/mock validation when relevant.
