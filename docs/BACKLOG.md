# Timeline Studio — Backlog

> Prioritized bugs and features for the V1 release. Legacy items migrated from `timeline project edits.txt` (now deleted — all items represented here).

> :rotating_light: **Backlog management rule:** On each edit, all **Done** items must be moved from the Open tables to the **Appendix: Completed Items** table. Open tables should only contain active work (Open, Plan, Blocked, Published & Testing). Keep the backlog clean.

## Versioning

| Version | Date | Summary |
|---------|------|---------|
| **0.44.5** | 2026-02-27 | F58: Pinning friction/confirmation. Auto-pin-on-drag in scheduled mode now shows an amber warning toast with clickable Undo button (5s duration). Smart undo: if no intervening actions, full undo reverts drag+pin; if other edits occurred, only unpins the specific items without reverting other work. Pin badge flashes with yellow glow animation when drag-pinned, drawing the eye to the newly-pinned state. Snap-back toast improved to explain why: "← Snapped back — can't start before dependencies allow." Bulk drags aggregate into a single toast. `toast()` method extended with optional `actionLabel`/`actionFn` parameters for reusable action toasts. New `.toast-warn` (amber) and `.toast-action` (clickable underline) CSS classes. |
| **0.44.4** | 2026-02-27 | F57: Swimlane hide icon clarity. Replaced ✕ with 👁 eye icon on minimized swimlane hide button — both beta testers thought ✕ meant delete. Enhanced tooltip explains hide action and how to restore. Red-tinted eye icon (`#fca5a5`) matches existing hidden visual cues (`.pill-hide`). Switched all swimlane/sub-swimlane collapse buttons from native `title` to `data-tooltip` system — fixes overlapping tooltips where parent "Double-click to edit" tooltip fired simultaneously with button tooltips. Made tooltip CSS theme-aware via CSS variables (`var(--bg1)`, `var(--tx1)`, `var(--brd)`) instead of hardcoded dark colors. Updated help modal. |
| **0.44.3** | 2026-02-27 | B52 fix: shift+drag off-by-one day. The `dX()→xD()` pixel round-trip is lossy (`Math.round` in `xD()` can shift ±1 at fractional day boundaries). During shift+drag, `style.left` never changes but the drop handler still ran `xD()` on the unchanged value. Fix: skip date update when `nL===d.oL` (item didn't move horizontally) in 3 locations — drop handler, drag feedback tooltip, ghost snap preview. Correctly handles all drag scenarios: pure shift+drag, mid-drag Shift toggle, bulk drag, escape, lock mode. |
| **0.44.2** | 2026-02-27 | B51 fix: right-click bulk status edit in Data View restored. The B45 `<select>` guard (v0.41.0) was running before the B37 right-click guard, collapsing multi-selection before `contextmenu` fired. Fix: swapped guard order in `tb.onmousedown` so right-click on a selected row preserves multi-selection. Docs updated with beta user feedback (Feb 2026): added B51, B52, F57–F60 to backlog; elevated F48 to P1, bumped F50 to P2; added beta feedback summary section; enriched F13, F26, F27 descriptions with user validation notes; updated README competitive positioning and version/test counts; updated CLAUDE.md and MEMORY.md. |
| **0.44.1** | 2026-02-27 | F56 Open in New Tab/Window: ⧉ button on each MRU entry opens recent files in a new browser tab (left-click) or window (right-click popover with "↗ Open in new tab" / "⧉ Open in new window"). Reads file fresh from disk via stored FileSystemFileHandle, compresses through existing share link pipeline (`_packProj` → `_skEnc` → `_compress` → `#p=` URL hash). New tab auto-links back to disk file via `?mru=` query parameter + IDB handle reconnect (no share banner, Save works). Unsaved changes on current file blocked with toast. `_packProj(src)` refactored to accept optional source project. MRU dropdown auto-collapses when File menu closes. Vertical guide line (`border-left` on `#mru-section`) replaces 24px indentation, reclaiming horizontal space. Right-click popover opens from anywhere on the entry row. Popover dismiss follows proven two-layer pattern (explicit call in `onTlMD()` + `closest()` safety net in global click handler). Popover dismiss pattern documented in CLAUDE.md and MEMORY.md. |
| **0.44.0** | 2026-02-27 | F55 Recent Files (MRU): Collapsible "Open & Recent" submenu in File dropdown with Most Recently Used file list (up to 8 entries). IndexedDB v2 upgrade adds `recentFiles` object store alongside existing `handles` store; `localStorage['tls3_recentNames']` mirrors entries for synchronous rendering. Five file handle states (READY/STALE/DENIED/ORPHANED/NAME_ONLY) computed via lazy validation on menu open (`queryPermission` + `getFile` in parallel). Collapsible UI: single "Open & Recent ▸" row expands to show Browse link, recent file entries with per-entry × remove buttons (red with glow on hover), and status badges (✓ current, ⚠ orphaned, ⦿ stale — each with descriptive tooltip). IDB transaction bug fix: `isSameEntry()` async calls were causing transaction auto-close; refactored into read/compare/write phases. Graceful Firefox/Safari fallback (NAME_ONLY entries, file picker on click). Expansion state persists within session. Ctrl+O shortcut still opens file picker directly. Hooks in `openFile()`, `handleOpen()`, `saveFile()` update MRU on every file operation. |
| **0.43.0** | 2026-02-26 | F54 Settings modal reorganization: Restructured settings from 13 flat nav sections to 10 well-balanced sections (Project, Appearance, Scheduling, Holidays, Status, Layout, Export, Shortcuts, Links, Advanced). Appearance section gains Theme cards with live preview, Visibility group-box with inline shading controls (color preview boxes with live opacity, Lighter/Darker labels), collapsible Watermark and Time-to-Target panels with italic descriptions and reactive one-line summaries. Promoted Holidays to its own section with cross-links between Appearance shading controls and Holiday data management. Layout section gains Auto Arrange description with right-click access hint and ⚠️ live preview warning. Date Gravity moved to Advanced. Toggle switches gain depth (white knob with box-shadow). Schedule Around note explains Work vs Cal item interaction. Holiday empty-hint links to add holidays. |
| **0.42.6** | 2026-02-26 | F47 Import shortcut: added "Import..." entry to the Add dropdown (`+` button) with `📋` icon and tooltip. Opens the existing paste/import modal (`showPaste()`) directly. Provides a discoverable entry point for import without requiring users to find it in the File menu or know about the Data View paste flow. Separator line visually groups it below the create-item actions (Milestone, Task, Swimlane). |
| **0.42.5** | 2026-02-26 | B50 bug sweep: XSS fix in tooltip (escape project name/filename in HTML tooltips via `U.esc()`), `_packProj()` vLine default comparison fixed (`v.color===it.color` → `v.color==='#999999'`), `addSubSw()` deferred item mutation to `saveSwM()` (prevents non-undoable changes on cancel), `doPaste()` now initializes `status`/`statusDate`/`vLine`/`links`/`durMode`, dead `first` parameter removed from `buildHdrRows` month/year callbacks. |
| **0.42.4** | 2026-02-25 | B49 share link Office truncation fix: Office apps (Word, Excel, PowerPoint) truncate long URLs when opening embedded hyperlinks, corrupting the compressed project data. Updated share modal advisory to explicitly state links work in messaging apps (Slack, Teams) but may fail from Office — copy-paste recommended. Added user-facing error toast when `_loadFromHash()` decompression fails ("Share link may be truncated — copy-paste the full URL directly"). Reverted `%23p=` fallback from v0.42.3 (misdiagnosis — Office truncates, doesn't encode `#`). Kept `console.warn` for debugging. |
| **0.42.2** | 2026-02-24 | B48 context menu overflow fix: timeline right-click menu could extend past viewport bottom when clicking items near the bottom edge. Added `requestAnimationFrame` reposition (measures actual rendered height, shifts up if needed) matching the data table menu's proven pattern. Added `max-height:85vh;overflow-y:auto` as safety net. Shortened URL Links popup hint text. |
| **0.42.1** | 2026-02-24 | B47 December custom format fix: `U.fmt()` custom format branch replaced month names (e.g. "Dec") before day substitution, causing the "D" in "Dec" to be replaced by the day number (e.g. "15ec 15"). Fixed with `\x01`/`\x02` placeholder tokens — month names are deferred until after all day/month number replacements. Added `MMM YYYY` (e.g. "Jan 2026") as a built-in preset date format across global settings, per-item properties, and milestone bulk-edit dropdowns. |
| **0.42.0** | 2026-02-24 | F25 Item Links & URLs: per-item URL links (max 5) with swimlane/sub-swimlane support (max 3). Timeline globe badge (🌐), properties panel link editor with auto-https and green-flash save confirmation, context menu URL Links sub-menu (manage/open primary/open all + popup-blocker hint), bulk paste modal (Ctrl+Shift+V). Settings URL Links section with editable name/URL/tagged-item reassignment. CSV export includes links column. Theme-aware link inputs across all surfaces. Icon convention: 🔗 = dependency links, 🌐 = URL links. |
| **0.41.1** | 2026-02-24 | F53 file indicator polish: italic project name, dirty-aware color states (green when saved, amber when unsaved), unsaved dot moved inline with filename text, always-visible subtitle with grey fallback text when no file linked, container tooltip shows full project name + filename. B46 TTT offset color logic corrected (positive/zero = green, negative = red). |
| **0.41.0** | 2026-02-24 | File handle UX indicator (F53): IndexedDB handle persistence, filename subtitle below project name, auto-reconnect on Ctrl+S, startup silent reconnect via queryPermission, click-to-reconnect flow. Smart zoom on scale change (F45): per-scale target column counts with today/centroid scroll anchoring. TTT offset color fix (B46): green for on-track, red for behind. Data table status dropdown flash fix (B45): select guard prevents DOM rebuild. |
| **0.40.8** | 2026-02-22 | UX polish: Shortened tools call-out text ("Tools support shortcuts — Ctrl+Shift+K to set") with smaller `.dd-hint-sm` font (8.5px). Lock tooltip updated with Shift+drag tip for locking item dates. Lasso Escape priority: first Escape exits lasso mode only (preserves selection), second Escape clears selection — moved lasso check to top of `_handleEscape()` with early return. Settings scroll-spy fix: replaced IntersectionObserver (rootMargin/threshold mismatch caused off-by-one section highlighting) with simple `onscroll` handler using `Math.abs(section.top - container.top)` to find nearest section. |
| **0.40.7** | 2026-02-22 | UX: Added call-out note at bottom of Tools dropdown — "All tools support customizable keyboard shortcuts — Ctrl+Shift+K to configure" with clickable link that opens Settings → Shortcuts. Added missing `toggleSched` shortcut action to `SHORTCUT_ACTIONS` + `_scDispatch` so Toggle Scheduling Mode is now customizable like all other tools. Updated Toggle Scheduling tooltip to mention confirmation dialog when switching modes with date impacts. |
| **0.40.6** | 2026-02-22 | UX: Descriptive HTML tooltips added to all 8 remaining Tools dropdown items (Lock, Hide, Critical Path, Toggle Scheduling, Lasso Select, Pan Mode, Screenshot Viewport, Screenshot Full). Each tooltip explains what the feature does in plain language for first-time users. Uses existing `data-tooltip` system with `<br>` line breaks. HTML-only change — no CSS or JS modifications. |
| **0.40.5** | 2026-02-22 | UX: Propagate Selection in Tools dropdown now greyed out (`dd-disabled`, opacity 0.35) when nothing is selected or in auto-scheduled mode. Contextual italic hint below the item explains why — "Select an item to propagate" (no selection) or "Auto-handled in scheduled mode" (auto mode). Auto-mode message takes precedence. Descriptive HTML tooltip on hover: "Push date changes to downstream dependent items · Manual mode only · Ctrl+Shift+P". Click handler returns early when disabled. `updateStatus()` toggles disabled class and hint text. |
| **0.40.4** | 2026-02-22 | UX: Compact diagonal-split undo/redo button replaces two separate toolbar buttons (~65px → 30px). Single 30×28px container with CSS `clip-path` triangles — undo arrow top-left, redo arrow bottom-right, diagonal divider via `::after` pseudo-element. Independent hover highlighting and disabled state (30% opacity when stack is empty) per triangle. `updateStatus()` toggles `.disabled` class based on `undoStack.length`/`redoStack.length`. IDs preserved — no JS handler changes. |
| **0.40.3** | 2026-02-22 | UX: Renamed "Edge Text Color" to "Date Text Color" across all UI surfaces (properties panel, bulk edit, Format Painter). Added contextual hint below the color picker — shows "Color of start/end date labels on the task bar" when dates are enabled, or "Enable Start/End Date below to see date labels" when they're not. Internal property name `edgeTextColor` unchanged (no migration). |
| **0.40.2** | 2026-02-21 | Bugfix: Data table prepend/append mini-input popover was immediately dismissed on open. The document `click` handler (line 1454) hid `#dt-ctx-input` whenever a click landed outside it — but clicking "Prepend text…" or "Append text…" in `#dt-ctx-menu` triggered `_showDtCtxInput()` and then the same click event bubbled to the document handler, which saw the target was inside `#dt-ctx-menu` (not `#dt-ctx-input`) and re-hid the popover. Fix: added `&&!e.target.closest('#dt-ctx-menu')` guard so context menu clicks don't dismiss the popover they just opened. |
| **0.40.1** | 2026-02-21 | Bugfix patch: (B41) Header format popover now dismisses on left-click outside via mousedown-level hide (matches swimlane popover pattern — `onTlMD()` calls `_hideHdrFmtPopover()` before `sched()`/DOM rebuild). Document click handler simplified as safety net. (B42) Holiday gear icon scrolls to `#sect-holidays` instead of `#sect-display`. (B43) Canvas DPR auto-capping (`maxDim=16384`) in `copyScreenshot()` and `exportPNG()` — prevents silent failure on large day-scale timelines at high DPI. Added null checks on `getContext('2d')`, `toBlob`, `naturalWidth/Height`, `img.onerror`, and outer try-catch to `exportPNG`. 18 new header format tests, 25 new export SVG tests (505 total across 23 files). |
| **0.40.0** | 2026-02-21 | Header Bar Customization (F4 + Phase 5 polish): Days timescale with 3 display modes (letter/number/hybrid) and 3 column width presets (compact/normal/wide). Month format (Jan/J) and quarter format (Q1 2025/Q1) selectors. Right-click header popover with font size stepper (7–16px), format selectors, weekend/holiday shading quick-controls (checkbox + opacity slider, bidirectional sync with Settings). Header grid lines strengthened with time-period boundary emphasis. Day header cells show holiday (red text + bar) and weekend (grey bar) indicators — on-screen only. Swimlane popover dismiss fix (Ctrl+Click multi-select exception). cycleDayFmt, cycleScale, cycleHdrRows keyboard shortcut actions. 362 tests in test_header_format.js. |

> **Versioning scheme:** `0.x.0` = mini-major (feature batches), `0.x.y` = patch/bugfix. Pre-1.0 = beta. Version 1.0 targets the first stable release. Versions tracked via **git tags** (`git tag v0.22.0`).
>
> **Full history:** See [VERSION_HISTORY.md](VERSION_HISTORY.md) for versions prior to 0.40.0.

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
| | _No open bugs_ | | | | |

---

## Open Features

> Sorted by priority (highest first), then by size (smallest first within each priority tier).

| # | Title | Description | Size | Priority | Status |
|---|-------|-------------|------|----------|--------|
| F43 | **Import scheduling options** | Expand the import flow with scheduling-aware options: (1) **Working vs Calendar days** toggle — determines how imported durations are interpreted. (2) **Manual vs Auto-Scheduled mode** selector with explanatory tooltip (e.g., "Auto for critical-path imports from other tools"). (3) **Same-day dependency start option** — accounts for the off-by-one issue where some tools (e.g., SmartSheet) allow a dependent milestone/task to start on the same end date as its predecessor rather than the next day. When enabled, applies a `-1` lag offset to imported FS dependencies. Research needed: what is the official name for this setting across tools (SmartSheet, MS Project, Primavera)? Does it apply only to milestone→task links or also task→task? This may be part of a broader "import strategy" configuration panel that surfaces the right options based on source tool conventions. | L | :orange_circle: P1 | :white_circle: Open |
| F13 | **Keyboard shortcut discoverability** | Surface keyboard shortcuts and power-user actions in the UI for new users. Options include a cheatsheet panel, tooltip hints, or help modal section. Bundle with F48 discoverability pass. **Beta feedback (Feb 2026):** Both testers needed feature walkthroughs — shortcuts were never discovered organically. | M | :yellow_circle: P2 | :white_circle: Open |
| F59 | **Scheduling mode indicator & explainer** | Neither beta tester (Feb 2026) discovered Manual vs. Auto-Scheduled mode — a fundamental concept. **Implementation:** (1) More prominent toolbar indicator showing current scheduling mode (not just the mode pill, which is only visible when auto-scheduled). (2) Brief one-time explainer when a user first creates a dependency, explaining the two modes and how to switch. Could be a dismissible tooltip or a small inline card. Part of the broader discoverability pass (see F48). | S | :yellow_circle: P2 | :white_circle: Open |
| F60 | **Dependency display filtering** | Beta user request (Sean, Feb 2026): with ~12 swimlanes, cross-lane dependency arrows create visual noise. Wants to show intra-swimlane dependencies while hiding inter-swimlane ones. **Implementation:** Toggle in View dropdown or right-click context menu: "Show dependencies: All / Within swimlane only / None." Could also be per-swimlane (in the swimlane edit modal). The rendering already knows which swimlane each item belongs to — this is a filter on the arrow drawing logic in `renderTL()` and `buildExportSVG()`. | S–M | :yellow_circle: P2 | :white_circle: Open |
| F17 | **Swimlane header text orientation** | Per-swimlane setting for major header text direction: horizontal, vertical, or angled. Configurable in the swimlane edit modal. Decouples text orientation from sub-swimlane presence. | M | :yellow_circle: P2 | :white_circle: Open |
| F44 | **Copy swimlane/sub-swimlane data to clipboard** | Copy items from a swimlane or sub-swimlane to the clipboard, allowing paste into a different Timeline Studio instance (another tab/window). **Use case:** Open someone's timeline, see their header or a few rows of interest, copy those items, switch to your own timeline, paste them in. **UI:** Right-click on a swimlane or sub-swimlane header → "Copy Items to Clipboard" (copies all items in that lane as structured JSON). On paste in another timeline, items are inserted into the target swimlane/sub-swimlane with a conflict resolution prompt if names collide. Should preserve item properties (dates, colors, status, dependencies where possible). **Design questions:** Should it copy the swimlane/sub-swimlane structure itself, or just the items? How to handle dependencies that reference items outside the copied set (drop them, warn, or create placeholders)? Should paste offer "merge into existing swimlane" vs "create new swimlane"? Needs design back-and-forth. | L | :yellow_circle: P2 | :memo: Plan |
| F46 | **High-def screenshot with auto-save** | Enhanced screenshot feature that automatically saves a high-resolution PNG to the user's designated folder and copies the same PNG to the clipboard in one action. Uses higher DPI scaling than the current screenshot (e.g. 4x or configurable) for presentation-quality output. **UI:** Could be a separate "HD Screenshot" button or an option in the screenshot flow. Should leverage the File System Access API to save without a picker dialog (if a save directory is configured in Settings). Tooltip should note that the export is high-def and suitable for presentations. **Settings:** Configurable save directory (remembered across sessions), DPI multiplier, default filename pattern (e.g. `ProjectName-YYYYMMDD-HHMMSS.png`). | M | :yellow_circle: P2 | :white_circle: Open |
| F52 | **Compact timeline view** | A "Compact" view mode that reduces item heights and row spacing to fit more items in the available vertical space. Useful for timelines with 30–50 items where seeing the full picture matters more than individual item detail. **Approach:** Reduce `rowH` constant (or make it per-mode), shrink item bar heights, reduce font sizes, tighten swimlane padding, and compress sub-swimlane spacing. Could be a toggle in the View dropdown (e.g. "Compact View" checkbox or a density selector: Normal / Compact). Must propagate through: on-screen rendering (`renderTL()`), drag-and-drop geometry, auto-arrange row math, fit-to-content calculations, and export SVG. Status badges, pin indicators, and edge labels may need smaller variants or conditional hiding in compact mode. **Open questions:** How compact? Should it be a slider (density) or a binary toggle? Does compact mode affect Data View row height too? Should export match the compact on-screen view or always use normal density? | M | :yellow_circle: P2 | :white_circle: Open |
| F48 | **New user onboarding highlights** | **Elevated to P1 based on beta user feedback (Feb 2026):** Both beta testers (day-one beginner and two-week power user) required hands-on walkthroughs to find Tools, View, Settings, screenshot/export, hide/visible toggles, swimlane collapse states, Data View features, and scheduling modes. Neither discovered them organically. This is the single biggest blocker to a self-serve paid launch. **Implementation:** For a brand-new empty timeline, after a brief delay (~60 seconds of inactivity), gently highlight the Add dropdown area (the + Task / + Milestone button) with a pulsing glow or tooltip to guide first-time users. After a longer delay or after they've added their first item, highlight the Help (?) and Settings (⚙) areas similarly. **Behavior:** Non-intrusive — highlights dismiss on any interaction. Should only trigger for genuinely new timelines (no items, no prior localStorage data). Uses CSS animations (pulse/glow) rather than modal overlays. Should bundle with F13 (keyboard shortcut discoverability), F57 (swimlane hide icon clarity), F59 (scheduling mode indicator), and F50 (Tools sub-grouping) as part of a broader discoverability pass. | S–M | :orange_circle: P1 | :white_circle: Open |
| F21 | **SharePoint hosting guide** | Document how to host Timeline Studio on SharePoint by renaming `index.html` to `index.aspx` and uploading all three files. Add a note to README Quick Start section after confirming it works. | XS | :large_blue_circle: P3 | :white_circle: Open |
| F6 | **Modal/kiosk window mode** | Open the app in a browser window without the URL bar for a clean, native-app feel. **Research (Feb 2026):** `window.open()` location/toolbar flags are deprecated and ignored in all modern browsers (Chrome, Firefox, Safari, Edge) since ~2017 — security policy prevents hiding the address bar. The only viable path is **PWA with `"display": "standalone"`**, which hides the URL bar when the user "installs" the app. This works on the GitHub Pages hosted version (`https://…`) since it satisfies the HTTPS requirement, but does NOT work for `file://` usage. Implementation would involve adding a `manifest.json`, a service worker stub, and an optional install prompt. **Deferred:** Works well but requires users to "install" the PWA — keeping in back pocket until there's demand. Revisit if user feedback requests it or if a broader PWA feature set (offline support, etc.) is planned. | S | :large_blue_circle: P3 | :mag: Research |
| F30 | **Mini-map navigation overlay** | Detect when timeline is very large and show a mini-map overlay for navigating around. Zoomed-out bird's-eye view with a draggable viewport rectangle for panning. Deferred to V2+. | L | :large_blue_circle: P3 | :white_circle: Open |
| F34 | **Import items from swimlane context menu** | Add an "Import Items to [Swimlane/Sub-swimlane]" option in the right-click context menu when clicking on a swimlane or sub-swimlane row. Context-aware label: shows "Import to *Swimlane Name*" or "Import to *Sub-swimlane Name*" depending on the target. Opens the paste/import modal pre-targeted to that lane. **Depends on:** advanced import options for Data View being configured first (advanced column mapping, conflict resolution). Implement after that groundwork is in place. | S | :large_blue_circle: P3 | :white_circle: Open |
| F39 | **Overlap conflict hint card** | Detect when many items overlap visually on the timeline (e.g., stacked in the same row/date range) and show a passive, dismissible hint card suggesting the Auto Fit Heights feature (`autoFitHeights()`) or Auto Arrange. Non-intrusive — appears as a small card near the toolbar or bottom status strip, not a modal. Could also mention the keyboard shortcut if one is bound. Ties into F13 (shortcut discoverability). | S | :large_blue_circle: P3 | :white_circle: Open |
| F49 | **Per-swimlane time-to-target milestone** | Allow time-to-target (TTT) to be configured per swimlane or per sub-swimlane, rather than a single project-wide target. **Use case:** 3 swimlanes reference a milestone from the first swimlane, while the next 5 each have their own target milestone. **UI:** In TTT settings, add a scope selector: "Project-wide" (current behavior) or "Per Swimlane/Sub-Swimlane." In per-lane mode, each swimlane/sub-swimlane gets its own TTT target dropdown in the swimlane edit modal or a dedicated TTT config section. Provide a quick "Copy TTT setting to…" action so users can easily replicate one lane's target milestone to other lanes without reconfiguring each one. When in per-lane mode, the TTT offset label on each item references its lane's target. **Must handle:** Lanes without a TTT target configured (show nothing or inherit project default). Mixing modes — some lanes use a shared milestone, others use their own. The offset color should be green for positive and zero offsets (on track or ahead) and red/accent for negative (behind). | L | :large_blue_circle: P3 | :memo: Plan |
| F50 | **Tools dropdown sub-grouping (Export & Screenshots)** | **Bumped to P2 based on beta user feedback (Feb 2026):** The flat Tools dropdown contributed to discoverability problems — both beta testers needed walkthroughs to find screenshot and export flows. Reorganize to group Export and Screenshot actions into sub-dropdowns or visually grouped sections. Export items (SVG, PNG, CSV, JSON) go under an "Export" sub-menu; Screenshot items (Viewport, Full) go under a "Screenshots" sub-menu. Add a tooltip on the PNG export option noting that it produces high-def output suitable for presentations. Reduces top-level clutter while keeping everything accessible. Consider whether the sub-dropdown pattern (hover to expand) or an accordion/section pattern (always visible but grouped) works better for this menu. Part of the broader discoverability pass (see F48). | S | :yellow_circle: P2 | :white_circle: Open |
| F51 | **Vertical shading & grid line formatting** | **[Plan — needs design discussion]** Add formatting controls for vertical shading bands and grid line visibility/styling by time period. **Shading:** Apply alternating or uniform vertical shading at a chosen view level (year, quarter, month) — e.g. every-other-quarter shading. Must compose correctly with existing weekend shading (additive opacity or separate layer). **Grid lines:** Control which vertical dividers are visible and their styling per view level. Example: month view active, but only quarter and year dividers are solid, month dividers are lighter/dashed, and you want every-other-quarter shading. **Settings:** Per-view-level controls for: line visibility (on/off), line style (solid/dashed/dotted), line opacity/color, shading (on/off), shading color/opacity, shading pattern (every-other, uniform). **Interaction with existing features:** Weekend shading, holiday shading, and header grid line emphasis (F4) all affect vertical appearance — new shading must layer correctly. **Open questions:** Where does the UI live — Settings modal, View dropdown, or right-click header popover? How many levels deep (day/week/month/quarter/year)? Performance impact of many semi-transparent rect elements in the DOM and export SVG? Should export faithfully reproduce the shading or simplify it? This will require iterative design discussion. | L | :large_blue_circle: P3 | :memo: Plan |
| F23 | **Legend watermark** | **[Plan — needs refinement/discussion]** A structured legend overlay on the timeline, similar to the existing watermark but purpose-built for conveying meaning. **Content sources:** Can pull from Status (F22), Team/Owner, Swimlane/Sub-swimlane names, Milestone shape types, Color types, and other item properties — grouping multiple dimensions into one legend. **Positioning & layout:** Separate from the existing watermark with its own position setting (corner, edge, or custom x/y coordinates). Movable on the timeline (drag to reposition). **Styling options:** Toggle border on/off, border thickness, background color, text color, opacity/transparency slider. Legend entries show a visual swatch (color dot, emoji, shape icon, or line sample) paired with label text. **Configuration UI:** Dedicated "Legend" section in Project Settings. User selects which property dimensions to include and in what order. Separate "Apply" button so users can preview changes without closing the modal. Modal should be movable/draggable (non-blocking) so users can see the timeline underneath while configuring. **Export:** Legend must render in SVG/PNG export at the configured position, matching on-screen appearance. **Open questions:** How to handle legends that are too tall for the timeline area (scrollable? multi-column?). Whether legend should auto-update when items change or be manually refreshed. Interaction with the existing watermark (coexist independently? shared positioning grid?). How custom/freeform legend entries work (not tied to a property). | XL | :large_blue_circle: P3 | :memo: Plan |
| F7 | **Multi-project tabs** | Support opening multiple projects in separate tabs or an in-app tab bar, each with its own state. | XL | :large_blue_circle: P3 | :white_circle: Open |
| F26 | **Status import & field linking** | **[Plan — V3+ future, validated by beta user (Feb 2026)]** Beta user (Shivani) described the export → collaborate → re-import workflow as her #1 feature wish. A lightweight re-import (overwrite/skip/append by name match) could ship before full status history diffing. Enable re-importing updated data (e.g. from Excel paste or CSV) and linking imported columns to item fields — especially Status — so users can quickly pull in bulk status updates without manually editing each item. **Ties into F22:** Leverages the 2-deep status history (prev status 1 & 2) to compute deltas on import (e.g. "changed from On Track to At Risk since last import"). Could surface import-diff summaries, highlight changed items, and optionally auto-apply or prompt for confirmation. **Conflict resolution scoping:** On paste/import, prompt user to choose conflict detection scope: (1) whole timeline, (2) specific swimlane, or (3) specific sub-swimlane. When milestones/tasks are presented in the delta summary, each should annotate which swimlane and sub-swimlane it belongs to, so the user can quickly identify where changes land. This scoping also determines match-key behavior — e.g., "Task A" in Swimlane 1 vs "Task A" in Swimlane 2 are treated as distinct items when scoped to swimlane. **Open questions:** Column mapping UI for linking import fields to item properties. Conflict resolution when imported data disagrees with manual edits. Whether to support scheduled/watched file re-import. Match-key strategy (name, name+lane, ID). | L | :large_blue_circle: P3+ | :memo: Plan |
| F41 | **Layout engine enhancements** | **[Research — see `timeline-studio-layout-engine-analysis.md`]** Six recommendations from deep analysis of `_autoLayoutItems()`: (1) Dependency-aware row preference via barycenter heuristic — highest impact, wires deps into placement so connected items land on same/adjacent rows. (2) Critical path → row 0 bias — easy win, anchors critical path visually. (3) 2D per-row label collision — tighter layouts with Consider Labels on. (4) Import-aware placement with pinned items — eliminates overlap on incremental import. (5) Milestone clustering. (6) Post-placement crossing minimization. **Approach:** Adapt algorithms from dagre/d3-dag source — no external dependencies. | L | :yellow_circle: P2 | :mag: Research |
| F27 | **Multi-instance file sync** | **[Research complete — V3+ future, validated as non-urgent by beta users (Feb 2026)]** Both beta testers explicitly confirmed the single-editor PgM-owns-the-timeline model. One noted Smartsheet's concurrent editing was "not useful." Real-time sync between multiple Timeline Studio instances viewing the same project file. Six-layer architecture: (1) StorageEvent for instant same-browser tab sync, (2) File System Access API polling for cross-browser/cross-instance sync, (3) Visual indicators for file handle state and active sessions, (4) `_lastSavedBy` metadata for conflict detection, (5) View-Only mode for safe read-only access, (6) Opt-in auto-save-to-disk for automatic propagation. **Risk:** Auto-save-to-disk on OneDrive/SharePoint-synced files creates conflict files when multiple users edit simultaneously — this is an inherent OneDrive limitation, not solvable without a server. Feature deferred to post-beta to avoid disrupting early users. **See:** Appendix B for full research, use-case walkthroughs, and implementation plan. | L | :large_blue_circle: P3+ | :mag: Research |

---

## Summary by Priority

### :red_circle: P0 — Must Fix Before V1
_All P0 items resolved in v0.14.0._

### :orange_circle: P1 — High Priority for V1
- **F43** — Import scheduling options (L)
- **F48** — New user onboarding highlights (S–M) — **elevated from P2** per beta feedback; discoverability is the #1 launch blocker

### :yellow_circle: P2 — Nice to Have for V1
- **F13** — Keyboard shortcut discoverability (M) — bundle with F48 discoverability pass
- **F59** — Scheduling mode indicator & explainer (S) — neither beta user discovered manual vs auto mode
- **F60** — Dependency display filtering (S–M) — beta user request for intra-swimlane-only view
- **F50** — Tools dropdown sub-grouping (S) — **bumped from P3** per beta feedback; flat menu hurts discoverability
- **F44** — Copy swimlane/sub-swimlane data to clipboard (L) — :memo: Plan
- **F52** — Compact timeline view (M)
- **F46** — High-def screenshot with auto-save (M)
- **F17** — Swimlane header text orientation (M)
- **F41** — Layout engine enhancements (L) — :mag: Research (see analysis doc)

### :large_blue_circle: P3 — Backlog for V2+
- **F21** — SharePoint hosting guide (XS)
- **F6** — Modal/kiosk window mode (S) — :mag: Research (PWA viable on HTTPS, deferred — requires user install)
- **F34** — Import items from swimlane context menu (S) — depends on advanced import
- **F39** — Overlap conflict hint card (S)
- **F49** — Per-swimlane time-to-target milestone (L) — :memo: Plan
- **F30** — Mini-map navigation overlay (L)
- **F51** — Vertical shading & grid line formatting (L) — :memo: Plan
- **F23** — Legend watermark (XL) — :memo: Plan
- **F7** — Multi-project tabs (XL)
- **F26** — Status import & field linking (L) — :memo: Plan, V3+ (beta user validated re-import workflow as top wish)
- **F27** — Multi-instance file sync (L) — :mag: Research complete, V3+ (both beta users confirmed single-editor model is correct)

---

## Beta User Feedback Summary (Feb 2026)

> Two beta testers — Shivani (Mac, ~1 day usage) and Sean (Mac, ~1–2 weeks daily usage) — both PgMs at GM who couldn't get Office Timeline Pro (Windows/PowerPoint only). Full report in `timeline-studio-beta-feedback-report.md`.

### Validated — No Action Needed
- **Core feature set** (dependencies, swimlanes, progress, vertical lines, lock, drag delta) — praised by both users
- **Single-editor model** — both users explicitly confirmed that concurrent editing is not needed; the PgM-owns-the-timeline model is correct (validates F27 deferral)
- **Performance and stability** — praised vs. competitors
- **Cross-platform (Mac)** — the reason both users are here; validates the core value proposition

### Competitive Positioning Confirmed
Both users independently validated the competitive landscape: Office Timeline Pro (Windows-only), Smartsheet (license friction, concurrent editing not useful), MS Project web (too detailed/overwhelming), Jira Planner (no better than sprint board), Google Slides (ugly timelines), Excel (can't surface dependencies), Confluence timeline (crude, no specific dates).

### Key Insight: Discoverability is the #1 Launch Blocker
Every beta user required a personal walkthrough to find core features. The product works great with guidance but is not yet self-serve. This is the gate between internal tool and paid product. Addressed by F48 (P1), F57, F58, F59, F50, and F13.

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

> Moved to **[COMPLETED.md](COMPLETED.md)** — full table of all completed bugs and features with version, size, and implementation notes.

---

## Appendix B: Multi-Instance File Sync Research (F27)

> Full research moved to **[COMPLETED.md](COMPLETED.md)** — includes six-layer architecture, OneDrive conflict analysis, walkthrough scenarios, and implementation blueprint. Summary below for quick reference.

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
