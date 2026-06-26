# Resilient Weather Map Dashboard 🌦️🗺️

Welcome to the **Resilient Weather Map Dashboard**! This project is a modern Next.js React application that lets users search for locations, pinpoint them on an interactive map, and view live weather metrics.

The primary goal of this repository is to demonstrate **Frontend Resilience**—ensuring the app remains fast, stable, and error-free even when networks fail or APIs respond slowly.

---

## 🚀 Technology Stack
* **Framework**: [Next.js](https://nextjs.org/) (App Router with TypeScript).
* **Map Engine**: [Leaflet](https://leafletjs.org/) (Client-side interactive maps).
* **Data Validation**: [Zod](https://zod.dev/) (Runtime schema validator).
* **HTTP Client**: [Axios](https://axios-http.com/) & Native Fetch.
* **Resilience Tools**: `axios-retry` & `p-limit`.
* **Testing**: [Jest](https://jestjs.io/) & [ts-jest](https://kulshekhar.github.io/ts-jest/).

---

## 🛡️ Frontend Resilience Patterns (Explained simply!)

When building web applications, we must assume that the network is unreliable and downstream APIs can fail or respond slowly. Here is how we protect our app:

### 1. Debouncing (API Spam Prevention)
When a user types in the search bar, we do not send a request for every single keystroke. Instead, we use **debouncing** (set to `400ms`). 
* *How it works*: The app waits until the user pauses typing for `400ms` before triggering the API.
* *Why*: It prevents spamming Nominatim's geocoding API with useless single-character queries.

### 2. Race Condition Prevention (The "Active" Closure)
If a user searches for "Kyoto" and then deletes a letter to search for "Kyot", we have two requests in flight. If the older request ("Kyoto") takes longer to resolve and returns *after* "Kyot" has already rendered, it would overwrite the screen with wrong search results.
* *How it works*: We use a cleanup flag (`active = true`) inside a React `useEffect` hook. When the query changes, the cleanup function runs and sets `active = false` for the previous query.
* *Why*: Even if the slower request resolves later, the state update is safely discarded, ensuring only the **latest search text** matches what is on screen.

### 3. Concurrency Bulkhead (`p-limit`)
A **bulkhead** partitions resources so that one failing or noisy feature doesn't consume all device resources or API limits. 
* *How it works*: We wrap search queries in `p-limit(2)`. This ensures that a maximum of **2 search requests** can run concurrently.
* *Why*: OpenStreetMap Nominatim has strict usage policies. Limiting concurrency protects our client IP from being banned and prevents the browser from overloading the connection pool.

### 4. Exponential Backoff Retries & Jitter
If the server is temporarily overloaded (responding with a `502 Bad Gateway` or timing out), retrying instantly can worsen the overload (known as the **thundering herd** problem).
* **Exponential Backoff**: We wait longer on each failure (e.g., $300\text{ms} \rightarrow 600\text{ms} \rightarrow 1200\text{ms}$).
* **Jitter (Randomness)**: We add random noise to the delay (so instead of exactly $600\text{ms}$, a client might wait $487\text{ms}$ or $550\text{ms}$).
* *Why*: 
  * Backoff gives the server time to recover.
  * Jitter spreads retry attempts out over time, preventing thousands of browsers from hitting the server in synchronized waves.
  * In our Axios geocoding client, this is handled automatically via `axiosRetry.exponentialDelay`. In custom fetch wrappers, we add it by multiplying the delay by a random factor (`Math.random()`).

---

## 💡 FAQ & Key Concepts

### Q1: Why do we have two types of fetch? (Vanilla vs. Axios)
You will notice we use both native `fetch` (with a custom `fetchWithRetry` helper) and `axios` (with `axios-retry`). We deliberately implemented both patterns as reference samples so you can choose the best approach for your specific project constraints:

* **Axios (`searchLocations` / Geocoding)**:
  * We chose Axios for autocomplete searches because we wanted to plug in `axios-retry` natively, which has pre-built, robust exponential backoff.
  * Axios provides cleaner parameter handling and handles browser-specific request cancellation behaviors uniformly under the hood.
* **Vanilla Fetch (`fetchWeather` / Weather API)**:
  * We kept the weather query on vanilla `fetch` to keep our application lightweight and avoid over-engineering simple, straightforward endpoints.
  * It demonstrates that you can achieve the exact same retry safety without pulling in heavy external packages when native APIs suffice.

### Q2: What is the purpose of passing `signal` inside `p-limit`?
When we trigger a search, we pass an `AbortSignal` to our Axios request options:

```typescript
return geocodeLimit(async () => {
  const response = await nominatimClient.get('/search', {
    params: { q: query },
    signal: signal || undefined, // <-- The AbortSignal
  });
  return response.data;
});
```

* **The Problem**: If `p-limit` is holding a request in queue (waiting for its turn) and the user types another letter, React aborts the request.
* **The Solution**: 
  * By passing `signal`, Axios intercepts the cancellation *before* it even makes it to the network. It aborts instantly.
  * Because it aborts, it throws an error immediately. `p-limit` detects the task is settled, and **instantly frees up that bulkhead slot** so the next query can run without any lag.

### Q3: Why do we not send `traceId` headers to public APIs?
Trace IDs correlate logs so developers can track a user's action across systems. 
* **The Risk**: Sending a custom header like `X-Trace-Id` to `openstreetmap.org` or `open-meteo.com` causes the browser to issue an HTTP `OPTIONS` preflight check. Public APIs will block these requests because they do not permit custom headers in their CORS configuration.
* **The Solution**: We generate the `traceId` client-side and use it strictly for **local console logging and error boundaries**. We strip it from the headers of outgoing public requests to keep the app working.

---

## 🔒 Idempotency Retry Rule
**We only retry requests that are safe and idempotent (`GET` requests).**

* **Idempotent (`GET`)**: Querying weather data or searching a location does not alter anything on the server. If the request fails, retrying is safe.
* **Non-Idempotent (`POST`, `PUT`, `DELETE`)**: If this app had a "Submit Payment" or "Delete Account" button, we would **never** silently retry them. Doing so could charge a customer twice or trigger side-effects. Mutating requests must be protected with explicit idempotency keys.
