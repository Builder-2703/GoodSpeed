# Video Wall Size Calculator — Calculation Logic

## Internal Units

All calculations are performed in **millimeters (mm)**. User input is converted to mm on entry, and results are converted back to the display unit on output.

```
MM_PER_UNIT = {
  mm: 1,
  m:  1000,
  ft: 304.8,
  in: 25.4,
}

toMM(value, unit)   = value * MM_PER_UNIT[unit]
fromMM(mm, unit)    = mm / MM_PER_UNIT[unit]
```

When the user switches the unit toggle, no recalculation is needed — we re-display stored mm values through `fromMM`.

---

## Cabinet Types

| Type | Width (mm) | Height (mm) | Native AR |
|------|-----------|-------------|-----------|
| 16:9 | 600       | 337.5       | 1.7778    |
| 1:1  | 500       | 500         | 1.0       |

Shorthand: `cab_w` = cabinet width, `cab_h` = cabinet height.

---

## Core Principle

Every video wall configuration is defined by two integers: **(rows, cols)**.

All output dimensions are derived from these:

```
width    = cols × cab_w
height   = rows × cab_h
diagonal = sqrt(width² + height²)
AR       = width / height
total    = rows × cols
```

The entire problem reduces to: **given two user constraints, find the best integer (rows, cols) pair, then return the closest lower and closest upper configuration.**

---

## Parameter Combinations

The user selects exactly **two** of four parameters: Aspect Ratio, Height, Width, Diagonal.

This gives **six** valid combinations, grouped into two categories.

### Category A: Aspect Ratio + One Dimension

The dimension determines one axis (floor/ceil), and the aspect ratio determines the other axis via `round()`.

#### A1. Aspect Ratio + Height

```
rows_exact = target_h / cab_h

rows_lower = floor(rows_exact)
rows_upper = ceil(rows_exact)
if rows_lower == rows_upper → rows_upper = rows_lower + 1

For each row count:
  actual_h  = rows × cab_h
  desired_w = actual_h × target_AR
  cols      = round(desired_w / cab_w)
  cols      = max(cols, 1)
```

**Lower config**: (rows_lower, cols_for_lower)
**Upper config**: (rows_upper, cols_for_upper)

**Verification** — 16:9 cab, AR=16:9, H=100":
- 100" = 2540mm, rows_exact = 2540 / 337.5 = 7.526
- rows=7: actual_h=2362.5, desired_w=2362.5×1.778=4200, cols=round(4200/600)=7 → **7×7** ✓
- rows=8: actual_h=2700, desired_w=2700×1.778=4800, cols=round(4800/600)=8 → **8×8** ✓

**Verification** — 1:1 cab, AR=16:9, H=100":
- 100" = 2540mm, rows_exact = 2540 / 500 = 5.08
- rows=5: actual_h=2500, desired_w=2500×1.778=4444, cols=round(4444/500)=9 → **9×5, AR=1.8** ✓
- rows=6: actual_h=3000, desired_w=3000×1.778=5333, cols=round(5333/500)=11 → **11×6, AR=1.833**

#### A2. Aspect Ratio + Width

Mirror of A1 — width determines cols, AR determines rows.

```
cols_exact = target_w / cab_w

cols_lower = floor(cols_exact)
cols_upper = ceil(cols_exact)
if cols_lower == cols_upper → cols_upper = cols_lower + 1

For each col count:
  actual_w  = cols × cab_w
  desired_h = actual_w / target_AR
  rows      = round(desired_h / cab_h)
  rows      = max(rows, 1)
```

#### A3. Aspect Ratio + Diagonal

Derive target height from geometry, then apply A1 logic.

```
target_h = target_diagonal / sqrt(1 + target_AR²)
→ proceed as A1 (Aspect Ratio + Height)
```

Derivation:
- AR = W / H → W = AR × H
- D² = W² + H² = (AR × H)² + H² = H²(AR² + 1)
- H = D / sqrt(AR² + 1)

---

### Category B: Two Physical Dimensions

Both axes are determined independently. Floor/ceil each separately.

#### B1. Height + Width

```
rows_exact = target_h / cab_h
cols_exact = target_w / cab_w

rows_lower = floor(rows_exact),  rows_upper = ceil(rows_exact)
cols_lower = floor(cols_exact),  cols_upper = ceil(cols_exact)

if rows_lower == rows_upper → rows_upper = rows_lower + 1
if cols_lower == cols_upper → cols_upper = cols_lower + 1
```

**Lower config**: (rows_lower, cols_lower) — both dimensions ≤ target
**Upper config**: (rows_upper, cols_upper) — both dimensions ≥ target

#### B2. Height + Diagonal

Derive width from geometry, then apply B1 logic.

```
target_w = sqrt(target_diagonal² - target_h²)
→ proceed as B1 (Height + Width)
```

Must validate: `target_diagonal > target_h`, otherwise error (impossible geometry).

#### B3. Width + Diagonal

Derive height from geometry, then apply B1 logic.

```
target_h = sqrt(target_diagonal² - target_w²)
→ proceed as B1 (Height + Width)
```

Must validate: `target_diagonal > target_w`, otherwise error (impossible geometry).

**Verification** — 16:9 cab, W=100", D=200":
- target_h = sqrt(5080² - 2540²) = sqrt(19354800) = 4399.18mm
- rows = floor(4399.18 / 337.5) = 13, cols = floor(2540 / 600) = 4
- Lower 4×13: W=2400mm=94.49", H=4387.5mm, D=sqrt(2400²+4387.5²)=5001mm=196.89" ✓

---

## Exact Match Handling

If a computed `_exact` value is already an integer (floor == ceil):

- The exact match becomes the **lower** configuration.
- The **upper** configuration uses that value **+ 1**.

This applies per-axis. For Category B, each axis is checked independently.

---

## Execution Flow

For each calculation request:

1. Convert user inputs to mm.
2. Identify which combination (A1–A3, B1–B3).
3. For B2/B3: derive the missing dimension via geometry.
4. For A3: derive target height from diagonal + AR.
5. Compute (rows, cols) for lower and upper.
6. For each config, compute all outputs: width, height, diagonal, AR, total cabinets.
7. **Run steps 2–6 for both cabinet types** (16:9 and 1:1).
8. Return 4 configs total: lower/upper × 2 cabinet types.
9. Convert output values to display unit via `fromMM`.

---

## Edge Cases

| Case | Handling |
|------|----------|
| Floor gives 0 rows or 0 cols | Clamp to minimum of 1 |
| Diagonal < Width (or < Height) | Show validation error — impossible geometry |
| AR = 1:1 with 16:9 cabinet | Works fine — `round()` picks closest cols, achieved AR will differ from target |
| Very large inputs (e.g., 10000") | No hard cap — just compute. Could result in hundreds of rows/cols |
| Very small inputs (e.g., 1mm) | Clamp floors to 1 — minimum config is 1×1 |
| Unit switch after results shown | Re-display all values through `fromMM` with new unit — no recalculation |
| Decimal precision | Store in mm (float64). Display rounded to 2 decimal places |

---

## Aspect Ratio Presets

| Label | Decimal Value |
|-------|--------------|
| 16:9  | 1.7778       |
| 16:10 | 1.6          |
| 4:3   | 1.3333       |
| 1:1   | 1.0          |
| 21:9  | 2.3333       |
| 32:9  | 3.5556       |
