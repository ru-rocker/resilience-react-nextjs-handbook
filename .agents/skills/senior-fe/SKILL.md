---
name: senior-frontend
description: Activated when the user asks for senior-level React/Next.js frontend development, performance optimization, advanced styling, state management, or architecture reviews.
---

# Senior Frontend Developer (React & Next.js) Guidelines

This skill provides advanced frontend engineering patterns, clean code principles, and performance optimization techniques for React and Next.js applications.

## 1. Advanced React & TypeScript Patterns
- **Type Safety**: Write strict TypeScript. Prefer interface composition over intersection types. Avoid `any` at all costs.
- **Custom Hooks**: Isolate business logic from UI components by encapsulating state management, side effects, and API requests inside custom hooks.
- **Compound Components**: Use the Compound Component pattern for complex UI widgets (e.g., Select, Modal, Tabs) to provide maximum flexibility and clean HTML rendering.

## 2. Rendering & State Management Optimization
- **Re-render Prevention**: Split context providers to isolate state values from update dispatches to prevent unnecessary re-renders of consuming components.
- **Memoization**: Strategically apply `useMemo` and `useCallback` on expensive computations or object references passed as dependencies or props to memoized components.
- **State Colocation**: Keep state as close to where it is used as possible. Avoid lifting state up globally if it is only consumed by a localized subtree.

## 3. Data Fetching and Boundary Discipline
- Use declarative fetching libraries (e.g., SWR or TanStack Query) to manage cache states, automatic revalidation, and loading/error states.
- Always implement the Data Boundary layer: validate all external API payloads using schema libraries (e.g., Zod) before putting data in state or context.

## 4. Accessibility (a11y) & Semantic HTML
- Ensure all interactive elements have appropriate ARIA attributes, focus states, and keyboard navigation support.
- Use semantic HTML tags (`<header>`, `<main>`, `<footer>`, `<section>`, `<nav>`, `<article>`) to structure documents correctly.
