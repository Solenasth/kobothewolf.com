---
id: accessibility
title: Accessible web UI
version: 1
scope: opt-in
enforcement: hard
---

## Rule
User-facing web UIs meet WCAG 2.2 AA, and automated tests check it in CI.

## Why
Accessibility that isn't tested regresses quietly. Keyboard and screen-reader users can't use what they can't reach.

## How to apply
- Run axe (for example `@axe-core/playwright`, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) on every view and every state that changes the UI (tabs, dialogs, menus). Cover every language and desktop and phone widths (for example 1280 and 360 px). Allow no serious or critical violations. Record each exception with the WCAG clause that allows it.
- Test the main task end to end with the keyboard only.
- Walk the Tab order in a test: every stop has an accessible name and a visible focus ring.
- With `prefers-reduced-motion: reduce`, nothing animates and scrolling doesn't glide.
- Images have text alternatives, and decoration is hidden from assistive tech. A complex preview is one labeled image, not raw content read out of context.
- Targets are at least 24 px, or meet WCAG's spacing exception.
- Run the tests in every browser engine CI covers. WebKit on macOS skips links on Tab unless Option is held.
- Automated checks don't cover screen readers. A manual pass (VoiceOver, NVDA) is reported as done or not done.

## Verification
The accessibility tests pass in CI, and the Verified section says whether a screen reader was used.
