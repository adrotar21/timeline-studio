# Timeline Studio — Backlog

> Prioritized bugs and features sized for the V1 release goal. Legacy items migrated from `timeline project edits.txt` (now deleted — all items represented here).

## Versioning

| Version | Date | Summary |
|---------|------|---------|
| **0.15.1** | 2026-02-10 | Export structural lines: header cell borders, header-to-body separator, label column edge, strengthened swimlane dividers. |
| **0.15.0** | 2026-02-10 | Settings navigation sidebar (F11): TOC with scroll-spy, click-to-jump, section reordering for logical grouping. Export sub-swimlane visuals (B5): divider lines and split label column with vertical main name + sub-labels. Modal widened to 660px. |
| **0.14.1** | 2026-02-10 | Watermark positioning fix (all 6 positions, on-screen + export). Ctrl+Scroll zoom (±5%/±1%). Auto fit-to-content on project open. Also fixed: importHolidays undo ordering, export milestone textColor, weekend opacity fallback, debug console.log cleanup. 76 new watermark tests. |
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

| # | Title | Description | Size | Priority | Status |
|---|-------|-------------|------|----------|--------|
| | | _No open bugs_ | | | |

---

## Features

| # | Title | Description | Size | Priority | Status |
|---|-------|-------------|------|----------|--------|
| F3 | **Collapsible sub-swimlanes** | Allow sub-swimlanes to be individually collapsed/expanded, not just top-level swimlanes. | M | P2 | Open |
| F4 | **Days scale option** | Add "Days" to the timescale options (currently: Weeks, Months, Quarters, Years). | L | P2 | Open |
| F6 | **Modal/kiosk window mode** | Open the app in a browser window without the URL bar (e.g., `window.open` with toolbar/location disabled, or PWA manifest). | S | P3 | Open |
| F7 | **Multi-project tabs** | Support opening multiple projects in separate tabs or an in-app tab bar, each with its own state. | XL | P3 | Open |
| F8 | **Comprehensive documentation (.md)** | Create full user documentation covering all features, workflows, keyboard shortcuts, and the dependency/scheduling system. | M | P1 | Open |
| F12 | **Fit-to-content hotkey** | Add a keyboard shortcut for fit-to-content (preferred: Alt+1 if not browser-reserved). Should trigger the existing `fitToContent()` method. | XS | P2 | Open |
| F13 | **Keyboard shortcut discoverability** | Surface keyboard shortcuts and power-user actions (Alt+lasso, Ctrl+Scroll zoom, Ctrl+Shift+Scroll fine zoom, etc.) in the UI for new users. Needs design discussion — options include a shortcut cheatsheet panel, tooltip hints, a help modal section, or subtle on-canvas labels. | M | P2 | Open |

---

## Summary by Priority

### P0 — Must Fix Before V1
_All P0 items resolved in v0.14.0._

### P1 — High Priority for V1
- **F8** — Comprehensive documentation (M)

### P2 — Nice to Have for V1
- **F3** — Collapsible sub-swimlanes (M)
- **F4** — Days scale option (L)
- **F12** — Fit-to-content hotkey (XS)
- **F13** — Keyboard shortcut discoverability (M)

### P3 — Backlog for V2+
- **F6** — Modal/kiosk window mode (S)
- **F7** — Multi-project tabs (XL)

---

## Appendix: Completed Items

| # | Title | Size | Version | Notes |
|---|-------|------|---------|-------|
| B5 | **Export missing sub-swimlane visuals** | S | 0.15.0 | Added divider lines between sub-swimlanes in export SVG. Split label column: 60px vertical main name + 100px sub-labels with white dividers. |
| F11 | **Settings navigation outline** | S | 0.15.0 | TOC sidebar (130px) with scroll-spy (IntersectionObserver), click-to-jump. Sections reordered: Project→Range→Scheduling→Theme→Display→Format→Watermark→TTT→Export→Advanced. Modal widened to 660px. |
| B1 | **Watermark drift on scroll** | S | 0.14.1 | Moved watermark to absolute-positioned element outside scroll container. Fixed all 6 positions on-screen + export. Export top positions now render correctly (were all at bottom). Font size aligned to 11px. |
| B4 | **Right-click add doesn't center on cursor** | XS | legacy | Previously resolved. |
| F1 | **Fit-to-timeline on open** | S | 0.14.1 | `_pendingFit` flag fires `fitToContent()` after first render via double rAF. Wired into all 5 load paths. View guard prevents firing in data-only mode. |
| F2 | **Ctrl+Scroll zoom** | S | 0.14.1 | Wheel listener on timeline body. Ctrl+Scroll=±5%, Ctrl+Shift+Scroll=±1%. Trackpad pinch works via synthetic ctrlKey events. |
| B2 | **Export/screenshot label misalignment** | M | 0.14.0 | Fixed label Y positioning with font-size-aware formula. Added top/bottom label position support. |
| B3 | **Export missing visual elements** | S | 0.14.0 | Added: weekend/holiday shading, today marker, dependency arrows, vertical lines, progress bars, edge dates, owner/duration, float labels, TTT labels. |
| F5 | **Sharper export/screenshot** | S | 0.14.0 | `copyScreenshot` renders at 2x DPI min, `exportPNG` at 3x DPI min. Uses `devicePixelRatio` with floor. |
| F9 | **Fit-to-content (on-screen)** | M | 0.14.0 | Canvas `measureText()` for accuracy. Iterative zoom solver separating scalable bar positions from fixed-pixel text. |
| F10 | **Fit-to-content (export)** | M | 0.14.0 | Shared `_itemExtents()` with canvas measurement. Handles all label positions, edge dates, secondary labels. |
