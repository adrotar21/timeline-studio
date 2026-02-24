# Timeline Studio Layout Engine: Deep Dive Analysis & Recommendations

## Executive Summary

Your `_autoLayoutItems()` implementation is a solid density-aware greedy interval packer. It handles the core problem — assigning non-overlapping rows within swimlane groups — with a tunable approach that's already better than what most Gantt tools offer out of the box. That said, the architecture maps directly to several well-studied algorithmic domains where targeted improvements could yield significant visual quality gains, particularly around dependency-aware placement and label collision accuracy. This document covers the relevant computer science foundations, comparable software approaches, and concrete recommendations ranked by impact.

---

## Part 1: What You've Built (Algorithmic Classification)

Your current algorithm is essentially a **greedy interval coloring** variant with a tunable heuristic for row preference. In formal terms:

- Each item is an **interval** on the time axis (with a "visual end" that accounts for label width)
- Each **row** (subRow) is a "color" or "resource"
- The goal is to assign intervals to resources such that no two overlapping intervals share a resource
- The **preferred row** blends index-based packing with date-proportional waterfall, controlled by `arrangeDateWeight`

This places your algorithm in the **Interval Partitioning** / **Interval Graph Coloring** family. The classical result here (from Kleinberg & Tardos, among others) is that a greedy algorithm sorting intervals by start time and assigning each to the lowest-numbered available row produces an **optimal** solution — meaning it uses the minimum number of rows equal to the maximum "depth" (number of simultaneously overlapping intervals) of the input.

Your algorithm intentionally deviates from this optimum by allowing the `spread` and `dateWeight` sliders to push items into more rows than strictly necessary, creating visual breathing room. This is a smart UX decision — strict minimum-row packing looks dense and intimidating for 50+ item imports.

**Key Observation:** The core packing logic is sound. The main gaps are orthogonal to interval coloring — they're about *which* row to prefer based on dependency structure, and about making the label-aware collision detection more precise.

---

## Part 2: Comparable Software & How They Approach Layout

### Office Timeline (your direct competitor space)
Office Timeline uses a strict one-item-per-row model for its PowerPoint output, with alternating above/below placement for milestone labels. It doesn't have a true auto-layout engine for dense data — it relies on the user to manage visual density manually. This is actually a weakness you can exploit: Timeline Studio's density-aware auto-layout is a differentiator.

### DHTMLX Gantt / Bryntum Gantt (JS Gantt libraries)
These commercial libraries use a fixed one-task-per-row model by default. Some support "resource view" with stacking, but their auto-layout is basic — items are stacked sequentially without waterfall optimization. They handle dependency arrows through separate rendering passes but don't use dependency structure to inform row assignment.

### Dagre (JavaScript graph layout library)
Dagre implements a full Sugiyama-framework hierarchical layout algorithm — the same approach used by Graphviz's `dot` engine. Its pipeline is: cycle removal → layer assignment → crossing minimization → coordinate assignment. This is overkill for your use case (you have fixed X-axis positions from dates), but the **crossing minimization** phase is directly relevant to your Gap 1 (dependency-aware row preference). Dagre is MIT-licensed and its crossing minimization heuristics could be adapted.

### ELK.js (Eclipse Layout Kernel)
ELK is a more comprehensive layout library from the Eclipse ecosystem, compiled to JavaScript via GWT. It offers a `layered` algorithm with extensive configuration options for node spacing, edge routing, and port placement. Like Dagre, it implements Sugiyama-style layout. Its layer assignment phase uses the Coffman-Graham algorithm or network simplex, both of which are relevant to optimizing row assignment for dependency chains.

### d3-dag
A lightweight JavaScript library specifically for DAG layout with Sugiyama, Zherebko, and Grid algorithms. Its Sugiyama implementation includes crossing minimization via the barycenter heuristic, which is the most directly applicable technique for your dependency-aware layout gap.

### Vega-Lite (Bitmap-based label placement)
A 2024 paper from the UW Interactive Data Lab introduced an **occupancy bitmap** approach for label overlap detection. Rather than computing geometric intersections, they rasterize occupied areas onto a bitmap and check pixel-level overlap. This runs in sub-millisecond time for 10,000+ labels and could dramatically improve your Gap 5 (label overlap approximation).

### yFiles (commercial graph drawing)
yFiles offers integrated labeling within its hierarchic layout algorithm — labels are first-class citizens in the layout computation, not an afterthought. This is the gold standard for integrated label placement but is a commercial library ($$$).

---

## Part 3: Algorithms to Apply (Ranked by Impact)

### Recommendation 1: Dependency-Aware Row Preference (Gap 1 — Highest Impact)

**The Problem:** `_autoLayoutItems` never reads `it.deps[]`, so predecessor-successor pairs can end up on distant rows with arrows crossing the entire swimlane.

**The Algorithm:** Apply a constrained version of the **barycenter heuristic** from Sugiyama's framework. The idea is:

1. **Build the dependency DAG** for items within each swimlane group
2. **Topologically sort** the items (you already have the topo sort elsewhere in your codebase)
3. **For each item, compute a preferred row** as the **weighted average** of its predecessors' assigned rows (the "barycenter")
4. **Blend** this dependency-derived preference with your existing date/index preference

Here's the conceptual approach:

```
For each swimlane group:
  1. Sort items by topo order (respecting deps), falling back to chronological
  2. For each item i (in topo order):
     a. existing_pref = your current blend of idxPct and daysPct
     b. If item has placed predecessors:
        dep_pref = average(subRow of placed predecessors)
     c. preferred = lerp(existing_pref, dep_pref, depWeight)
        // depWeight is a new tunable slider (0 = ignore deps, 100 = strong affinity)
     d. Spiral search from preferred row as before
```

**Why barycenter works here:** In the Sugiyama framework, the barycenter heuristic positions each node at the average position of its connected nodes in the previous layer, then iteratively refines. This directly minimizes edge (dependency arrow) length, which is exactly what you want for visual clarity. The heuristic is O(n) per pass and converges quickly — typically 2-4 passes produce good results.

**Additional refinement — row affinity for dependency chains:** After initial placement, run a 2-pass optimization:
- **Downward pass:** For each item with a single successor, if the successor hasn't been placed yet, bias it toward the same row
- **Upward pass:** For each item with a single predecessor, pull it toward the predecessor's row if there's space

This produces the "dependency chains read left-to-right on the same row" effect you described in your desired outcome.

### Recommendation 2: Critical Path Gets Row 0 (Gap 3 — High Impact, Easy Win)

Since you already have a full critical path engine, this is straightforward:

```
Before the main placement loop:
  1. Identify critical path items in this group
  2. Sort them chronologically
  3. Place them on row 0 first (using your existing overlap detection)
  4. Mark row 0 as "preferred" for non-critical items that are
     direct predecessors/successors of critical items
  5. Run the normal algorithm for remaining items, starting
     preferred row calculation at row 1
```

This gives the critical path visual prominence (top row) and creates a natural anchor for the rest of the layout.

### Recommendation 3: 2D Label Collision Detection (Gap 5 — Medium Impact)

**Current problem:** Your `useLabels` mode adds label width to the "visual end date," treating it as a 1D extension. But items on different subRows can't actually collide horizontally, so you're being overly conservative — items that could share a row get pushed apart unnecessarily.

**Two approaches:**

**Option A — Per-row interval tracking (simple, recommended):**
Change `rowEnds` from storing a single visual-end date to storing a list of occupied horizontal extents per row. When checking if an item fits on row `r`, check actual pixel overlap rather than just "does my start come after rowEnd":

```
rowOccupied[r] = [{left: px, right: px}, ...]
// Item fits on row r if none of its occupied extents overlap
```

This is more memory but still O(n²) worst case (same as now) and produces tighter layouts when labels are enabled.

**Option B — Occupancy bitmap (advanced):**
Inspired by the Vega-Lite approach: maintain a bitmap where each bit represents a small pixel region of the layout. Before placing an item, rasterize its bar + label footprint and check for conflicts against already-placed items. This handles arbitrary label positions (top, bottom, left, right, center) with perfect accuracy. The bitmap approach runs in constant time per overlap check regardless of item count.

For your scale (30-50 items per group), Option A is sufficient and much simpler to implement. Reserve Option B for if you scale to hundreds of items.

### Recommendation 4: Import-Aware Placement (Gap 2 — Medium Impact)

**Current problem:** Import runs `_autoLayoutItems(newItems)` without knowledge of existing items, causing overlaps.

**Fix:** Pass the full item set for the affected swimlane groups, but mark which items are "pinned" (existing) vs "new" (to be placed):

```
Import path change:
  1. Collect all existing items in affected swimlane groups
  2. Mark them as pinned (preserve their current subRow)
  3. Call _autoLayoutItems([...existingItems, ...newItems])
  4. In the algorithm: skip row assignment for pinned items,
     but include them in rowEnds tracking
```

This ensures new items route around existing ones. The pinned items participate in density calculation and collision detection without being moved.

### Recommendation 5: Milestone Clustering (Gap 4 — Lower Impact)

For milestones sharing the same date, apply a **grouping heuristic** before the main layout:

1. Identify milestone clusters (same date ± 1 day)
2. If a cluster has dependencies connecting some milestones, place connected ones on adjacent rows
3. For unconnected milestones on the same date, spread them vertically starting from the date-proportional preferred row, alternating above/below
4. If milestones share a common predecessor, place them on consecutive rows immediately after the predecessor's row

This is a preprocessing step that feeds adjusted preferred rows into the existing algorithm.

### Recommendation 6: Iterative Crossing Minimization (Advanced — Future Enhancement)

If you want to go further, implement a **2-pass crossing minimization** as a post-processing step:

```
After initial placement:
  For 2-4 iterations:
    For each dependency edge (pred → succ):
      Count how many other edges it crosses
    For the item whose edges cross the most:
      Try swapping it with adjacent-row items in same time region
      Keep the swap if total crossings decrease
```

This is a simplified version of the Jünger-Mutzel heuristic used in Dagre. It's optional polish — the barycenter heuristic from Recommendation 1 handles most cases, but this step can clean up the remaining 10-15% of messy arrow crossings.

---

## Part 4: Fit-to-Content Solver Observations

Your iterative zoom solver in `fitToContent()` is elegant. The key insight — that bar positions scale with zoom but text labels are fixed-pixel — is correctly modeled with the `z*barL - textL` / `z*barR + textR` formulation. Four iterations is sufficient for convergence given the linear relationship.

**One potential improvement:** The solver currently treats all items equally. For presentation contexts, you could weight the fit toward items on row 0 (critical path) or selected items, allowing less-important items to be slightly off-screen. This could be a "Fit Priority" option: `all` (current behavior) vs `critical path` vs `selection context` (fit selection + 1 row of context above/below).

---

## Part 5: Libraries Worth Evaluating (for specific sub-problems)

| Library | License | Size | Relevant For | Tradeoff |
|---------|---------|------|--------------|----------|
| **dagre** | MIT | ~30KB | Crossing minimization heuristics (source code reference) | Unmaintained since 2018, but algorithms are textbook-correct |
| **d3-dag** | MIT | ~25KB | Sugiyama layout reference implementation | Light maintenance mode, but clean code |
| **ELK.js** | EPL-2.0 | ~600KB | Full hierarchical layout if you ever need it | Very large, likely overkill |
| **graphlib** | MIT | ~15KB | Graph data structure (adjacency lists, topo sort) | Useful if you don't want to roll your own |

**My recommendation:** Don't add any of these as dependencies for Timeline Studio (keeping it dependency-free is a genuine advantage). Instead, study the source code of dagre's crossing minimization (specifically the barycenter + transpose heuristic in `order.js`) and adapt the algorithm to your specific data model. The core logic is ~100 lines and translates directly to your vanilla JS codebase.

---

## Part 6: Suggested Implementation Roadmap

| Priority | Change | Effort | Visual Impact |
|----------|--------|--------|---------------|
| **P0** | Dependency-aware preferred row (barycenter) | 2-3 days | Transformative for dep-heavy imports |
| **P0** | Critical path → row 0 bias | 0.5 day | Immediate exec-presentation quality boost |
| **P1** | Import respects existing items (pinned items) | 1 day | Eliminates overlap bug on incremental imports |
| **P1** | Per-row 2D collision tracking for labels | 1-2 days | Tighter layouts with "Consider Labels" on |
| **P2** | Milestone clustering heuristic | 1 day | Cleaner milestone-heavy timelines |
| **P2** | Post-placement crossing minimization pass | 1-2 days | Final polish for complex dependency webs |
| **P3** | New slider: "Dependency Affinity" (0-100) | 0.5 day | User control over dep-vs-waterfall tradeoff |

---

## Part 7: Summary

Your layout engine is already in the top tier for browser-based timeline tools. The density-based row budgeting with tunable spread is genuinely novel — most tools either hard-code one-per-row or do naive bin-packing. The main gaps are all additive (you're not doing anything wrong, you're just not yet doing the dependency-aware placement that would take it to the next level).

The single highest-ROI change is wiring your existing dependency/topo-sort engine into `_autoLayoutItems` via the barycenter heuristic. Combined with critical-path-to-row-0 bias, this would produce layouts where dependency chains naturally read left-to-right on the same or adjacent rows — exactly the "auto-layout that a PM would be proud to screenshot" outcome you described.
