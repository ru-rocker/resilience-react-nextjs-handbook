---
name: ux-ui-design
description: Activated when the user asks for modern web UI/UX design, visual aesthetics, glassmorphism, responsive grids, custom theme setup, styling systems, or UX/UI component patterns.
---

# Premium UX/UI Design Guidelines

This skill enforces modern, premium visual standards, cohesive styling, responsive layouts, and interactive micro-animations.

## 1. Design Philosophy & Aesthetics (White, Yellow, and Blue Palette)
- **Primary Color (Blue)**: A deep, rich corporate/electric blue (`hsl(220, 85%, 57%)`) for primary branding, navigation components, links, and major actions.
- **Accent Color (Yellow)**: A warm, bright yellow/gold (`hsl(45, 100%, 50%)`) for callouts, highlighting selected states, badges, warnings, and custom interaction feedback.
- **Base Neutral (White)**: Pure white (`hsl(0, 0%, 100%)`) for primary text in dark mode, cards and container backgrounds in light mode, and crisp whitespace partitions.
- **Wow Factor**: Use curated, harmonious variations of these colors (prefer HSL values over raw hex codes). Avoid browser default colors and raw primary red/blue/green.
- **Glassmorphism**: Implement rich background-blur effects (`backdrop-filter: blur()`) with semi-transparent overlays (`rgba` or `hsla` with low opacity) and subtle borders to build layers.
- **Modern Typography**: Avoid browser default fonts. Use typography from Google Fonts (e.g., Inter, Outfit, Plus Jakarta Sans) with defined hierarchy (font sizes, weights, and line heights).

## 2. Layout & Responsive Systems
- **Fluid Layouts**: Build page layouts using CSS Grid and Flexbox. Utilize container queries (`@container`) and CSS `clamp()` for fluid font sizing and spacing.
- **Consistent Spacing**: Use a modular grid spacing scale (e.g., 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px) using CSS variables to maintain consistent alignment.

## 3. Micro-Animations & Transitions
- **Hover Effects**: Add smooth, subtle hover states (`transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`) on buttons, links, cards, and input fields.
- **Interactive Feedback**: Use micro-animations to indicate state changes (e.g., loading states, validation indicators, popover reveals).
- **Reduced Motion**: Respect user preferences by wrapping animations in media queries for `@media (prefers-reduced-motion: no-preference)`.

## 4. Styling Systems & Tokenization
- Implement the White, Yellow, and Blue styling tokens as CSS variables in `index.css` under the `:root` pseudo-class for seamless theme integration:
  ```css
  :root {
    /* Blue Brand Palette */
    --color-blue-50: hsl(220, 95%, 96%);
    --color-blue-500: hsl(220, 85%, 57%);
    --color-blue-700: hsl(220, 80%, 45%);

    /* Yellow Accent Palette */
    --color-yellow-100: hsl(45, 100%, 90%);
    --color-yellow-500: hsl(45, 100%, 50%);
    --color-yellow-600: hsl(42, 95%, 45%);

    /* White and Neutrals */
    --color-white: hsl(0, 0%, 100%);
    --color-gray-50: hsl(210, 20%, 98%);
    --color-gray-100: hsl(210, 16%, 93%);
  }
  ```
- Design for both dark mode and light mode, switching tokens via a `.dark` class on the body or the `prefers-color-scheme` media query.
