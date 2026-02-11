# Timeline Studio — Backlog

> Migrated from `timeline project edits.txt`. Items sized and prioritized based on user impact, technical complexity, and alignment with the V1 release goal.

## Size Key
| Size | Meaning | Rough Effort |
|------|---------|--------------|
| **XS** | Trivial tweak, <1 hour | Quick fix or config change |
| **S** | Small, focused change, ~half day | Single function or CSS fix |
| **M** | Moderate, ~1-2 days | Touches multiple areas or requires design |
| **L** | Large feature, ~3-5 days | New system or significant refactor |
| **XL** | Major feature, ~1-2 weeks | Multi-system, phased delivery |

## Priority Key
| Priority | Meaning |
|----------|---------|
| **P0 — Critical** | Must fix before V1 release |
| **P1 — High** | Should fix before V1; impacts daily usability |
| **P2 — Medium** | Nice to have for V1; improves polish |
| **P3 — Low** | Backlog for V2+; cosmetic or niche |

---

## Bugs

| # | Title | Description | Size | Priority | Notes |
|---|-------|-------------|------|----------|-------|
| B1 | **Watermark drift on scroll** | Watermark doesn't stay auto-centered/aligned when the user scrolls the timeline. | S | P1 | Likely a CSS `position: fixed` vs `sticky` issue or a scroll-event offset calculation. Visible in every session. |
| B2 | **Export/screenshot label misalignment** | Some labels appear in incorrect positions during PNG/SVG export. What's on-screen doesn't match the exported output. | M | P0 | Breaks trust in exports — users share these with leadership. Probably a timing issue where Canvas renders before layout is finalized. |
| B3 | **Export missing visual elements** | Weekend shading and possibly other visible timeline elements (holidays, today marker) don't appear in screenshots/exports. | S | P0 | Related to B2. Audit every visual layer to confirm it's included in the export pipeline. |
| B4 | **Right-click add doesn't center on cursor** | When adding a new item via right-click, it doesn't place the item at the cursor's position on the timeline. | XS | P2 | Minor UX annoyance. Likely just needs the click coordinates passed through to the creation logic. |

---

## Features

| # | Title | Description | Size | Priority | Notes |
|---|-------|-------------|------|----------|-------|
| F1 | **Fit-to-timeline on open** | When opening a new or saved project, auto-zoom/scroll to fit visible tasks and milestones in the viewport. | S | P1 | Great first-impression UX. Calculate min/max dates across items, set zoom and scroll offset to frame them. |
| F2 | **Ctrl+Scroll zoom** | `Ctrl+Scroll` zooms ±5%. `Ctrl+Shift+Scroll` zooms ±1% for fine-tuning. Should mirror the toolbar zoom behavior. | S | P1 | Standard UX pattern users expect. Need to prevent default browser zoom and bind wheel events with modifier checks. |
| F3 | **Collapsible sub-swimlanes** | Allow sub-swimlanes to be individually collapsed/expanded, not just top-level swimlanes. | M | P2 | Requires a `collapsed` flag per sub-swimlane and updates to height calculation in `met()` and rendering. |
| F4 | **Days scale option** | Add "Days" to the timescale options (currently: Weeks, Months, Quarters, Years). | L | P2 | Significant rendering work — every column becomes one day. Needs header format, column width tuning, and performance consideration for long timelines. |
| F5 | **Sharper export/screenshot** | Improve crispness of PNG exports (e.g., 2x or 3x DPI Canvas rendering with user-selectable resolution). | S | P2 | Render Canvas at 2x scale and downscale, or offer a resolution multiplier in the export dialog. |
| F6 | **Modal/kiosk window mode** | Open the app in a browser window without the URL bar (e.g., `window.open` with toolbar/location disabled, or PWA manifest). | S | P3 | Limited browser support for chromeless windows now. A PWA manifest with `"display": "standalone"` is the modern approach. |
| F7 | **Multi-project tabs** | Support opening multiple projects in separate tabs or an in-app tab bar, each with its own state. | XL | P3 | Architecturally complex — the global `App` object is a singleton. Would need per-tab state isolation or a simple "open in new browser tab" approach as V1. |
| F8 | **Comprehensive documentation (.md)** | Create full user documentation covering all features, workflows, keyboard shortcuts, and the dependency/scheduling system. | M | P1 | Required for the V1 release. Should include quick-start guide, feature reference, and FAQ. |

---

## Summary by Priority

### P0 — Must Fix Before V1
- **B2** — Export/screenshot label misalignment (M)
- **B3** — Export missing visual elements (S)

### P1 — High Priority for V1
- **B1** — Watermark drift on scroll (S)
- **F1** — Fit-to-timeline on open (S)
- **F2** — Ctrl+Scroll zoom (S)
- **F8** — Comprehensive documentation (M)

### P2 — Nice to Have for V1
- **B4** — Right-click add cursor centering (XS)
- **F3** — Collapsible sub-swimlanes (M)
- **F4** — Days scale option (L)
- **F5** — Sharper export/screenshot (S)

### P3 — Backlog for V2+
- **F6** — Modal/kiosk window mode (S)
- **F7** — Multi-project tabs (XL)
