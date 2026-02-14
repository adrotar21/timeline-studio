# Timeline Studio — Backlog

> Prioritized bugs and features for the V1 release. Legacy items migrated from `timeline project edits.txt` (now deleted — all items represented here).

## Versioning

| Version | Date | Summary |
|---------|------|---------|
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
| :blue_circle: **P3 — Low** | Backlog for V2+; cosmetic or niche |

---

## Open Features

| # | Title | Description | Size | Priority | Status |
|---|-------|-------------|------|----------|--------|
| F4 | **Days scale option** | Add "Days" to the timescale options (currently: Weeks, Months, Quarters, Years). | L | :yellow_circle: P2 | Open |
| F6 | **Modal/kiosk window mode** | Open the app in a browser window without the URL bar. **Blocked by browser limitations:** Chrome ignores `window.open` location flags (since ~2017), PWA install requires HTTPS (not `file://`), "Create shortcut → Open as window" is greyed out for local files. Only viable path: serve via localhost (e.g., `python -m http.server`) and use PWA manifest or Chrome shortcut. Revisit if the app moves to a hosted/server model. | S | :blue_circle: P3 | Blocked |
| F7 | **Multi-project tabs** | Support opening multiple projects in separate tabs or an in-app tab bar, each with its own state. | XL | :blue_circle: P3 | Open |
| F13 | **Keyboard shortcut discoverability** | Surface keyboard shortcuts and power-user actions in the UI for new users. Options include a cheatsheet panel, tooltip hints, or help modal section. | M | :yellow_circle: P2 | Open |
| F17 | **Swimlane header text orientation** | Per-swimlane setting for major header text direction: horizontal, vertical, or angled. Configurable in the swimlane edit modal. Decouples text orientation from sub-swimlane presence. | M | :yellow_circle: P2 | Open |
| F19 | **Swimlane header font size** | Per-swimlane font size for header labels. Configurable in swimlane edit modal with bulk propagation. Must flow through `_svgText()` for export. | S | :yellow_circle: P2 | Open |
| F21 | **SharePoint hosting guide** | Document how to host Timeline Studio on SharePoint by renaming `index.html` to `index.aspx` and uploading all three files. Add a note to README Quick Start section after confirming it works. | XS | :blue_circle: P3 | Open |
| F22 | **Status field for tasks/milestones** | **[Plan — needs refinement/discussion]** Add a configurable Status property to tasks and milestones. **Data model — global status definitions:** Each status entry (globally configured in project settings) stores: Status Name (used in selection dropdown), Status Description (shown after a status is selected in properties pane), Color (maps to a palette — red, yellow, green, blue, grey/white, plus user-configurable extras), Short Name (e.g. "R", "Y", "G", "Gr" for compact display), Emoji (bubble emoji mapped to color, plus other common emojis for non-color statuses). **Required default statuses:** (a) Blank/None — the default for all items; no status assigned, skipped entirely for rendering, export, legend, and any status-based logic; allows users to un-select a previously set status back to empty. (b) "TBD" / Unknown — explicitly marks an item as not-yet-determined; distinct from Blank so it can be filtered, displayed, and propagated. **Data model — per-item status properties:** Current Status Name (references a global definition, or Blank), Last Status Update Date (auto-set when status changes), Previous Status 1 Name + Date (auto-captured on status change, stores the prior status — reserved for future delta/trend checks, not surfaced in initial UI), Previous Status 2 Name + Date (one level deeper history — same purpose, not surfaced initially). The 2-deep status history protects the data model for future features like staleness detection, trend indicators, and import-based status diffing without requiring a migration later. **Timeline display options:** Configurable per-project how status appears on items — text label, short name only, emoji bubble, and/or override task/milestone color with the status color for easy visual propagation. Must support multiple display modes simultaneously (e.g. emoji + short name). **Accessibility:** Short name text option is critical for color-blind users — must always be available as an alternative to color-only display. **Configuration UI:** Global status configuration lives in Project Settings with a dedicated section. Properties pane shows a status dropdown per item plus a link/button to jump directly to the status configuration in settings. Dropdown options are the globally-configured status names. Default presets: Blank/None (default, no rendering), "TBD"→grey/?/❓, "On Track"→green/G/🟢, "At Risk"→yellow/Y/🟡, "Off Track"→red/R/🔴, "Complete"→blue/B/🔵, "Not Started"→grey-white/Gr/⚪ — fully customizable, users can rename, reorder, add, remove statuses. **TBD propagation:** Ability to bulk-propagate TBD status in logical ways — e.g. set all items with no status (Blank) to TBD, or flag items whose last status update date exceeds a staleness threshold (configurable) as TBD. More complex propagation rules (e.g. auto-TBD based on previous status age delta using the 2-deep history) deferred to future iteration. **Export:** Status display must render correctly in SVG/PNG export matching the on-screen appearance. **Sub-features to break down:** (1) Data model & migration, (2) Global config UI in settings, (3) Per-item dropdown in properties pane, (4) Timeline rendering (all display modes), (5) Export rendering, (6) Data table column, (7) CSV export column, (8) Default presets & customization, (9) Emoji picker/selection for statuses. | XL | :orange_circle: P1 | Plan |
| F23 | **Legend watermark** | **[Plan — needs refinement/discussion]** A structured legend overlay on the timeline, similar to the existing watermark but purpose-built for conveying meaning. **Content sources:** Can pull from Status (F22), Team/Owner, Swimlane/Sub-swimlane names, Milestone shape types, Color types, and other item properties — grouping multiple dimensions into one legend. **Positioning & layout:** Separate from the existing watermark with its own position setting (corner, edge, or custom x/y coordinates). Movable on the timeline (drag to reposition). **Styling options:** Toggle border on/off, border thickness, background color, text color, opacity/transparency slider. Legend entries show a visual swatch (color dot, emoji, shape icon, or line sample) paired with label text. **Configuration UI:** Dedicated "Legend" section in Project Settings. User selects which property dimensions to include and in what order. Separate "Apply" button so users can preview changes without closing the modal. Modal should be movable/draggable (non-blocking) so users can see the timeline underneath while configuring. **Export:** Legend must render in SVG/PNG export at the configured position, matching on-screen appearance. **Open questions:** How to handle legends that are too tall for the timeline area (scrollable? multi-column?). Whether legend should auto-update when items change or be manually refreshed. Interaction with the existing watermark (coexist independently? shared positioning grid?). How custom/freeform legend entries work (not tied to a property). | XL | :blue_circle: P3 | Plan |
| F26 | **Status import & field linking** | **[Plan — V3+ future]** Enable re-importing updated data (e.g. from Excel paste or CSV) and linking imported columns to item fields — especially Status — so users can quickly pull in bulk status updates without manually editing each item. **Ties into F22:** Leverages the 2-deep status history (prev status 1 & 2) to compute deltas on import (e.g. "changed from On Track to At Risk since last import"). Could surface import-diff summaries, highlight changed items, and optionally auto-apply or prompt for confirmation. **Open questions:** Column mapping UI for linking import fields to item properties. Conflict resolution when imported data disagrees with manual edits. Whether to support scheduled/watched file re-import. | L | :blue_circle: P3+ | Plan |
| F25 | **Item links/URLs** | **[Plan — needs refinement/discussion]** Allow tasks and milestones to store one or more hyperlinks. **Data model:** Each item gets a `links` array of objects, each with: URL, Display Name (optional — falls back to URL), and optionally a Link Type or category (e.g. "JIRA", "Confluence", "SharePoint", "Other"). **Properties pane UI:** A links section in the item properties pane — add/remove/edit links, each rendered as a clickable hyperlink that opens in a new tab. Compact display (icon + short name) with expand/edit on click. **Configuration:** Project-level settings for default link types/categories (so users can predefine "JIRA", "Wiki", etc. with URL templates like `https://jira.company.com/browse/{key}`). **Timeline display:** Optional — small link icon badge on items that have links (similar to pin badge). Click or hover to reveal link list. **Data table:** Links column showing count or first link, with expand to see all. **Export:** Links are metadata-only in PNG export (no clickable links in images). SVG export could include `<a>` elements for clickable links. CSV export includes links as a delimited string. **Open questions:** Maximum number of links per item? Should links support drag-and-drop URL paste? Integration with paste-import from Excel (link column)? | M | :blue_circle: P3 | Plan |
| F27 | **Multi-instance file sync** | **[Research complete — V3+ future, implement after beta]** Real-time sync between multiple Timeline Studio instances viewing the same project file. Six-layer architecture: (1) StorageEvent for instant same-browser tab sync, (2) File System Access API polling for cross-browser/cross-instance sync, (3) Visual indicators for file handle state and active sessions, (4) `_lastSavedBy` metadata for conflict detection, (5) View-Only mode for safe read-only access, (6) Opt-in auto-save-to-disk for automatic propagation. **Risk:** Auto-save-to-disk on OneDrive/SharePoint-synced files creates conflict files when multiple users edit simultaneously — this is an inherent OneDrive limitation, not solvable without a server. Feature deferred to post-beta to avoid disrupting early users. **See:** Appendix B for full research, use-case walkthroughs, and implementation plan. | L | :blue_circle: P3+ | Research |

---

## Summary by Priority

### :red_circle: P0 — Must Fix Before V1
_All P0 items resolved in v0.14.0._

### :orange_circle: P1 — High Priority for V1
- **F22** — Status field for tasks/milestones (XL) — **Plan**

### :yellow_circle: P2 — Nice to Have for V1
- **F4** — Days scale option (L)
- **F13** — Keyboard shortcut discoverability (M)
- **F17** — Swimlane header text orientation (M)
- **F19** — Swimlane header font size (S)

### :blue_circle: P3 — Backlog for V2+
- **F6** — Modal/kiosk window mode (S) — **Blocked**: requires HTTPS/localhost, not possible from `file://`
- **F7** — Multi-project tabs (XL)
- **F21** — SharePoint hosting guide (XS)
- **F23** — Legend watermark (XL) — **Plan**
- **F25** — Item links/URLs (M) — **Plan**
- **F26** — Status import & field linking (L) — **Plan, V3+**
- **F27** — Multi-instance file sync (L) — **Research complete, V3+** (see Appendix B)

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
