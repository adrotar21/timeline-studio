# Timeline Studio — Backlog

> Prioritized bugs and features sized for the V1 release goal. Legacy items migrated from `timeline project edits.txt` (now deleted — all items represented here).

## Versioning

| Version | Date | Summary |
|---------|------|---------|
| **0.16.0** | 2026-02-11 | Resizable swimlane header column (F16): drag-resize 80–400px, persisted in project, flows through rendering + export + watermark. Fit-to-content hotkey (F12): Ctrl+Shift+F and Alt+1 bindings, tooltip + help modal updated. Export swimlane label text wrapping via `_svgText()`/`_wrapText()` — labels now word-wrap in export/screenshot to match on-screen rendering at narrow column widths. |
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
| F12 | **Fit-to-content hotkey** | Add a keyboard shortcut for fit-to-content (preferred: Alt+1 if not browser-reserved). Should trigger the existing `fitToContent()` method. | XS | P2 | Done (0.16.0) |
| F13 | **Keyboard shortcut discoverability** | Surface keyboard shortcuts and power-user actions (Alt+lasso, Ctrl+Scroll zoom, Ctrl+Shift+Scroll fine zoom, etc.) in the UI for new users. Needs design discussion — options include a shortcut cheatsheet panel, tooltip hints, a help modal section, or subtle on-canvas labels. | M | P2 | Open |
| F14 | **Swimlane Manager modal** | Comprehensive swimlane management modal that consolidates all swimlane operations. Double-clicking a swimlane header opens the manager focused on that swimlane; a toolbar button opens the full list view. Supports per-swimlane property editing (name, color, height, sub-swimlanes) plus bulk operations. Reuses/replaces the current `showSwM()` edit modal. Should include: swimlane reordering, expand/collapse all buttons, and collapse-mode toggles (see F15). | L | P1 | Open |
| F15 | **Dual-mode swimlane collapse** | Expand the collapse toggle to a 3-state cycle: expanded → minimized (28px, header-only, current behavior) → fully collapsed (0px, invisible). "Expand All" and "Collapse All" buttons in the toolbar (Expand All greyed out when all are expanded). Collapse mode per swimlane configurable in the Swimlane Manager (F14). | M | P1 | Open |
| F16 | **Resizable swimlane header column** | Allow the user to drag-resize the swimlane label column width (currently hard-coded 160px). Resize handle on the right edge of the label column. Persisted in project settings. Must update on-screen rendering, export SVG (`lw`), fit-to-content, and watermark positioning. | M | P2 | Done (0.16.0) |
| F17 | **Swimlane header text orientation** | Per-swimlane setting for major header text direction: horizontal, vertical, or angled (e.g., 45°). Configurable in the Swimlane Manager (F14) with propagation to multiple swimlanes via selection or "apply to all". Currently vertical text is auto-applied only when sub-swimlanes exist — this decouples the choice from sub-swimlane presence. | M | P2 | Open |
| F18 | **Configurable keyboard shortcuts** | Settings section for customizing keyboard shortcuts. Multiple shortcuts per action (e.g., both Ctrl+Shift+F and Alt+1 for fit). Conflict detection warns if a binding clashes with another action. Persisted in project or user preferences. Ties into F13 (discoverability) — the shortcut settings panel doubles as a reference. | M | P2 | Open |
| F19 | **Swimlane header font size** | Per-swimlane font size setting for the major swimlane header label (and optionally sub-swimlane labels). Configurable in the Swimlane Manager (F14) with bulk propagation via selection or "apply to all". Must render correctly on-screen, in export SVG (`_svgText`), and screenshots. Default inherits from project font size. | S | P2 | Open |

---

## Suggested Swimlane Header Work Order

> Items impacting the swimlane header system, in recommended implementation sequence. Each step builds on the previous — completing them in order minimizes rework.

1. **F16 — Resizable swimlane header column (M, P2)** — Foundational: decouples header width from the 160px constant. Must be done first since F14, F15, and F17 all render into the header column and need to respect a dynamic width.
2. **F15 — Dual-mode swimlane collapse (M, P1)** — Adds the 3-state collapse cycle and Expand/Collapse All toolbar buttons. Self-contained state change that doesn't require the manager modal yet (works with existing chevron button).
3. **F14 — Swimlane Manager modal (L, P1)** — The big piece: consolidates swimlane editing, reordering, collapse-mode config, and bulk operations into one modal. Depends on F15's collapse model being settled, and benefits from F16's dynamic width being in place.
4. **F17 — Swimlane header text orientation (M, P2)** — Per-swimlane text direction (horizontal/vertical/angled). Cleanest to implement after the manager modal exists (F14) since the UI for this setting lives there, and the label column width is dynamic (F16).
5. **F19 — Swimlane header font size (S, P2)** — Per-swimlane font size for header labels. Same implementation pattern as F17 (per-swimlane property, bulk propagation, manager UI). Natural to implement alongside F17 since both are text appearance settings. Must flow through `_svgText()` for export.
6. **F3 — Collapsible sub-swimlanes (M, P2)** — Individual sub-swimlane expand/collapse. Best done last in this sequence since the Swimlane Manager (F14) provides the natural UI for sub-swimlane collapse controls.

---

## Summary by Priority

### P0 — Must Fix Before V1
_All P0 items resolved in v0.14.0._

### P1 — High Priority for V1
- **F8** — Comprehensive documentation (M)
- **F14** — Swimlane Manager modal (L)
- **F15** — Dual-mode swimlane collapse (M)

### P2 — Nice to Have for V1
- **F3** — Collapsible sub-swimlanes (M)
- **F4** — Days scale option (L)
- **F13** — Keyboard shortcut discoverability (M)
- **F17** — Swimlane header text orientation (M)
- **F18** — Configurable keyboard shortcuts (M)
- **F19** — Swimlane header font size (S)

### P3 — Backlog for V2+
- **F6** — Modal/kiosk window mode (S)
- **F7** — Multi-project tabs (XL)

---

## Appendix: Completed Items

| # | Title | Size | Version | Notes |
|---|-------|------|---------|-------|
| F16 | **Resizable swimlane header column** | M | 0.16.0 | Drag-resize handle on label column right edge (80–400px range). `proj.labelWidth` persisted in project. Dynamic CSS var `--sl-w`, flows through on-screen rendering, export SVG, watermark, sub-swimlane label split. |
| F12 | **Fit-to-content hotkey** | XS | 0.16.0 | Bound to `Ctrl+Shift+F` (cross-browser) and `Alt+1` (Chrome/Edge). Tooltip on Fit button, row in help modal shortcuts table. |
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
