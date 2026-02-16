# Timeline Studio — Manual QA Checklist

Use this checklist at major revisions (new mini-major versions, pre-release) to verify the app works end-to-end. Automated tests cover logic; this covers visual, interactive, and integration flows that require a human eye.

**How to use:** Open `index.html` in a browser. Use the Showcase.tlproj file for pre-populated data, or start fresh for empty-state checks. Check off items as you go.

---

## Quick Smoke Test (10-15 minutes)

Core flows that tell you "the app is fundamentally working." Do this at every release.

### Load & Save
- [ ] Open `index.html` — app loads without console errors
- [ ] Load `Showcase.tlproj` via File > Open — timeline renders with items
- [ ] Save project via Ctrl+S — `.tlproj` file downloads
- [ ] Re-open the saved file — all data intact (items, colors, deps, statuses)
- [ ] Refresh page — auto-saved project restores from localStorage

### Timeline Basics
- [ ] Add a task via right-click > Add Task — appears on timeline
- [ ] Add a milestone via right-click > Add Milestone — diamond icon renders
- [ ] Select an item — properties panel opens on right
- [ ] Drag an item horizontally — dates update correctly
- [ ] Drag an item vertically — moves to new swimlane
- [ ] Delete a selected item — removed from timeline

### Dependencies
- [ ] Add a dependency (properties panel > Predecessors) — arrow renders
- [ ] Arrow connects predecessor end to successor start
- [ ] Move predecessor — dependency arrow follows
- [ ] Violated dependency shows red/dashed styling

### Export
- [ ] File > Export PNG — image downloads, matches what's on screen
- [ ] File > Export SVG — SVG downloads with all elements visible
- [ ] Copy Screenshot (Ctrl+Shift+C) — clipboard has image

### View Switching
- [ ] Switch to Data View — table shows all items
- [ ] Switch to Split View — timeline and table both visible
- [ ] Switch back to Timeline View — renders correctly

### Undo/Redo
- [ ] Make a change, press Ctrl+Z — change undone
- [ ] Press Ctrl+Shift+Z — change redone
- [ ] Undo stack handles multiple operations

---

## Comprehensive Feature Sweep (45-60 minutes)

Full walkthrough organized by feature area. Do this before major releases.

### Timeline Rendering

#### Items
- [ ] Tasks render as colored horizontal bars
- [ ] Milestones render as diamond icons
- [ ] Item names display correctly (no clipping, no overlap)
- [ ] Item colors match what's set in properties
- [ ] Long item names truncate gracefully
- [ ] Progress bar overlay shows on tasks with progress > 0
- [ ] Edge date labels show when "Show Dates" is enabled
- [ ] Owner label displays when "Show Owner" is enabled
- [ ] Duration label displays when "Show Duration" is enabled
- [ ] B21: showDate OFF does NOT hide owner or duration labels

#### Grid & Background
- [ ] Vertical column lines visible for each time period
- [ ] B7: Grid lines appear in exports (check SVG/PNG output)
- [ ] Weekend shading visible when enabled (Settings > Weekends)
- [ ] Holiday shading visible with correct colors
- [ ] Today marker (vertical red line + label) visible when enabled
- [ ] Zoom in/out changes column width proportionally

#### Scrolling & Navigation
- [ ] Horizontal scroll moves timeline left/right
- [ ] Vertical scroll moves through swimlanes
- [ ] B1: Watermark stays fixed during scrolling (doesn't drift)
- [ ] Fit-to-Content (Ctrl+Shift+F) zooms to show all items
- [ ] Fit is idempotent — pressing twice doesn't change view

### Swimlanes

#### Basic Swimlane Operations
- [ ] Swimlane headers visible in left column
- [ ] Swimlane labels word-wrap when text is long
- [ ] Resize swimlane height by dragging divider
- [ ] Add swimlane via Settings > Swimlanes
- [ ] Rename swimlane in settings
- [ ] Reorder swimlanes via drag in settings

#### 3-State Collapse (B5, B9 regression areas)
- [ ] Click collapse button: Expanded > Minimized (short bar, no items)
- [ ] Click collapse button again: Minimized > Hidden (0 height)
- [ ] Click expand button: Hidden > Expanded
- [ ] Expand All button: all swimlanes expand
- [ ] Collapse All button: all swimlanes collapse
- [ ] Minimized swimlane shows curved tab indicator

#### Sub-Swimlanes
- [ ] Sub-swimlane headers render within parent
- [ ] Sub-swimlane collapse: Expanded > Minimized (20px height)
- [ ] Auto-cascade: all subs minimized -> parent auto-minimizes
- [ ] Auto-cascade: expanding any sub -> parent auto-expands
- [ ] B9: Resize sub-swimlane handle works correctly
- [ ] Sub-swimlane dividers visible in both on-screen and export

### Dependencies

#### Visual
- [ ] FS arrows render from predecessor end to successor start
- [ ] SS arrows render from predecessor start to successor start
- [ ] FF arrows render from predecessor end to successor end
- [ ] Violated dependencies show different styling (red/dashed)
- [ ] Critical path highlighting works when enabled

#### Scheduling
- [ ] Manual mode: dependencies shown but don't move items
- [ ] Auto-scheduled mode: moving predecessor shifts successors
- [ ] Lag (positive) adds gap between predecessor and successor
- [ ] Lag (negative) allows overlap
- [ ] Working day mode: dependencies skip weekends
- [ ] Holiday scheduling: deps respect "schedule around" holidays
- [ ] Pinned items resist auto-scheduling

### Status System (F22)

#### Status Assignment
- [ ] Right-click item > Set Status > choose from list
- [ ] Status shows in properties panel
- [ ] Status badge displays on timeline items
- [ ] Status badge updates when changed
- [ ] Status date auto-sets to today when status assigned
- [ ] Clear status (set to blank) removes badge

#### Status Display Modes
- [ ] Emoji mode: emoji icon shows on item
- [ ] Short Name mode: abbreviated text shows (e.g., "G", "Y", "R")
- [ ] Text mode: full status name shows
- [ ] Badge positions: inline, top-left, bottom-right all render correctly
- [ ] Color Override: item bars change to status colors
- [ ] Blank Color: items without status get the configured color
- [ ] Toggling display mode updates all items immediately

#### Status Settings
- [ ] Settings > Status: all 7 default statuses listed
- [ ] Add custom status — appears in list and dropdowns
- [ ] Edit status name/emoji/color — updates everywhere
- [ ] Delete status with items assigned — impact modal shows count
- [ ] Impact modal: reassign items to different status
- [ ] Reset Defaults button restores original 7 statuses
- [ ] Short name column visible and editable

### Data Table

#### Rendering
- [ ] All items listed with correct columns
- [ ] B20: Header row clean, no visual artifacts
- [ ] Column widths appropriate for content
- [ ] Inline editing works (click cell to edit)
- [ ] Status dropdown in data table works
- [ ] Type toggle (task/milestone) works in data table

#### Filter & Search
- [ ] Filter by type (task/milestone) works
- [ ] Filter by swimlane works
- [ ] Filter by status works
- [ ] Filter by "(No Status)" shows unset items
- [ ] B11: Active filter indicator visible when filters applied
- [ ] Text search matches item names (case-insensitive)
- [ ] Advanced search: toggle owner/notes/status checkboxes
- [ ] Clear filters restores full list

#### Sorting
- [ ] Sort by name (alphabetical)
- [ ] Sort by start date (chronological)
- [ ] Sort by status (by definition order, not alphabetical)
- [ ] Sort ascending/descending toggle

### Export & Screenshot

#### PNG Export
- [ ] Full export includes all visible items
- [ ] B3: Weekend shading, holiday shading, today marker, dep arrows all present
- [ ] B2/B6: Labels centered correctly (not misaligned)
- [ ] Watermark renders at configured position
- [ ] Collapsed swimlanes excluded from export
- [ ] Hidden items excluded when hideMode ON
- [ ] Hidden items shown at 30% opacity when hideMode OFF
- [ ] DPI scaling: exported image is crisp (not blurry)

#### SVG Export
- [ ] SVG contains all visual elements matching PNG
- [ ] B5: Sub-swimlane dividers present in SVG
- [ ] B7: Grid column lines present in SVG
- [ ] Swimlane labels word-wrapped correctly in SVG
- [ ] Status badges/colors render in SVG

#### CSV Export
- [ ] CSV downloads with all expected columns
- [ ] B16: Predecessors column populated with names and lag
- [ ] Status column shows full status name
- [ ] StatusDate column shows ISO date
- [ ] Special characters (commas, quotes) escaped correctly

#### Clipboard Screenshot
- [ ] Screenshot (viewport): use toolbar Export > Copy Screenshot (no default shortcut)
- [ ] Paste into image editor confirms correct capture

### Keyboard Shortcuts

#### Core Shortcuts
- [ ] Ctrl+Z: Undo
- [ ] Ctrl+Y: Redo
- [ ] Ctrl+S: Save
- [ ] Ctrl+A: Select All items
- [ ] Delete: Remove selected items
- [ ] Escape: Clear selection, close panels/menus/modals
- [ ] Arrow keys: Nudge selected items
- [ ] B12: Arrow keys with Lock ON shows locked toast (not nudge)

#### Shortcut Manager
- [ ] Ctrl+Shift+K: Opens Settings > Shortcuts
- [ ] Reserved shortcuts (Save, Undo, etc.) shown but not editable
- [ ] Customizable shortcuts can be rebound
- [ ] Record new binding: press key combo, it captures correctly
- [ ] Conflict detection: warns if combo already bound
- [ ] Reset binding to default works
- [ ] Help modal (?) shows current shortcut assignments
- [ ] Customized bindings marked with accent * in help modal

### Locking & Movement

- [ ] Lock toggle (Tools menu) prevents all item movement
- [ ] B12: Nudge while locked shows toast notification
- [ ] Unlock allows movement again
- [ ] Lock state syncs lockH and lockV together
- [ ] Lock state persists after save/reload

### Settings

#### General
- [ ] Theme selector: Default, Claude, Light, Midnight all apply correctly
- [ ] Label width slider changes swimlane header column width
- [ ] Scheduling mode toggle: Manual vs Auto-Scheduled
- [ ] Schedule Around Non-Working Days toggle

#### Holidays
- [ ] Add holiday — appears in list and on timeline
- [ ] Edit holiday date/name/color
- [ ] Delete holiday
- [ ] Per-holiday "Schedule Around" checkbox
- [ ] Master holiday toggle enables/disables all

### Themes
- [ ] Default theme: dark sidebar, light grid
- [ ] Claude theme: distinctive accent colors
- [ ] Light theme: light sidebar, light grid
- [ ] Midnight theme: full dark mode
- [ ] All themes render items, badges, menus correctly
- [ ] Theme persists after save/reload

### Edge Cases & Regression

- [ ] Empty project: hint text displays, disappears when items added (B15)
- [ ] B4: Right-click > Add Task positions item near cursor
- [ ] B8: Toolbar buttons centered in toolbar area
- [ ] B10: Help modal sections numbered sequentially
- [ ] Zero duration task renders as thin bar or point
- [ ] Milestone at project boundary dates renders correctly
- [ ] Very long project names don't break layout
- [ ] B22: Header row height (22px) aligns with swimlane headers
- [ ] Paste import from Excel: tab-separated data creates items
- [ ] Template projects (Product Launch, Software Dev) load correctly

---

## Post-Test Notes

**Date tested:** _______________
**Version tested:** _______________
**Browser/OS:** _______________

**Issues found:**
1. _______________
2. _______________
3. _______________

**Notes:**
_______________
