# Timeline Studio — Backlog

> Prioritized bugs and features sized for the V1 release goal. Legacy items migrated from `timeline project edits.txt` (now deleted — all items represented here).

## Versioning

| Version | Date | Summary |
|---------|------|---------|
| **0.19.3** | 2026-02-11 | Help modal polish (B18): paste import explanation in section 2, watermark feature in section 11, corrected lock/export/invert-selection references, lasso mode + Ctrl+Scroll zoom in shortcuts table, new Notes/Troubleshooting section (work type, scheduling toggle, holidays, lock, hidden items, selection inversion, zoom). Pin badge on timeline items (B19): small 📌 indicator on pinned items, positioned top-right. Data view cleanup (B20): invert-selection button styled as compact 20×20px square, select-all checkbox vertically centered in header cell. |
| **0.19.2** | 2026-02-11 | Pre-beta first-user experience cleanup. Help modal numbering fix (B10) and content improvements (B17): Lock H/V explanation, swimlane resize handle mention, right-click and double-click tips, new shortcut rows. Swimlane label tooltip. Lock-blocked nudge/drag toast (B12). Ctrl+Shift+S Save As (B13). Ctrl+A Select All on timeline (B14). Active-filter indicator in Data Table (B11). Empty-state hint on blank timeline (B15). Predecessors column in CSV export (B16). |
| **0.19.1** | 2026-02-11 | Favicon (inline SVG data URI) and dynamic tab title (`ProjectName — Timeline Studio` with unsaved dot). Toast duration parameter. F6 kiosk mode investigated and blocked (browser security restrictions on `file://`). |
| **0.19.0** | 2026-02-11 | Sub-swimlane collapse polish: parent resize fix (cumulative delta bug), thin 1px dividers, auto-minimize parent when all subs minimized, slimmer minimized subs (20px). Expand All includes sub-swimlanes. Vertical main swimlane text auto-scales font-size (min 8px) when height is short. Export vertical label wrapping via `<g>` rotation with `_wrapText()`. Export label overflow shows in both directions (two-pass rendering). |
| **0.18.0** | 2026-02-11 | Toolbar center alignment (B8). Sub-swimlane resize handles (B9): per-sub `ss.height`, interactive dividers, `bindRH()` rewrite. Collapsible sub-swimlanes (F3): 2-state `ss.collapsed`, collapse buttons, fit/export exclusion. Major swimlane buttons moved to upper-left. |
| **0.17.0** | 2026-02-11 | Swimlane collapse UX polish: `dominant-baseline="central"` export centering, dual expand/hide buttons, curved-tab hidden indicator. Fit-to-content excludes collapsed swimlane items. F14 archived. |
| **0.16.1** | 2026-02-11 | Export label centering (B6), grid column lines (B7), dual-mode swimlane collapse (F15): 3-state cycle, Expand/Collapse All buttons, `sl.collapsed` migrated to string. |
| **0.16.0** | 2026-02-11 | Resizable swimlane header column (F16): drag-resize 80–400px. Fit-to-content hotkey (F12): Ctrl+Shift+F, Alt+1. Export label text wrapping via `_svgText()`/`_wrapText()`. |
| **0.15.1** | 2026-02-10 | Export structural lines: header cell borders, header-to-body separator, label column edge. |
| **0.15.0** | 2026-02-10 | Settings navigation sidebar (F11). Export sub-swimlane visuals (B5). Modal widened to 660px. |
| **0.14.1** | 2026-02-10 | Watermark positioning fix. Ctrl+Scroll zoom. Auto fit-to-content on open. 76 new watermark tests. |
| **0.14.0** | 2026-02-10 | Export/screenshot overhaul: all missing visual elements, canvas text measurement, DPI scaling. |

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
| :red_circle: **P0 — Critical** | Must fix before V1 release |
| :orange_circle: **P1 — High** | Should fix before V1; impacts daily usability |
| :yellow_circle: **P2 — Medium** | Nice to have for V1; improves polish |
| :blue_circle: **P3 — Low** | Backlog for V2+; cosmetic or niche |

---

## Open Features

| # | Title | Description | Size | Priority | Status |
|---|-------|-------------|------|----------|--------|
| F4 | **Days scale option** | Add "Days" to the timescale options (currently: Weeks, Months, Quarters, Years). | L | :yellow_circle: P2 | Open |
| F6 | **Modal/kiosk window mode** | Open the app in a browser window without the URL bar. **Blocked by browser limitations:** Chrome ignores `window.open` location flags (since ~2017), PWA install requires HTTPS (not `file://`), "Create shortcut → Open as window" is greyed out for local files. Only viable path: serve via localhost (e.g., `python -m http.server`) and use PWA manifest or Chrome shortcut. Revisit if the app moves to a hosted/server model. | S | :blue_circle: P3 | Blocked |
| F7 | **Multi-project tabs** | Support opening multiple projects in separate tabs or an in-app tab bar, each with its own state. | XL | :blue_circle: P3 | Open |
| F8 | **Comprehensive documentation (.md)** | Create full user documentation covering all features, workflows, keyboard shortcuts, and the dependency/scheduling system. | M | :orange_circle: P1 | Open |
| F13 | **Keyboard shortcut discoverability** | Surface keyboard shortcuts and power-user actions in the UI for new users. Options include a cheatsheet panel, tooltip hints, or help modal section. | M | :yellow_circle: P2 | Open |
| F17 | **Swimlane header text orientation** | Per-swimlane setting for major header text direction: horizontal, vertical, or angled. Configurable in the swimlane edit modal. Decouples text orientation from sub-swimlane presence. | M | :yellow_circle: P2 | Open |
| F18 | **Configurable keyboard shortcuts** | Settings section for customizing keyboard shortcuts. Multiple shortcuts per action, conflict detection, persisted in project or user preferences. Ties into F13 (discoverability). | M | :yellow_circle: P2 | Open |
| F19 | **Swimlane header font size** | Per-swimlane font size for header labels. Configurable in swimlane edit modal with bulk propagation. Must flow through `_svgText()` for export. | S | :yellow_circle: P2 | Open |

---

## Summary by Priority

### :red_circle: P0 — Must Fix Before V1
_All P0 items resolved in v0.14.0._

### :orange_circle: P1 — High Priority for V1
- **F8** — Comprehensive documentation (M)

### :yellow_circle: P2 — Nice to Have for V1
- **F4** — Days scale option (L)
- **F13** — Keyboard shortcut discoverability (M)
- **F17** — Swimlane header text orientation (M)
- **F18** — Configurable keyboard shortcuts (M)
- **F19** — Swimlane header font size (S)

### :blue_circle: P3 — Backlog for V2+
- **F6** — Modal/kiosk window mode (S) — **Blocked**: requires HTTPS/localhost, not possible from `file://`
- **F7** — Multi-project tabs (XL)

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

## Appendix: Completed Items

| # | Title | Size | Version | Notes |
|---|-------|------|---------|-------|
| B18 | **Help modal polish** | S | 0.19.3 | Paste import explanation in section 2 (Data View 📋 Paste, tab-separated from Excel). Watermark feature in section 11 (Last Updated stamp, position, owner, appears in exports). Corrected references: Lock now locks both axes (removed Lock H/V), export via Settings→Export (not ⬇ icon), Invert Selection is a header button (not right-click). Lasso Mode and Ctrl+Scroll/Ctrl+Shift+Scroll zoom added to shortcuts table. New ⚠ Notes/Troubleshooting section: work type, scheduling toggle, holidays, lock, hidden items, selection inversion, zoom. |
| B19 | **Pin badge on timeline items** | XS | 0.19.3 | Small 📌 emoji badge rendered at top-right of pinned items on the timeline. 9px font, absolute positioned, `pointer-events:none`, drop-shadow for visibility. `.item-pinned` class was applied but had no visual effect — now items show a clear pin indicator. |
| B20 | **Data view header cleanup** | XS | 0.19.3 | Invert-selection button (⇅) styled as compact 20×20px square with themed border, background, and hover state (was unstyled browser default). Select-all checkbox cell vertically and horizontally centered via `text-align:center; vertical-align:middle` on the `_cb` column header. |
| B10 | **Help modal numbering fix** | XS | 0.19.2 | Fixed duplicate "7." numbering — Views→8, Swimlanes→9, Selection Tools→10, Export & Share→11. |
| B11 | **Active-filter indicator** | XS | 0.19.2 | Filter inputs get accent border/background when they have a value. Filter button shows count badge when filters are active. Clear button resets indicators. |
| B12 | **Lock-blocked nudge toast** | XS | 0.19.2 | Arrow keys with global lock: toast "🔒 Locked — unlock to move items". Per-axis: "Horizontal lock is on" / "Vertical lock is on". 2s debounce prevents spam. |
| B13 | **Ctrl+Shift+S Save As** | XS | 0.19.2 | Keyboard shortcut for Save As dialog. Shortcut label added to File dropdown. |
| B14 | **Ctrl+A Select All** | XS | 0.19.2 | Selects all visible items on timeline/split view. Respects hideMode. Toast shows count. Only fires when no input focused. |
| B15 | **Empty-state hint** | XS | 0.19.2 | Centered hint on blank timeline: "Click + Task or + Milestone to add your first item." Auto-removed when items exist. `pointer-events:none` so it doesn't block interaction. |
| B16 | **Predecessors in CSV export** | XS | 0.19.2 | Added "Predecessors" column to `exportDataCSV()` and advanced data export. Format: `"Task A (FS+2d), Task B (SS)"`. `_fmtPreds()` helper. |
| B17 | **Help modal content improvements** | S | 0.19.2 | Lock H/V explanation in section 4. Swimlane resize handle and 3-state collapse in section 9. Ctrl+A and Ctrl+Shift+S in shortcuts table. Right-click and double-click rows added. Tips: right-click context menu and double-click swimlane labels. Swimlane label `title="Double-click to edit"` tooltip. |
| F20 | **Favicon & dynamic tab title** | XS | 0.19.1 | Inline SVG favicon (data URI, no extra file). Dynamic `document.title` shows `ProjectName — Timeline Studio` with `●` unsaved indicator. Updates on render, rename, load, save. Toast `dur` parameter added. |
| B8 | **Toolbar center alignment** | XS | 0.18.0 | Absolute centering `.toolbar-center` with `position:absolute;left:50%;transform:translateX(-50%)` within `position:relative` toolbar. |
| B9 | **Sub-swimlane resize handle** | M | 0.18.0 | Per-sub `ss.height` property (default 0 = content-derived). Interactive `.sub-rh` divider handles between subs. `bindRH()` rewrite: parent handle distributes to last sub when subs exist; sub handle sets `ss.height` directly. Migration adds `ss.height` to all existing subs. Export mirrors on-screen height logic. |
| F3 | **Collapsible sub-swimlanes** | M | 0.18.0 | 2-state `ss.collapsed` (`'expanded'`/`'minimized'`). Collapse buttons (upper-right of each sub label cell). Minimized = 20px header-only with no items rendered. Fit-to-content and export exclude items in minimized subs via `collapsedSubIds` set. Export renders minimized subs with small label. `addItem()` auto-expands minimized target sub. Major swimlane collapse buttons moved to upper-left (all swimlanes). Auto-minimize parent when all subs minimized; auto-expand parent when expanding a sub. |
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
