# Timeline Studio — Backlog

> Migrated from `timeline project edits.txt`. Items sized and prioritized based on user impact, technical complexity, and alignment with the V1 release goal.

## Versioning

| Version | Date | Summary |
|---------|------|---------|
| **0.14.0** | 2026-02-10 | Export/screenshot overhaul: fixed label alignment, added all missing visual elements (weekends, holidays, today marker, dependency arrows, vertical lines, float/TTT labels, progress bars, edge dates). Canvas-based text measurement for accurate fit-to-content. DPI scaling for crisp PNG/screenshot output. Folder renamed from v13.5. |

> **Versioning scheme:** `0.x.0` = mini-major (feature batches), `0.x.y` = patch/bugfix. Pre-1.0 = beta. Version 1.0 targets the initial release.

---

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

| # | Title | Description | Size | Priority | Status | Notes |
|---|-------|-------------|------|----------|--------|-------|
| B1 | **Watermark drift on scroll** | Watermark doesn't stay auto-centered/aligned when the user scrolls the timeline. | S | P1 | Open | Likely a CSS `position: fixed` vs `sticky` issue or a scroll-event offset calculation. Visible in every session. |
| B2 | **Export/screenshot label misalignment** | Some labels appear in incorrect positions during PNG/SVG export. What's on-screen doesn't match the exported output. | M | P0 | ✅ Done (0.14.0) | Fixed label Y positioning with font-size-aware formula. Added top/bottom label position support. |
| B3 | **Export missing visual elements** | Weekend shading and possibly other visible timeline elements (holidays, today marker) don't appear in screenshots/exports. | S | P0 | ✅ Done (0.14.0) | Added: weekend/holiday shading, today marker, dependency arrows, vertical lines, progress bars, edge dates, owner/duration, float labels, TTT labels. |
| B4 | **Right-click add doesn't center on cursor** | When adding a new item via right-click, it doesn't place the item at the cursor's position on the timeline. | XS | P2 | Open | Minor UX annoyance. Likely just needs the click coordinates passed through to the creation logic. |

---

## Features

| # | Title | Description | Size | Priority | Status | Notes |
|---|-------|-------------|------|----------|--------|-------|
| F1 | **Fit-to-timeline on open** | When opening a new or saved project, auto-zoom/scroll to fit visible tasks and milestones in the viewport. | S | P1 | Open | Great first-impression UX. Calculate min/max dates across items, set zoom and scroll offset to frame them. |
| F2 | **Ctrl+Scroll zoom** | `Ctrl+Scroll` zooms ±5%. `Ctrl+Shift+Scroll` zooms ±1% for fine-tuning. Should mirror the toolbar zoom behavior. | S | P1 | Open | Standard UX pattern users expect. Need to prevent default browser zoom and bind wheel events with modifier checks. |
| F3 | **Collapsible sub-swimlanes** | Allow sub-swimlanes to be individually collapsed/expanded, not just top-level swimlanes. | M | P2 | Open | Requires a `collapsed` flag per sub-swimlane and updates to height calculation in `met()` and rendering. |
| F4 | **Days scale option** | Add "Days" to the timescale options (currently: Weeks, Months, Quarters, Years). | L | P2 | Open | Significant rendering work — every column becomes one day. Needs header format, column width tuning, and performance consideration for long timelines. |
| F5 | **Sharper export/screenshot** | Improve crispness of PNG exports (e.g., 2x or 3x DPI Canvas rendering with user-selectable resolution). | S | P2 | ✅ Done (0.14.0) | `copyScreenshot` renders at 2x DPI min, `exportPNG` at 3x DPI min. Uses `devicePixelRatio` with floor. |
| F6 | **Modal/kiosk window mode** | Open the app in a browser window without the URL bar (e.g., `window.open` with toolbar/location disabled, or PWA manifest). | S | P3 | Open | Limited browser support for chromeless windows now. A PWA manifest with `"display": "standalone"` is the modern approach. |
| F7 | **Multi-project tabs** | Support opening multiple projects in separate tabs or an in-app tab bar, each with its own state. | XL | P3 | Open | Architecturally complex — the global `App` object is a singleton. Would need per-tab state isolation or a simple "open in new browser tab" approach as V1. |
| F8 | **Comprehensive documentation (.md)** | Create full user documentation covering all features, workflows, keyboard shortcuts, and the dependency/scheduling system. | M | P1 | Open | Required for the V1 release. Should include quick-start guide, feature reference, and FAQ. |
| F9 | **Fit-to-content (on-screen)** | Fit button auto-zooms and scrolls to frame all visible content in the viewport. | M | P1 | ✅ Done (0.14.0) | Canvas `measureText()` for accuracy. Iterative zoom solver separating scalable bar positions from fixed-pixel text. |
| F10 | **Fit-to-content (export)** | Full screenshot/export auto-crops to item extents with text-aware padding. | M | P1 | ✅ Done (0.14.0) | Shared `_itemExtents()` with canvas measurement. Handles all label positions, edge dates, secondary labels. |

---

## Summary by Priority

### P0 — Must Fix Before V1
- ~~**B2** — Export/screenshot label misalignment (M)~~ ✅ 0.14.0
- ~~**B3** — Export missing visual elements (S)~~ ✅ 0.14.0

### P1 — High Priority for V1
- **B1** — Watermark drift on scroll (S)
- **F1** — Fit-to-timeline on open (S)
- **F2** — Ctrl+Scroll zoom (S)
- **F8** — Comprehensive documentation (M)
- ~~**F9** — Fit-to-content on-screen (M)~~ ✅ 0.14.0
- ~~**F10** — Fit-to-content export (M)~~ ✅ 0.14.0

### P2 — Nice to Have for V1
- **B4** — Right-click add cursor centering (XS)
- **F3** — Collapsible sub-swimlanes (M)
- **F4** — Days scale option (L)
- ~~**F5** — Sharper export/screenshot (S)~~ ✅ 0.14.0

### P3 — Backlog for V2+
- **F6** — Modal/kiosk window mode (S)
- **F7** — Multi-project tabs (XL)
