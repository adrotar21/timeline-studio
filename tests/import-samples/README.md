# Import Test Samples — Benchmark Reference

> Realistic export files from major PM tools, used as test fixtures and reference benchmarks.
> When real exports are obtained from actual tools, compare against these benchmarks to verify parsing coverage.

## Directory Structure

```
import-samples/
  msproject/     MS Project XML (MSPDI) — 5 files
  smartsheet/    Smartsheet CSV exports — 5 files
  jira/          Jira CSV exports — 5 files
  asana/         Asana CSV exports — 3 files
  monday/        Monday.com CSV exports — 2 files
  generic/       Generic CSV/TSV edge cases — 14 files
  json/          JSON import formats — 3 files
```

## Benchmark Specs

### MS Project XML (`msproject/`)

| File | Items | Milestones | Deps | Hierarchy | Key Test Points |
|------|-------|------------|------|-----------|-----------------|
| `msproject-simple.xml` | 5 | 2 | 0 | Flat (OL=1) | Basic XML parsing, duration `PT80H0M0S` = 10 days |
| `msproject-deps.xml` | 10 | 1 | 9 | Flat | All 4 dep types (FS/SS/FF), lag `9600` = 2d, lead `-4800` = -1d |
| `msproject-hierarchy.xml` | 22 | 4 | ~8 | 3-level OL | Summary tasks (OL=1), groups (OL=2), leaf (OL=3) |
| `msproject-complex.xml` | 41 | ~5 | ~15 | 3-level OL | Calendar exceptions, baselines, ExtendedAttributes, constraints, resources, assignments |
| `msproject-milestones.xml` | 8 | 5 | 7 | Flat | Alternating milestone/task chain, ConstraintType=4 (SNET), Deadline element |

**Key conversion rules:**
- Duration: `PT40H0M0S` = 5 days at 8h/day. Parse `PT(\d+)H` and divide by 8.
- Lag: stored as tenths-of-minute. `4800` = 1 day (4800 / 480 min/day = 1). Negative = lead.
- Dep types: `Type` element: 0=FF, 1=FS, 2=SF, 3=SS.
- Milestones: `<Milestone>1</Milestone>` and `Duration=PT0H0M0S`.

### Smartsheet CSV (`smartsheet/`)

| File | Items | Deps | Key Test Points |
|------|-------|------|-----------------|
| `smartsheet-simple.csv` | 5 | 0 | Basic columns, US date format (MM/DD/YYYY) |
| `smartsheet-deps.csv` | 8 | 6 | **Off-by-one predecessor bug** — row refs are +1 |
| `smartsheet-hierarchy.csv` | 13 | ~4 | Indented Primary Column (2-space = level 1, 4-space = level 2) |
| `smartsheet-complex.csv` | 15 | ~5 | Status, Priority, Risk Level, duration as "5d"/"2w", quoted comments |
| `smartsheet-dates-intl.csv` | 5 | 0 | DD/MM/YYYY dates, ambiguity test (day > 12 = unambiguous) |

**Smartsheet quirks:**
- Predecessor off-by-one: CSV export shifts row refs by +1. Parser must decrement.
- Hierarchy: spaces in "Primary Column" indicate indent depth (2 per level).
- Duration: "5d", "2w", "0d" formats.

### Jira CSV (`jira/`)

| File | Items | Deps | Key Test Points |
|------|-------|------|-----------------|
| `jira-simple.csv` | 6 | 0 | Issue Type (Epic/Story/Task/Bug/Sub-task), ISO datetime |
| `jira-with-links.csv` | 8 | ~6 | `Outward issue link (Blocks)` / `Inward issue link (is blocked by)` columns |
| `jira-with-dates.csv` | 8 | 0 | Jira date format `15/Jan/26`, Sprint, Story Points, Original Estimate (seconds) |
| `jira-complex.csv` | 10 | ~3 | Epic Link, Labels, multiple Comment columns, multi-line Description |
| `jira-all-fields.csv` | 5 | ~2 | 24 columns — stress test for auto-detect |

**Jira quirks:**
- Dependencies via link columns, not predecessor rows. "Blocks" = outward, "is blocked by" = inward.
- Multiple Comment columns: Comment, Comment.1, Comment.2 (one per comment).
- Date format: `15/Jan/26` (Jira default) or ISO datetime.
- Original Estimate in seconds (28800 = 8 hours = 1 day).

### Asana CSV (`asana/`)

| File | Items | Deps | Key Test Points |
|------|-------|------|-----------------|
| `asana-simple.csv` | 6 | 0 | Section rows (`Planning:` in Name column), ISO dates |
| `asana-with-deps.csv` | 8 | ~5 | `Dependent On` column with Asana task IDs |
| `asana-complex.csv` | 10 | ~3 | Parent Task, Tags, Projects, Completed At, multi-line Notes |

**Asana quirks:**
- Sections appear as rows with `:` suffix in Name column.
- Dependencies via task ID in `Dependent On` column.
- `Completed At` date indicates done status.

### Monday.com CSV (`monday/`)

| File | Items | Key Test Points |
|------|-------|-----------------|
| `monday-simple.csv` | 6 | Group column (= swimlane), Monday statuses ("Working on it", "Stuck", "Done") |
| `monday-timeline.csv` | 8 | **Timeline range column**: `2026-01-15 - 2026-01-30` (start+end in single column) |

**Monday quirks:**
- "Group" column = swimlane equivalent.
- Timeline column contains date range with ` - ` separator.
- Status labels differ from standard: "Working on it" = In Progress.

### Generic CSV/TSV (`generic/`)

| File | Items | Key Test Points |
|------|-------|-----------------|
| `generic-tab-separated.tsv` | 8 | TSV format, auto-detect delimiter |
| `generic-minimal.csv` | 8 | Name only — all become milestones (no dates) |
| `generic-dates-us.csv` | 6 | MM/DD/YYYY dates |
| `generic-dates-iso.csv` | 6 | YYYY-MM-DD dates |
| `generic-dates-eu.csv` | 6 | DD/MM/YYYY dates |
| `generic-dates-mixed.csv` | 6 | Mixed formats in same file (ISO, US, text month) |
| `generic-all-fields.csv` | 13 | Every Timeline Studio field populated (22 columns) |
| `generic-deps-all-types.csv` | 12 | All 4 dep types (FS/SS/FF/SF), positive/negative lag |
| `generic-special-chars.csv` | 7 | Unicode, commas in names, embedded quotes, multi-line fields, accented chars |
| `generic-empty-rows.csv` | 5 | Blank rows interspersed — parser must skip |
| `generic-no-header.csv` | 6 | Data without header row — positional parsing |
| `generic-duplicate-names.csv` | 10 | Same name across different swimlanes — tests merge behavior |
| `generic-large.csv` | 100 | Stress test: 5 swimlanes, 13 sub-swimlanes, ~40% with deps |
| `generic-tls-reimport.csv` | 6 | Exact Timeline Studio CSV export format — round-trip test |

### JSON (`json/`)

| File | Items | Key Test Points |
|------|-------|-----------------|
| `json-array-simple.json` | 6 | Minimal `[{name, start, end}]` format |
| `json-array-full.json` | 8 | All fields: type, swimlane, subSwimlane, predecessors, status, progress, color, etc. |
| `json-nested.json` | ~20 | Grouped by lane: `{lanes: [{name, subLanes: [{items}]}]}` |

## Auto-Detection Signatures

| Source Tool | Detection Signals | Confidence |
|-------------|-------------------|------------|
| MS Project XML | File ext `.xml` + `<Project>` root element | High |
| Smartsheet | "Primary Column" OR ("Row ID" + "Predecessors") headers | High |
| Jira | "Issue key" + "Summary" + "Issue Type" headers | High |
| Asana | "Task ID" + "Section/Column" headers | High |
| Monday.com | "Group" + "Person" headers, OR "Timeline" column | Medium |
| Generic CSV | No tool-specific headers match | Fallback |
| Generic TSV | Tab delimiter detected | Fallback |
| TLS Reimport | All columns match TLS export format | High |

## Usage in Tests

```javascript
const fs = require('fs');
const path = require('path');
const SAMPLES = path.join(__dirname, '..', 'import-samples');

// Load a sample file
const csv = fs.readFileSync(path.join(SAMPLES, 'smartsheet', 'smartsheet-deps.csv'), 'utf8');
const rows = parseCSV(csv);

// Validate against benchmark
assert('row count', rows.length - 1, 8); // minus header
```
