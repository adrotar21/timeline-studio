# Timeline Studio — Backlog

> Prioritized bugs and features sized for the V1 release goal. Legacy items migrated from `timeline project edits.txt` (now deleted — all items represented here).

## Versioning

| Version | Date | Summary |
|---------|------|---------|
| **0.18.0** | 2026-02-11 | Toolbar center alignment (B8): absolute centering for `.toolbar-center`. Sub-swimlane resize handles (B9): per-sub `ss.height`, interactive divider drag handles, `bindRH()` rewrite for parent + sub resize. Collapsible sub-swimlanes (F3): 2-state `ss.collapsed` (`expanded`/`minimized`), collapse buttons (upper-right of each sub label), fit-to-content and export exclude minimized sub items, export renders minimized subs at 28px with small label. Major swimlane collapse buttons moved to upper-left. |
| **0.17.0** | 2026-02-11 | Swimlane collapse UX polish: SVG `dominant-baseline="central"` for pixel-perfect export label centering, dual expand/hide buttons on minimized swimlanes, 8px curved-tab hidden indicator with hover cue, hidden swimlanes omitted from export. Fit-to-content and export now exclude items in collapsed/hidden swimlanes. Swimlane Manager (F14) archived — current UI covers the use case. |
| **0.16.1** | 2026-02-11 | Export label centering fix (B6): `_svgText()` line-height 1.3→1.2, baseline factor 0.35→0.38, rotated vertical name +4px correction. Export grid column lines (B7): vertical dividers matching on-screen `.grid-col` borders. Dual-mode swimlane collapse (F15): 3-state cycle (expanded→minimized→collapsed), Expand All / Collapse All buttons in View dropdown with disabled-state management, `sl.collapsed` migrated from boolean to string. |
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
| B6 | **Export swimlane label vertical centering** | Swimlane header labels and sub-swimlane labels appear slightly off-center vertically in export/screenshot SVG. The `_svgText()` vertical centering math needs tuning to match on-screen CSS flexbox `align-items:center` rendering. Affects both main swimlane names and sub-swimlane labels. | XS | P1 | Done (0.16.1) |
| B7 | **Export missing grid column lines** | Vertical grid column divider lines (e.g., monthly column borders) that run from the header down through all swimlane rows are not rendered in export/screenshot SVG. On-screen these are `.grid-col` elements with `border-right`. Similar class of bug to the previously-fixed header cell borders and swimlane dividers (v0.15.1). | S | P1 | Done (0.16.1) |
| B8 | **Toolbar center alignment** | Timeline/Data/Split view toggle in `.toolbar-center` should be visually centered across the full toolbar width, not just positioned between left/right sections via `justify-content:space-between`. Fix: use absolute centering on `.toolbar-center` (e.g., absolute positioning or CSS grid). | XS | P2 | Done (0.18.0) |
| B9 | **Sub-swimlane resize handle** | The `.sl-rh` drag-to-resize handle in `bindRH()` works for simple swimlanes but breaks when sub-swimlanes exist — can't drag down beyond content height. Needs: (1) allow drag-down resize for swimlanes with subs by updating the min-height logic, and (2) add per-sub-swimlane resize handles at sub-swimlane divider lines. | M | P2 | Done (0.18.0) |

---

## Features

| # | Title | Description | Size | Priority | Status |
|---|-------|-------------|------|----------|--------|
| F3 | **Collapsible sub-swimlanes** | Allow sub-swimlanes to be individually collapsed/expanded, not just top-level swimlanes. | M | P2 | Done (0.18.0) |
| F4 | **Days scale option** | Add "Days" to the timescale options (currently: Weeks, Months, Quarters, Years). | L | P2 | Open |
| F6 | **Modal/kiosk window mode** | Open the app in a browser window without the URL bar (e.g., `window.open` with toolbar/location disabled, or PWA manifest). | S | P3 | Open |
| F7 | **Multi-project tabs** | Support opening multiple projects in separate tabs or an in-app tab bar, each with its own state. | XL | P3 | Open |
| F8 | **Comprehensive documentation (.md)** | Create full user documentation covering all features, workflows, keyboard shortcuts, and the dependency/scheduling system. | M | P1 | Open |
| F12 | **Fit-to-content hotkey** | Add a keyboard shortcut for fit-to-content (preferred: Alt+1 if not browser-reserved). Should trigger the existing `fitToContent()` method. | XS | P2 | Done (0.16.0) |
| F13 | **Keyboard shortcut discoverability** | Surface keyboard shortcuts and power-user actions (Alt+lasso, Ctrl+Scroll zoom, Ctrl+Shift+Scroll fine zoom, etc.) in the UI for new users. Needs design discussion — options include a shortcut cheatsheet panel, tooltip hints, a help modal section, or subtle on-canvas labels. | M | P2 | Open |
| F14 | **Swimlane Manager modal** | Comprehensive swimlane management modal that consolidates all swimlane operations. Double-clicking a swimlane header opens the manager focused on that swimlane; a toolbar button opens the full list view. Supports per-swimlane property editing (name, color, height, sub-swimlanes) plus bulk operations. Reuses/replaces the current `showSwM()` edit modal. Should include: swimlane reordering, expand/collapse all buttons, and collapse-mode toggles (see F15). | L | P1 | Archived (0.17.0) — current inline UI (double-click edit, context menu, collapse buttons, Expand/Collapse All) covers the use case without a separate modal. |
| F15 | **Dual-mode swimlane collapse** | Expand the collapse toggle to a 3-state cycle: expanded → minimized (28px, header-only, current behavior) → fully collapsed (0px, invisible). "Expand All" and "Collapse All" buttons in the toolbar (Expand All greyed out when all are expanded). Collapse mode per swimlane configurable in the Swimlane Manager (F14). | M | P1 | Done (0.16.1) |
| F16 | **Resizable swimlane header column** | Allow the user to drag-resize the swimlane label column width (currently hard-coded 160px). Resize handle on the right edge of the label column. Persisted in project settings. Must update on-screen rendering, export SVG (`lw`), fit-to-content, and watermark positioning. | M | P2 | Done (0.16.0) |
| F17 | **Swimlane header text orientation** | Per-swimlane setting for major header text direction: horizontal, vertical, or angled (e.g., 45°). Configurable in the Swimlane Manager (F14) with propagation to multiple swimlanes via selection or "apply to all". Currently vertical text is auto-applied only when sub-swimlanes exist — this decouples the choice from sub-swimlane presence. | M | P2 | Open |
| F18 | **Configurable keyboard shortcuts** | Settings section for customizing keyboard shortcuts. Multiple shortcuts per action (e.g., both Ctrl+Shift+F and Alt+1 for fit). Conflict detection warns if a binding clashes with another action. Persisted in project or user preferences. Ties into F13 (discoverability) — the shortcut settings panel doubles as a reference. | M | P2 | Open |
| F19 | **Swimlane header font size** | Per-swimlane font size setting for the major swimlane header label (and optionally sub-swimlane labels). Configurable in the Swimlane Manager (F14) with bulk propagation via selection or "apply to all". Must render correctly on-screen, in export SVG (`_svgText`), and screenshots. Default inherits from project font size. | S | P2 | Open |

---

## Suggested Swimlane Header Work Order

> Items impacting the swimlane header system, in recommended implementation sequence. Each step builds on the previous — completing them in order minimizes rework.

1. ~~**F16 — Resizable swimlane header column (M, P2)** — Done (0.16.0).~~
2. ~~**F15 — Dual-mode swimlane collapse (M, P1)** — Done (0.16.1).~~
3. ~~**F14 — Swimlane Manager modal (L, P1)** — Archived (0.17.0). Current inline UI covers the use case.~~
4. **F17 — Swimlane header text orientation (M, P2)** — Per-swimlane text direction (horizontal/vertical/angled). Settings live in the existing swimlane edit modal (`showSwM()`). Label column width is dynamic (F16).
5. **F19 — Swimlane header font size (S, P2)** — Per-swimlane font size for header labels. Same implementation pattern as F17 (per-swimlane property). Natural to implement alongside F17 since both are text appearance settings. Must flow through `_svgText()` for export.
6. ~~**F3 — Collapsible sub-swimlanes (M, P2)** — Done (0.18.0). 2-state collapse with upper-right buttons, fit exclusion, export rendering.~~

---

## Summary by Priority

### P0 — Must Fix Before V1
_All P0 items resolved in v0.14.0._

### P1 — High Priority for V1
- **F8** — Comprehensive documentation (M)

### P2 — Nice to Have for V1
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
| B8 | **Toolbar center alignment** | XS | 0.18.0 | Absolute centering `.toolbar-center` with `position:absolute;left:50%;transform:translateX(-50%)` within `position:relative` toolbar. |
| B9 | **Sub-swimlane resize handle** | M | 0.18.0 | Per-sub `ss.height` property (default 0 = content-derived). Interactive `.sub-rh` divider handles between subs. `bindRH()` rewrite: parent handle distributes to last sub when subs exist; sub handle sets `ss.height` directly. Migration adds `ss.height` to all existing subs. Export mirrors on-screen height logic. |
| F3 | **Collapsible sub-swimlanes** | M | 0.18.0 | 2-state `ss.collapsed` (`'expanded'`/`'minimized'`). Collapse buttons (upper-right of each sub label cell). Minimized = 28px header-only with no items rendered. Fit-to-content and export exclude items in minimized subs via `collapsedSubIds` set. Export renders minimized subs at 28px with small label. `addItem()` auto-expands minimized target sub. Major swimlane collapse buttons moved to upper-left (all swimlanes). |
| F14 | **Swimlane Manager modal** | L | 0.17.0 | Archived — current inline UI (double-click edit, context menu, collapse buttons, Expand/Collapse All) covers the use case without a separate modal. |
| F15 | **Dual-mode swimlane collapse** | M | 0.16.1 | 3-state cycle: expanded → minimized (28px) → collapsed (0px, invisible). `sl.collapsed` migrated from boolean to string (`'expanded'`/`'minimized'`/`'collapsed'`). Expand All / Collapse All buttons in View dropdown with disabled-state management. Updated: `renderTL()`, `buildExportSVG()`, `addItem()`, context menu, `migrate()`, all templates. |
| B7 | **Export missing grid column lines** | S | 0.16.1 | Added vertical `<line>` elements in `buildExportSVG()` iterating `tl.cols` — matches on-screen `.grid-col` `border-right`. Color `#e8ecf0`, bounds-checked to label column and viewport width. |
| B6 | **Export swimlane label vertical centering** | XS | 0.16.1 | `_svgText()` line-height 1.3→1.2 (match CSS), baseline factor 0.35→0.38 (better DM Sans cap-height). Rotated vertical main name +4px baseline correction in export SVG. |
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
