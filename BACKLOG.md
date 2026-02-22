# Timeline Studio — Backlog

> Prioritized bugs and features for the V1 release. Legacy items migrated from `timeline project edits.txt` (now deleted — all items represented here).

> :rotating_light: **Backlog management rule:** On each edit, all **Done** items must be moved from the Open tables to the **Appendix: Completed Items** table. Open tables should only contain active work (Open, Plan, Blocked, Published & Testing). Keep the backlog clean.

## Versioning

| Version | Date | Summary |
|---------|------|---------|
| **0.40.4** | 2026-02-22 | UX: Compact diagonal-split undo/redo button replaces two separate toolbar buttons (~65px → 30px). Single 30×28px container with CSS `clip-path` triangles — undo arrow top-left, redo arrow bottom-right, diagonal divider via `::after` pseudo-element. Independent hover highlighting and disabled state (30% opacity when stack is empty) per triangle. `updateStatus()` toggles `.disabled` class based on `undoStack.length`/`redoStack.length`. IDs preserved — no JS handler changes. |
| **0.40.3** | 2026-02-22 | UX: Renamed "Edge Text Color" to "Date Text Color" across all UI surfaces (properties panel, bulk edit, Format Painter). Added contextual hint below the color picker — shows "Color of start/end date labels on the task bar" when dates are enabled, or "Enable Start/End Date below to see date labels" when they're not. Internal property name `edgeTextColor` unchanged (no migration). |
| **0.40.2** | 2026-02-21 | Bugfix: Data table prepend/append mini-input popover was immediately dismissed on open. The document `click` handler (line 1454) hid `#dt-ctx-input` whenever a click landed outside it — but clicking "Prepend text…" or "Append text…" in `#dt-ctx-menu` triggered `_showDtCtxInput()` and then the same click event bubbled to the document handler, which saw the target was inside `#dt-ctx-menu` (not `#dt-ctx-input`) and re-hid the popover. Fix: added `&&!e.target.closest('#dt-ctx-menu')` guard so context menu clicks don't dismiss the popover they just opened. |
| **0.40.1** | 2026-02-21 | Bugfix patch: (B41) Header format popover now dismisses on left-click outside via mousedown-level hide (matches swimlane popover pattern — `onTlMD()` calls `_hideHdrFmtPopover()` before `sched()`/DOM rebuild). Document click handler simplified as safety net. (B42) Holiday gear icon scrolls to `#sect-holidays` instead of `#sect-display`. (B43) Canvas DPR auto-capping (`maxDim=16384`) in `copyScreenshot()` and `exportPNG()` — prevents silent failure on large day-scale timelines at high DPI. Added null checks on `getContext('2d')`, `toBlob`, `naturalWidth/Height`, `img.onerror`, and outer try-catch to `exportPNG`. 18 new header format tests, 25 new export SVG tests (505 total across 23 files). |
| **0.40.0** | 2026-02-21 | Header Bar Customization (F4 + Phase 5 polish): Days timescale with 3 display modes (letter/number/hybrid) and 3 column width presets (compact/normal/wide). Month format (Jan/J) and quarter format (Q1 2025/Q1) selectors. Right-click header popover with font size stepper (7–16px), format selectors, weekend/holiday shading quick-controls (checkbox + opacity slider, bidirectional sync with Settings). Header grid lines strengthened with time-period boundary emphasis. Day header cells show holiday (red text + bar) and weekend (grey bar) indicators — on-screen only. Swimlane popover dismiss fix (Ctrl+Click multi-select exception). cycleDayFmt, cycleScale, cycleHdrRows keyboard shortcut actions. 362 tests in test_header_format.js. |
| **0.39.0** | 2026-02-19 | Format Painter (F42): Office-style copy-formatting tool. Two-step popover wizard: select source item → click 🖌 → choose properties via checkbox list → "Apply Once" (single target) or "Apply to Many" (persistent mode). Three-state machine: IDLE → STAGED (popover open, source pulsing) → PAINTING (cursor=copy, click targets). F4 keyboard shortcut enters single paint mode directly (skips popover, uses last-saved property selection); pressing F4 again before applying upgrades to persistent/multi mode. 12 copyable properties (color, text color, edge text color, font size, label position, icon, date display, date format, show owner, status, hidden/pinned, vertical line). Mutual exclusion with lasso/pan modes. Escape/re-click/pill dismiss to exit. `FP_PROPS_DEF` constant with composite key expansion. Property selection persisted in `localStorage['tls3_fpProps']`. 76 tests in `test_format_painter.js`. |
| **0.38.2** | 2026-02-19 | Timescale validation fix (B40): `migrate()` validated ~40+ project properties but skipped `timescale` and `dateFormat`. When `_packProj()` strips defaults for share-link compression, `timescale:'months'` was removed — on load via `_loadFromHash()`, `migrate()` never restored it, leaving `proj.timescale` undefined. Caused blank timescale dropdown, `met()` falling to years branch, and column width defaulting to 100. Also affects old `.tlproj` files and corrupted localStorage. Fix validates timescale against `['weeks','months','quarters','years']` (default `'months'`) and dateFormat (default `'MMM D, YYYY'`). |
| **0.38.1** | 2026-02-19 | F19 popover polish: context-aware title ("Format Swimlane Header" / "Format Sub-Swimlane Header"), reordered controls (Select scope first, Font Size second), "Apply to" renamed to "Select:" for clearer workflow. Scope dropdown now live-highlights all affected swimlane labels — switching back to "Selected Only" restores the manual selection; closing the popover reverts automatically. Main swimlane selection highlight scoped to just the left label box (`sl-lbl-main`) when sub-swimlanes exist. Themed tooltips on swimlane and sub-swimlane labels ("Double-click to edit names & ordering / Right-click to bulk edit text size") using the app's `data-tooltip` system with multi-line HTML support. |
| **0.38.0** | 2026-02-19 | Swimlane Label Font Size (F19): Per-swimlane and per-sub-swimlane font size control via orthogonal selection system + right-click formatting popover. `App.slSel` array tracks selected lanes independently of item selection. Click label to select, Ctrl+click for multi-select, right-click for format popover with live-preview font size stepper (7–24px, ±0.5 increments). Context-smart "Apply to" scoping: Selected / All Swimlanes / Subs in This Lane / All Sub-Swimlanes. Dual-ring selection highlight (`box-shadow` with white inner + accent outer). `fontSize` property on swimlanes/sub-swimlanes (`0` = default, stripped by `_packProj()`). Font size field in swimlane edit modal. Export SVG respects custom sizes. Close button on popover. 3 new `MOUSE_REFS` entries. 45 new tests in `test_swimlane_format.js`. |
| **0.37.1** | 2026-02-19 | Data table status dropdown fix (B39): right-clicking or clicking a status cell dropdown on a non-selected row no longer dismisses the dropdown. `_dtSelect()` guard skips re-render when the clicked row is already the sole selection target. |
| **0.37.0** | 2026-02-19 | Mode Indicator Pills (F37): hybrid collapsed-pill toolbar indicators for Lock, Hide Mode, and Auto-Schedule states. Each pill shows a centered emoji icon (🔒/👁/📐) at 26px collapsed width, expanding on hover to reveal label + dismiss ×. Lock pill appears on any axis lock, hide pill on `hideMode`, auto-schedule pill on `autoSched`. Dismissing a pill toggles the state off. Locked-drag toast ("🔒 Locked — unlock to move items") on drag attempt while locked. Pills use CSS transitions for smooth expand/collapse, `flex-shrink:0` to prevent compression, and `pointer-events:none` on hidden text to avoid ghost clicks. Slack character limit thresholds tightened to match actual ~11.5K platform limit. |
| **0.36.0** | 2026-02-18 | Share via Link v2 — Ultra Compression: replaces LZString with 3-layer pipeline (strip defaults → short-key encoding → native `CompressionStream('deflate-raw')` + base64url), reducing share links ~3× (11.5K→~3.4K chars for 30-item project). Three-tier Slack/Teams character limit warnings (green ≤3,500 / amber 3,501–4,000 / red >4,000). `_packProj()` strips fields matching `newProj()` defaults — `migrate()` restores on load. `_skEnc`/`_skDec` recursive key-replacement (60+ keys). Async `init()`/`_loadFromHash()`/`shareProject()`. Zero-dependency — browser-native compression, no library. |
| **0.35.0** | 2026-02-18 | Share via Link (F42): compress project JSON into URL hash (`#p=...`) using LZString, recipient opens link and timeline loads instantly in browser — no server, no account. Rich-text clipboard copy pastes as clickable "Timeline Studio: Project Name" hyperlink in Slack/Teams/email (plain-text fallback for editors). Shared-project banner with 30s SVG countdown timer + Save a Copy button. `_shareMode` flag guards autoSave to protect user's localStorage. OG meta tags for generic link previews. Warning callout in share modal explaining long-link behavior. Scroll fixes: 18px bottom padding on timeline body and labels column for horizontal scrollbar clearance; dynamic 42px padding when bottom watermark is active (matching export's `wmH=24` allocation). Labels column padding synced with body to prevent scroll desync. |
| **0.34.4** | 2026-02-18 | Critical path highlighting in export/screenshot: `buildExportSVG()` now computes `getCriticalPath()` when the critical path toggle is ON and renders orange `#fb8500` border rects around critical task bars and milestone icons, matching the on-screen CSS styling. 9 new tests in `test_export_svg.js`. |
| **0.34.3** | 2026-02-18 | Critical path fix (B38): Fixed backward-pass float calculation for FS/FF constraints through milestones with working-day scheduling. `_addLagWorkingDays()` was non-invertible when starting from non-working days (weekends/holidays) — forward normalization (e.g. Sat→Mon) had no backward equivalent, producing spurious float. Fix anchors backward constraints to the forward pass's recomputed EF and replays forward-direction lag arithmetic with `_skipNonWorking`, eliminating the asymmetry. 46 new regression tests in `test_b38_critical_path.js`. |
| **0.34.2** | 2026-02-17 | Panel button polish: Corrected collapse chevron direction to › (pointing toward panel edge), reordered buttons to [›🔒] [›] (lock-collapse left, collapse right nearest edge), lock-collapse icon now ›🔒 combining collapse direction with lock. |
| **0.34.1** | 2026-02-17 | Panel UX Refinement: Simplified from three-button (📌/›/») to two-button (› Collapse / ›🔒 Lock-Collapse) model. Panel never auto-collapses on deselect — always shows empty state. Lock state visible on collapsed tab (🔒 icon vs ‹ chevron). Data view ALWAYS lock-collapses with `_wasExpandedBeforeDataView` boolean for auto-restore. Data toolbar and filter bar get `paddingRight` to prevent panel/tab overlap on search controls. Removed `panelPinOpen`/`panelOpen`/`_panelPreDataView`; simplified to `panelCollapsed` + `panelLocked`. |
| **0.34.0** | 2026-02-17 | Collapsible Properties Panel (F36): Three-button panel system (📌 Pin Open, › Collapse, » Pin Collapse) replaces old auto-hide model. Pin Open keeps panel expanded on deselect (shows empty state); Collapse temporarily collapses to 28px tab (auto-reopens on next item click); Pin Collapse locks panel collapsed with gentle hint animation (1.2s glow, 4s cooldown) when items are clicked. Empty state with contextual hints when nothing selected. Data view auto-collapses with `_panelPreDataView` state memory for seamless restore. Both timeline and data table get `paddingRight` for collapsed 28px tab. Context menu "Edit Properties" overrides pin-collapse. Panel stays open during drag. Session persistence via `localStorage`. |
| **0.33.1** | 2026-02-17 | Tab key panel glitch fix (B36): Pressing Tab while timeline focused (no selection) no longer opens a broken empty properties pane. Tab intercepted in keydown handler — `preventDefault()` when not in a form field, normal Tab navigation preserved within inputs. |
| **0.33.0** | 2026-02-17 | Simple Auto Arrange Slider: New "Layout Style" slider (Compact ↔ Waterfall) maps a single 0–100 value to three advanced parameters (Spread, Padding, Date Weight) + Consider Labels toggle via piecewise linear interpolation. Advanced options collapsed behind "▸ Advanced Options" panel with bidirectional sync. Added F41 (Layout engine enhancements) as P2 Research backlog item referencing `timeline-studio-layout-engine-analysis.md`. |
| **0.32.0** | 2026-02-17 | Data Table Context Menu (F40, B37, F38): Column-aware right-click bulk editing in Data View. Recognizes property type (text/status/lane/sub/color/row/progress/pin/hidden/type) and offers smart operations — text fields get apply-value/prepend/append/clear; enum fields get dropdown pickers that apply to all selected; pin/hidden get set/unset/toggle; type gets bulk convert with date conversion rules; delete cleans dependency references. `ctx-hint` headers show affected item count. Mini-input popover for prepend/append with Enter/Escape/stopPropagation. Single `snap()` per operation for atomic undo. Restored inline status `<select>` dropdown in data table (F38). Fixed right-click collapsing multi-selection — `onmousedown` now skips `_dtSelect` for button=2 when item already selected (B37). 173 new tests in `test_dt_context_menu.js`. |
| **0.31.1** | 2026-02-16 | File handle bug fixes (B33–B35): Save As button no longer clears `_fileHandle` before picker (B33), Save As preserves original file handle for future Ctrl+S instead of redirecting to the copy (B34), `openFile()` now confirms unsaved changes before discarding (B35). |
| **0.31.0** | 2026-02-16 | Advanced Import (F35): click-to-link column mapping GUI with drag-drop reorder, auto-detection (date/number/status/color), prefix delimiter extraction, overloads (append/replace/skip), status matching with auto-map + manual assignment, smart sub-swimlane grouping, label position defaults (center for tasks, bottom for milestones). Tunable Auto Arrange: zoom-independent density-based algorithm with 3 sliders (Row Spread, Label Padding, Date Weight Pack/Waterfall) + Consider Label Width toggle + live preview with draggable transparent-overlay modal + Reset Defaults button. Upward-first spiral search, label-position-aware collision detection. |
| **0.30.2** | 2026-02-16 | New Project shortcut fix (B32): changed default binding from `Ctrl+N` (browser-reserved, opens new window) to `Ctrl+Alt+N`. Added `Ctrl+n` to `BROWSER_RESERVED` set so shortcut manager warns on rebind attempts. Updated File dropdown label in `index.html`. Doc shortcut audit: README.md shortcuts table updated with `Ctrl+Alt+N`, added missing `Ctrl+Shift+G` (Fit to Selection), `Ctrl+Shift+K` (Shortcut Manager), `+`/`-` (Zoom), `Middle-drag` (Pan). Fixed `tests/MANUAL_QA.md`: `Ctrl+Shift+C` (not a registered shortcut) and `Ctrl+Shift+Z` (should be `Ctrl+Y` for Redo). |
| **0.30.1** | 2026-02-15 | Work-mode drag resize fix (B30): removed `startTR()` guard that blocked drag-based resizing for work-mode tasks; replaced calendar-only duration math (`U.days()+1`) with `_countWorkingDays()` for correct working-day duration during resize. `isWork` flag computed once at mousedown for efficiency. New task default fix (B31): changed default `durMode` from `'work'` to `'cal'` in `addItem()` and data table milestone-to-task type conversion, aligning with migration code (line 277) and test builders. Eliminates unintended resize restrictions on freshly created tasks. |
| **0.30.0** | 2026-02-15 | Bulk drag-and-drop (F28): multi-select group move across swimlanes and sub-swimlanes. CSS-only swimlane expansion during drag (no DOM destruction), snapshot-based revert for exact height restoration, single-band preview (only hovered target expands), cross-swimlane/sub-swimlane drop detection with divider offset correction, two-tier ghost snap preview (primary + secondary), smart group-aware row compaction (items from different sub-swimlanes stack by source order). B29 bug fixes: stale variable references after `_expandedMap` refactor, ghost flicker from `renderTL()` DOM rebuilds, geometry-based item shifting (`.tl-item` selector fix), dragged-item exclusion from snapshot revert. |
| **0.29.2** | 2026-02-15 | Shift+drag -1 day offset fix (B28): `parseInt()` → `parseFloat()` in 4 drag system locations (start capture, ghost preview, date feedback, drop handler) prevents fractional pixel truncation from causing `xD()` date round-trip errors during shift+drag horizontal lock. Only affected items whose `dX()` pixel position had a fractional part that crossed a `Math.round()` boundary when truncated. |
| **0.29.1** | 2026-02-15 | Auto-fit swimlane heights (F33): `autoFitHeights()` shrinks swimlane/sub-swimlane heights to tightly fit content (`Math.max(50, (maxSubRow+1)*38+10)`). Auto Fit ↕ button in View dropdown (Swimlanes section, alongside Expand All / Collapse All). Registered in `SHORTCUT_ACTIONS` (no default binding, user-configurable). Skips collapsed/minimized swimlanes, respects hideMode, routes unassigned items to first sub-swimlane. Uses explicit contentH values (not 0 sentinel) to avoid resize-handle edge case. 71 new tests. |
| **0.29.0** | 2026-02-15 | Item-anchored zoom (F31) + Fit to selection (F32): `doZoom()` now anchors to selection centroid date (or viewport center if nothing selected) to keep the anchor visually fixed during zoom. `_selCentroidDate()` computes midpoint of earliest-start to latest-end. All zoom paths anchored (keyboard, toolbar, Ctrl+Scroll, 100% reset via `doZoomTo()`). New `fitToSelection()` method filters iterative solver to selected items, `Ctrl+Shift+G` shortcut (`ctx:'sel'`), Fit toolbar button context-sensitive (selection → fit selection, no selection → fit content). 60 new tests. |
| **0.28.3** | 2026-02-15 | Status badge clipping fix (B25): top-left badge CSS offset adjusted from `top:-8px` to `top:-2px` so badges no longer clip above swimlane boundary for top-row items. Matching +6px shift applied to all SVG export badge offsets (task + milestone) for emoji, shortName, and text display modes. |
| **0.28.2** | 2026-02-15 | Data table row selection (B24): shift+click range select on checkboxes and row backgrounds, ctrl+click toggle, plain click single-select. `_dtSelect()` shared helper, mousedown-based shift detection (shiftKey unreliable on change events), `addEventListener` stacking fix in `bindDT()` (converted to property assignment), same-item early-return prevents input focus loss. 176 data table tests (up from 60). |
| **0.28.1** | 2026-02-14 | Panel-aware viewport (B26): scroll headroom (+290px body width when panel open, `box-sizing:border-box` workaround), smooth auto-scroll items clear of panel on select (Google Maps-style `scrollTo({behavior:'smooth'})`), bulk selection scroll support, `fitToContent()` and `goToday()` subtract panel width from viewport, fit zoom minimum lowered to 10% for wide timelines. `autoRange()` ordering fix (range expands before `sched()`, self-schedules on change). Negative duration guard (B27): changing start past end keeps duration and moves end forward, and vice versa. Panel date changes trigger auto-scroll to follow edited item. |
| **0.28.0** | 2026-02-14 | Pan mode (F29): middle-mouse drag for instant pan, toggle-based Pan Mode in Tools menu (✋) with bindable keyboard shortcut, 2D scrolling (horizontal + vertical), mutual exclusion with Lasso Mode, Escape to exit, cursor feedback (grab/grabbing). Capture-phase middle-click prevention for smooth scrolling. Help modal updated with pan documentation. |
| **0.27.1** | 2026-02-14 | Backlog update: B24 (Shift+click range select in Data View), B25 (status badges clipped at edges), B26 (properties panel overlaps right-side items + scroll range limits), F28 (bulk drag-and-drop group move), F29 (right-click drag to pan), F30 (mini-map navigation overlay). |
| **0.27.0** | 2026-02-14 | Drag-and-drop overhaul: items follow mouse during drag (DOM orphaning fix), ghost snap preview (dashed outline at landing position), sub-swimlane band highlighting, Shift+drag horizontal lock, Escape to cancel drag (with undo pop), date feedback system (cursor delta badge with tiered units, header column span highlight, bottom status strip with original→target dates), selection ring fix (sched() on click-without-drag). Properties panel suppressed during drag. Cross-swimlane + sub-swimlane drop detection with divider offset correction. Help modal section 4 rewritten. |
| **0.26.4** | 2026-02-14 | Comprehensive test coverage: 1,675 tests across 14 files (up from 579 across 2). Shared test helpers (assert, mock-engine, builders), aggregate runner (`run-all.js`), 12 new test files organized by category (core, features, release, regression). Playwright visual regression framework. Bug gap analysis (B1–B22 coverage audit) with targeted gap-filling tests (B7 grid lines, B12 lock-nudge, export completeness). Manual QA checklist (`tests/MANUAL_QA.md`) with quick smoke test (10-15 min) and comprehensive feature sweep (45-60 min). CLAUDE.md updated with test structure and run guidance. |
| **0.26.3** | 2026-02-13 | Status field F22 Phase 4 — Export + CSV: status badges in SVG/PNG export (emoji, shortName pill, text, color override, inline prefix via `<tspan>`), Status + StatusDate columns in simple and advanced CSV export, Showcase.tlproj updated with sample statuses. |
| **0.26.2** | 2026-02-13 | Status field F22 Phase 3 — Timeline rendering + context menu: status badges on timeline items in 3 display modes (emoji, shortName, text) × 3 positions (inline, bottom-right, top-left). Color override as separate toggle (combo with any mode). Blank status color option. "🚦 Set Status ▸" context menu submenu. Inline mode respects all display modes. |
| **0.26.1** | 2026-02-13 | Status field F22 Phase 2 — Properties pane + data table: status dropdown with gear button, expanding description/date. Data table status column with colored short name badges. Status filter, sort by definition order, advanced search by status name. Bulk edit and apply modal support. |
| **0.26.0** | 2026-02-13 | Status field F22 Phase 1 — Data model + settings UI: `statusDefs` array (7 defaults) and `statusDisplay` config in project data. Per-item `status`/`statusDate` fields. Settings UI with dynamic status definition list (color, emoji, name, short name, description, reorder, delete). Impact modal for deletions affecting items. Migration for backward compatibility. |
| **0.25.1** | 2026-02-13 | Header/swimlane alignment fix (B22): `.th-row` explicit height matches `rowH` constant, removed `border-bottom` from `#tl-hdr-corner`. |
| **0.25.0** | 2026-02-13 | Configurable keyboard shortcuts (F18): three-tier shortcut manager in Settings (Reserved / Customizable / Mouse Reference). `SHORTCUT_ACTIONS` registry with `_normalizeKey()` → `_scMap` hash dispatch replacing hardcoded if/else chain. Key recorder with capture-phase listener, conflict detection with auto-fade messaging, max 2 bindings per action. Per-user `localStorage['tls3_shortcuts']`. Reserved 2-column compact grid (Delete Selected, Select All moved to Reserved). Nudge actions hidden from UI but still functional. Zoom In/Out (5%) default bindings (`=`/`-`). Toolbar zoom buttons aligned to ±5%. `Ctrl+Shift+K` opens Settings scrolled to Shortcuts. Help modal dynamically generated from registry with `*` markers on customized bindings. |
| **0.24.0** | 2026-02-12 | Bulk edit panel expanded: duration display toggle, duration format, owner text, show owner/start/end checkboxes, edge text color — all with type-aware propagation (task-only fields skip milestones). Data View filters: new Type (task/milestone), Swimlane, and Sub-Swimlane dropdown filters; swimlane dropdowns populate dynamically on open. Filter button active state: accent-colored toggle shows whether filter bar is open. Shared `_fltMatch()` refactor eliminates duplicated filter logic in `renderDT()`. |
| **0.23.1** | 2026-02-12 | PRIVACY.md: privacy architecture document with sourced references from GitHub Docs and MDN. Explains static hosting, File API, and Local Storage architecture. Privacy architecture diagram added (`screenshots/privacy-architecture.png`). README updated with privacy blurb linking to PRIVACY.md. |
| **0.23.0** | 2026-02-12 | Non-shifting properties pane (F24): panel converted from flex-layout sibling to right-side `position:absolute` overlay with `z-index:50`, `box-shadow`, GPU-accelerated `transform:translateX`. Zero layout shift on open/close. Split view reordered: data table on left, timeline on right. Today marker fix: explicit height for full swimlane coverage. UI polish: "Show Date Label" hidden for tasks (milestone-only), dependency lag input widened (38→54px), data table header checkbox left-aligned. Backlog: F22 (Status field), F23 (Legend), F24 (done), F25 (Links), F26 (Status import). |
| **0.22.0** | 2026-02-11 | README editorial polish (comparison prose, session recovery, accurate shortcut count). Test files moved to `tests/`. Personal .tlproj files removed from repo + git history scrubbed. .gitignore added. Versioned folder now contains only 3 core files + Showcase.tlproj. Repo flattened: core files moved to root for GitHub Pages. Versioning moved from folder names to git tags. Live at `https://adrotar21.github.io/timeline-studio/`. |
| **0.21.0** | 2026-02-11 | README screenshots finalized (5 PNGs: hero, data-view, dependencies, themes, auto-schedule). New Auto-Scheduling section in README highlighting manual→auto-scheduled workflow. Hero screenshot doubles as timeline view. Bug fix (B21): `showDate` no longer gates task owner/duration display. Showcase.tlproj polish. Lock default fix (newProj/migrate lockV). |
| **0.20.0** | 2026-02-11 | Comprehensive README.md documentation (F8). 11-section structure: hero, value prop with comparison table, quick start guide, feature showcase with screenshot placeholders, file format, project structure, keyboard shortcuts, browser compatibility, development guide, roadmap, license. Screenshot guide for 5 key views. Public-facing readiness milestone. Bug fix (B21): `showDate` no longer gates task owner/duration display — decoupled in 3 render paths. Showcase.tlproj file with 30-item demo project for README screenshots. |
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

> **Versioning scheme:** `0.x.0` = mini-major (feature batches), `0.x.y` = patch/bugfix. Pre-1.0 = beta. Version 1.0 targets the first stable release. Versions tracked via **git tags** (`git tag v0.22.0`).

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
| :large_blue_circle: **P3 — Low** | Backlog for V2+; cosmetic or niche |

## Status Key
| Status | Emoji | Meaning |
|--------|-------|---------|
| **Open** | :white_circle: | Not started |
| **In Progress** | :hammer_and_wrench: | Actively being worked on |
| **Published & Testing** | :test_tube: | Published to GitHub, still working out kinks |
| **Plan** | :memo: | Spec drafted, needs refinement before work begins |
| **Blocked** | :no_entry_sign: | Cannot proceed — external dependency or limitation |
| **Research** | :mag: | Investigation complete, implementation deferred |
| **Done** | :white_check_mark: | Completed — move to Appendix on next backlog edit |

---

## Open Bugs

> Sorted by priority (highest first), then by size (smallest first).

| # | Title | Description | Size | Priority | Status |
|---|-------|-------------|------|----------|--------|
| | | _No open bugs — all resolved._ | | | |

---

## Open Features

> Sorted by priority (highest first), then by size (smallest first within each priority tier).

| # | Title | Description | Size | Priority | Status |
|---|-------|-------------|------|----------|--------|
| F43 | **Import scheduling options** | Expand the import flow with scheduling-aware options: (1) **Working vs Calendar days** toggle — determines how imported durations are interpreted. (2) **Manual vs Auto-Scheduled mode** selector with explanatory tooltip (e.g., "Auto for critical-path imports from other tools"). (3) **Same-day dependency start option** — accounts for the off-by-one issue where some tools (e.g., SmartSheet) allow a dependent milestone/task to start on the same end date as its predecessor rather than the next day. When enabled, applies a `-1` lag offset to imported FS dependencies. Research needed: what is the official name for this setting across tools (SmartSheet, MS Project, Primavera)? Does it apply only to milestone→task links or also task→task? This may be part of a broader "import strategy" configuration panel that surfaces the right options based on source tool conventions. | L | :orange_circle: P1 | :white_circle: Open |
| F13 | **Keyboard shortcut discoverability** | Surface keyboard shortcuts and power-user actions in the UI for new users. Options include a cheatsheet panel, tooltip hints, or help modal section. | M | :yellow_circle: P2 | :white_circle: Open |
| F17 | **Swimlane header text orientation** | Per-swimlane setting for major header text direction: horizontal, vertical, or angled. Configurable in the swimlane edit modal. Decouples text orientation from sub-swimlane presence. | M | :yellow_circle: P2 | :white_circle: Open |
| F21 | **SharePoint hosting guide** | Document how to host Timeline Studio on SharePoint by renaming `index.html` to `index.aspx` and uploading all three files. Add a note to README Quick Start section after confirming it works. | XS | :large_blue_circle: P3 | :white_circle: Open |
| F6 | **Modal/kiosk window mode** | Open the app in a browser window without the URL bar. **Blocked by browser limitations:** Chrome ignores `window.open` location flags (since ~2017), PWA install requires HTTPS (not `file://`), "Create shortcut → Open as window" is greyed out for local files. Only viable path: serve via localhost (e.g., `python -m http.server`) and use PWA manifest or Chrome shortcut. Revisit if the app moves to a hosted/server model. | S | :large_blue_circle: P3 | :no_entry_sign: Blocked |
| F30 | **Mini-map navigation overlay** | Detect when timeline is very large and show a mini-map overlay for navigating around. Zoomed-out bird's-eye view with a draggable viewport rectangle for panning. Deferred to V2+. | L | :large_blue_circle: P3 | :white_circle: Open |
| F34 | **Import items from swimlane context menu** | Add an "Import Items to [Swimlane/Sub-swimlane]" option in the right-click context menu when clicking on a swimlane or sub-swimlane row. Context-aware label: shows "Import to *Swimlane Name*" or "Import to *Sub-swimlane Name*" depending on the target. Opens the paste/import modal pre-targeted to that lane. **Depends on:** advanced import options for Data View being configured first (advanced column mapping, conflict resolution). Implement after that groundwork is in place. | S | :large_blue_circle: P3 | :white_circle: Open |
| F39 | **Overlap conflict hint card** | Detect when many items overlap visually on the timeline (e.g., stacked in the same row/date range) and show a passive, dismissible hint card suggesting the Auto Fit Heights feature (`autoFitHeights()`) or Auto Arrange. Non-intrusive — appears as a small card near the toolbar or bottom status strip, not a modal. Could also mention the keyboard shortcut if one is bound. Ties into F13 (shortcut discoverability). | S | :large_blue_circle: P3 | :white_circle: Open |
| F25 | **Item links/URLs** | **[Plan — needs refinement/discussion]** Allow tasks and milestones to store one or more hyperlinks. **Data model:** Each item gets a `links` array of objects, each with: URL, Display Name (optional — falls back to URL), and optionally a Link Type or category (e.g. "JIRA", "Confluence", "SharePoint", "Other"). **Properties pane UI:** A links section in the item properties pane — add/remove/edit links, each rendered as a clickable hyperlink that opens in a new tab. Compact display (icon + short name) with expand/edit on click. **Configuration:** Project-level settings for default link types/categories (so users can predefine "JIRA", "Wiki", etc. with URL templates like `https://jira.company.com/browse/{key}`). **Timeline display:** Optional — small link icon badge on items that have links (similar to pin badge). Click or hover to reveal link list. **Data table:** Links column showing count or first link, with expand to see all. **Export:** Links are metadata-only in PNG export (no clickable links in images). SVG export could include `<a>` elements for clickable links. CSV export includes links as a delimited string. **Open questions:** Maximum number of links per item? Should links support drag-and-drop URL paste? Integration with paste-import from Excel (link column)? | M | :large_blue_circle: P3 | :memo: Plan |
| F23 | **Legend watermark** | **[Plan — needs refinement/discussion]** A structured legend overlay on the timeline, similar to the existing watermark but purpose-built for conveying meaning. **Content sources:** Can pull from Status (F22), Team/Owner, Swimlane/Sub-swimlane names, Milestone shape types, Color types, and other item properties — grouping multiple dimensions into one legend. **Positioning & layout:** Separate from the existing watermark with its own position setting (corner, edge, or custom x/y coordinates). Movable on the timeline (drag to reposition). **Styling options:** Toggle border on/off, border thickness, background color, text color, opacity/transparency slider. Legend entries show a visual swatch (color dot, emoji, shape icon, or line sample) paired with label text. **Configuration UI:** Dedicated "Legend" section in Project Settings. User selects which property dimensions to include and in what order. Separate "Apply" button so users can preview changes without closing the modal. Modal should be movable/draggable (non-blocking) so users can see the timeline underneath while configuring. **Export:** Legend must render in SVG/PNG export at the configured position, matching on-screen appearance. **Open questions:** How to handle legends that are too tall for the timeline area (scrollable? multi-column?). Whether legend should auto-update when items change or be manually refreshed. Interaction with the existing watermark (coexist independently? shared positioning grid?). How custom/freeform legend entries work (not tied to a property). | XL | :large_blue_circle: P3 | :memo: Plan |
| F7 | **Multi-project tabs** | Support opening multiple projects in separate tabs or an in-app tab bar, each with its own state. | XL | :large_blue_circle: P3 | :white_circle: Open |
| F26 | **Status import & field linking** | **[Plan — V3+ future]** Enable re-importing updated data (e.g. from Excel paste or CSV) and linking imported columns to item fields — especially Status — so users can quickly pull in bulk status updates without manually editing each item. **Ties into F22:** Leverages the 2-deep status history (prev status 1 & 2) to compute deltas on import (e.g. "changed from On Track to At Risk since last import"). Could surface import-diff summaries, highlight changed items, and optionally auto-apply or prompt for confirmation. **Open questions:** Column mapping UI for linking import fields to item properties. Conflict resolution when imported data disagrees with manual edits. Whether to support scheduled/watched file re-import. | L | :large_blue_circle: P3+ | :memo: Plan |
| F41 | **Layout engine enhancements** | **[Research — see `timeline-studio-layout-engine-analysis.md`]** Six recommendations from deep analysis of `_autoLayoutItems()`: (1) Dependency-aware row preference via barycenter heuristic — highest impact, wires deps into placement so connected items land on same/adjacent rows. (2) Critical path → row 0 bias — easy win, anchors critical path visually. (3) 2D per-row label collision — tighter layouts with Consider Labels on. (4) Import-aware placement with pinned items — eliminates overlap on incremental import. (5) Milestone clustering. (6) Post-placement crossing minimization. **Approach:** Adapt algorithms from dagre/d3-dag source — no external dependencies. | L | :yellow_circle: P2 | :mag: Research |
| F27 | **Multi-instance file sync** | **[Research complete — V3+ future, implement after beta]** Real-time sync between multiple Timeline Studio instances viewing the same project file. Six-layer architecture: (1) StorageEvent for instant same-browser tab sync, (2) File System Access API polling for cross-browser/cross-instance sync, (3) Visual indicators for file handle state and active sessions, (4) `_lastSavedBy` metadata for conflict detection, (5) View-Only mode for safe read-only access, (6) Opt-in auto-save-to-disk for automatic propagation. **Risk:** Auto-save-to-disk on OneDrive/SharePoint-synced files creates conflict files when multiple users edit simultaneously — this is an inherent OneDrive limitation, not solvable without a server. Feature deferred to post-beta to avoid disrupting early users. **See:** Appendix B for full research, use-case walkthroughs, and implementation plan. | L | :large_blue_circle: P3+ | :mag: Research |

---

## Summary by Priority

### :red_circle: P0 — Must Fix Before V1
_All P0 items resolved in v0.14.0._

### :orange_circle: P1 — High Priority for V1
- **F43** — Import scheduling options (L)

### :yellow_circle: P2 — Nice to Have for V1
- **F13** — Keyboard shortcut discoverability (M)
- **F17** — Swimlane header text orientation (M)
- **F41** — Layout engine enhancements (L) — :mag: Research (see analysis doc)

### :large_blue_circle: P3 — Backlog for V2+
- **F21** — SharePoint hosting guide (XS)
- **F6** — Modal/kiosk window mode (S) — :no_entry_sign: **Blocked**: requires HTTPS/localhost
- **F34** — Import items from swimlane context menu (S) — depends on advanced import
- **F39** — Overlap conflict hint card (S)
- **F30** — Mini-map navigation overlay (L)
- **F25** — Item links/URLs (M) — :memo: Plan
- **F23** — Legend watermark (XL) — :memo: Plan
- **F7** — Multi-project tabs (XL)
- **F26** — Status import & field linking (L) — :memo: Plan, V3+
- **F27** — Multi-instance file sync (L) — :mag: Research complete, V3+ (see Appendix B)

---

## Suggested Swimlane Header Work Order

> Items impacting the swimlane header system, in recommended implementation sequence. Each step builds on the previous — completing them in order minimizes rework.

1. ~~**F16 — Resizable swimlane header column (M, P2)** — Done (0.16.0).~~
2. ~~**F15 — Dual-mode swimlane collapse (M, P1)** — Done (0.16.1).~~
3. ~~**F14 — Swimlane Manager modal (L, P1)** — Archived (0.17.0). Current inline UI covers the use case.~~
4. **F17 — Swimlane header text orientation (M, P2)** — Per-swimlane text direction (horizontal/vertical/angled). Settings live in the existing swimlane edit modal (`showSwM()`). Label column width is dynamic (F16).
5. ~~**F19 — Swimlane header font size (S, P2)** — Done (0.38.0). Per-swimlane font size via orthogonal selection + right-click format popover with live preview and bulk "Apply to" scoping.~~
6. ~~**F3 — Collapsible sub-swimlanes (M, P2)** — Done (0.18.0). 2-state collapse with upper-right buttons, fit exclusion, export rendering.~~

---

## Appendix: Completed Items

| # | Title | Size | Version | Notes |
|---|-------|------|---------|-------|
| F4 | **Header Bar Customization (Days scale + formats)** | XL | 0.40.0 | 5-phase implementation: (1) Month format (Jan/J) and quarter format (Q1 2025/Q1) selectors in View dropdown. (2) Right-click header popover with font size stepper (7–16px) and format selectors. (3) Days timescale with letter/number/hybrid label formats and compact/normal/wide column widths. (4) cycleDayFmt, cycleScale, cycleHdrRows keyboard shortcut actions. (5) Header grid lines strengthened with time-period boundary emphasis, holiday (red text + bar) and weekend (grey bar) indicators on day cells, weekend/holiday shading quick-controls (checkbox + opacity slider) in popover and View dropdown, swimlane popover dismiss fix. 362 tests in test_header_format.js. |
| F42 | **Format Painter** | M | 0.39.0 | Office-style copy-formatting tool with two-step popover wizard. Three-state machine (IDLE → STAGED → PAINTING): click 🖌 → popover opens with 12 property checkboxes + All/None links → "Apply Once" (single target, auto-exit) or "Apply to Many" (persistent mode). F4 keyboard shortcut enters single paint mode directly (skips popover, uses last-saved property selection); F4 again upgrades to multi/persistent. `FP_PROPS_DEF` constant with composite key expansion (`dateDisplay` → 5 sub-props, `hiddenPinned` → 2). Source item pulses during staged and painting. Mutual exclusion with lasso/pan. Property selection persisted in `localStorage['tls3_fpProps']`. `MOUSE_REFS` entry for paint-mode click. 76 tests. |
| B40 | **Missing timescale/dateFormat validation in migrate()** | XS | 0.38.2 | `migrate()` skipped `timescale` and `dateFormat` — both stripped by `_packProj()` for share links and missing from old files. Undefined timescale caused blank dropdown, wrong scale rendering, and incorrect column widths. Fix validates against allowed values with sensible defaults. |
| F19 | **Swimlane header font size** | S | 0.38.0 | Per-swimlane and per-sub-swimlane font size via orthogonal selection system (`App.slSel`) + right-click formatting popover with live-preview stepper (7–24px). Context-smart "Apply to" scoping (Selected / All Swimlanes / Subs in This Lane / All Sub-Swimlanes). Dual-ring selection highlight. `fontSize` property (`0` = default) stripped by `_packProj()`, restored by `migrate()`. Font size field in swimlane edit modal. Export SVG respects custom sizes. Close button on popover. 3 new `MOUSE_REFS` entries. 45 new tests. |
| B39 | **Data table status dropdown dismissed on row select** | S | 0.37.1 | Clicking a status cell dropdown on a non-selected row caused the dropdown to flash open then close — `_dtSelect()` re-rendered the table, destroying the dropdown. Fixed with a guard that skips re-render when the target row is already the sole selection. |
| F37 | **Header bar state indicators (Mode Indicator Pills)** | M | 0.37.0 | Hybrid collapsed-pill toolbar indicators for Lock (🔒), Hide Mode (👁), and Auto-Schedule (📐) states. Pills show centered emoji icon at 26px collapsed width, expanding on hover to reveal label + dismiss ×. Dismissing toggles state off. Locked-drag toast on move attempt while locked. CSS transitions for smooth expand/collapse. Slack character limit thresholds tightened. |
| B38 | **Critical path not highlighting all branches through milestones** | S | 0.34.3 | `_addLagWorkingDays()` non-invertible when starting from non-working days — forward normalization (Sat→Mon) had no backward equivalent in `calculateFloat()`. Backward FS/FF constraints now anchor to forward pass EF (`ef.get(id)`) and replay forward-direction `_addLagWorkingDays` + `_skipNonWorking`, eliminating asymmetry. 46 new tests in `test_b38_critical_path.js`. |
| F36 | **Collapsible Properties Panel** | M | 0.34.0 | Three-button panel system (📌 Pin Open, › Collapse, » Pin Collapse). Pin Open keeps panel expanded on deselect (empty state). Collapse temporarily collapses to 28px tab (auto-reopens on next click). Pin Collapse locks collapsed with hint animation (1.2s glow, 4s cooldown). Data view auto-collapses with state memory (`_panelPreDataView`). Both views get `paddingRight` for 28px tab. Context menu "Edit" overrides pin-collapse. Panel stays open during drag. Session persistence via `localStorage`. |
| B36 | **Tab key opens glitched empty properties pane** | XS | 0.33.1 | Pressing Tab while timeline focused (no selection) opened the properties pane in a broken all-black state. Tab's default browser focus-navigation reached offscreen panel buttons (hidden via `transform:translateX(100%)` but still focusable). Fix: added Tab key guard in the document keydown handler — `preventDefault()` when `activeElement` is not an input/textarea/select, preserving normal Tab navigation within form fields. |
| F40 | **Data Table Context Menu** | L | 0.32.0 | Column-aware right-click bulk editing in Data View. Recognizes property type and offers smart operations: text fields (apply value, prepend, append, clear), enum fields (dropdown picker applies to all selected), pin/hidden (set/unset/toggle), type (bulk convert with date rules), delete with dep cleanup. `ctx-hint` headers show affected item count. Mini-input popover for prepend/append. Single `snap()` per operation. 173 new tests. |
| F38 | **Data View status dropdown** | S | 0.32.0 | Restored inline `<select>` dropdown for Status column in Data View. Lists all `statusDefs` (excluding blank) with emoji + shortName. Change handler updates `statusDate` to today when status is set, clears it when status is cleared. |
| B37 | **Right-click collapses multi-selection** | XS | 0.32.0 | `tb.onmousedown` fired before `tb.oncontextmenu` on right-click (button=2), calling `_dtSelect()` with no modifiers which replaced the multi-selection with just the clicked item. Fix: added `if(e.button===2&&this.sel.includes(row.dataset.iid))return;` guard to skip `_dtSelect` when right-clicking an already-selected item. |
| B35 | **Open has no unsaved-changes guard** | XS | 0.31.1 | `openFile()` silently discarded unsaved changes without confirmation. Added `if(this._unsaved&&!confirm(...))return;` at the top, matching the guard in `createFromTemplate()`. |
| B34 | **Save As redirects future saves to copy** | S | 0.31.1 | `saveFile(saveAs=true)` replaced `_fileHandle` with the picker's new handle, so subsequent Ctrl+S saved to the copy instead of the original file. Fix: store `prevHandle` before picker, write to temp handle `h`, restore `prevHandle` after write. When no prior handle exists (first save), keeps the new handle via `saveAs&&prevHandle?prevHandle:h`. |
| B33 | **Save As button clears file handle prematurely** | XS | 0.31.1 | `btn-save-as` click handler set `this._fileHandle=null` before calling `saveFile(true)`. If user cancelled the picker, the handle was permanently lost. Removed the redundant clear — `saveFile(saveAs=true)` already skips the handle-reuse path. Keyboard shortcut (`_scDispatch.saveAs`) was unaffected. |
| F35 | **Advanced Import + Tunable Auto Arrange** | XL | 0.31.0 | Click-to-link column mapping GUI with drag-drop reorder, auto-detection (date/number/status/color), prefix delimiter extraction, overloads (append/replace/skip), status matching with auto-map + manual assignment, smart sub-swimlane grouping. Tunable Auto Arrange: zoom-independent density-based algorithm with Row Spread / Label Padding / Date Weight sliders, Consider Label Width toggle, live preview with draggable modal, Reset Defaults button, upward-first spiral search, label-position-aware collision. Import label defaults: center (tasks), bottom (milestones). |
| B32 | **New Project shortcut conflicts with browser Ctrl+N** | XS | 0.30.2 | `Ctrl+N` is browser-reserved (opens new browser window) but was intercepted by Timeline Studio's keydown handler. Changed default binding to `Ctrl+Alt+N` in `SHORTCUT_ACTIONS`. Added `Ctrl+n` to `BROWSER_RESERVED` set. Updated hardcoded label in `index.html` File dropdown. Doc audit: README.md shortcuts table updated with new binding + 4 missing shortcuts (`Ctrl+Shift+G`, `Ctrl+Shift+K`, `+`/`-`, `Middle-drag`). Fixed `tests/MANUAL_QA.md` referencing non-existent `Ctrl+Shift+C` and incorrect `Ctrl+Shift+Z` (should be `Ctrl+Y`). |
| B30 | **Work-mode tasks can't be drag-resized** | S | 0.30.1 | `startTR()` had a guard (lines 2912-2914) that blocked drag-based resizing for work-mode tasks, showing a toast "use the Duration field instead." The original concern was valid (calendar-only `U.days()+1` duration math corrupted working-day duration), but the codebase gained `_countWorkingDays()` which is used correctly in the properties panel and data table. Fix: removed the guard, replaced calendar-only duration calc with `isWork ? _countWorkingDays(start, addDays(end,1)) : U.days()+1`, matching the pattern at lines 2255 and 3375. `isWork` flag computed once at mousedown (stable for drag lifetime). |
| B31 | **New tasks default to work mode (unresizable)** | XS | 0.30.1 | `addItem()` set `durMode='work'` on new tasks, which combined with the B30 guard meant freshly created tasks couldn't be drag-resized. Changed default to `durMode='cal'` in both `addItem()` (line 1374) and data table milestone-to-task type conversion (line 3368). Aligns with migration code (line 277, `if(!it.durMode) it.durMode='cal'`) and test builder factories. |
| F28 | **Bulk drag-and-drop to new swimlane** | L | 0.30.0 | Multi-select group move across swimlanes and sub-swimlanes. CSS-only swimlane expansion during drag (manipulates DOM styles directly instead of mutating model + `renderTL()` to avoid DOM destruction that kills ghosts/highlights). Snapshot-based revert captures exact original DOM state before expansion for guaranteed exact reversal. Single-band preview — only the currently-hovered target band expands, previous expansions auto-revert. Two-tier ghost snap preview (primary darker, secondary lighter). Cross-swimlane/sub-swimlane drop detection with divider offset correction. Smart group-aware row compaction: items from different sub-swimlanes stack by source sub-swimlane order (`_groupKey = swimlaneIndex*1000 + subSwimIndex`), with compact stacking within each group. Dragged items excluded from snapshot revert (`_dragIids` Set) to prevent jitter. Key implementation details: `_expandedMap` (targetId → expansion info), `_snapshots` (slId → original DOM state), `_activeExpandId` (single-band tracking), `_cssExpand()`/`_cssRevertAll()` for CSS-only expansion/revert. 113 multi-drag tests. |
| B29 | **F28 bug fixes: expansion, revert, selectors** | M | 0.30.0 | Multiple bugs found and fixed during F28 implementation: (1) stale `_dragExpandTarget`/`_dragOrigHeight` variable references after `_expandedMap` refactor (ReferenceError flooding console, preventing drop/escape), (2) ghost flicker from `renderTL()` DOM rebuilds during expansion (solved by CSS-only approach), (3) `.item` → `.tl-item` selector fix (items have class `tl-item`, not `item` — zero items were being selected/shifted), (4) geometry-based item shifting (`top >= bandEnd`) instead of model-based `subSwimId` (some items unassigned in model but visually bucketed), (5) piecemeal CSS revert accumulation errors (solved by snapshot-based revert), (6) all expanded bands staying expanded (solved by single-band `_activeExpandId` tracking), (7) dragged items jumping during revert (solved by `_dragIids` exclusion set). |
| B28 | **Shift+drag -1 day offset** | XS | 0.29.2 | `parseInt()` truncated fractional pixel positions from DOM `style.left` during drag, causing `xD()` date round-trip to return the wrong day for items whose rendered position had a fractional part crossing a `Math.round()` boundary. Fixed: `parseInt()` → `parseFloat()` in 4 drag locations (start capture, ghost preview, date feedback, drop handler). Only manifested during shift+drag (horizontal lock) because the position was never updated to an integer during drag. |
| F33 | **Auto-fit swimlane heights** | M | 0.29.1 | `autoFitHeights()` method shrinks swimlane and sub-swimlane heights to tightly fit content. Content height formula: `Math.max(50, (maxSubRow+1)*38+10)`. Auto Fit ↕ button in View dropdown (Swimlanes section). Registered in `SHORTCUT_ACTIONS` (View category, no default binding, user-configurable via Settings → Shortcuts). Skips collapsed/minimized swimlanes and minimized sub-swimlanes. Respects `hideMode` (hidden items excluded). Routes unassigned items to first sub-swimlane (matches `renderTL()` routing). Uses explicit `contentH` values (not 0 sentinel) to avoid `bindRH()` resize-handle edge case. Idempotent — second run produces 0 changes. Toast feedback: "Heights auto-fitted (N lanes)" or "Heights already optimal". 71 new tests. |
| F31 | **Item-anchored zoom** | M | 0.29.0 | `doZoom()` now anchors to selection centroid date (midpoint of earliest-start to latest-end across selected items) or viewport center when nothing selected. All zoom paths anchored: keyboard shortcuts, toolbar buttons, Ctrl+Scroll, zoom label scroll, and 100% reset (`doZoomTo()`). Uses `_selCentroidDate()` helper, date-based anchor (zoom-independent), post-render `requestAnimationFrame` scroll adjustment (same pattern as `fitToContent()`). Centroid off-screen clamped to viewport edge. |
| F32 | **Fit to selected items** | M | 0.29.0 | New `fitToSelection()` method filters the iterative zoom solver to only selected items. Falls back to `fitToContent()` if nothing selected. Collapsed swimlane items included (user intent is explicit), hidden items excluded when `hideMode` ON. `Ctrl+Shift+G` keyboard shortcut with `ctx:'sel'` guard. Fit toolbar button context-sensitive: selection present → fit selection, empty → fit content. Toast shows "Fit to selection (N items)". 60 new tests covering centroid calculation, anchor zoom math, solver edge cases, shortcut registration. |
| B25 | **Status badges clipped at timeline edges** | S | 0.28.3 | Top-left status badges on items in subRow 0 were clipped by the swimlane boundary above — CSS `top:-8px` positioned badges 2px above the 6px padding from swimlane top. Fixed: CSS offset adjusted to `top:-2px`, keeping badges fully visible within the swimlane. Matching +6px shift applied to all SVG export badge offsets for both tasks and milestones (emoji, shortName, text display modes). |
| B24 | **Shift+click range select in Data View** | M | 0.28.2 | Shift+click on checkboxes and row backgrounds now range-selects all visible rows between anchor and target. `_dtSelect()` shared helper handles plain click (single-select), Ctrl+click (toggle), Shift+click (range). Key fix: shift detection moved from `onchange` (where `shiftKey` is unreliable on checkboxes) to `onmousedown`. Also fixed `addEventListener` stacking in `bindDT()` (converted to property assignment) and added same-item early-return to prevent input focus loss during editing. 176 data table tests. |
| B26 | **Properties panel overlaps right-side items + scroll range limits** | M | 0.28.1 | Two related issues fixed: (1) Items on the right side covered by properties panel — solved via scroll headroom (+290px body width), smooth auto-scroll on select. (2) Scroll range too tight after fit — lowered fit zoom minimum (10%), panel-aware fit/goToday. |
| B27 | **Negative duration when start moved past end** | S | 0.28.1 | Changing start past end (or end before start) in properties panel produced negative duration. Fixed: keep duration and compute new end/start. Also fixed `autoRange()` ordering. |
| F29 | **Pan mode** | M | 0.28.0 | Middle-mouse drag for instant pan + toggle-based Pan Mode (Tools → ✋) with bindable keyboard shortcut. 2D scrolling with grab/grabbing cursor feedback. Pan and Lasso modes mutually exclusive. Capture-phase `preventDefault` on scroll container prevents native middle-click auto-scroll. |
| F22 | **Status field for tasks/milestones** | XL | 0.26.0–0.26.3 | Full 4-phase implementation: (1) Data model + settings UI, (2) Properties pane + data table, (3) Timeline rendering + context menu, (4) Export + CSV. 7 default status definitions, 3 display modes × 3 positions, color override toggle, status history tracking. |
| B22 | **Header/swimlane label alignment gap** | XS | 0.25.1 | `.th-row` elements had no explicit height — sized to content (~19-20px) while `#tl-hdr-corner` used `rowH=22px` constant, creating a visible gap between the calendar header and swimlane labels. Fixed by adding `height:${rowH}px` inline style to each `.th-row`. Removed `border-bottom` from `#tl-hdr-corner` to eliminate 1px line artifact at the seam. |
| F18 | **Configurable keyboard shortcuts** | M | 0.25.0 | Three-tier shortcut manager in Settings: Reserved (2-column compact grid — Save, Undo, Redo, New, Open, Save As, Escape, Shortcut Manager, Delete Selected, Select All), Customizable (rebindable — View, Tools, Items, Export actions), Mouse Reference (read-only — Ctrl+Click, Alt+Drag, Ctrl+Scroll, etc.). `SHORTCUT_ACTIONS` registry with `_normalizeKey()` → `_scMap` hash dispatch replacing hardcoded if/else chain. Key recorder with capture-phase listener, conflict detection with auto-fade messaging (5s timeout + CSS opacity transition), max 2 bindings per action. Nudge actions hidden from UI but functional via arrow keys. Zoom In/Out (5%) default bindings (`=`/`Shift+=`/`-`). Toolbar zoom buttons aligned to ±5%. Per-user `localStorage['tls3_shortcuts']` (not per-project). `_buildShortcutMap()` skips user overrides for reserved actions. `Ctrl+Shift+K` opens Settings scrolled to Shortcuts. Help modal dynamically generated from registry with `*` markers on customized bindings. |
| F24 | **Non-shifting properties pane** | L | 0.23.0 | Converted properties panel from flex-layout sibling (290px, pushed timeline right on open) to `position:absolute` right-side overlay with `z-index:50`. Panel now slides in/out via `transform:translateX(100%)` (GPU-accelerated) instead of `margin-left:-290px` (layout reflow). Timeline never resizes — zero layout shift on open/close/add-item. Theme-specific `box-shadow` for depth cue (lighter on light theme, darker on midnight). Panel HTML moved to end of `#main-content` (after `#dt-ctx-menu`) to remove from flex flow. Zero JS changes — all `openPanel()`/`closePanel()` calls work unchanged via CSS class toggle. |
| F8 | **Comprehensive README.md** | M | 0.20.0 | 11-section README.md: hero with badges, competitive comparison table, 3-step quick start, feature showcase (timeline, data, dependencies, export, themes), file format, project structure, keyboard shortcuts table, browser compatibility, development guide, roadmap, license placeholder. Screenshot guide for 5 key views (hero, timeline-view, data-view, dependencies, themes). |
| B18 | **Help modal polish** | S | 0.19.3 | Paste import explanation in section 2 (Data View 📋 Paste, tab-separated from Excel). Watermark feature in section 11 (Last Updated stamp, position, owner, appears in exports). Corrected references: Lock now locks both axes (removed Lock H/V), export via Settings→Export (not ⬇ icon), Invert Selection is a header button (not right-click). Lasso Mode and Ctrl+Scroll/Ctrl+Shift+Scroll zoom added to shortcuts table. New ⚠ Notes/Troubleshooting section: work type, scheduling toggle, holidays, lock, hidden items, selection inversion, zoom. |
| B19 | **Pin badge on timeline items** | XS | 0.19.3 | Small 📌 emoji badge rendered at top-right of pinned items on the timeline. 9px font, absolute positioned, `pointer-events:none`, drop-shadow for visibility. `.item-pinned` class was applied but had no visual effect — now items show a clear pin indicator. |
| B20 | **Data view header cleanup** | XS | 0.19.3 | Invert-selection button (⇅) styled as compact 20×20px square with themed border, background, and hover state (was unstyled browser default). Select-all checkbox cell vertically and horizontally centered via `text-align:center; vertical-align:middle` on the `_cb` column header. |
| B21 | **showDate gates task owner/duration** | S | 0.20.0 | `showDate` property acted as master gate for the entire secondary label line on tasks — setting `showDate: false` silently blocked owner and duration display even when `showOwner: true` and `showDuration: true`. Fixed by decoupling task owner/duration rendering from the `showDate` check in 3 locations: on-screen `rI()`, export `buildExportSVG()`, and label width `_itemLabelWidths()`. Milestones unchanged (showDate still gates milestone date text). Showcase.tlproj updated to `showDate: true` on all tasks. |
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

---

## Appendix B: Multi-Instance File Sync Research (F27)

> Full feasibility analysis and implementation plan for real-time sync between multiple Timeline Studio instances. Researched in v0.24.0. Deferred to post-beta (V3+) due to OneDrive conflict risk.

### Use Cases

1. **Same browser, two tabs** — User opens the same project in two tabs to view timeline and data table side by side. Edits in one tab should appear in the other.
2. **Same machine, two browsers** — User has Chrome and Edge both open on the same `.tlproj` file. Saves in one should be visible in the other.
3. **Two machines, OneDrive sync** — Two people on different machines both have the OneDrive folder synced locally. One edits, the other should see the changes.
4. **Presentation mode** — One person edits while another has it open in view-only for a meeting/review.

### Current Architecture (No Sync)

- `autoSave()` writes to `localStorage['tls3']` every 400ms (debounced). Single-tab, single-browser only.
- `saveFile()` writes to disk via `FileSystemFileHandle` on explicit Ctrl+S. Handle stored in `App._fileHandle` (ephemeral — lost on page refresh).
- No `StorageEvent` listener, no `BroadcastChannel`, no file polling, no `FileSystemObserver`.
- Each tab is fully isolated. Opening two tabs = two independent copies.

### Proposed Six-Layer Architecture

| Layer | Mechanism | Scope | Latency | Risk | Effort |
|-------|-----------|-------|---------|------|--------|
| 1. **StorageEvent** | `window.addEventListener('storage', ...)` | Same-browser tabs | ~400ms | None | XS |
| 2. **File polling** | `setInterval` + `handle.getFile()` every 2s | Cross-browser, same machine | ~2s | None (read-only) | S |
| 3. **Sync indicators** | 🔗 handle badge + 👥 active-session badge | Visual awareness | Instant | None | XS |
| 4. **`_lastSavedBy` metadata** | Embed machine ID + timestamp in `.tlproj` JSON | Conflict detection | On file read | None | XS |
| 5. **View-Only mode** | `App._viewOnly = true`, disable all writes | Safe shared viewing | N/A | None | S |
| 6. **Auto-save-to-disk** | Debounced `handle.createWritable()` every 5s | Cross-instance propagation | ~5-7s | **OneDrive conflicts** | S |

Layers 1–5 are low-risk and can be implemented independently. Layer 6 (auto-save-to-disk) is the only one with OneDrive conflict risk and should be opt-in with clear warnings.

### Walkthrough: Same Browser, Two Tabs (Layers 1 + 3)

```
t=0.0s  Tab A: user edits task name "Alpha" → "Beta"
t=0.4s  autoSave → localStorage['tls3'] updated
t=0.4s  Browser fires StorageEvent on Tab B (NOT on Tab A — per spec)
t=0.4s  Tab B: handler parses new value, replaces App.proj, re-renders
        Toast: "🔄 Synced from another tab"
        👥 badge lights up on both tabs
```

**Key detail:** The `storage` event fires only on *other* same-origin tabs, never on the tab that wrote. No suppression flag needed.

### Walkthrough: Same Machine, Two Browsers (Layers 2 + 3)

```
t=0.0s  Chrome: user edits and saves (Ctrl+S) → writes .tlproj to disk
t=0-2s  Edge: polling tick fires, calls handle.getFile()
t=~2s   Edge: detects lastModified changed, reads file, parses JSON, replaces proj
        Toast: "🔄 File updated"
        👥 badge lights up
```

**Self-save suppression:** After writing to disk, `_updateFileTimestamp()` records the new `lastModified`. Next poll tick sees `file.lastModified === this._lastFileModified` → no reload.

### Walkthrough: Two Machines, OneDrive Sync (Layers 2 + 4 + 6)

```
t=0s     Machine A: user edits → auto-save-to-disk fires after 5s → writes .tlproj
t=0-30s  OneDrive syncs Machine A's version to cloud
t=0-60s  OneDrive syncs cloud version down to Machine B's local copy
t=+2s    Machine B: polling detects new lastModified → reloads → toast
```

**Total latency:** 7–67 seconds depending on OneDrive sync speed.

### How OneDrive Conflict Detection Actually Works

OneDrive uses **optimistic concurrency control** via **eTags** — opaque version strings assigned by the server. The server is a dumb storage layer; all conflict detection logic lives in the local sync client.

**What the sync client tracks:** Every file in its local database has a last-synced eTag and content hash (quickXorHash). When the sync client detects a local file change, it checks the server's current eTag before uploading.

**The decision tree:**

| Server eTag | Local file | Outcome |
|-------------|-----------|---------|
| Unchanged since last sync | Changed | **Clean upload** — no conflict |
| Changed since last sync | Unchanged | **Download new version** — no conflict |
| Changed since last sync | Also changed | **Conflict copy created** (e.g., `timeline-MachineB.tlproj`) |
| Changed since last sync | Same hash as server | **No action** — pseudo-conflict, content identical |

**Important:** The server never "reconciles" or "merges" anything. It accepts uploads and returns HTTP 412 (Precondition Failed) when an eTag doesn't match. The sync client on the uploading machine decides what to do with the rejection.

#### Outcome 1: Conflict File (Expected, Safe)

```
State: Server has file at eTag "abc". Both machines synced to "abc".

t=0s   Machine A saves locally → sync client uploads → Server eTag now "def"
t=2s   Machine B saves locally → sync client tries to upload with If-Match: "abc"
       → Server returns 412: eTag is "def", not "abc"
       → Machine B's sync client creates "timeline-MachineB.tlproj"
       → Original file keeps Machine A's version
       → Machine B's edits preserved in the conflict copy (requires manual merge)
```

This is the "safe" path — nothing is lost, but the user sees confusing extra files.

#### Outcome 2: Silent Overwrite (Dangerous, No Warning)

```
State: Server has file at eTag "abc". Both machines synced to "abc".

t=0s    Machine A saves → sync client uploads → Server eTag now "def"
t=5-30s OneDrive propagates "def" down to Machine B's local copy
        Machine B's sync client updates its local DB: last-synced eTag = "def"
t=30s+  Machine B's user saves → sync client sees local change against eTag "def"
        → Server still at "def" → clean upload → Server eTag now "ghi"
        → Machine A's changes SILENTLY OVERWRITTEN. No conflict file. No warning.
```

This happens when the sync propagation from A→cloud→B completes **before** B saves. From B's sync client's perspective, it's just a normal local edit against the current version — it has no way to know B's user never reviewed A's changes.

#### Which Outcome Depends Entirely on Timing

The variable is whether Machine B's sync client learns about Machine A's upload **before or after** Machine B's user saves:

- **B saves before sync propagates A's changes:** Conflict file created (safe — both versions preserved)
- **B saves after sync propagates A's changes:** Silent overwrite (dangerous — A's work gone from main file)

OneDrive version history (cloud-side, 30 days) is the only safety net for silent overwrites. The overwritten version still exists in the recycle bin / version history on OneDrive's web interface.

#### Why No Auto-Save Mechanism Can Guarantee Safety

For non-merge-supported file types like `.tlproj` (JSON), **there is fundamentally no way to have two simultaneous editors without either conflicts or silent overwrites.** OneDrive is a file sync service, not a real-time collaboration platform for arbitrary formats. The only file types that avoid this are Office formats (.docx, .xlsx, .pptx) which use Microsoft's proprietary co-authoring protocol — unavailable for JSON/custom formats.

Any mechanism that writes to disk — whether auto-save, heartbeat, or manual save — changes the file content, increments the eTag, and enters the conflict-or-overwrite lottery above.

### The Auto-Save Tradeoff

The choice between auto-save-to-disk ON vs OFF isn't "safe vs risky" — it's choosing **which failure mode**:

| | Auto-save ON (every 5s) | Auto-save OFF (manual Ctrl+S) |
|---|---|---|
| **Conflict frequency** | High — every 5s of concurrent editing | Low — only when both users happen to Ctrl+S at overlapping times |
| **Data loss per conflict** | Minimal — at most 5 seconds of edits in each conflict copy | Potentially catastrophic — hours of unsaved work silently overwritten |
| **Silent overwrite risk** | Lower — frequent saves mean the eTag mismatch is usually detected before sync propagates | Higher — long gaps between saves mean sync propagation likely completes, enabling clean-upload overwrite |
| **OneDrive churn** | High — constant file writes generate sync traffic, bandwidth use, version history bloat | Low — file only changes on explicit save |
| **User experience** | Frequent conflict files appearing in the folder (confusing for non-technical users) | Rare conflicts but devastating when they happen (hours of work vanish silently) |

**Key insight:** Auto-save creates more visible problems (conflict files) but less invisible data loss. Manual save creates fewer visible problems but the invisible failures are catastrophic. Neither is strictly "better" — it depends on user sophistication and how much they value data safety vs clean folder hygiene.

**What happens when you just open a file but don't edit?** Nothing — file polling is read-only (`handle.getFile()` doesn't modify the file). Two people can have the same file open simultaneously without any conflict, as long as only one is actively editing and saving.

### Proposed Conflict Mitigations

#### Tier 1 — Already Planned (in Layers 1–5)

1. **`_lastSavedBy` metadata in `.tlproj`**: Add fields `_lastSavedBy` (machine identity string) and `_lastSavedAt` (ISO timestamp) to the project JSON. On file open, check: if `_lastSavedAt` is within the last 10 minutes and `_lastSavedBy` ≠ current identity → show warning.

2. **View-Only mode**: On file open, if recent external save detected, offer: "This file was last modified by *Adam-Desktop* 7 minutes ago. Open in Edit mode or View-Only mode?" View-Only disables all saves and writes, but file polling still runs — live viewer sees updates from the editor.

3. **Auto-save-to-disk is opt-in, OFF by default**: Setting `proj.autoSyncToDisk` with clear warning about OneDrive conflict risk. Most users should leave this off and rely on explicit saves.

4. **File handle indicator (🔗)**: Visual badge showing whether the app has a retained file handle (direct save to disk) or not (will prompt file picker). Helps users understand their save context.

5. **Active-session indicator (👥)**: Pulsing badge when the file was updated by an external source within the last 60 seconds. Alerts user that someone else may be editing.

#### Tier 2 — Additional Mitigations (New)

6. **Pre-save conflict check (XS effort, high value)**: Before writing to disk on Ctrl+S, re-read the file via `handle.getFile()` and compare `lastModified` against `_lastFileModified`. If the file changed since our last read/write, prompt: "This file was modified externally since you last saved. Overwrite, Save As Copy, or Cancel?" Prevents the silent-overwrite scenario at the application level — catches it before OneDrive's sync client even gets involved.

7. **Generation counter in `.tlproj` JSON (XS effort)**: Add an incrementing `_saveGeneration` field. On pre-save conflict check, compare generations: if the file's generation is higher than expected, another instance wrote to it. More reliable than `lastModified` alone (timestamps can be unreliable across OneDrive sync).

8. **Auto-backup on conflict detection (S effort)**: When the pre-save check detects external changes, automatically save the current in-memory state as `projectname-backup-YYYYMMDD-HHMMSS.tlproj` in the same directory before prompting. Guarantees zero data loss even if the user makes the wrong choice in the conflict dialog.

9. **Session heartbeat in `.tlproj` (S effort)**: Write a `_sessionHeartbeat` timestamp and `_sessionId` to the JSON on a 30-second interval (only when auto-sync-to-disk is ON). Other instances can read this to detect active editing sessions. **Caveat:** This itself is a file write and triggers OneDrive sync — use with caution. Best paired with the pre-save conflict check.

10. **Default to "Save As Copy" on conflict (XS effort)**: When the pre-save check detects external changes, default the conflict dialog to "Save As Copy" rather than "Overwrite." Nudges users toward the safe choice. The copy gets a timestamp suffix: `projectname-copy-20260212-143022.tlproj`.

### SharePoint / OneDrive Technical Details

- **File System Access API reads/writes the local synced copy**, not the network. `handle.getFile()` returns the cached local file — no cloud round-trip.
- **OneDrive sync is background and asynchronous.** After a local write, OneDrive takes seconds to minutes to push to cloud and propagate to other machines.
- **SharePoint document libraries accessed directly (via URL) are NOT supported** by File System Access API — files must be synced locally via OneDrive first.
- **OneDrive may create `~$filename.tlproj` temp files** during sync conflicts. File polling should ignore these — it only checks `lastModified` on the original handle.
- **If OneDrive moves/renames the file** (conflict resolution), `handle.getFile()` will throw. Polling must catch this gracefully, stop polling, clear the handle indicator, and toast a warning.
- **The File System Access API does NOT lock files.** Two instances can both hold handles to the same file. No `flock()` equivalent exists in the browser.
- **Browser `File` object metadata is limited:** `name`, `size`, `lastModified` only. No "modified by", no NTFS metadata, no OneDrive author tracking. Machine identity must be stored inside the JSON itself.

### Implementation Blueprint

**State variables to add to `App`:**

| Variable | Type | Purpose |
|----------|------|---------|
| `_filePollId` | number\|null | `setInterval` ID for file polling loop |
| `_lastFileModified` | number | `file.lastModified` from last read/write |
| `_lastExtUpdate` | number | `Date.now()` of last external sync event |
| `_viewOnly` | boolean | View-only mode flag |

**Project data fields to add:**

| Field | Type | Purpose |
|-------|------|---------|
| `_lastSavedBy` | string | Machine/user identity (user-configurable) |
| `_lastSavedAt` | string | ISO timestamp of last save |
| `_saveGeneration` | number | Incrementing counter, bumped on every save to disk |
| `_sessionHeartbeat` | string | ISO timestamp of last heartbeat write (when auto-sync ON) |
| `_sessionId` | string | Random ID for the current editing session |
| `autoSyncToDisk` | boolean | Opt-in auto-save-to-disk (default `false`) |

**Methods to add:**

- `_startFilePolling()` — start `setInterval` (2s) on `_fileHandle`
- `_stopFilePolling()` — `clearInterval`, cleanup
- `_updateFileTimestamp()` — record `lastModified` after own write
- `_autoSaveToDisk` — debounced (5s) disk write via handle, guarded by `autoSyncToDisk`
- `_updateSyncInd()` — toggle 🔗 and 👥 indicators

**Files to modify:** `app.js` (logic), `index.html` (indicator elements), `styles.css` (indicator styles)

### Decision: Deferred to Post-Beta

**Reason:** OneDrive's conflict detection is fundamentally unsuitable for real-time multi-editor scenarios on non-Office file types. The eTag-based optimistic concurrency model produces two failure modes (conflict files or silent overwrites), neither of which can be eliminated — only shifted between. This was confirmed through deep analysis of OneDrive's sync client architecture, Microsoft Graph API conflict behavior, and real-world user reports of silent overwrites.

Layers 1–5 are safe individually and add real value for the common case (same browser, same machine). Layer 6 (auto-save-to-disk) is the only one with OneDrive risk and should be opt-in. The Tier 2 mitigations (#6–#10) significantly reduce the danger of Layer 6, especially the pre-save conflict check (#6) which catches silent overwrites at the application level before OneDrive's sync client gets involved.

**Recommended implementation order (when ready):**
1. Layers 1 + 3 (StorageEvent + indicators) — safe, no disk I/O, immediate value
2. Layer 2 (file polling) — safe, read-only, detects external changes
3. Mitigation #6 (pre-save conflict check) — XS effort, catches silent overwrites, no downside
4. Layer 4 (`_lastSavedBy` + `_saveGeneration` metadata) — safe, just extra JSON fields
5. Mitigation #7 (generation counter) — XS effort, pairs with #6 for reliable detection
6. Layer 5 (View-Only mode) — safe, no writes
7. Mitigation #10 (default Save As Copy on conflict) — XS effort, nudges toward safe choice
8. Layer 6 (auto-save-to-disk) — last, opt-in only, with OneDrive warnings
9. Mitigations #8–#9 (auto-backup + heartbeat) — only if Layer 6 is enabled
