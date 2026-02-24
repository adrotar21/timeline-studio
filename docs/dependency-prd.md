# Timeline Studio — Dependency Management PRD

## Document Info
- **Status:** Draft for Review
- **Scope:** Phase 1 (Smart Defaults) + Phase 2 (Scheduled Mode)
- **Preserves:** Current arrow rendering, current link creation workflow (Ctrl+select / lasso → right-click → Link), current visual style

---

## 1. Product Vision

Transform Timeline Studio's dependency system from a visual annotation layer into a lightweight but capable scheduling tool — without losing the app's core identity as an approachable, manual-first timeline builder.

**Two-phase approach:**
- **Phase 1 ("Smart Defaults"):** Clean up the data model, add lag, add on-demand propagation, add float display. Net simplification of existing code.
- **Phase 2 ("Scheduled Mode"):** Add an opt-in project-level toggle that enables automatic propagation and calculated dates.

---

## 2. Phase 1 — Smart Defaults

### 2.1 Data Model Changes

#### 2.1.1 Dependency Link Migration

**Current:** `deps: ['itemId1', 'itemId2']` — flat array of predecessor IDs, with a separate `depType` field on the item itself.

**New:** `deps: [{id: 'itemId1', type: 'FS', lag: 0}, ...]` — array of link objects.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | required | Predecessor item ID |
| `type` | string | `'FS'` | Link type. Phase 1: always `'FS'`. Phase 2: `'FS'`, `'SS'`, `'FF'` |
| `lag` | number | `0` | Lag in calendar days. Positive = wait after predecessor. Negative = lead (start before predecessor completes). |

**Migration logic** (in `migrate()`):
```
if item.deps is array of strings → convert each string to {id: string, type: 'FS', lag: 0}
remove item.depType field (no longer needed — type lives on each link)
```

Backward compatibility: all existing project files auto-migrate on load. Saved files use the new format.

#### 2.1.2 Lock Flag Consolidation

**Current:** Four separate boolean flags per item:
- `depLocked` — "don't auto-resolve this item's dep conflicts"
- `startLocked` — "don't move my start date"
- `endLocked` — "don't move my end date"
- `durationLocked` — "don't change my duration"

These interact in confusing, undocumented ways. In practice, users either want "this item stays where I put it" or "this item can move."

**New:** Single `pinned` boolean per item.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `pinned` | boolean | `false` | When true, Propagate and (Phase 2) the scheduling engine will not move this item. Equivalent to a "Must Start On" constraint. |

**Migration:** `pinned = depLocked || startLocked` (if either was true, the item is pinned). Remove `depLocked`, `startLocked`, `endLocked`, `durationLocked`.

**UI:** Single "📌 Pin Date" toggle in Properties panel and right-click context menu. Pinned items show a small pin icon on the timeline.

#### 2.1.3 Duration as a First-Class Field

**Current:** `duration` is stored but only used for display. It's calculated from `endDate - startDate` and can drift out of sync.

**New:** `duration` remains calculated from dates in Phase 1 (no behavior change). But we ensure it's always kept in sync:
- On any date edit: `duration = U.days(startDate, endDate)`
- On duration edit in panel: `endDate = U.addDays(startDate, duration)`
- This two-way sync is necessary groundwork for Phase 2 where duration becomes the primary driver.

### 2.2 Remove: Conflict Detection & Resolution System

**What's removed:**
- `getDepConflicts()` function
- `checkDepConflicts()` function
- `showDepResolve()` function and the dep resolution modal UI
- `autoResolveDeps()` function
- `btn-dep-resolve` button and `dep-conflict-count` badge
- The entire `dep-modal` HTML block (the modal with per-conflict shift/unlock/remove actions)

**Why:** In the new model, conflicts are expected and normal in manual mode. The user sees them visually (red/orange conflict indicator on arrows) and resolves them by either (a) manually moving items or (b) using the new Propagate action. The heavyweight modal-per-conflict approach is replaced by a simpler, faster workflow.

**What replaces it:**
- Visual conflict indicator on dependency arrows (see 2.4)
- "Propagate to Successors" action (see 2.3)

### 2.3 New Feature: Propagate to Successors

**The core idea:** Select one or more items → trigger Propagate → all downstream successors shift to respect dependency timing (type + lag). This is a one-time, user-initiated action — not automatic.

#### 2.3.1 Algorithm

```
propagateFrom(sourceIds):
  snap()  // single undo checkpoint
  
  // Build a set of all items reachable downstream from sourceIds
  queue = [...sourceIds]
  visited = new Set()
  ordered = []  // topological order
  
  while queue is not empty:
    id = queue.shift()
    if visited.has(id): continue
    visited.add(id)
    ordered.push(id)
    for each item in project where item.deps contains a link with id == id:
      queue.push(item.id)
  
  // Forward pass: process in topological order
  for each itemId in ordered (skip the source items themselves):
    item = getItem(itemId)
    if item.pinned: continue  // respect pins
    
    // Calculate earliest valid start from ALL predecessors (not just the ones in our propagation set)
    earliestStart = null
    for each link in item.deps:
      pred = getItem(link.id)
      if not pred: continue
      
      if link.type == 'FS':
        predEnd = pred.endDate or pred.date  // task endDate or milestone date
        candidateStart = addDays(predEnd, link.lag)
      else if link.type == 'SS':
        candidateStart = addDays(pred.startDate or pred.date, link.lag)
      else if link.type == 'FF':
        // FF: item must finish after pred finishes + lag
        // So: item.end >= pred.end + lag → item.start >= pred.end + lag - item.duration
        predEnd = pred.endDate or pred.date
        candidateStart = addDays(predEnd, link.lag - (item.duration || 0))
      
      if candidateStart is not null:
        // For FS/SS: item start must be >= candidateStart
        if earliestStart is null or candidateStart > earliestStart:
          earliestStart = candidateStart
    
    if earliestStart is not null and earliestStart != current start:
      if item is task:
        item.startDate = earliestStart
        item.endDate = addDays(earliestStart, item.duration)
      else:  // milestone
        item.date = earliestStart
  
  sched()
  autoSave()
  toast("Propagated to X items")
```

#### 2.3.2 Circular Dependency Protection

Before propagation (and before any new link is created), run a cycle detection check:

```
hasCycle(itemId, newPredId):
  // Would adding newPredId as a predecessor of itemId create a cycle?
  // Walk upstream from newPredId — if we reach itemId, it's a cycle.
  visited = new Set()
  queue = [newPredId]
  while queue not empty:
    id = queue.shift()
    if id == itemId: return true  // cycle!
    if visited.has(id): continue
    visited.add(id)
    pred = getItem(id)
    for each link in pred.deps:
      queue.push(link.id)
  return false
```

If a cycle is detected when linking: toast error "Cannot link — would create a circular dependency" and don't create the link.

#### 2.3.3 Access Points

The Propagate action is available from:
1. **Right-click context menu** (single or multi-select): "Propagate to Successors"
2. **Keyboard shortcut:** `Ctrl+P` when items are selected (check no conflict with browser print — if so, use `Ctrl+Shift+P`)

Toast message format: `"Propagated: 8 items updated, 2 pinned (skipped)"`

#### 2.3.4 What "Propagate" Does NOT Do

- Does NOT move the source item(s) — only their downstream successors
- Does NOT affect items that aren't reachable via dependency links from the source
- Does NOT override pinned items (but does propagate past them to their successors using the pinned item's current dates)
- Does NOT run automatically — always user-initiated in Phase 1

### 2.4 Visual Conflict Indicators

When a dependency link is violated (successor starts before its predecessor + lag allows), the dependency arrow should display a visual warning.

**Definition of "violated":**
- For FS link with lag L: `successor.start < predecessor.end + L days`
- For SS link with lag L: `successor.start < predecessor.start + L days`  
- For FF link with lag L: `successor.end < predecessor.end + L days`

**Visual treatment:**
- Normal arrow: current rendering (unchanged)
- Violated arrow: same rendering but with color override to a muted red/orange (`#d4726a`) and dashed stroke
- No modal, no badge, no count — just a visible "something's off here" signal

**Implementation:** In `rDeps()`, before drawing each arrow, check if the link constraint is satisfied. If not, apply the conflict color. This is a lightweight check per arrow (~3 lines of logic).

### 2.5 Lag Display on Arrows

When a dependency link has a non-zero lag, display the lag value as a small label near the midpoint of the arrow.

**Format:** `+3d` (positive lag) or `-2d` (negative lead)
**Style:** 8px font, monospace, same color as the arrow, slight background for readability
**Position:** Near the midpoint of the arrow path, offset slightly above/below to avoid overlapping the line

**When hidden:** When lag is 0 (default), show nothing. Only non-zero lag gets a label.

### 2.6 Lag Editing

**In Properties Panel — Dependency Chips:**

Current dep chips show: `[Predecessor Name] [✕]`

New dep chips show: `[Predecessor Name] [FS] [+0d] [✕]`

- Clicking the type badge (`FS`) does nothing in Phase 1. In Phase 2, it cycles through FS → SS → FF.
- Clicking the lag badge (`+0d`) opens an inline input to type a number. Enter/blur commits. Negative values allowed (lead time).
- The `[✕]` remove button unchanged.

**In Data View — Deps Column:**

Current: shows count ("2 deps") or names
New: shows compact notation, e.g. "Task A (FS+3d), Task B (FS)"

### 2.7 Float Calculation & Display

#### 2.7.1 Algorithm

Float (also called slack or total float) is the amount of time an item can be delayed without delaying the project end date.

```
calculateFloat():
  items = project.items with dates
  
  // Forward pass: calculate early start (ES) and early finish (EF)
  for each item in topological order:
    ES = max of all predecessor constraints (same logic as propagate)
    if no predecessors: ES = item's current start date
    EF = ES + duration (tasks) or ES (milestones)
    store ES, EF on item
  
  // Project end = max EF across all items
  projectEnd = max(all EF values)
  
  // Backward pass: calculate late finish (LF) and late start (LS)
  for each item in REVERSE topological order:
    if item has no successors: LF = projectEnd
    else: LF = min of all successor late starts (adjusted for link type + lag)
    LS = LF - duration
    store LS, LF on item
  
  // Float = LS - ES (or equivalently LF - EF)
  for each item:
    item._float = LS - ES  // transient, not saved to project file
```

Items with float = 0 are on the critical path.

#### 2.7.2 Display

**Toggle:** View dropdown → "Show Float" checkbox (default: off)

**Timeline rendering:** When enabled, a small grey label appears below each item showing the float in days:
- `0d` in bold red (critical — no slack)
- `5d` in grey (5 days of slack)
- Items with no predecessors AND no successors: no float label shown (they're not part of a dependency network)

**Style:** 8px font, monospace, positioned below the item's label area. Similar positioning to TTT labels but distinct styling.

#### 2.7.3 Critical Path Integration

The existing `getCriticalPath()` function currently uses a longest-chain heuristic. Once float calculation exists, critical path becomes the set of items where `_float === 0`. This is mathematically correct and replaces the heuristic.

**Change:** `getCriticalPath()` calls `calculateFloat()` and returns `new Set(items.filter(i => i._float === 0).map(i => i.id))`.

### 2.8 Pin Date UX

**Properties Panel:**
- New toggle row: `📌 Pin Date` with toggle switch
- When pinned: a small pin icon (📌) renders on the timeline next to the item, and the item name has a subtle pin indicator in Data View
- Pinned items are skipped by Propagate (with count reported in toast)
- Tooltip on pin toggle: "Pinned items won't move during Propagate or auto-scheduling"

**Context Menu:**
- "📌 Pin / Unpin Date" action (toggles)

**Visual on timeline:**
- Small `📌` icon rendered at top-right of task bar or top-right of milestone, 10px, muted color, z-index above item

### 2.9 Phase 1 Summary: What Changes

| Area | Removed | Added | Modified |
|------|---------|-------|----------|
| Data model | `depType` (item-level), `depLocked`, `startLocked`, `endLocked`, `durationLocked` | `pinned` (per item), `type` + `lag` (per link) | `deps[]` format |
| Functions | `getDepConflicts`, `checkDepConflicts`, `showDepResolve`, `autoResolveDeps` | `propagateFrom`, `calculateFloat`, `hasCycle` | `getCriticalPath`, `rDeps`, `migrate` |
| UI | Dep resolution modal, conflict count badge, lock toggles in panel | Propagate context menu action, float display toggle, lag editing on dep chips, pin toggle, visual conflict on arrows, lag labels on arrows | Panel dep chip format, Data View dep column format |
| HTML | `dep-modal` block, `btn-dep-resolve`, `dep-conflict-count` | Float toggle in View dropdown | Context menu entries |

---

## 3. Phase 2 — Scheduled Mode

### 3.1 Project-Level Toggle

**New field:** `schedulingMode: 'manual' | 'scheduled'` (default: `'manual'`)

**Location:** Project Settings → new section "Scheduling" above the current Display section.

**UI:**
```
┌─ Scheduling ─────────────────────────────────────┐
│                                                   │
│  Scheduling Mode                                  │
│  ┌──────────────────┐ ┌────────────────────────┐  │
│  │  ✅ Manual       │ │  ◻ Auto-Scheduled     │  │
│  │                  │ │                        │  │
│  │  You control all │ │  Dates auto-calculate  │  │
│  │  dates directly. │ │  from dependencies     │  │
│  │  Dependencies    │ │  and durations. Move   │  │
│  │  are visual.     │ │  a predecessor and     │  │
│  │  Use Propagate   │ │  successors follow.    │  │
│  │  to push changes │ │                        │  │
│  │  downstream.     │ │                        │  │
│  └──────────────────┘ └────────────────────────┘  │
│                                                   │
└───────────────────────────────────────────────────┘
```

Two card-style selectors with descriptions, not a toggle switch. This is a significant decision and users should understand what they're choosing.

### 3.2 The Scheduling Engine

In scheduled mode, every edit that affects dates triggers the scheduling engine:

```
schedule():
  if project.schedulingMode !== 'scheduled': return
  
  items = topological sort of all items by dependency graph
  
  for each item in order:
    if item has no predecessors:
      // "Root" items keep their manually-set start date
      // (this is their anchor point)
      continue
    
    if item.pinned:
      // Pinned items don't move, but we still process them
      // so their successors can reference their dates
      continue
    
    // Calculate earliest valid start from all predecessors
    earliestStart = null
    for each link in item.deps:
      pred = getItem(link.id)
      candidate = computeCandidate(pred, link)  // same logic as propagateFrom
      earliestStart = max(earliestStart, candidate)
    
    if earliestStart is null: continue
    
    // Update dates
    if item is task:
      item.startDate = earliestStart
      item.endDate = addDays(earliestStart, item.duration || 0)
    else:
      item.date = earliestStart
  
  // Recalculate float
  calculateFloat()
```

**When `schedule()` runs:**
- After any item drag (on mouseup)
- After any date change in Properties panel
- After any duration change in Properties panel
- After adding/removing a dependency link
- After pasting/importing items
- After undo/redo
- NOT during drag (only on mouseup, for performance)

### 3.3 UI Behavior Differences in Scheduled Mode

#### 3.3.1 Date Fields

**Tasks with predecessors:**
- Start Date field: shows calculated date, greyed-out background, non-editable, with a small "calculated" indicator (e.g., `📐` or grey italic text "auto")
- End Date field: also calculated (start + duration), same treatment
- Duration field: **editable** — this is the primary input. Changing duration changes end date, which may cascade to successors.

**Tasks without predecessors (root tasks):**
- Start Date: editable (this is the anchor — user sets when work begins)
- Duration: editable
- End Date: calculated from start + duration, non-editable

**Milestones with predecessors:**
- Date field: calculated, non-editable (shows when predecessor finishes + lag)

**Milestones without predecessors:**
- Date field: editable (user places manually)

**Pinned items (regardless of predecessors):**
- All date fields editable. Pin overrides auto-scheduling.
- Visual indicator: "📌 Pinned — dates set manually" note in panel

#### 3.3.2 Drag Behavior

**Dragging a root task/milestone (no predecessors):**
- Works as today. On mouseup, `schedule()` runs and shifts all downstream successors.

**Dragging an item WITH predecessors (not pinned):**
- The drag should feel like "temporarily overriding" the schedule.
- On mouseup: `schedule()` runs. If the item was dragged earlier than its predecessors allow, it snaps back to its calculated position. If dragged later, it becomes implicitly pinned ("Start No Earlier Than" constraint — see 3.4).
- Toast: "Item snapped to calculated position" (if it moved back) or "Item pinned at new date" (if user dragged it later)

**Dragging an item WITH predecessors (pinned):**
- Works as today. The pin means the user is in control. On mouseup, `schedule()` runs for downstream items using this item's new position.

#### 3.3.3 Propagate Button

In scheduled mode, the Propagate context menu entry is **hidden** (it's unnecessary — the engine handles everything automatically). The context menu shows "Schedule is automatic" as a disabled/greyed label in its place, so users understand why Propagate is gone.

#### 3.3.4 Visual Indicators

- Calculated dates: small `📐` icon next to date labels on timeline (opt-in via Settings toggle, default on in scheduled mode)
- Float labels: automatically shown in scheduled mode (can be toggled off)
- Critical path: uses accurate zero-float calculation

### 3.4 Constraints (Simplified)

Full MS Project has 8 constraint types. We implement 2:

| Constraint | Meaning | When Applied |
|---|---|---|
| **ASAP** (default) | Start as soon as predecessors allow | Default for all items with predecessors |
| **Pin to Date** | Start on this exact date regardless of predecessors | When user toggles `pinned = true` or drags a scheduled item later |

No other constraint types. ASAP + Pin covers 98% of real-world needs. The remaining constraint types (ALAP, SNET, SNLT, FNET, FNLT, MFO) are rarely used and add enormous complexity.

### 3.5 The Mode Transition Problem

#### 3.5.1 Manual → Scheduled (The Dangerous Direction)

**The problem you identified:** A user works in manual mode, places items wherever they want, maybe with dependencies drawn for visual reference. They toggle to scheduled mode. The engine runs. Half the timeline rearranges because those "visual" dependencies now have teeth.

**Solution: Preview Before Commit**

When the user selects "Auto-Scheduled" mode and clicks Apply in Settings, instead of immediately applying:

1. **Run the engine in preview mode** — calculate what every item's new date would be, but don't apply yet.

2. **Show a transition summary modal:**

```
┌─ Switch to Auto-Scheduled Mode ─────────────────────────┐
│                                                          │
│  The scheduling engine will update dates based on your   │
│  current dependencies. Here's what would change:         │
│                                                          │
│  📊 Summary                                              │
│  ─────────────────────────────────────────────────        │
│  Total items:              24                            │
│  Items that will move:     11                            │
│  Items staying in place:   13                            │
│  Pinned items (protected): 2                             │
│                                                          │
│  ⚠ Largest shift: "Beta Testing" moves +14 days         │
│     (from Mar 1 → Mar 15)                                │
│                                                          │
│  📋 All changes:                                         │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Item              Current Start  → New Start     │    │
│  │ Sprint 2          Feb 10         → Feb 28   +18d │    │
│  │ Beta Testing      Mar 1          → Mar 15   +14d │    │
│  │ Code Review       Mar 5          → Mar 20   +15d │    │
│  │ ... (scrollable)                                 │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  💡 Tip: Pin items you don't want to move before         │
│     switching modes.                                     │
│                                                          │
│  [Cancel]  [Pin All & Stay Manual]  [Apply & Switch]     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

3. **Three actions:**
   - **Cancel** — stay in manual mode, nothing changes
   - **Pin All & Stay Manual** — pins every item that would move (so user can selectively unpin and propagate at their own pace — a graceful on-ramp)
   - **Apply & Switch** — commits the changes and switches to scheduled mode. This is a single undo step, so Ctrl+Z reverts the entire transition.

#### 3.5.2 Scheduled → Manual (The Safe Direction)

This is safe: all calculated dates become manual dates. Nothing moves. Dependencies remain as visual arrows. The engine simply stops running.

**Implementation:** Set `schedulingMode = 'manual'`. That's it. All current dates are already stored on items — the engine was just recalculating them. Removing the engine leaves them in place.

**Toast:** "Switched to Manual mode. All dates preserved. Dependencies are now visual only."

#### 3.5.3 Edge Case: Scheduled Mode with No Dependencies

If a user enables scheduled mode but has no dependencies defined, nothing happens. All items are "root items" and keep their manual dates. The engine has nothing to calculate. This is harmless.

### 3.6 Dependency Type Cycling (Phase 2 Only)

In Phase 1, all links are FS and the type badge is non-interactive.

In Phase 2, clicking the type badge on a dep chip in the Properties panel cycles: **FS → SS → FF → FS**

No SF type. It's too rare and confusing to justify the UI and logic complexity.

**Visual on arrows:**
- FS arrows: connect predecessor's right edge → successor's left edge (current behavior)
- SS arrows: connect predecessor's left edge → successor's left edge
- FF arrows: connect predecessor's right edge → successor's right edge

Arrow routing (the Bézier path calculation) uses different attachment points but the same rendering style. No visual changes to stroke, color, or curvature.

### 3.7 Phase 2 Summary: What Changes

| Area | Added | Modified |
|------|-------|----------|
| Data model | `schedulingMode` on project | — |
| Functions | `schedule()`, transition preview | `propagateFrom` (hidden in sched mode) |
| UI | Scheduling mode selector in Settings, transition modal, calculated-date indicators, constraint display | Panel date fields (conditional editability), drag behavior (conditional), context menu (conditional) |
| Settings HTML | Scheduling section with card selector | — |

---

## 4. Detailed Requirements by Feature

### REQ-1: Dependency Data Model Migration

| ID | Requirement | Phase | Priority |
|----|-------------|-------|----------|
| R1.1 | `deps` array items migrate from strings to `{id, type, lag}` objects on project load | 1 | Must |
| R1.2 | `depType` field removed from item schema | 1 | Must |
| R1.3 | All code that reads `deps` updated to handle object format | 1 | Must |
| R1.4 | Migration is idempotent (running twice doesn't corrupt data) | 1 | Must |
| R1.5 | Exported JSON uses new format | 1 | Must |
| R1.6 | CSV export includes dep type and lag columns | 1 | Should |

### REQ-2: Lock Flag Consolidation

| ID | Requirement | Phase | Priority |
|----|-------------|-------|----------|
| R2.1 | `depLocked`, `startLocked`, `endLocked`, `durationLocked` removed | 1 | Must |
| R2.2 | `pinned` boolean added (default: false) | 1 | Must |
| R2.3 | Migration: `pinned = depLocked \|\| startLocked` | 1 | Must |
| R2.4 | Pin toggle in Properties panel | 1 | Must |
| R2.5 | Pin toggle in context menu | 1 | Must |
| R2.6 | Pin icon (📌) rendered on pinned items in timeline | 1 | Should |
| R2.7 | All existing panel UI for lock toggles removed | 1 | Must |
| R2.8 | All code paths referencing old lock flags updated | 1 | Must |

### REQ-3: Conflict System Removal

| ID | Requirement | Phase | Priority |
|----|-------------|-------|----------|
| R3.1 | `getDepConflicts()` function removed | 1 | Must |
| R3.2 | `showDepResolve()` function and modal removed | 1 | Must |
| R3.3 | `autoResolveDeps()` function removed | 1 | Must |
| R3.4 | Dep resolve button and conflict count badge removed from UI | 1 | Must |
| R3.5 | `dep-modal` HTML block removed | 1 | Must |
| R3.6 | Visual conflict indicator on violated arrows in `rDeps()` | 1 | Must |

### REQ-4: Propagate to Successors

| ID | Requirement | Phase | Priority |
|----|-------------|-------|----------|
| R4.1 | `propagateFrom(itemIds)` function implemented per algorithm in 2.3.1 | 1 | Must |
| R4.2 | Cycle detection via `hasCycle()` — blocks link creation if cycle would result | 1 | Must |
| R4.3 | Propagate respects `pinned` flag (skips pinned items, continues past them) | 1 | Must |
| R4.4 | Propagate available in right-click context menu for single and multi-select | 1 | Must |
| R4.5 | Toast reports: items updated count, pinned-skipped count | 1 | Must |
| R4.6 | Propagate is a single undo step (one `snap()`) | 1 | Must |
| R4.7 | Keyboard shortcut for Propagate | 1 | Should |
| R4.8 | Propagate processes ALL predecessors of each item, not just the source chain | 1 | Must |

### REQ-5: Lag on Dependencies

| ID | Requirement | Phase | Priority |
|----|-------------|-------|----------|
| R5.1 | `lag` field on each dependency link (integer, days) | 1 | Must |
| R5.2 | Lag editable via dep chip in Properties panel | 1 | Must |
| R5.3 | Lag displayed on arrows when non-zero ("+3d" or "-2d" label) | 1 | Must |
| R5.4 | Lag respected by Propagate algorithm | 1 | Must |
| R5.5 | Lag respected by scheduling engine (Phase 2) | 2 | Must |
| R5.6 | Negative lag (lead) allowed, clamped to predecessor duration | 1 | Should |
| R5.7 | Lag editable in Data View dep column | 1 | Should |

### REQ-6: Float Calculation & Display

| ID | Requirement | Phase | Priority |
|----|-------------|-------|----------|
| R6.1 | `calculateFloat()` implements forward + backward pass per 2.7.1 | 1 | Must |
| R6.2 | Float stored as transient `_float` property (not saved to file) | 1 | Must |
| R6.3 | "Show Float" toggle in View dropdown | 1 | Must |
| R6.4 | Float labels rendered below items (0d in red, >0 in grey) | 1 | Must |
| R6.5 | Items with no deps and no successors: no float label | 1 | Must |
| R6.6 | `getCriticalPath()` updated to use float === 0 | 1 | Must |
| R6.7 | Float recalculated on every `sched()` call when toggle is on | 1 | Must |
| R6.8 | Float values shown in Data View as optional column | 1 | Should |

### REQ-7: Scheduling Mode Toggle

| ID | Requirement | Phase | Priority |
|----|-------------|-------|----------|
| R7.1 | `schedulingMode` field on project ('manual' / 'scheduled', default: 'manual') | 2 | Must |
| R7.2 | Scheduling mode selector in Settings with card-style UI and descriptions | 2 | Must |
| R7.3 | `schedule()` function runs after edits when in scheduled mode | 2 | Must |
| R7.4 | Engine runs on: drag end, date edit, duration edit, link add/remove, paste, undo/redo | 2 | Must |
| R7.5 | Engine does NOT run mid-drag (performance) | 2 | Must |

### REQ-8: Mode Transition Safety

| ID | Requirement | Phase | Priority |
|----|-------------|-------|----------|
| R8.1 | Manual → Scheduled: preview modal shows all items that would move | 2 | Must |
| R8.2 | Preview modal shows summary counts and largest shift | 2 | Must |
| R8.3 | Preview modal scrollable change list with before/after dates | 2 | Must |
| R8.4 | "Cancel" action: stay in manual, no changes | 2 | Must |
| R8.5 | "Pin All & Stay Manual" action: pins all items that would move | 2 | Must |
| R8.6 | "Apply & Switch" action: commits changes as single undo step | 2 | Must |
| R8.7 | Scheduled → Manual: instant switch, all dates preserved, toast confirmation | 2 | Must |
| R8.8 | Switching modes with no dependencies: no changes, no modal | 2 | Should |

### REQ-9: Scheduled Mode UI Behavior

| ID | Requirement | Phase | Priority |
|----|-------------|-------|----------|
| R9.1 | Calculated date fields: grey background, non-editable, "auto" indicator | 2 | Must |
| R9.2 | Root items (no predecessors): start date remains editable | 2 | Must |
| R9.3 | Duration is primary editable field for scheduled tasks with predecessors | 2 | Must |
| R9.4 | Pinned items: all fields editable regardless of mode | 2 | Must |
| R9.5 | Dragging root items triggers engine on mouseup | 2 | Must |
| R9.6 | Dragging non-pinned items with predecessors: snap back or auto-pin per 3.3.2 | 2 | Must |
| R9.7 | Propagate hidden in context menu in scheduled mode | 2 | Must |
| R9.8 | SS/FF link types functional in scheduled mode | 2 | Must |
| R9.9 | Type badge on dep chips clickable to cycle FS/SS/FF in scheduled mode | 2 | Must |

---

## 5. Implementation Sequence

### Phase 1 — Smart Defaults (estimated: 3-4 sessions)

**Session 1: Data Model & Cleanup**
- Dependency link migration (strings → objects)
- Lock flag consolidation (4 flags → `pinned`)
- Remove conflict detection system (functions + modal + UI)
- Update all code paths that touch deps
- Pin toggle in panel and context menu

**Session 2: Propagate & Cycle Detection**
- `hasCycle()` implementation
- `propagateFrom()` implementation
- Context menu integration
- Undo integration
- Cycle check on link creation

**Session 3: Float, Lag, Visual Polish**
- `calculateFloat()` with forward + backward pass
- Float display toggle and rendering
- Update `getCriticalPath()` to use float
- Lag editing on dep chips
- Lag display on arrows
- Visual conflict indicator on arrows

**Session 4: Testing & Edge Cases**
- Test with existing project files (migration)
- Test propagation with complex graphs
- Test float with milestones, cross-swimlane deps
- Test circular dependency detection
- Verify undo/redo integrity

### Phase 2 — Scheduled Mode (estimated: 3-4 sessions)

**Session 5: Engine & Toggle**
- `schedulingMode` field and settings UI
- `schedule()` function
- Trigger on relevant edit events
- Basic happy path: add deps, engine runs, items move

**Session 6: Mode Transition**
- Preview modal for manual → scheduled
- "Pin All & Stay Manual" action
- "Apply & Switch" with undo support
- Scheduled → manual instant switch

**Session 7: Scheduled Mode UI**
- Conditional field editability in panel
- Drag behavior changes
- Calculated-date indicators
- SS/FF link types
- Type cycling on dep chips

**Session 8: Polish & Edge Cases**
- Test mode transitions with complex projects
- Test undo/redo across mode switches
- Test scheduled mode with paste/import
- SVG export with float labels
- Data View integration

---

## 6. Out of Scope

The following are explicitly NOT planned:
- SF (Start-to-Finish) dependency type
- Resource assignment or leveling
- WBS / task hierarchy / summary tasks / indent-outdent
- Baseline snapshots or variance tracking
- Earned value management
- ALAP, SNET, SNLT, FNET, FNLT, MFO constraints
- Recurring tasks
- Calendar exceptions (non-working days) in scheduling — holidays are visual only, not scheduling inputs
- Changes to arrow rendering style/routing
- Drag-to-link interaction
- Automatic dependency creation (e.g., "auto-link items in same swimlane")

---

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dependency migration breaks existing project files | Low | High | Idempotent migration; test with multiple saved projects; preserve raw data on load failure |
| Float calculation incorrect for complex graphs | Medium | Medium | Unit test with known graph; compare against manual calculation |
| Users accidentally switch to scheduled mode | Medium | Medium | Card selector with clear descriptions; preview modal; single undo step |
| Circular dependency created via paste/import | Medium | Low | Run cycle check after paste; remove offending links with toast warning |
| Performance with 200+ items and many deps | Low | Medium | Forward pass is O(n); only recalculate when deps change; skip float when toggle is off |
| Users confused by "pinned" replacing 4 lock flags | Low | Low | Pin concept is simpler; tooltip explains; migration preserves intent |

---

## 8. Success Criteria

**Phase 1 is successful when:**
- A user with 30+ items and dependencies can select a predecessor, change its dates, right-click → Propagate, and see all downstream items shift correctly in <1 second
- Float values match hand-calculated expected values for a 10-item test graph
- Existing project files load and render identically after migration (no visual changes for projects that don't use new features)
- The codebase has fewer lines than before Phase 1 started (net removal of complexity)

**Phase 2 is successful when:**
- A user can toggle to scheduled mode, see a clear preview of what will change, and switch back with Ctrl+Z
- In scheduled mode, dragging a root task cascades correctly to all downstream items on mouseup
- A user unfamiliar with scheduling can open a scheduled-mode project and understand why some date fields are greyed out (via clear labeling)
- The app can serve as a primary scheduling tool for a 50-item program timeline with cross-swimlane dependencies (the SC3 use case)

---

*Next step: Review this PRD, confirm/adjust requirements, then move to Detailed Requirements phase where we specify the exact code changes, function signatures, and UI element specs needed for implementation.*
