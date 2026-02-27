# Timeline Studio

## Why This Project Exists
Timeline Studio is a cross-platform, zero-dependency replacement for Office Timeline Pro. The creator needed a tool that works on both Windows and Mac, launches instantly from a single folder, and can be easily shared with others — no installs, no plugins, no licenses. The goal is a lightweight Gantt chart tool for making clean, readable timelines with 30–50 items for leadership reviews.

**Competitive positioning:** Lives as an Office Timeline Pro alternative that punches above its weight. Comparable tools are either locked to PowerPoint (Office Timeline Pro ~$149/yr), library-only with fewer features (Frappe Gantt), commercially licensed and heavy (DHTMLX Gantt), or heavyweight SaaS overkill for simple timeline needs (MS Project, Smartsheet, Monday).

## Project Roadmap
1. Complete remaining updates and thorough testing
2. Collect real-world feedback from early users; stabilize and release V1
3. Iterate toward V2+ based on user feedback
4. Publish documentation and usage guidance
5. Share through professional channels for broader adoption

## Versioning
- **Scheme:** `0.x.0` = mini-major (feature batches), `0.x.y` = patch/bugfix. Pre-1.0 = beta.
- **Current:** `v0.44.1` — F56 Open in New Tab/Window: ⧉ button on MRU entries, right-click popover for tab vs window, disk file reconnect via ?mru= param, auto-collapse MRU, vertical guide line, popover dismiss pattern. Live at `https://adrotar21.github.io/timeline-studio/`.
- Version history tracked in `docs/BACKLOG.md` (recent) and `docs/VERSION_HISTORY.md` (archive), plus **git tags** (`git tag v0.23.1`)
- Git repo at project root; versions marked with git tags instead of folder names

## Critical Architecture Rule
> **The application MUST remain exactly three core files: `index.html`, `styles.css`, and `app.js`.**

This is a non-negotiable design constraint. The three-file architecture is what makes Timeline Studio trivially portable:
- Download three files → open `index.html` → it works
- No build step, no `npm install`, no server, no dependencies
- Works on any system with a modern browser, even locked-down corporate machines without admin rights
- Easy to share via email, USB drive, or file share

**Do not** introduce frameworks, bundlers, package managers, transpilers, or additional JS/CSS files. All application logic stays in `app.js`, all styles in `styles.css`, all markup in `index.html`. Test files and docs live alongside but are not required to run the app.

## Project Structure
```
TimelineProject/
├── index.html                      # Complete DOM structure, modals, inline styles
├── app.js                          # All application logic (~5200 lines)
├── styles.css                      # Theming via CSS custom properties, layout
├── Showcase.tlproj                 # Example project file (JSON)
├── README.md                       # Project README (stays at root for GitHub)
├── docs/                           # All documentation
│   ├── CLAUDE.md                   # This file — project context for AI assistants
│   ├── BACKLOG.md                  # Prioritized bugs/features with recent version history
│   ├── COMPLETED.md                # Completed items archive (moved from BACKLOG appendix)
│   ├── VERSION_HISTORY.md          # Version history archive (pre-0.40.0)
│   ├── PRIVACY.md                  # Privacy architecture document
│   ├── dependency-prd.md           # Dependency engine PRD (Phase 1 + Phase 2)
│   ├── autofit-analysis.md         # Auto-fit analysis document
│   └── timeline-studio-layout-engine-analysis.md  # Layout engine analysis
├── screenshots/                    # README screenshots (5 PNGs)
└── tests/                         # 2,489 tests across 22 files
    ├── helpers/                    # Shared assert lib, mock engine, builder factories
    ├── core/                       # Scheduling engine, dependency type tests
    ├── features/                   # Per-feature: status, shortcuts, swimlane, fit, data table, CSV, SVG
    ├── release/                    # Migration compatibility, e2e integration flows
    ├── regression/                 # Targeted bug regression tests
    ├── visual/                     # Playwright-based screenshot regression (separate npm)
    ├── test_comprehensive.js       # 115 tests covering core engine
    ├── test_expanded.js            # 464 tests targeting real bug patterns + watermarks
    └── run-all.js                  # Aggregate runner for all Node.js tests
```

## Tech Stack
- **Vanilla JavaScript (ES6+)** — no frameworks, no transpilation, no bundler
- **SVG** for dependency arrow rendering and export
- **Canvas API** for PNG export/screenshot (with DPI scaling)
- **CSS custom properties** for theme system
- **localStorage** for auto-save (key: `tls3`), keyboard shortcut overrides (key: `tls3_shortcuts`), and MRU cache (key: `tls3_recentNames`)
- **IndexedDB** (`tls3_handles` v2) for file handle persistence (`handles` store) and MRU entries (`recentFiles` store)
- **File System Access API** for native save/open dialogs and MRU handle reconnection
- `.tlproj` files are JSON with a version field for migration

## Architecture

### State Management
- Single global `App` object holds all state
- `App.proj` is the project data (swimlanes, items, settings, holidays)
- `App.sel` tracks selected item IDs
- Undo/Redo via snapshot-based `undoStack`/`redoStack` (40 items)

### Utilities
- `U` object provides date arithmetic, ID generation, formatting helpers

### Constants
- `COLORS` (20 colors), `TEXT_COLORS`, `ICONS`, `THEMES`
- `SHORTCUT_ACTIONS` — registry of all keyboard shortcuts with `{id, cat, label, defaults, ctx, global, special, reserved}`
- `MOUSE_REFS` — read-only reference list of mouse+modifier interactions
- `RESERVED_COMBOS` / `BROWSER_RESERVED` — sets of key combos blocked or warned during binding

### Keyboard Shortcut Engine
- **Three-tier system**: Reserved (non-editable: Save, Undo, etc.), Customizable (user-rebindable), Mouse Reference (informational)
- **Storage**: `localStorage['tls3_shortcuts']` stores user overrides as `{actionId: [combo1, combo2]}`. Missing keys fall back to `SHORTCUT_ACTIONS[].defaults`.
- **Dispatch**: `_buildShortcutMap()` builds `_scMap: {comboString → actionId}`. The keydown handler normalizes the event via `_normalizeKey(e)`, looks up in `_scMap`, checks context guards (global, tl, sel, sel-manual), then dispatches via `_scDispatch[actionId]`.
- **Special handlers**: Escape → `_handleEscape()` (multi-step: clear sel, close panel/menus/modals, exit lasso). Nudge → `_handleNudgeKey()` (preserves arrow acceleration system via `_nudgeSpeed`/`_nudgeSnapped`).
- **Key recorder**: Capture-phase listener absorbs keydown during recording in Settings → Shortcuts. Conflict detection prevents duplicate bindings.
- **Ctrl+Shift+K** opens Settings scrolled to the Shortcuts section (reserved shortcut).
- **Help modal** dynamically generates shortcut table from `SHORTCUT_ACTIONS` + overrides. Customized bindings marked with accent `*`.

### MRU (Most Recently Used) File System (F55)
- **Storage**: IndexedDB `tls3_handles` v2 with `recentFiles` object store (keyPath: `id`). Each entry: `{id, name, projectName, handle, lastOpened}`. Max 8 entries (`_MRU_MAX`).
- **Cache**: `localStorage['tls3_recentNames']` mirrors IDB entries (minus handles) for synchronous menu rendering. Kept in sync via `_syncMRUCache()` after every IDB write.
- **Five handle states** (computed, not stored): READY (green ✓), STALE (amber ⦿, needs re-grant), DENIED (amber ⦿), ORPHANED (red ⚠, file moved/deleted), NAME_ONLY (no handle, Firefox/Safari fallback).
- **Validation**: Lazy on menu open — `_validateMRU()` runs `queryPermission()` + `getFile()` in parallel via `Promise.allSettled`, progressively updates badges via `_renderMRUBadges()`.
- **IDB transaction safety**: `_storeMRUEntry()` uses 3-phase pattern (read tx → async `isSameEntry()` comparison → write tx) to avoid transaction auto-close from async gaps.
- **UI**: Collapsible "Open & Recent ▸" row in File dropdown. `_mruExpanded` state persists within session. Per-entry × remove buttons. Browse link always at top of expansion.
- **Hooks**: `_updateMRU()` called from `openFile()`, `handleOpen()`, and all 3 `saveFile()` paths.
- **Fallback**: Firefox/Safari get NAME_ONLY entries (filename + projectName from localStorage, no handle). Clicking opens standard file picker.

### Rendering Pipeline
```
User action → snap() [undo] → modify App.proj → sched(tl, dt) [dirty flags]
→ requestAnimationFrame → runSchedule() → renderTL() / renderDT()
→ updateStatus() → autoSave() [500ms debounced]
```

### Dependency Engine
- Supports FS (Finish-Start), SS (Start-Start), FF (Finish-Finish) link types
- Lag support (positive/negative, calendar or working days)
- Topological sort for scheduling order
- Cycle detection and violation highlighting
- Two-pass float (slack) calculation
- Critical path analysis

### Scheduling Modes
- **Manual mode**: user controls all dates
- **Auto-Scheduled mode**: dates computed from dependencies + durations (5-pass iterative)
- Working day support skips weekends and configurable holidays

### Key Design Decisions
- **Inclusive end dates**: task end date is the last active day, not exclusive
- **v1→v2 migration**: changed from exclusive to inclusive end dates
- **Calendar vs. working day** durations handled consistently across all operations
- **Pinned items** are protected from auto-scheduling and propagation
- **`proj.labelWidth`**: swimlane header column width in px (default 160, range 80–400). Stored in project, flows through CSS `--sl-w`, on-screen rendering, export SVG, and watermark positioning

## Export & Rendering Quirks

> **Important context for anyone modifying export or fit-to-content logic.**

### `buildExportSVG(viewportOnly)` — The Export Pipeline
- Single function generates all SVG for export (PNG, SVG, clipboard screenshot)
- Pipeline: `buildExportSVG()` → SVG blob → `Image` → `Canvas` → PNG blob
- `viewportOnly=true` for viewport screenshot, `false` for full export (fit-to-content)
- **DPI scaling**: `copyScreenshot` uses `Math.max(2, devicePixelRatio)`, `exportPNG` uses `Math.max(3, devicePixelRatio)`, both via `ctx.scale(dpr, dpr)` on canvas
- **Two-pass swimlane labels**: Pass 1 renders all background rects and structural lines; Pass 2 renders all label text. This ensures label text overflow is visible in both directions (not masked by adjacent swimlane rects)
- **Vertical label wrapping**: When swimlanes have sub-swimlanes, the main name is rendered via `<g transform="rotate(-90,cx,cy)">` containing `_wrapText()`-generated `<tspan>` elements — matches on-screen CSS `word-wrap` behavior

### Coordinate System
- `dX(date, tl)` returns pixel position from left edge of timeline grid (0 = start of first column)
- Positions scale linearly with zoom: `dX_at_z(date) = z × dX_at_z1(date)`
- `dXEnd(date)` = pixel position at END of a day (for task bar right edges)
- `dXMid(date)` = pixel position at CENTER of a day (for milestone icons)
- In export SVG, all positions are offset by `-vpX` (scroll position) and shifted right by `lw` (`proj.labelWidth`, default 160px)

### Fit-to-Content — Two Separate Implementations
1. **Export fit** (`buildExportSVG` with `viewportOnly=false`): Uses `_itemExtents(items, tl)` to find min/max pixel extents including text labels, then crops SVG to that range. Straightforward — all at current zoom.
2. **On-screen fit** (`fitToContent()`): More complex because zoom and text interact differently:
   - Bar positions scale with zoom, but text label widths are fixed pixels
   - Uses per-item geometry: `{bL, bR}` (bar at z=1) + `{tL, tR}` (fixed-px text offsets)
   - Iterative solver (4 rounds): at each candidate zoom, computes absolute extents `z×barPos ± textOffset`, adjusts zoom to fit viewport
   - **Must be idempotent** — clicking Fit repeatedly should not change the result
3. **Collapsed swimlane exclusion**: Both implementations build a `Set` of collapsed swimlane IDs (`sl.collapsed !== 'expanded'`) and a `Set` of collapsed sub-swimlane IDs (`ss.collapsed === 'minimized'`), then filter items by both `swimlaneId` and `subSwimId` before computing extents. Items in minimized/hidden swimlanes or minimized sub-swimlanes are excluded from fit without modifying actual properties.

### Text Measurement
- `_mt(text, fontSize, fontWeight)` — uses a shared offscreen `<canvas>` context for pixel-accurate text width
- `_itemLabelWidths(it)` — returns `{labelW, edgeLW, edgeRW}` for any item (primary label, secondary label, edge date labels)
- `_itemExtents(items, tl)` — returns `{minPx, maxPx}` combining bar positions + text widths at the given zoom
- `_wrapText(text, maxW, fontSize, fontWeight)` — word-wraps text into lines fitting within `maxW` pixels, using `_mt()` for measurement
- `_svgText(text, x, y, maxW, boxH, fontSize, fontWeight, attrs)` — renders wrapped text as SVG `<text>` with `<tspan>` elements, vertically centered in `boxH` using `dominant-baseline="central"` for pixel-perfect centering. Used for swimlane labels in export.
- **SVG text centering**: Always use `dominant-baseline="central"` on `<tspan>` elements. The y-coordinate marks the geometric center of the text line. Never use manual baseline correction factors — they're font-dependent and fragile.
- **Never use character-count estimation** (`charCount × fontSize × 0.6`) — it's unreliable and causes fit instability

### Weekend/Holiday Opacity Stacking
- DOM renders weekends via CSS class `rgba(0,0,0,0.15)` with inline `opacity` style on top
- Export must multiply: `0.15 × (userOpacity/100)` to match the visual stacking
- Holiday shading uses its own color channel with opacity directly

### Hidden Item Handling in Export
- `hideMode ON + item.hidden` → skip entirely (not rendered, not in fit calculation)
- `hideMode OFF + item.hidden` → render with `opacity: 0.3` (greyed out, included in fit)
- **Collapsed swimlane items** → excluded from fit extents (both on-screen and export), swimlane renders at 0px (hidden) or 28px (minimized) with no item content
- Hidden swimlanes (`sl.collapsed === 'collapsed'`) contribute 0px in export — no rects, no visual trace

## Popover Dismiss Pattern (Critical)

> **Any new popover MUST follow this two-layer pattern. Ad-hoc `document.addEventListener('click', close)` listeners DO NOT WORK reliably because `onTlMD()` and other handlers call `stopPropagation()`, preventing clicks from reaching `document`.**

### The Problem
Clicking on the timeline body area does not always bubble `click` events to `document`. The `onTlMD()` handler (mousedown on timeline) calls `e.stopPropagation()` in multiple branches (lasso mode, format painter, item drag). Any popover relying solely on a `document`-level click listener will fail to dismiss when the user clicks on the timeline.

### The Two-Layer Solution
Every popover in this app uses the same proven pattern:

1. **Layer 1 — `onTlMD()` (mousedown):** Explicitly call `_hideMyPopover()` at the top of `onTlMD()` alongside the other popover dismissals. This fires **before** any `stopPropagation()` branch, so it always runs when clicking the timeline.

2. **Layer 2 — Global `document` click handler (safety net):** Add a `closest()` check in the global `document.addEventListener('click', ...)` block (around line 1755). This catches clicks on the toolbar, sidebar, panels, and other areas outside the timeline.

### Current Popovers Using This Pattern
- **Header format popover** (`#hdr-fmt-popover`): `_hideHdrFmtPopover()` in `onTlMD()` + `closest()` check in global click
- **Swimlane format popover** (`#sl-fmt-popover`): `_hideSlFmtPopover()` in `_clearSlSel()` (called from `onTlMD()`) + `closest()` check in global click
- **Format Painter popover** (`#fp-popover`): handled via global click `closest()` check
- **MRU external popover** (`.mru-ext-pop`): `_hideExtPopover()` in `onTlMD()` + `closest()` check in global click

### Checklist for New Popovers
1. Add `this._hideMyPopover()` call to `onTlMD()` (line ~4709)
2. Add `if(!e.target.closest('#my-popover'))this._hideMyPopover()` to the global `document` click handler (line ~1755)
3. Do NOT rely on ad-hoc `document.addEventListener('click', fn, {once:true})` — it will miss timeline clicks

## Running Tests

### Test Structure
Tests live in `tests/` organized by category:
```
tests/
├── helpers/               # Shared assert lib, mock engine, builder factories
├── core/                  # Scheduling engine, dependency type tests
├── features/              # Per-feature: status, shortcuts, swimlane, fit, data table, CSV, SVG export
├── release/               # Migration compatibility, e2e integration flows
├── regression/            # Targeted bug regression tests
├── visual/                # Playwright-based screenshot regression (separate npm install)
├── test_comprehensive.js  # Original 115 engine tests
├── test_expanded.js       # Original 464 bug pattern tests
└── run-all.js             # Aggregate runner for all Node.js tests
```

### Running Tests
```bash
# Run ALL tests (always do this after any app.js change)
node tests/run-all.js

# Run a specific feature suite (fast feedback during development)
node tests/features/test_status.js
node tests/features/test_shortcuts.js
node tests/features/test_data_table.js
# ... etc

# Visual regression tests (before releases or after CSS/theme changes)
cd tests/visual && npm install   # first time only
npm test                          # compare against baselines
npm run update                    # capture new baselines after intentional changes
```

### When to Run What
- **Any `app.js` change** → `node tests/run-all.js` (all Node.js tests, ~5s)
- **Targeted development** → run the relevant `tests/features/test_*.js` first for fast feedback, then full suite
- **Before tagging a release** → full `run-all.js` + visual tests
- **After CSS/theme changes** → update visual baselines and review diffs
- **Original test files** (`test_comprehensive.js`, `test_expanded.js`) are included in `run-all.js` — run them separately only when debugging specific failures

Output is color-coded (green pass / red fail) with summary stats. Tests mock engine functions from app.js internally.

## Key Features
- Milestones and tasks on a timeline with swimlanes (including sub-swimlanes)
- Swimlane collapse: 3-state (expanded → minimized → hidden) with dual expand/hide buttons, curved tab indicators, and Expand All / Collapse All controls (includes sub-swimlanes). Sub-swimlane collapse: 2-state (expanded/minimized) with per-sub toggle buttons, auto-minimize parent when all subs minimized, auto-expand parent when expanding a sub. Dynamic vertical text scaling (min 8px) when swimlane height is short
- Dependency arrows with violation/critical-path highlighting
- Drag-and-drop editing with auto-snap in scheduled mode
- Holiday management with per-holiday scheduling control
- Data table view with filtering, searching, sorting
- Paste import from Excel (tab-separated)
- Export: SVG, PNG, CSV, JSON (with fit-to-content and viewport modes)
- Screenshots: clipboard copy (viewport or full)
- Themes: Default, Claude, Light, Midnight
- Lasso selection for bulk operations
- Project templates (Product Launch, Software Development)
- Format Painter: two-step popover wizard (select properties → Apply Once / Apply to Many) with F4 keyboard shortcut (double-tap for multi mode)
- Customizable keyboard shortcuts with 3-tier manager (Reserved / Customizable / Mouse Reference) in Settings → Shortcuts (Ctrl+Shift+K). Per-user overrides stored in localStorage.

## Known Issues & Backlog
See `docs/BACKLOG.md` for the prioritized and sized bug/feature backlog with version history. Completed items are archived in `docs/COMPLETED.md`. Older version history is in `docs/VERSION_HISTORY.md`.

**Backlog management rule:** On each edit to `docs/BACKLOG.md`, all **Done** items must be moved from the Open tables to `docs/COMPLETED.md`. Open tables should only contain active work (Open, Plan, Blocked, Published & Testing).

## Common Patterns
- Event handlers are wired in `bind()` method
- `snap()` before mutations to capture undo state
- `sched(tl, dt)` marks timeline/datatable as dirty for next render frame
- `met()` recalculates layout metrics (columns, cell widths, pixel positions)
- `migrate()` handles backward-compatible loading of older project files
