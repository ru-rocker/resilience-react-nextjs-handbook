---
name: frontend-testing
description: Guidelines, tooling, and best practices for writing resilient frontend tests, including unit tests, custom hook verification, error boundary behavior, and mocking network boundaries.
---

# Resilient Frontend Testing Guidelines

This skill defines the testing standards and code-generation rules to guarantee the resilience and correctness of frontend applications.

## 1. Network Boundary Mocking
- **MSW (Mock Service Worker)**: Prefer using MSW for API mocking to intercept requests at the network layer rather than patching global `fetch` or Axios clients.
- **Fail-Safe Testing**: For every API integration, write tests that mock network failures:
  - **HTTP Errors (500, 404, 403)**: Verify the UI renders appropriate error fallback panels instead of freezing or crashing.
  - **Latency / Timeouts**: Verify loading states or progress bars trigger correctly.
  - **Malformed Payload**: Mock invalid schema payloads to verify that the validation boundary (e.g., Zod) catches the discrepancies and recovers gracefully.

## 2. Testing Custom Hooks
- Use `@testing-library/react-hooks` or React 18's `renderHook` to test custom hooks in isolation.
- Verify internal state changes, debouncing cycles, retry mechanisms, and cache revalidation triggers.

## 3. UI and Error Boundary Testing
- **Local Error Boundaries**: Write component tests that intentionally throw rendering errors to verify that the nearest parent error boundary intercepts the exception, logs it, and presents the fallback UI.
- **Accessibility (a11y)**: Integrate axe-core audits inside tests (`jest-axe`) to catch basic color contrast, missing labels, and bad DOM hierarchies automatically.

## 4. Test Framework Conventions
- **Tooling**: Prefer Vitest + React Testing Library for fast, lightweight in-memory DOM execution.
- **Async Elements**: Use `findBy*` queries to locate items that appear asynchronously after api calls. Avoid arbitrary sleep/timeout delays inside tests.
- **Cleanups**: Ensure mock servers (`msw`) reset handlers after every test block to prevent test-leakage contamination.
