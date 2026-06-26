# architecture.md — Frontend Resilience Architecture Context

Use this file only when the repository needs structural context beyond the compact `GEMINI.md`. Keep the rules in `GEMINI.md`; keep architecture decisions, ownership boundaries, and local project context here.

## Execution Flow

```plaintext
User action / route navigation
        │
        ▼
Edge / middleware trace context
        │
        ▼
Route segment boundary (`error.tsx`, `loading.tsx`, layout boundary)
        │
        ▼
Data fetch boundary
        │
        ▼
Payload validation and normalization
        │
        ▼
Client cache / server cache / ISR decision
        │
        ▼
Critical or optional request lane
        │
        ▼
Rendered component / fallback UI / telemetry event
```

## Architectural Layers

### 1. UI Fault Isolation Layer

- Critical route segments must define local error and loading behavior.
- High-risk widgets, third-party embeds, analytics panels, recommendations, and experimental components should have component-level boundaries.
- A local UI failure must not remove global navigation, authentication state, or primary workflow controls.

### 2. Data Boundary Layer

- Treat backend, CMS, gateway, edge, and third-party responses as untrusted input.
- Validate and normalize payloads before writing them into React state, shared stores, caches, or rendered components.
- Separate transport failure, schema validation failure, empty state, and authorization failure so the UI can show the correct fallback.

### 3. Fetch Resilience Layer

- Retries are allowed only for immutable or idempotent read paths.
- Mutating actions such as submit, checkout, transfer, payment, create, update, and delete must not be silently retried unless explicit idempotency and duplicate protection exist.
- Implement retries using a controlled utility (such as `fetchWithRetry`) that:
  - Immediately halts retries if the request is canceled or aborted (intercepts `AbortError`) to avoid executing zombie requests.
  - Limits retries strictly to transient server-side errors (HTTP >= 500) and network dropouts, skipping client errors (4xx) to minimize load.
  - Employs an exponential backoff strategy with optional jitter.
- Retry exhaustion must transition to stale data, retry UI, fallback UI, or actionable error UI. Infinite spinners are prohibited.
- Search-as-you-type, autocomplete, polling, refresh loops, and other high-frequency read flows must use input/request controls such as debouncing, throttling, deduplication, minimum input gates, or bounded request budgets.
- Concurrent client requests must prevent stale or out-of-order responses from overwriting newer UI state, using cancellation, request sequencing, active request tracking, or equivalent safeguards.

### 4. Cache and Rendering Layer

- Use cache, ISR, stale-data, or client-side cache patterns only where business correctness allows staleness.
- Do not serve stale data for strict confirmation, payment completion, security state, entitlement, or other correctness-sensitive flows.
- Cache tags, revalidation windows, and invalidation scope must match business data boundaries.

### 5. Client Traffic-Control Layer

- Rate-limit noisy flows such as search-as-you-type, polling, refresh loops, repeated clicks, and optional dashboard updates.
- Isolate critical lanes such as login, checkout, payment confirmation, account access, and navigation from optional lanes such as recommendations, banners, analytics, and polling.
- Optional-lane saturation must degrade optional UI only. It must not block critical user journeys.

### 6. Deployment Recovery Layer

- Detect deployment asset or chunk-load failures caused by version skew between active browser sessions and the latest deployed build.
- Recover safely by refreshing to the latest build when state loss is acceptable, or by showing explicit recovery guidance when automatic refresh could lose critical user input.
- Chunk-load incidents should be observable because they often indicate rollout skew, CDN propagation delay, or cache invalidation issues.

### 7. Observability and Telemetry Layer

- Preserve or generate trace and correlation identifiers at the edge, route, request, and telemetry boundaries:
  - Generate a distinct correlation/trace ID client-side for each user request flow.
  - Forward trace headers to internal api/middleware systems.
  - Strip trace ID headers from outgoing requests to external third-party servers to prevent CORS preflight (`OPTIONS` request) blocking, logging the IDs locally in telemetry logs and console warnings instead.
- Browser APIs and third-party service calls that may fail or be denied by the user must catch failure states, emit privacy-safe diagnostics where appropriate, and degrade to a safe fallback UI instead of crashing or blocking the primary workflow.
- Telemetry engines are conditional. Confirm existing Sentry, Firebase, CleverTap, OpenTelemetry, analytics, or custom telemetry services before writing integration code.
- When telemetry is unavailable, do not create broken stubs. Ask the developer before adding SDKs or platform-specific tracking blocks.
- Telemetry must be privacy-safe and low-cardinality.

## Ownership Split

The frontend application owns UI fault isolation, payload validation, client retry discipline, fallback behavior, cache correctness decisions, client-side traffic control, trace enrichment, privacy-safe telemetry payloads, and deployment recovery behavior.

The platform, edge, CDN, gateway, or sidecar may own trace injection, routing, cache delivery, TLS termination, WAF rules, origin shielding, traffic shaping, asset delivery, and baseline network telemetry when those capabilities are confirmed.

Business-impact telemetry platforms may own event collection and dashboards, but the application owns when a user-visible degraded state is emitted and which safe metadata is attached.

## Infrastructure-Awareness Model

Gemini must detect the active project model before generating code:

- Routing: Next.js App Router, Pages Router, React Router, or another framework.
- Runtime boundary: browser-only, server component, edge runtime, middleware, API route, or server action.
- Delivery path: CDN, edge middleware, gateway, reverse proxy, sidecar, or direct origin.
- Telemetry path: existing Sentry, Firebase, CleverTap, OpenTelemetry, analytics service, custom logger, or none confirmed.
- Validation path: existing schema library, generated API types, runtime validator, or manual validation.
- Traffic-control path: SWR, TanStack Query, Axios, fetch wrapper, custom client, rate limiter, or concurrency limiter.
- Browser capability path: geolocation, camera, media capture, notifications, storage, clipboard, payment APIs, maps/geocoding, or other user-permissioned APIs.

If the repository does not confirm a capability, Gemini must ask before assuming it.

## Architecture Decision Notes

Record project-specific decisions here, for example:

- Which routes are critical journeys and require stricter isolation.
- Which API responses must be validated before rendering.
- Which data domains may use stale cache and which must remain real-time.
- Which request lanes are critical versus optional.
- Which autocomplete/search inputs require stricter debounce, throttle, or minimum-character policies.
- Which browser/device APIs are used, what denial or failure fallback should render, and whether the feature is critical or optional.
- Which third-party lookup services are approved, including maps/geocoding providers, required trace headers, throttling limits, and safe fallback behavior.
- Which telemetry destination is approved and which events represent customer blast radius.
- Which deployment recovery strategy is safe for active sessions.
