# Video Wall Size Calculator — PRD

## 1. Overview

A client-side calculator that determines the closest possible LED cabinet configurations for a target video wall size. The user provides two constraints (from: aspect ratio, height, width, diagonal), and the system returns the closest **lower** and **upper** configurations for both cabinet types (16:9 and 1:1) — four results total.

---

## 2. Tech Stack & Technical Decisions

### 2.1 Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | React 18 + Vite + TypeScript | Single page, no routing/SSR needed, type-safe calc logic |
| Backend | None | All logic is client-side arithmetic — no API, no server |
| Styling | Tailwind CSS v3 | Rapid, clean UI without custom CSS |
| Storage | localStorage | Zero infra, persists across browser sessions |
| Hosting | Vercel | Free tier, one-command deploy from repo |

### 2.2 Runtime Dependencies

| Dependency | Purpose | Size |
|-----------|---------|------|
| React + ReactDOM | UI framework | (core) |
| Lucide React | Icons: lock/unlock, (?), (!), close, radio | ~8kb tree-shaken |
| @headlessui/react | Accessible modal Dialog (focus trap, esc-to-close, aria) | ~10kb tree-shaken |

### 2.3 Dev Dependencies

| Dependency | Purpose |
|-----------|---------|
| Vitest | Unit tests for calculation engine and unit conversion |
| Tailwind CSS + PostCSS | Build-time styling |

### 2.4 State Management — `useReducer`

The app has coupled state transitions: locking a parameter must simultaneously update lock state, check if 2 are locked, run calculations if so, and clear any previous selection/confirmation. `useReducer` handles this in a single atomic dispatch rather than coordinating multiple `useState` setters.

```ts
type AppState = {
  locks: Record<Param, boolean>
  values: Record<Param, number>
  unit: Unit
  results: Config[] | null       // 4 configs or null
  nearestIndex: number | null    // index of nearest size
  selectedIndex: number | null   // radio selection (pre-confirm)
  confirmed: Config | null       // post-confirm
  history: SavedSelection[]
  modalOpen: boolean
  modalSource: 'help' | 'quote' | null
}

type Action =
  | { type: 'LOCK_PARAM'; param: Param; value: number }
  | { type: 'UNLOCK_PARAM'; param: Param }
  | { type: 'SET_UNIT'; unit: Unit }
  | { type: 'SET_VALUE'; param: Param; value: number }
  | { type: 'SELECT_OPTION'; index: number }
  | { type: 'CONFIRM' }
  | { type: 'CANCEL' }
  | { type: 'OPEN_MODAL'; source: 'help' | 'quote' }
  | { type: 'CLOSE_MODAL' }
  | { type: 'DELETE_HISTORY'; id: string }
```

**Key transition: `LOCK_PARAM`**
```
1. Set locks[param] = true
2. Count locked params
3. If 2 locked → run calculate() for both cabinet types → set results + nearestIndex
4. Clear selectedIndex and confirmed (fresh results)
```

**Key transition: `UNLOCK_PARAM`**
```
1. Set locks[param] = false
2. Clear results, selectedIndex, confirmed (stale data)
3. Remaining fields re-enable (derived from lock count < 2)
```

Components receive `state` and `dispatch` — one object, one function, no prop drilling of 6+ setters.

### 2.5 Other Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Form validation (quote modal) | Hand-rolled | 3 fields max, a library adds more code than it saves |
| Toast notification | State-driven div, auto-dismiss via `setTimeout` | One toast in one place, no library needed |
| Number formatting | `toFixed(2)` | Reference app uses plain decimals, no locale formatting |
| Grid visualization | Pure SVG | Single coordinate system for grid + arrows + labels |
| Responsive (mobile) | Horizontal scroll on results table, stack inputs on mobile | See section 5.5 |
| Testing | Vitest — unit tests for `calculate.ts` and `units.ts` | Spec evaluates "mathematical correctness" |

---

## 3. User Flow

### 3.1 Input — Lock-Based Parameter Selection

Each of the 4 parameters has its own input field, an **Apply** button, and a **lock icon**.

1. All 4 fields start **unlocked** (open padlock, teal/muted).
2. User enters a value in a field and clicks that field's **Apply** button.
3. The lock icon transitions to **closed** (solid dark padlock) — that parameter is now locked.
4. User locks a second parameter the same way.
5. Once **2 parameters are locked**, the remaining 2 fields become **disabled** (greyed out, non-interactive).
6. To change a locked parameter: click the closed lock icon to **unlock** it. This re-enables the other disabled fields (if fewer than 2 are now locked).
7. Results are computed automatically once exactly 2 parameters are locked.

**Field types:**
- **Diagonal, Width, Height**: numeric input + Apply button + lock icon. Label includes current unit, e.g. "Height. (Inches)".
- **Aspect Ratio**: dropdown of presets (see 6.3) + lock icon. No Apply button — selecting a value from the dropdown and clicking the lock locks it.

### 3.2 Results — "Choose a Size"

Once 2 parameters are locked, a results section appears with:

1. **Header**: "Choose a Size" with subtitle: "The following size options are the closest available to your entered dimensions."
2. **"Help me choose" button** (gold/accent, top-right of header) with a (?) icon — opens the contact modal (same as "Receive Quote", see section 12).
3. **Comparison table** with **4 columns** laid out side by side:

| Column | Content |
|--------|---------|
| 1 | 16:9 Cabinet — Size Lower |
| 2 | 16:9 Cabinet — Size Upper |
| 3 | 1:1 Cabinet — Size Lower |
| 4 | 1:1 Cabinet — Size Upper |

4. **Each column header** shows:
   - Grid size in large bold text (e.g. **7x7**)
   - Cabinet system label (e.g. "16:9 Cabinet System")
5. **"Nearest Size" badge** — appears above the column that is the overall closest match to the user's input (see 8.5 for logic).
6. **Table rows** (row labels on the left, values per column):

| Row | Format |
|-----|--------|
| Width | achieved value in display unit |
| Height | achieved value |
| Height Entry | user's input value (greyed/secondary) |
| Diagonal | achieved value |
| Aspect Ratio | label + decimal, e.g. "16:9 (1.78)" or "1.8:1 (1.8)" |
| Aspect Ratio Entry | user's input value (greyed/secondary) |

   Entry rows only appear for the parameters the user locked. E.g., if user locked AR + Height, show "Height Entry" and "Aspect Ratio Entry" rows.

7. **Select buttons** with radio circles at the bottom of each column — only one can be selected at a time.
8. **Cancel / Confirm buttons** below the table.

### 3.3 Selection & Confirmation

1. User clicks **Select** on one of the 4 columns (radio selection).
2. User clicks **Confirm**.
3. A **row/column counter** appears above the visualization: e.g. "**7** Columns **7** Rows" — large, prominent numbers.
4. A **grid visualization** appears below showing the cabinet layout (see 5.3 for full spec):
   - Pure **SVG** rendering — grid, arrows, and labels in a single `<svg>` element with `viewBox` for responsive scaling.
   - Rectangular grid of cabinet cells: cols wide × rows tall.
   - **Width arrow**: horizontal double-headed arrow above the grid, label: "{width} {unit} ({n} columns)".
   - **Height arrow**: vertical double-headed arrow to the left of the grid, label rotated 90°: "{height} {unit} ({n} rows)".
   - **Diagonal line**: bottom-left to top-right corner-to-corner line, label at midpoint rotated to match angle: "{diagonal} {unit}".
   - Arrowheads via SVG `<marker>` definitions, reused across all three lines.
4. Final chosen dimensions are displayed prominently.
5. The selection is **saved to localStorage** (see section 7).
6. A **"Receive Quote"** button appears below the confirmed config (see section 12).

### 3.4 Unit Switching

- Unit dropdown sits in the info banner bar (top-right of parameter area).
- Changing the unit at any time converts all visible values (inputs, labels, and results) to the new unit.
- No recalculation — stored mm values are re-displayed through `fromMM()`.
- Field labels update dynamically: "Height. (Inches)" → "Height. (Meters)".
- Works before and after locking parameters.

---

## 4. UI States

| State | What's Visible |
|-------|---------------|
| **Empty** | All 4 fields unlocked, default values 0.00, info banner: "Select a measurement to start" |
| **1 locked** | One field locked (closed padlock), other 3 still active, info banner updates |
| **2 locked (Results)** | Two fields locked, other 2 disabled/greyed, "Choose a Size" comparison table appears with 4 columns |
| **Option selected** | One radio button selected in the table, Confirm button enabled |
| **Confirmed** | Grid visualization shown below table, final dimensions displayed, "Receive Quote" button visible |

### Lock State Transitions

```
Unlocked (open padlock, teal)
  → user clicks Apply on that field →
Locked (closed padlock, dark)
  → user clicks the closed lock →
Unlocked (reverts to open)
```

- Max 2 locked at any time.
- When 2 are locked: remaining fields disabled.
- When a lock is opened: if now <2 locked, disabled fields re-enable.

---

## 5. UI Layout

### 5.1 Input Section

```
┌──────────────────────────────────────────────────────────────┐
│                          Size                                │
│             Enter at least 2 parameters.                     │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ (!) Select a measurement to start        Inches    [▼] │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Diagonal. (Inches)                Aspect Ratio              │
│  ┌──────────────┬─────────┐  🔓    ┌──────────────────┐  🔓  │
│  │ 0.00         │  apply  │        │ Aspect       [▼] │     │
│  └──────────────┴─────────┘        └──────────────────┘     │
│                                                              │
│  Width. (Inches)                   Height. (Inches)          │
│  ┌──────────────┬─────────┐  🔓    ┌──────────────┬───────┐ 🔓│
│  │ 0.00         │  apply  │        │ 0.00         │ apply │  │
│  └──────────────┴─────────┘        └──────────────┴───────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ (?) What to know                                        │ │
│  │ When you enter your values, this tool will design the   │ │
│  │ largest video wall which fits into your dimensions.     │ │
│  │ Initially, you can lock 2 parameters and the tool will  │ │
│  │ 'fit' a Video Wall to your specifications.              │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Results Section — "Choose a Size"

```
┌──────────────────────────────────────────────────────────────────────┐
│  Choose a Size                              [Help me choose (?)]    │
│  The following size options are the closest                          │
│  available to your entered dimensions.                               │
│                                                                      │
│                                          Nearest Size                │
│                                              ▼                       │
│            7x7          8x8           9x5            11x6            │
│        16:9 Cabinet  16:9 Cabinet  1:1 Cabinet    1:1 Cabinet        │
│          System        System        System         System           │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────── │
│  Dimensions                                                          │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  Width      165.35 in   188.98 in    177.17 in     216.54 in        │
│                                                                      │
│  Height     93.01 in    106.30 in    98.43 in      118.11 in        │
│  H. Entry   100 in      100 in       100 in        100 in           │
│                                                                      │
│  Diagonal   189.72 in   216.82 in    202.67 in     246.65 in        │
│                                                                      │
│  AR         16:9 (1.78) 16:9 (1.78)  1.8:1 (1.8)   1.83:1 (1.83)  │
│  AR Entry   16:9 (1.78) 16:9 (1.78)  16:9 (1.78)   16:9 (1.78)    │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  [Select ○] [Select ○]  [Select ○]   [Select ○]                     │
│                                                                      │
│                                     [Cancel]  [Confirm]              │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.3 Confirmed Selection — Grid Visualization

Rendered as a single `<svg>` with `viewBox` for responsive scaling. No external libraries.

```
┌──────────────────────────────────────────────────────────────────┐
│  SELECTED: 16:9 Cabinet System                                   │
│                                                                  │
│            5                             14                      │
│          Columns                        Rows                     │
│                                                                  │
│            ◄── 118.11 Inches (5 columns) ──►                     │
│         ┌──────┬──────┬──────┬──────┬──────┐                     │
│    ▲    │      │      │      │      │    ╱ │                     │
│    │    ├──────┼──────┼──────┼──────┼─╱──-─┤                     │
│    │    ├──────┼──────┼──────┼────╱─┼──────┤                     │
│    │    ├──────┼──────┼──────┼╱─────┼──────┤                     │
│    │    ├──────┼──────┼──╱───┼──────┼──────┤                     │
│  186.02 ├──────┼──────╱──────┼──────┼──────┤ 220.35              │
│  Inches ├──────┼──╱───┼──────┼──────┼──────┤ Inches              │
│ (14 rows)├─────╱──────┼──────┼──────┼──────┤                     │
│    │    ├╱─────┼──────┼──────┼──────┼──────┤                     │
│    │    ├──────┼──────┼──────┼──────┼──────┤                     │
│    │    ├──────┼──────┼──────┼──────┼──────┤                     │
│    │    ├──────┼──────┼──────┼──────┼──────┤                     │
│    │    ├──────┼──────┼──────┼──────┼──────┤                     │
│    ▼    └──────┴──────┴──────┴──────┴──────┘                     │
│                                                                  │
│  Total cabinets: 70                                              │
│  AR: 16:9 (1.78)                                                 │
│                                                                  │
│  [Receive Quote]                                                 │
└──────────────────────────────────────────────────────────────────┘
```

**SVG implementation details:**

| Element | SVG approach |
|---------|-------------|
| Grid cells | `<rect>` elements in nested loops, stroke for borders, light fill |
| Width arrow | `<line>` above grid with `marker-start` + `marker-end` arrowheads |
| Height arrow | `<line>` left of grid with arrowhead markers |
| Diagonal line | `<line>` from bottom-left to top-right corner of grid |
| Arrowheads | Single `<marker id="arrow">` in `<defs>`, reused by all arrow lines |
| Width label | `<text>` centered above grid: "{value} {unit} ({n} columns)" |
| Height label | `<text>` left of grid, `transform="rotate(-90)"`: "{value} {unit} ({n} rows)" |
| Diagonal label | `<text>` at line midpoint, `transform="rotate({angle})"` where angle = `atan2(gridHeight, gridWidth)` in degrees |
| Responsive | `viewBox="0 0 {w} {h}"` with padding for arrows/labels, `width="100%"` on the `<svg>` |
```

### 5.4 History

```
┌──────────────────────────────────────────────────────────────┐
│  HISTORY                                                     │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ 7×7 16:9 — 165.35" × 93.01" — 2m ago           [×] │     │
│  │ 11×6 1:1 — 216.54" × 118.11" — 5m ago          [×] │     │
│  └─────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### 5.5 Responsive Behavior

| Breakpoint | Width | Behavior |
|-----------|-------|----------|
| Desktop | ≥1024px | Full 2-column input grid, 4-column results table, SVG grid at full width |
| Tablet | 768–1023px | 2-column input grid preserved, results table horizontally scrollable with scroll hint shadow |
| Mobile | <768px | Input fields stack to single column, results table horizontally scrollable, SVG grid scales down via viewBox |

- Input section: 2-column grid → single column below 768px.
- Results table: always rendered as 4 columns. On screens too narrow to fit, `overflow-x: auto` with a subtle gradient shadow on the right edge to indicate scrollability.
- SVG visualization: naturally responsive via `viewBox` + `width="100%"`. No breakpoint logic needed.
- Contact modal: max-width 480px, centered. On mobile it fills the screen width with padding.

---

## 5A. Visual Design Specifications

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#FFFFFF` | Page background |
| `--bg-secondary` | `#F5F5F5` | Info banner, "What to know" box, table row alternation |
| `--bg-disabled` | `#E5E5E5` | Disabled input fields |
| `--text-primary` | `#1A1A1A` | Headings, grid size labels (7x7), primary text |
| `--text-secondary` | `#6B7280` | Subtitles, entry values, helper text |
| `--border` | `#D1D5DB` | Input borders, table dividers |
| `--accent-gold` | `#D4A843` | "Help me choose" button background |
| `--lock-open` | `#5B9A8B` | Unlocked padlock icon (teal/muted) |
| `--lock-closed` | `#1A1A1A` | Locked padlock icon (dark) |
| `--nearest-badge` | `#F5F5F5` | "Nearest Size" badge background |
| `--confirm-btn` | `#1A1A1A` | Confirm button background |
| `--error` | `#DC2626` | Validation error text |
| `--success` | `#16A34A` | Toast success background |

Colors are derived from the reference app screenshots. Implemented as Tailwind classes (e.g. `bg-gray-100`, `text-gray-500`) — no CSS custom properties needed unless we want theme support later.

### Spacing

Tailwind's default 4px scale. Key values:

| Element | Spacing |
|---------|---------|
| Page padding | `px-6 py-8` (24px / 32px) |
| Section gap (input → results → grid) | `space-y-8` (32px) |
| Input grid gap | `gap-6` (24px) |
| Results table cell padding | `px-4 py-3` (16px / 12px) |
| Card/box border radius | `rounded-lg` (8px) |
| Input border radius | `rounded-md` (6px) |
| Button border radius | `rounded-md` (6px) |

### Borders & Shadows

- Input fields: `border border-gray-300`
- Info banner / "What to know" box: `border border-gray-200 bg-gray-50`
- Results table: `divide-y divide-gray-200` for rows
- Modal overlay: `bg-black/50` backdrop
- No drop shadows except modal (`shadow-xl`)

---

## 5B. Typography

Using system font stack via Tailwind's `font-sans` (no custom fonts to load).

| Element | Tailwind Classes | Example |
|---------|-----------------|---------|
| Page title "Size" | `text-sm text-gray-400 uppercase tracking-wide` | Size |
| Main heading | `text-2xl font-bold text-gray-900` | Enter at least 2 parameters. |
| Section heading | `text-xl font-semibold text-gray-900` | Choose a Size |
| Grid size (results column header) | `text-4xl font-black text-gray-900` | **7x7** |
| Cabinet system label | `text-sm text-gray-500` | 16:9 Cabinet System |
| Input field label | `text-sm font-medium text-gray-700` | Height. (Inches) |
| Input field value | `text-base text-gray-900` | 100.00 |
| Table cell (achieved value) | `text-base font-medium text-gray-900` | 93.01 Inches |
| Table cell (entry value) | `text-sm text-gray-400` | 100 Inches |
| "What to know" heading | `text-sm font-semibold text-gray-900` | What to know |
| "What to know" body | `text-sm text-gray-600` | When you enter... |
| Button text | `text-sm font-medium` | apply / Select / Confirm |
| Row/column counter number | `text-5xl font-black text-gray-900` | **5** |
| Row/column counter label | `text-sm text-gray-500` | Columns |

---

## 5C. Animation Guidelines

Minimal animation — the spec prioritizes logic and accuracy over polish. Only use transitions where they communicate state changes.

| Element | Animation | Implementation |
|---------|-----------|---------------|
| Lock icon toggle | 150ms opacity crossfade between open/closed icon | `transition-opacity duration-150` |
| Disabled field | 200ms fade to greyed state | `transition-colors duration-200` |
| Results section appearing | None — instant render on 2nd lock | No animation |
| Modal open | 200ms fade-in backdrop + 200ms scale-up dialog | Headless UI `Transition` component |
| Modal close | 150ms fade-out | Headless UI `Transition` |
| Toast | Slide in from top, auto-dismiss after 3s with fade-out | `transition-all duration-300` + `setTimeout` |
| Radio select | Instant fill — no animation | Default browser/Tailwind behavior |
| SVG grid | None — renders instantly on confirm | No animation |
| Unit switch value update | None — instant re-render | No animation |

**What we explicitly do NOT animate:**
- Results table appearing (instant, no slide/fade)
- SVG grid drawing (no progressive reveal)
- Number value changes (no counting animations)

---

### 6.1 Cabinet Types

| Type | Width (mm) | Height (mm) | Native AR |
|------|-----------|-------------|-----------|
| 16:9 | 600       | 337.5       | 1.7778    |
| 1:1  | 500       | 500         | 1.0       |

### 6.2 Unit Conversion

All internal math in mm. Convert at input/output boundaries only.

```
MM_PER_UNIT = { mm: 1, m: 1000, ft: 304.8, in: 25.4 }

toMM(value, unit)  = value × MM_PER_UNIT[unit]
fromMM(mm, unit)   = mm / MM_PER_UNIT[unit]
```

### 6.3 Aspect Ratio Presets

| Label | Decimal |
|-------|---------|
| 16:9  | 1.7778  |
| 16:10 | 1.6     |
| 4:3   | 1.3333  |
| 1:1   | 1.0     |
| 21:9  | 2.3333  |
| 32:9  | 3.5556  |

---

## 7. Persistence — localStorage

### 7.1 What We Save

When the user clicks **Select** on a result card, we persist the full configuration.

```ts
type SavedSelection = {
  id: string                // crypto.randomUUID()
  cabinetType: '16:9' | '1:1'
  rows: number
  cols: number
  widthMM: number
  heightMM: number
  diagonalMM: number
  aspectRatio: number
  totalCabinets: number
  inputParams: {
    combo: string           // e.g. 'ar_height', 'width_diagonal'
    values: Record<string, number>  // raw values in mm
    unit: string            // display unit at time of save
  }
  savedAt: number           // Date.now()
}
```

### 7.2 Storage

```
Key:   'videowall_selections'
Value: JSON.stringify(SavedSelection[])    // newest first
```

### 7.3 Operations

- **Save**: prepend to array on Select
- **List**: read and display in History section
- **Delete**: remove by id (× button on history row)
- **Reload**: click a history item to re-display its grid visualization

In production, swap localStorage for API calls to persist server-side.

---

## 8. Calculation Logic

### 8.1 Core Principle

Every configuration is **(rows, cols)** — two integers. All outputs derive from these:

```
width    = cols × cab_w
height   = rows × cab_h
diagonal = sqrt(width² + height²)
AR       = width / height
total    = rows × cols
```

### 8.2 Parameter Combinations

Six valid combos in two categories.

#### Category A: Aspect Ratio + One Dimension

The dimension gives floor/ceil for one axis. AR determines the other via `round()`.

**A1. AR + Height**

```
rows_exact = target_h / cab_h
rows_lower = floor(rows_exact)
rows_upper = ceil(rows_exact)
if rows_lower == rows_upper → rows_upper = rows_lower + 1

For each row count:
  actual_h  = rows × cab_h
  desired_w = actual_h × target_AR
  cols      = max(round(desired_w / cab_w), 1)
```

**A2. AR + Width** — mirror of A1, width determines cols, AR determines rows.

```
cols_exact = target_w / cab_w
cols_lower = floor(cols_exact)
cols_upper = ceil(cols_exact)
if cols_lower == cols_upper → cols_upper = cols_lower + 1

For each col count:
  actual_w  = cols × cab_w
  desired_h = actual_w / target_AR
  rows      = max(round(desired_h / cab_h), 1)
```

**A3. AR + Diagonal** — derive height, then A1.

```
target_h = target_diagonal / sqrt(1 + target_AR²)
→ proceed as A1
```

#### Category B: Two Physical Dimensions

Both axes independent. Floor/ceil each separately.

**B1. Height + Width**

```
rows_lower = floor(target_h / cab_h)
rows_upper = ceil(target_h / cab_h)
cols_lower = floor(target_w / cab_w)
cols_upper = ceil(target_w / cab_w)
if rows_lower == rows_upper → rows_upper++
if cols_lower == cols_upper → cols_upper++

Lower = (rows_lower, cols_lower)    // both dims ≤ target
Upper = (rows_upper, cols_upper)    // both dims ≥ target
```

**B2. Height + Diagonal** — derive width, then B1.

```
target_w = sqrt(diagonal² - height²)
→ proceed as B1
```

**B3. Width + Diagonal** — derive height, then B1.

```
target_h = sqrt(diagonal² - width²)
→ proceed as B1
```

### 8.3 Exact Match Handling

If `floor(exact) == ceil(exact)`:
- Exact match → **lower** config
- Exact + 1 → **upper** config

For Category B, each axis checked independently.

### 8.4 Execution Flow

1. Convert inputs to mm.
2. Identify combo (A1–A3, B1–B3).
3. For A3/B2/B3: derive missing dimension via geometry.
4. Compute (rows, cols) for lower and upper.
5. Compute all outputs for each config.
6. **Repeat for both cabinet types** → 4 results.
7. Determine "Nearest Size" (see 8.5).
8. Convert outputs to display unit.

### 8.5 Nearest Size Logic

Of the 4 results, one is flagged as the "Nearest Size" — the overall closest match to the user's input.

**Scoring**: For each of the 4 configs, compute a normalized distance based on the two locked parameters:

```
For each locked dimension (height, width, or diagonal):
  error = abs(achieved_value - target_value) / target_value

For aspect ratio (if locked):
  error = abs(achieved_AR - target_AR) / target_AR

score = sum of all errors
```

The config with the **lowest score** gets the "Nearest Size" badge.

**Example** — AR 16:9 + Height 100" (2540mm):

| Config | Height error | AR error | Score |
|--------|-------------|----------|-------|
| 7×7 (16:9) | \|2362.5-2540\|/2540 = 0.070 | \|1.778-1.778\|/1.778 = 0.000 | **0.070** |
| 8×8 (16:9) | \|2700-2540\|/2540 = 0.063 | 0.000 | **0.063** |
| 9×5 (1:1) | \|2500-2540\|/2540 = 0.016 | \|1.8-1.778\|/1.778 = 0.012 | **0.028** |
| 11×6 (1:1) | \|3000-2540\|/2540 = 0.181 | \|1.833-1.778\|/1.778 = 0.031 | **0.212** |

Winner: **9×5 (1:1)** with score 0.028 — gets "Nearest Size" badge. This matches the reference app screenshot where 9×5 has the badge.

---

## 9. Verified Test Cases

These are derived from the reference application (Loom video) and must pass.

### Test 1: AR 16:9 + Height 100" — 16:9 cabinet

| | Lower | Upper |
|---|-------|-------|
| Grid | 7 × 7 | 8 × 8 |
| Total | 49 | 64 |
| Height | 93.01" | 106.30" |
| AR | 1.78 | 1.78 |

### Test 2: AR 16:9 + Height 100" — 1:1 cabinet

| | Lower | Upper |
|---|-------|-------|
| Grid | 9 × 5 | 11 × 6 |
| Height | 98.43" | 118.11" |
| AR | 1.80 | 1.83 |

### Test 3: Width 100" + Diagonal 200" — 16:9 cabinet

| | Lower | Upper |
|---|-------|-------|
| Grid | 4 × 13 | 5 × 14 |
| Width | 94.49" | 118.11" |
| Diagonal | 196.89" | ~220" |

---

## 10. Edge Cases

| Case | Handling |
|------|----------|
| Floor gives 0 rows or cols | Clamp to 1 |
| Diagonal < Width or Height | Validation error — impossible geometry |
| AR mismatch (e.g. 16:9 on 1:1 cabs) | `round()` picks closest cols, show achieved AR |
| Very large inputs | No cap — compute normally |
| Very small inputs | Clamp to 1×1 minimum |
| Unit switch after results | Re-display via `fromMM`, no recalculation |
| Decimal precision | Internal float64, display 2 decimal places |
| Empty/non-numeric input | Apply button stays disabled |

---

## 11. Architecture & File Structure

### 11.1 Design Principles

**Modular architecture** — every layer can be changed independently:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Config      │────▶│  Calc Engine │────▶│  UI Components  │
│  (constants) │     │  (pure TS)   │     │  (React)        │
└─────────────┘     └──────┬───────┘     └────────┬────────┘
                           │                      │
                    ┌──────▼───────┐     ┌────────▼────────┐
                    │   Reducer    │     │    Storage       │
                    │  (state mgmt)│     │  (persistence)   │
                    └──────────────┘     └─────────────────┘
```

| Principle | How It's Enforced |
|-----------|------------------|
| **Config separate from code** | All cabinet dimensions, AR presets, and unit multipliers live in `config.ts` as typed constants. To add a new cabinet type or AR preset, edit one file — no calc logic changes. |
| **Calc engine has zero dependencies** | `calculate.ts`, `units.ts`, `nearest.ts` are pure TypeScript functions. No React imports, no DOM, no side effects. They can be extracted to a shared package or run server-side with zero changes. |
| **State logic separate from UI** | `reducer.ts` is a pure function `(state, action) → state`. Testable without rendering any components. Components only call `dispatch()`. |
| **Storage is a swappable interface** | `storage.ts` exports `saveSelection()`, `getSelections()`, `deleteSelection()`, `saveQuote()`, `getQuotes()`. Internally uses localStorage. To migrate to a real DB: replace the function bodies, keep the signatures. No component changes. |
| **Components are presentation-only** | Each component receives data + dispatch. No component fetches data, computes results, or calls localStorage directly. |

### 11.2 Configuration Layer

All domain constants in a single file:

```ts
// src/lib/config.ts

export const CABINETS = {
  '16:9': { width: 600, height: 337.5 },
  '1:1':  { width: 500, height: 500 },
} as const

export const ASPECT_RATIOS = [
  { label: '16:9',  value: 16 / 9 },
  { label: '16:10', value: 16 / 10 },
  { label: '4:3',   value: 4 / 3 },
  { label: '1:1',   value: 1 },
  { label: '21:9',  value: 21 / 9 },
  { label: '32:9',  value: 32 / 9 },
] as const

export const MM_PER_UNIT = {
  mm: 1,
  m:  1000,
  ft: 304.8,
  in: 25.4,
} as const
```

**To customize**: add a new cabinet type → add one entry to `CABINETS` → the calc engine and results table automatically pick it up (they iterate over `Object.keys(CABINETS)`). Same for AR presets and units.

### 11.3 Production Migration Path

| Current (Demo) | Production Swap | What Changes |
|----------------|----------------|-------------|
| `config.ts` constants | API endpoint returning cabinet types + AR presets | Add a fetch call in App init, feed response into reducer. Config becomes dynamic. |
| `localStorage` in `storage.ts` | REST API / database calls | Replace function bodies in `storage.ts`. Signatures stay the same. Components unchanged. |
| Quote form → localStorage | POST to `/api/quotes` → CRM webhook | Replace `saveQuote()` body. Add error handling for network failures. |
| Client-side calc | Could move server-side | `calculate.ts` is pure TS with no browser APIs. Import it in a Node/Edge function as-is. |
| Vite SPA | Next.js or similar | Components and lib/ folder port directly. Add routing if needed. Reducer stays the same. |

Nothing in the architecture assumes "demo only." Every seam is designed so the production version replaces implementations, not interfaces.

### 11.4 File Structure

```
src/
  lib/
    config.ts           — cabinet types, AR presets, unit multipliers (constants only)
    types.ts            — shared types (Cabinet, Config, SavedSelection, Unit, Param, AppState, Action)
    calculate.ts        — core calculation engine (pure functions, no React)
    calculate.test.ts   — Vitest unit tests for all 6 combos + edge cases
    units.ts            — toMM, fromMM (imports multipliers from config.ts)
    units.test.ts       — Vitest unit tests for conversion accuracy
    nearest.ts          — nearest size scoring logic
    storage.ts          — localStorage wrapper (save, list, delete selections + quotes)
    reducer.ts          — useReducer state machine (AppState + Action → AppState)
  components/
    ParameterForm.tsx   — lock-based inputs, unit dropdown, Apply buttons per field
    ResultsTable.tsx    — 4-column comparison table, Nearest Size badge, Select radios, Cancel/Confirm
    WallGrid.tsx        — pure SVG grid visualization with dimension arrows + diagonal
    History.tsx         — saved selections list with delete + reload
    ContactModal.tsx    — Headless UI Dialog for "Help me choose" + "Receive Quote"
    Toast.tsx           — auto-dismiss confirmation banner
    App.tsx             — root layout, useReducer, dispatch wiring
  main.tsx
  index.css             — Tailwind directives
```

---

## 12. Bonus Feature — Contact / Quote Modal

### 12.1 Triggers

The same contact modal is opened from **two** entry points:

1. **"Help me choose"** button (gold/accent with (?) icon) — visible in the top-right of the "Choose a Size" results header. Available as soon as results are shown, before the user selects anything.
2. **"Receive Quote"** button — visible below the grid visualization after the user confirms a selection.

Both open the same modal. If triggered from "Receive Quote", the modal is linked to the confirmed selection. If triggered from "Help me choose", no selection is attached.

### 12.2 Modal Flow

1. User clicks either trigger button.
2. A modal overlay opens with a short form:

```
┌─────────────────────────────────────┐
│  REQUEST A QUOTE                    │
│                                     │
│  Name *                             │
│  [________________________]         │
│                                     │
│  Preferred contact method:          │
│  (●) Email  ( ) Phone              │
│                                     │
│  Email *                            │
│  [________________________]         │
│                                     │
│  [Submit]           [Cancel]        │
└─────────────────────────────────────┘
```

3. **Name** is always required.
4. User picks their preferred contact method — **Email** or **Phone**.
5. Based on selection, only the relevant field appears:
   - Email selected → show email input (validated: basic `x@y.z` format)
   - Phone selected → show phone input (validated: non-empty, digits/dashes/spaces/+)
6. The non-selected contact field is **hidden** (not disabled — removed from view).
7. User clicks **Submit**.

### 12.3 On Submit

- Validate required fields (name + the active contact field).
- Show inline validation errors if invalid.
- On success: close modal, show a brief toast/confirmation: **"Quote request received!"**
- Save the quote request to localStorage alongside the selected configuration:

```ts
type QuoteRequest = {
  id: string
  selectionId: string | null  // links to SavedSelection, null if from "Help me choose"
  name: string
  contactMethod: 'email' | 'phone'
  contactValue: string        // email address or phone number
  submittedAt: number
}
```

```
localStorage key: 'videowall_quotes'
```

### 12.4 Production Note

In production this would POST to an API endpoint that triggers an email notification to the sales team and stores the lead in a CRM. For this demo, localStorage capture demonstrates the intent.

### 12.5 Files

`ContactModal.tsx` and `storage.ts` (saveQuote/getQuotes) — already listed in section 11 file structure.

---

## 13. Success Metrics (MVP)

The assignment will be evaluated on these criteria (from the spec). Each maps to a concrete deliverable:

| Criterion | How We Meet It | Verification |
|-----------|---------------|-------------|
| **Mathematical correctness** | All 6 parameter combos produce correct (rows, cols). Nearest size scoring works. | Vitest unit tests pass for all 3 verified test cases + edge cases |
| **Logical thinking** | Clean separation: pure calc engine → reducer → components. Each parameter combo handled by documented algorithm. | Code review of `calculate.ts` and `reducer.ts` |
| **Use of AI to accelerate** | Documented in Loom recording | Deliverable #3 |
| **Clean UI behavior** | Lock-based input matches reference app. 4-column comparison table. SVG grid with arrows. | Visual comparison to reference screenshots |
| **Edge case handling** | All cases in section 10 handled gracefully (clamping, validation errors, impossible geometry) | Manual testing + unit tests |
| **Code structure** | Typed file structure per section 11. Logic separated from UI. No god-components. | Code review |
| **Accuracy of calculations** | Results match reference app values to 2 decimal places | Test cases in section 9 |

**MVP definition**: all of the above working on the hosted Vercel URL. History, quote modal, and grid arrows are included but not blockers if time runs short — core calc + results table + basic grid is the minimum.

---

## 14. Development Phases

### Phase 1 — Foundation (est. ~30% of effort)
- [ ] Scaffold Vite + React + TS + Tailwind project
- [ ] Define all types in `types.ts`
- [ ] Implement `units.ts` (toMM, fromMM) + unit tests
- [ ] Implement `calculate.ts` (all 6 combos) + unit tests
- [ ] Implement `nearest.ts` (scoring logic)
- [ ] Verify all 3 test cases pass

### Phase 2 — State & Input UI (~25%)
- [ ] Implement `reducer.ts` (AppState, all Actions)
- [ ] Build `ParameterForm.tsx` — 4 fields, lock/unlock, unit dropdown
- [ ] Wire reducer to form — lock transitions, disable logic
- [ ] Unit switching updates labels and values

### Phase 3 — Results & Selection (~25%)
- [ ] Build `ResultsTable.tsx` — 4-column comparison table
- [ ] "Nearest Size" badge rendering
- [ ] Radio select + Cancel/Confirm flow
- [ ] Row/column counter display
- [ ] Build `WallGrid.tsx` — SVG grid + arrows + diagonal + labels

### Phase 4 — Persistence & Bonus (~15%)
- [ ] Implement `storage.ts` — save/list/delete selections + quotes
- [ ] Build `History.tsx` — list with delete + reload
- [ ] Build `ContactModal.tsx` — "Help me choose" + "Receive Quote"
- [ ] Build `Toast.tsx` — auto-dismiss confirmation

### Phase 5 — Polish & Deploy (~5%)
- [ ] Responsive behavior (mobile stack, table scroll)
- [ ] Edge case manual testing sweep
- [ ] Deploy to Vercel
- [ ] Record Loom walkthroughs

---

## 15. Constraints & Considerations

### Time
- Time-boxed assignment. Prioritize core calc + results table over polish.

### Technical
- No backend — all client-side. localStorage has ~5MB cap (irrelevant for our data sizes).
- `crypto.randomUUID()` requires HTTPS or localhost — works on Vercel and dev server, not file:// protocol.
- SVG grid rendering may slow on extremely large configs (e.g., 200×200 cabinets = 40,000 `<rect>` elements). Cap grid rendering at a reasonable maximum (e.g., 50×50 visual cells) with a note "showing simplified grid" if exceeded.

### Browser Support
- Modern evergreen browsers (Chrome, Firefox, Safari, Edge). No IE11.
- `viewBox` SVG, `crypto.randomUUID()`, `structuredClone` all require modern browsers.

### Accessibility
- Headless UI Dialog provides focus trap + aria for the modal.
- Lock icons should have `aria-label` ("Lock parameter" / "Unlock parameter").
- Radio buttons in results table use native `<input type="radio">` for keyboard nav.
- Color contrast: all text meets WCAG AA against its background (verified by Tailwind defaults).
- Beyond these basics, accessibility is not a primary evaluation criterion for this assignment.

### Known Limitations
- localStorage is per-browser, per-device. No cross-device history sync.
- Quote form data is stored locally only — no actual email/notification sent.
- Aspect ratio presets are assumed (not confirmed by the client's screenshot).

---

## 16. Assumptions

1. The spec example "8 columns × 7 rows, height 106.3 inches" is a typo — correct is **8 × 8** (verified by math).
2. Aspect ratio presets are the 6 listed in 6.3. The spec mentioned sharing a screenshot of presets but it was not included — we use standard video ratios.
3. "Lower" means all achieved dimensions ≤ target. "Upper" means all ≥ target.
4. Results show for **both** cabinet types simultaneously (4 columns total), per the Loom at 1:39.
5. Grid visualization is pure SVG with dimension arrows (width, height, diagonal) matching the reference app.
6. No authentication or multi-user support. localStorage is per-browser.

---

## 17. Future Enhancements (Post-MVP)

These are explicitly out of scope for this submission but demonstrate production thinking:

| Enhancement | Description |
|------------|-------------|
| **Custom aspect ratio** | Spec says to ignore for now. Add a numeric input alongside the preset dropdown. |
| **Additional cabinet types** | Support more than 2 cabinet sizes. Make cabinet dimensions configurable / fetched from an API. |
| **Server-side persistence** | Replace localStorage with a database (Supabase/Turso). User accounts, cross-device history. |
| **Quote form → CRM integration** | POST to an API that creates a lead in HubSpot/Salesforce and sends email notification to sales. |
| **PDF export** | Generate a PDF summary of the selected configuration with the SVG grid, dimensions, and cabinet count. |
| **Comparison mode** | Allow selecting 2 configs side by side (e.g., lower 16:9 vs lower 1:1) with a diff view. |
| **Pricing calculator** | Add per-cabinet cost and show total price for each configuration. |
| **3D preview** | Replace SVG grid with a basic Three.js/WebGL render showing cabinets in perspective. |
| **Internationalization** | Multi-language support for labels and formatting (comma vs period for decimals). |
| **Analytics** | Track which configs users select most, which combos are most popular, drop-off in the funnel. |
