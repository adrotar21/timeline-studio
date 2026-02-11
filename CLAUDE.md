# Timeline Studio

## Why This Project Exists
Timeline Studio is a cross-platform, zero-dependency replacement for Office Timeline Pro. The creator needed a tool that works on both Windows and Mac, launches instantly from a single folder, and can be easily shared with others — no installs, no plugins, no licenses. The goal is a lightweight Gantt chart tool for making clean, readable timelines with 30–50 items for leadership reviews.

**Competitive positioning:** Lives as an Office Timeline Pro alternative that punches above its weight. Comparable tools are either locked to PowerPoint (Office Timeline Pro ~$149/yr), library-only with fewer features (Frappe Gantt), commercially licensed and heavy (DHTMLX Gantt), or heavyweight SaaS overkill for simple timeline needs (MS Project, Smartsheet, Monday).

## Project Roadmap
1. Complete remaining updates and thorough testing for defects and usability issues
2. Share with early users for real-world feedback; stabilize and release V1
3. Expand to the broader audience, collect feedback, iterate toward V2+
4. Publish on GitHub with a simple project website, documentation, and usage guidance
5. Document the problem solved, lightweight setup, and three-file architecture
6. Share through professional channels for broader adoption

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
├── CLAUDE.md                       # This file — project context for AI assistants
├── BACKLOG.md                      # Prioritized bugs and feature backlog
├── dependency-prd.md               # Dependency engine PRD (Phase 1 + Phase 2)
├── timeline project edits.txt      # Raw bug tracking notes (legacy, see BACKLOG.md)
└── v13.5/                          # Current version
    ├── index.html                  # Complete DOM structure, modals, inline styles
    ├── app.js                      # All application logic (~2200 lines)
    ├── styles.css                  # Theming via CSS custom properties, layout
    ├── test_comprehensive.js       # ~400 tests covering core engine
    ├── test_expanded.js            # ~500+ tests targeting real bug patterns
    └── *.tlproj                    # Sample project files (JSON)
```

## Tech Stack
- **Vanilla JavaScript (ES6+)** — no frameworks, no transpilation, no bundler
- **SVG** for dependency arrow rendering
- **Canvas API** for PNG export/screenshot
- **CSS custom properties** for theme system
- **localStorage** for auto-save (key: `tls3`)
- **File System Access API** for native save/open dialogs
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

## Running Tests
Tests are Node.js CLI scripts with no dependencies:
```bash
node v13.5/test_comprehensive.js
node v13.5/test_expanded.js
```
Output is color-coded (green pass / red fail) with summary stats. Tests mock the engine functions from app.js internally. **Always run both test suites after making changes to `app.js`.**

## Key Features
- Milestones and tasks on a timeline with swimlanes (including sub-swimlanes)
- Dependency arrows with violation/critical-path highlighting
- Drag-and-drop editing with auto-snap in scheduled mode
- Holiday management with per-holiday scheduling control
- Data table view with filtering, searching, sorting
- Paste import from Excel (tab-separated)
- Export: SVG, PNG, CSV, JSON
- Themes: Default, Claude, Light, Midnight
- Lasso selection for bulk operations
- Project templates (Product Launch, Software Development)

## Known Issues & Backlog
See `BACKLOG.md` for the prioritized and sized bug/feature backlog.

## Common Patterns
- Event handlers are wired in `bind()` method
- `snap()` before mutations to capture undo state
- `sched(tl, dt)` marks timeline/datatable as dirty for next render frame
- `met()` recalculates layout metrics (columns, cell widths, pixel positions)
- `migrate()` handles backward-compatible loading of older project files
