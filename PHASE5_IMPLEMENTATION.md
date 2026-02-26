# Phase 5 — Polish & Deploy: Implementation Plan

**Goal**: Make the app production-ready by fixing responsive behavior across all breakpoints, running an edge case manual testing sweep, deploying to Vercel, and recording Loom walkthroughs.

**Depends on (Phase 4 deliverables)**:
- `src/App.tsx` — root layout: `<div className="max-w-5xl mx-auto px-6 py-8 space-y-8">` wrapping `ParameterForm`, `ResultsTable`, confirmed section, `History`, `ContactModal`, `Toast`
- `src/components/ParameterForm.tsx` — 2-column grid via `grid grid-cols-1 md:grid-cols-2 gap-6` (already responsive)
- `src/components/ResultsTable.tsx` — `overflow-x-auto` wrapper with `min-w-[600px]` table and `md:hidden` scroll shadow gradient
- `src/components/WallGrid.tsx` — SVG with `viewBox` + `width="100%"` (already responsive via viewBox)
- `src/components/ContactModal.tsx` — `max-w-md` DialogPanel inside `fixed inset-0 flex items-center justify-center p-4`
- `src/components/History.tsx` — simple list, no breakpoint logic
- `src/components/Toast.tsx` — fixed `top-4 right-4` positioning

**PRD sections covered**: 5.5 (Responsive Behavior), 10 (Edge Cases), 13 (Success Metrics), 14 (Phase 5 checklist), 15 (Constraints — browser support, accessibility).

**No new dependencies needed.** All responsive work uses existing Tailwind 4 utility classes.

---

## Step 1: Audit Current Responsive Gaps

### What
Before writing code, document exactly which components break at which breakpoints. This step is research-only — no code changes.

### How
Test at three breakpoints using Chrome DevTools device toolbar:
- **Mobile**: 375px (iPhone SE)
- **Tablet**: 768px (iPad mini)
- **Desktop**: 1280px (default)

### Known Issues from PRD 5.5 vs Current Code

| Component | Current | PRD Spec | Gap |
|-----------|---------|----------|-----|
| `ParameterForm` | `grid-cols-1 md:grid-cols-2` | 2-col → 1-col below 768px | Already correct |
| `ResultsTable` | `overflow-x-auto` + `min-w-[600px]` + `md:hidden` shadow | Horizontal scroll + gradient hint | Already correct |
| `App` page padding | `px-6 py-8` (24px/32px at all widths) | PRD doesn't specify mobile-specific padding | Reduce to `px-4 py-6` on mobile for more breathing room |
| `ResultsTable` header | `flex items-start justify-between` (title + Help me choose) | Should wrap on narrow screens | "Help me choose" may overlap/wrap poorly on mobile |
| `ContactModal` | `max-w-md` + `p-4` outer | "On mobile it fills the screen width with padding" (PRD 5.5) | Already close — max-w-md (448px) + p-4 outer padding works |
| Row/Column counter | `gap-12` with `text-5xl` | Should scale down on mobile | Numbers may be too large on 375px screens |
| `History` rows | Fixed `px-4 py-3` | Should work on mobile | Text may truncate on very narrow screens — verify |
| `WallGrid` SVG | `viewBox` + `width="100%"` | "Naturally responsive via viewBox" (PRD 5.5) | Already correct — no changes needed |

### Validation
- [x] Tested all three breakpoints in Chrome DevTools
- [x] Gap analysis documented above is confirmed or updated
- [x] No layout-breaking issues missed

---

## Step 2: Responsive Page Padding — `src/App.tsx`

### File Modified
`src/App.tsx`

### What
Add mobile-specific padding to the main content wrapper so the app doesn't feel cramped on small screens.

### Why
PRD 5 specifies `px-6 py-8` (24px/32px) for desktop. On a 375px viewport, 24px side padding leaves only 327px for content. Reducing to `px-4` (16px) on mobile gives 343px — 16px more usable space.

### Change

**Line 69** — update the content wrapper class:

```diff
- <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
+ <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-8">
```

This uses Tailwind's mobile-first approach: `px-4 py-6` by default (mobile), `sm:px-6 sm:py-8` at 640px+.

### Validation
- [x] At 375px: content has 16px side padding
- [x] At 640px+: content has 24px side padding (unchanged from before)
- [x] No layout shift at the 640px breakpoint

---

## Step 3: Responsive Results Header — `src/components/ResultsTable.tsx`

### File Modified
`src/components/ResultsTable.tsx`

### What
Make the "Choose a Size" header and "Help me choose" button stack vertically on mobile instead of side-by-side.

### Why
At 375px, `flex items-start justify-between` puts the title and button on the same row. The title text wraps while the button gets squeezed. On mobile, stacking them vertically gives each full width.

### Change

**Line 87** — update the header wrapper:

```diff
- <div className="flex items-start justify-between">
-   <div>
+ <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
+   <div>
```

This stacks title + button vertically by default, then goes horizontal at `sm:` (640px+).

### Validation
- [x] At 375px: title above "Help me choose" button, both full width
- [x] At 640px+: title and button side-by-side (unchanged)
- [x] "Help me choose" button text not truncated at any width

---

## Step 4: Responsive Row/Column Counter — `src/App.tsx`

### File Modified
`src/App.tsx`

### What
Scale down the row/column counter numbers on mobile screens.

### Why
`text-5xl` (3rem = 48px) with `gap-12` (3rem) is designed for desktop. On a 375px viewport the numbers still fit but look disproportionately large relative to content. Using `text-4xl sm:text-5xl` and tighter gap on mobile creates better visual balance.

### Change

**Lines 87–96** — update the counter layout:

```diff
- <div className="flex items-center justify-center gap-12">
+ <div className="flex items-center justify-center gap-8 sm:gap-12">
    <div className="text-center">
-     <p className="text-5xl font-black text-gray-900">{state.confirmed.cols}</p>
+     <p className="text-4xl sm:text-5xl font-black text-gray-900">{state.confirmed.cols}</p>
      <p className="text-sm text-gray-500">Columns</p>
    </div>
    <div className="text-center">
-     <p className="text-5xl font-black text-gray-900">{state.confirmed.rows}</p>
+     <p className="text-4xl sm:text-5xl font-black text-gray-900">{state.confirmed.rows}</p>
      <p className="text-sm text-gray-500">Rows</p>
    </div>
  </div>
```

### Validation
- [x] At 375px: numbers are `text-4xl` (2.25rem) with `gap-8`, visually proportionate
- [x] At 640px+: numbers are `text-5xl` (3rem) with `gap-12` (unchanged)

---

## Step 5: Responsive Info Banner Unit Selector — `src/components/ParameterForm.tsx`

### File Modified
`src/components/ParameterForm.tsx`

### What
The info banner at the top of the form (`getInfoMessage()` + unit `<select>`) uses `flex items-center justify-between`. On very narrow screens the info text and dropdown compete for horizontal space. Ensure this wraps gracefully.

### Why
At 375px, the "Results calculated — choose a size below" text + "Inches" dropdown may overflow. Adding `flex-wrap` with `gap-2` lets them wrap to two lines if needed, while staying single-line on wider screens.

### Change

**Line 84** — update the info banner wrapper:

```diff
- <div className="flex items-center justify-between border border-gray-200 bg-gray-50 rounded-lg px-4 py-3">
+ <div className="flex items-center justify-between flex-wrap gap-2 border border-gray-200 bg-gray-50 rounded-lg px-4 py-3">
```

### Validation
- [x] At 375px: info text and unit dropdown wrap to two rows if needed
- [x] At 640px+: stays single row (unchanged)
- [x] No visual regression at 1280px

---

## Step 6: Edge Case Manual Testing Sweep

### What
Systematically test all edge cases listed in PRD Section 10 plus responsive-specific edge cases. This step is testing-only — fixes for any issues found are applied inline.

### Test Matrix

#### A. Calculation Edge Cases (PRD Section 10)

| # | Test | Input | Expected | Status |
|---|------|-------|----------|--------|
| A1 | Floor gives 0 rows/cols | AR=32:9 + Height=5in (127mm) | Clamp to min 1 row; no crash | [x] |
| A2 | Diagonal < Height | Lock Height=200in, Diagonal=100in | Error: "Diagonal must be larger than height" | [x] |
| A3 | Diagonal < Width | Lock Width=200in, Diagonal=100in | Error: "Diagonal must be larger than width" | [x] |
| A4 | AR mismatch on 1:1 cabs | AR=32:9 + Width=100in | 1:1 columns should use `round()`, show achieved AR ≠ 32:9 | [x] |
| A5 | Very large inputs | Width=10000in + Height=10000in | Compute normally; SVG shows "simplified view" note | [x] |
| A6 | Very small inputs | Width=1in + Height=1in | Clamp to 1×1 minimum | [x] |
| A7 | Unit switch after results | Lock AR+Height in inches, switch to mm | All displayed values recalculate via `fromMM()`; no results recalculation | [x] |
| A8 | Exact match (floor == ceil) | AR=16:9 + Height=93.01in (exact 7 rows for 16:9 cab) | Lower=7×7, Upper=8×8 (upper gets +1) | [x] |

#### B. UI Edge Cases

| # | Test | Action | Expected | Status |
|---|------|--------|----------|--------|
| B1 | Lock 3rd param attempt | Lock AR + Height, try to lock Width | Width field should be disabled; lock button disabled | [x] |
| B2 | Unlock restores fields | Lock AR + Height → Unlock AR | Width and Diagonal fields re-enable | [x] |
| B3 | Confirm without selection | Lock 2 params, do NOT select radio, click Confirm | Confirm button should be disabled (`state.selectedIndex === null`) | [x] |
| B4 | Cancel after selection | Select a radio, click Cancel | `selectedIndex` cleared, radio deselected | [x] |
| B5 | Double-confirm same config | Confirm 7×7, then confirm 7×7 again | Storage dedup prevents duplicate history entry | [x] |
| B6 | History at 10+ entries | Confirm 10+ different configs | All render; no performance issues; scroll works | [x] |
| B7 | Delete all history | Delete every history entry | History panel returns null (disappears); localStorage key still exists as `[]` | [x] |
| B8 | Non-numeric input | Type "abc" in Height, click Apply | `parseFloat` returns NaN; `handleApply` early-returns; no crash | [x] |
| B9 | Negative input | Type "-50" in Width, click Apply | `parsed <= 0` check in `handleApply`; no lock | [x] |
| B10 | Zero input | Type "0" in Diagonal, click Apply | `parsed <= 0` check in `handleApply`; no lock | [x] |

#### C. Responsive Edge Cases

| # | Test | Viewport | Action | Expected | Status |
|---|------|----------|--------|----------|--------|
| C1 | Mobile full flow | 375px | Lock AR+Height → select → confirm → Receive Quote → submit | Full flow works; no horizontal overflow on body | [x] |
| C2 | Table scroll | 375px | Results table visible | Table scrolls horizontally; gradient shadow visible on right | [x] |
| C3 | Modal on mobile | 375px | Open contact modal | Modal fills viewport width with p-4 padding; form fields usable | [x] |
| C4 | SVG on mobile | 375px | Confirm a selection | SVG grid scales down via viewBox; labels still readable | [x] |
| C5 | History on mobile | 375px | History with 3+ entries | Text truncates gracefully; delete button reachable | [x] |
| C6 | Toast on mobile | 375px | Submit a quote | Toast appears top-right; doesn't overlap critical UI | [x] |
| C7 | Orientation change | 375px → 667px | Rotate device | Layout reflowed; no stuck states | [x] |
| C8 | Tablet results | 768px | View results table | 4 columns visible without scroll (table is 600px min-width) | [x] |

### Validation
- [x] All A1–A8 edge cases pass
- [x] All B1–B10 UI edge cases pass
- [x] All C1–C8 responsive edge cases pass
- [x] Any issues found are fixed and noted in this checklist

---

## Step 7: Pre-Deploy Build Verification

### What
Run the full build pipeline and ensure zero errors/warnings before deployment.

### Commands

```bash
npx tsc --noEmit              # TypeScript strict check
npm run build                  # Full production build (tsc -b && vite build)
npm test                       # All tests pass (98 tests across 10 suites)
npm run lint                   # ESLint clean
```

### Build Output Checks
- [x] `dist/` folder generated with `index.html`, `assets/*.js`, `assets/*.css`
- [x] Total JS bundle < 200KB gzipped (React + Headless UI + app code) — 85KB gzipped
- [x] No console warnings in production build
- [ ] `npm run preview` serves the built app correctly on `localhost:4173`

### Validation
- [x] `npx tsc --noEmit` — zero errors
- [x] `npm run build` — zero errors, zero warnings
- [x] `npm test` — all 98 tests pass
- [ ] `npm run preview` — app loads and full flow works against production build

---

## Step 8: Deploy to Vercel

### What
Deploy the production build to Vercel via the CLI. The app is a static SPA (no server, no API routes) — Vite's default build output works directly.

### Prerequisites
- Vercel CLI installed: `npm i -g vercel` (or use `npx vercel`)
- Vercel account linked (one-time `vercel login`)

### Commands

```bash
# Option A: CLI deploy (fastest)
npx vercel --prod

# Option B: Git-based deploy (if repo is connected to Vercel)
git push origin main  # Vercel auto-deploys on push
```

### Vercel Configuration
No `vercel.json` needed for a Vite SPA. Vercel auto-detects the Vite framework:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

If Vercel doesn't auto-detect, create `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### SPA Routing
Since this is a single-page app with no routing (everything is on `/`), no rewrites are needed. If Vercel 404s on direct URL access, add this to `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Post-Deploy Checks
- [x] Production URL loads: https://goodspeed-six.vercel.app
- [x] Full flow works: lock 2 params → results → select → confirm → SVG grid → Receive Quote → toast
- [x] History persists across page reload on production
- [x] HTTPS enabled (required for `crypto.randomUUID()`)
- [x] No console errors in production (only browser default favicon.ico 404)
- [ ] Mobile responsive at production URL (test via Chrome DevTools)

### Validation
- [x] Vercel deployment successful
- [x] Production URL accessible and functional
- [x] All manual test steps pass on production URL

---

## Step 9: Record Loom Walkthroughs

### What
Record two Loom videos demonstrating the application and the development process.

### Video 1: Product Demo (~3-5 min)

Walk through the full user flow:

1. **Open app** — show empty state with 4 unlocked parameters
2. **Lock AR = 16:9** — select from dropdown, click lock icon
3. **Lock Height = 100 inches** — type value, click Apply
4. **Results table** — show 4 configs (7×7, 8×8, 9×5, 11×6), point out "Nearest Size" badge on 9×5
5. **Select 7×7** — click radio, click Confirm
6. **Confirmed view** — show column/row counter (7 Columns, 7 Rows), SVG grid with dimension arrows
7. **Receive Quote** — click button, fill form with email, submit → show toast
8. **History** — show saved entry, reload it, delete it
9. **Unit switching** — switch to Feet, show all values update
10. **"Help me choose"** — click from results table, show different modal title
11. **Responsive** — resize browser to mobile width, show table scrolling and stacked form

### Video 2: Technical Walkthrough (~3-5 min)

Walk through the architecture and code:

1. **File structure** — `src/lib/` (pure TS engine) vs `src/components/` (React UI)
2. **`config.ts`** — show cabinet dimensions, AR presets, unit multipliers
3. **`calculate.ts`** — explain one combo (AR + Height), show how floor/ceil produces 2 configs per cabinet type → 4 total
4. **`reducer.ts`** — show `LOCK_PARAM` action triggering calculation, `CONFIRM` setting state
5. **`storage.ts`** — localStorage wrapper with dedup logic
6. **`ResultsTable.tsx`** — 4-column layout, "Nearest Size" badge via `nearestIndex`
7. **`WallGrid.tsx`** — SVG `viewBox` for responsive scaling, marker-based arrowheads
8. **Testing** — show test count (98), run `npm test`, highlight `calculate.test.ts` coverage
9. **AI acceleration** — mention how Claude was used for architecture decisions, code generation, and debugging

### Validation
- [ ] Video 1 recorded and uploaded to Loom
- [ ] Video 2 recorded and uploaded to Loom
- [ ] Both videos are < 5 minutes
- [ ] Links added to README or submission

---

## Step 10: Final Phase 5 Verification

Run everything one last time:

```bash
npm run build        # zero errors, zero warnings
npm test             # all tests pass (Phase 1–4 + any new)
npx tsc --noEmit     # type check passes
```

### Checklist
- [ ] `src/App.tsx` — responsive page padding (`px-4 py-6 sm:px-6 sm:py-8`)
- [ ] `src/components/ResultsTable.tsx` — responsive header (`flex-col sm:flex-row`)
- [ ] `src/App.tsx` — responsive counter (`text-4xl sm:text-5xl`, `gap-8 sm:gap-12`)
- [ ] `src/components/ParameterForm.tsx` — info banner flex-wrap
- [ ] Edge case sweep — all A/B/C tests pass
- [ ] `npm run build` — clean production build
- [ ] `npm test` — all tests green (regression clean)
- [ ] Vercel deployment live and functional
- [ ] Loom videos recorded

### Files Modified in Phase 5

```
src/
  App.tsx               ← MODIFIED (responsive padding, responsive counter)
  components/
    ParameterForm.tsx   ← MODIFIED (info banner flex-wrap)
    ResultsTable.tsx    ← MODIFIED (responsive header)
```

**Total: 3 files modified, 0 new files.** Phase 5 is CSS-only responsive polish + deployment — no logic changes, no new components, no new state.

---

## Phase 5 Completion → Submission

Phase 5 delivers:
- Responsive polish at mobile (375px), tablet (768px), and desktop (1280px)
- Edge case manual testing sweep (calculation + UI + responsive)
- Production build verification
- Vercel deployment with live URL
- Loom walkthrough videos (product demo + technical)

**Submission artifacts**:
1. GitHub repo URL
2. Vercel production URL
3. Loom video links (product demo + technical walkthrough)
