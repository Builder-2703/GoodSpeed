# Phase 2 — State & Input UI: Implementation Plan

**Goal**: Build the state management layer (`reducer.ts`) and the lock-based parameter input form (`ParameterForm.tsx`). At the end of Phase 2, the user can lock/unlock parameters, switch units, and see the form respond correctly — but there is no results table or grid visualization yet.

**Depends on (Phase 1 deliverables)**:
- `src/lib/types.ts` — `Param`, `Unit`, `Config`, `CalcInput`, `CabinetType`, `SavedSelection`
- `src/lib/config.ts` — `ASPECT_RATIOS`, `CABINETS`, `CABINET_TYPES`
- `src/lib/units.ts` — `toMM(value, unit)`, `fromMM(mm, unit)`
- `src/lib/calculate.ts` — `calculate(input: CalcInput): Config[]`
- `src/lib/nearest.ts` — `findNearestIndex(results: Config[], input: CalcInput): number`

**PRD sections covered**: 2.4 (State Management), 3.1 (Lock-Based Parameter Selection), 3.4 (Unit Switching), 4 (UI States: Empty, 1 Locked, 2 Locked), 5.1 (Input Section Layout), 5A (Colors/Spacing), 5B (Typography), 5C (Animations).

---

## Step 1: Add `AppState` and `Action` to Types — `src/lib/types.ts`

### What
Add the `AppState` and `Action` types that the reducer consumes. These reference existing types (`Param`, `Unit`, `Config`, `SavedSelection`) already defined in `types.ts`.

### Why
The reducer is a pure function `(AppState, Action) → AppState`. Defining the state shape and action union as types lets TypeScript enforce exhaustive handling of every action. Adding them to the existing `types.ts` keeps all shared types in one file (PRD Section 11.4).

### Changes to `src/lib/types.ts`

Append after the existing `QuoteRequest` type:

```ts
// --- App State ---

export type AppState = {
  locks: Record<Param, boolean>
  values: Record<Param, number>       // stored in mm (except aspectRatio which is unitless)
  unit: Unit
  results: Config[] | null            // 4 configs or null
  nearestIndex: number | null         // index 0-3 of nearest match
  selectedIndex: number | null        // radio selection (pre-confirm)
  confirmed: Config | null            // post-confirm
  history: SavedSelection[]
  modalOpen: boolean
  modalSource: 'help' | 'quote' | null
  error: string | null                // validation error message
}

// --- Reducer Actions ---

export type Action =
  | { type: 'LOCK_PARAM'; param: Param; value: number }
  | { type: 'UNLOCK_PARAM'; param: Param }
  | { type: 'SET_UNIT'; unit: Unit }
  | { type: 'SELECT_OPTION'; index: number }
  | { type: 'CONFIRM' }
  | { type: 'CANCEL' }
  | { type: 'OPEN_MODAL'; source: 'help' | 'quote' }
  | { type: 'CLOSE_MODAL' }
  | { type: 'DELETE_HISTORY'; id: string }
  | { type: 'LOAD_HISTORY'; history: SavedSelection[] }
```

### Key Decisions
- `values` stores all dimensions in **mm** internally. Aspect ratio is unitless (stored as decimal, e.g. `1.7778`). The component converts user input via `toMM()` before dispatching `LOCK_PARAM`.
- `error` field added (not in original PRD) to surface impossible geometry errors from `calculate.ts` (e.g., "Diagonal must be greater than height").
- `LOAD_HISTORY` added to initialize history from localStorage on mount — keeps reducer pure (no side effects inside reducer).
- `SET_VALUE` from PRD omitted — input fields use local component state for draft values. Only locked values flow into `AppState.values` via `LOCK_PARAM`. This avoids unnecessary re-renders on every keystroke.

### Validation
- [x] `npx tsc --noEmit` passes
- [x] `AppState` references existing types: `Param`, `Unit`, `Config`, `SavedSelection`
- [x] `Action` union covers all 10 action types

---

## Step 2: Create Reducer — `src/lib/reducer.ts`

### File Created
`src/lib/reducer.ts`

### What
A pure function `(AppState, Action) → AppState` that handles all state transitions. Contains a private helper `buildCalcInput()` that maps 2 locked params → a `CalcInput` discriminated union for the calc engine.

### Why
Centralizes all state logic. Components only call `dispatch()`. The reducer is testable without rendering any React components. The `buildCalcInput` helper is the bridge between the UI's lock model (which 2 of 4 params are locked) and the calc engine's combo model (`CalcInput`).

### Content

```ts
import type { AppState, Action, Param, CalcInput } from './types'
import { calculate } from './calculate'
import { findNearestIndex } from './nearest'

// --- Initial State ---

export const initialState: AppState = {
  locks: { aspectRatio: false, height: false, width: false, diagonal: false },
  values: { aspectRatio: 0, height: 0, width: 0, diagonal: 0 },
  unit: 'in',
  results: null,
  nearestIndex: null,
  selectedIndex: null,
  confirmed: null,
  history: [],
  modalOpen: false,
  modalSource: null,
  error: null,
}

// --- Helper: map 2 locked params → CalcInput ---

function buildCalcInput(
  locks: Record<Param, boolean>,
  values: Record<Param, number>
): CalcInput | null {
  const locked = (Object.keys(locks) as Param[]).filter(p => locks[p])
  if (locked.length !== 2) return null

  const has = (p: Param) => locked.includes(p)

  if (has('aspectRatio') && has('height'))   return { combo: 'ar_height',       ar: values.aspectRatio, height: values.height }
  if (has('aspectRatio') && has('width'))    return { combo: 'ar_width',        ar: values.aspectRatio, width: values.width }
  if (has('aspectRatio') && has('diagonal')) return { combo: 'ar_diagonal',     ar: values.aspectRatio, diagonal: values.diagonal }
  if (has('height') && has('width'))         return { combo: 'height_width',    height: values.height, width: values.width }
  if (has('height') && has('diagonal'))      return { combo: 'height_diagonal', height: values.height, diagonal: values.diagonal }
  if (has('width') && has('diagonal'))       return { combo: 'width_diagonal',  width: values.width, diagonal: values.diagonal }

  return null
}

// --- Reducer ---

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {

    case 'LOCK_PARAM': {
      const newLocks = { ...state.locks, [action.param]: true }
      const newValues = { ...state.values, [action.param]: action.value }

      const input = buildCalcInput(newLocks, newValues)
      if (!input) {
        // <2 locked — just update locks/values, no calculation
        return {
          ...state,
          locks: newLocks,
          values: newValues,
          results: null,
          nearestIndex: null,
          selectedIndex: null,
          confirmed: null,
          error: null,
        }
      }

      // 2 locked — run calculation
      try {
        const results = calculate(input)
        const nearestIndex = findNearestIndex(results, input)
        return {
          ...state,
          locks: newLocks,
          values: newValues,
          results,
          nearestIndex,
          selectedIndex: null,
          confirmed: null,
          error: null,
        }
      } catch (e) {
        return {
          ...state,
          locks: newLocks,
          values: newValues,
          results: null,
          nearestIndex: null,
          selectedIndex: null,
          confirmed: null,
          error: e instanceof Error ? e.message : 'Calculation error',
        }
      }
    }

    case 'UNLOCK_PARAM': {
      return {
        ...state,
        locks: { ...state.locks, [action.param]: false },
        results: null,
        nearestIndex: null,
        selectedIndex: null,
        confirmed: null,
        error: null,
      }
    }

    case 'SET_UNIT': {
      return { ...state, unit: action.unit }
    }

    case 'SELECT_OPTION': {
      return { ...state, selectedIndex: action.index }
    }

    case 'CONFIRM': {
      if (state.results === null || state.selectedIndex === null) return state
      const confirmed = state.results[state.selectedIndex]
      if (!confirmed) return state
      return { ...state, confirmed }
    }

    case 'CANCEL': {
      return { ...state, selectedIndex: null }
    }

    case 'OPEN_MODAL': {
      return { ...state, modalOpen: true, modalSource: action.source }
    }

    case 'CLOSE_MODAL': {
      return { ...state, modalOpen: false, modalSource: null }
    }

    case 'DELETE_HISTORY': {
      return {
        ...state,
        history: state.history.filter(h => h.id !== action.id),
      }
    }

    case 'LOAD_HISTORY': {
      return { ...state, history: action.history }
    }
  }
}
```

### Key Decisions
- **`buildCalcInput` is private** — not exported. The reducer is the only consumer. It checks all 6 two-param combinations and returns the matching `CalcInput` variant, or `null` if <2 are locked.
- **`LOCK_PARAM` wraps `calculate()` in try/catch** — catches impossible geometry errors (e.g., diagonal < height) thrown by `calcHeightDiagonal`/`calcWidthDiagonal` and stores the message in `state.error`. The UI will display this.
- **`LOCK_PARAM` always clears `selectedIndex` and `confirmed`** — fresh results mean any previous selection is stale. PRD Section 2.4 specifies this.
- **`UNLOCK_PARAM` clears results, selectedIndex, confirmed, error** — PRD Section 2.4: "Clear results, selectedIndex, confirmed (stale data)".
- **`SET_UNIT` only updates `unit`** — no recalculation. PRD Section 3.4: "No recalculation — stored mm values are re-displayed through `fromMM()`".
- **`CONFIRM` reads from `results[selectedIndex]`** — guards against null/undefined.
- **No side effects** — reducer is pure. localStorage read/write happens outside (in components or effects).

### Best Practices
- Exhaustive switch — TypeScript ensures all `Action` types are handled. Adding a new action type causes a compile error until handled.
- Spread copies for immutability — `{ ...state, locks: { ...state.locks, ... } }`.
- `initialState` exported separately for use in `useReducer` and tests.

### Validation
- [x] File compiles with zero errors
- [x] No `any` types, no `as` casts (except the `Object.keys` cast in `buildCalcInput` which is necessary)
- [x] Tested in Step 3

---

## Step 3: Reducer Tests — `src/lib/reducer.test.ts`

### File Created
`src/lib/reducer.test.ts`

### What
Tests for every action type and the critical `buildCalcInput` logic (tested indirectly via dispatching actions).

### Why
The reducer is the brain of the app. A bug here means wrong UI state everywhere. Testing it as a pure function (input state + action → output state) is fast and deterministic — no DOM, no React rendering.

### Content

```ts
import { describe, it, expect } from 'vitest'
import { reducer, initialState } from './reducer'
import { toMM } from './units'
import type { AppState } from './types'

describe('reducer', () => {

  describe('LOCK_PARAM', () => {
    it('locks a single param without triggering calculation', () => {
      const state = reducer(initialState, {
        type: 'LOCK_PARAM',
        param: 'height',
        value: toMM(100, 'in'),
      })
      expect(state.locks.height).toBe(true)
      expect(state.values.height).toBe(toMM(100, 'in'))
      expect(state.results).toBeNull()
    })

    it('locks 2 params and triggers calculation', () => {
      let state = reducer(initialState, {
        type: 'LOCK_PARAM',
        param: 'aspectRatio',
        value: 16 / 9,
      })
      state = reducer(state, {
        type: 'LOCK_PARAM',
        param: 'height',
        value: toMM(100, 'in'),
      })
      expect(state.results).not.toBeNull()
      expect(state.results).toHaveLength(4)
      expect(state.nearestIndex).not.toBeNull()
      expect(state.selectedIndex).toBeNull()
      expect(state.confirmed).toBeNull()
      expect(state.error).toBeNull()
    })

    it('clears previous selectedIndex and confirmed on re-lock', () => {
      let state = reducer(initialState, {
        type: 'LOCK_PARAM',
        param: 'aspectRatio',
        value: 16 / 9,
      })
      state = reducer(state, {
        type: 'LOCK_PARAM',
        param: 'height',
        value: toMM(100, 'in'),
      })
      // Simulate selection and confirmation
      state = reducer(state, { type: 'SELECT_OPTION', index: 0 })
      state = reducer(state, { type: 'CONFIRM' })
      expect(state.confirmed).not.toBeNull()

      // Unlock and re-lock with different value
      state = reducer(state, { type: 'UNLOCK_PARAM', param: 'height' })
      state = reducer(state, {
        type: 'LOCK_PARAM',
        param: 'height',
        value: toMM(50, 'in'),
      })
      expect(state.selectedIndex).toBeNull()
      expect(state.confirmed).toBeNull()
    })

    it('catches impossible geometry and sets error', () => {
      let state = reducer(initialState, {
        type: 'LOCK_PARAM',
        param: 'height',
        value: toMM(200, 'in'),
      })
      state = reducer(state, {
        type: 'LOCK_PARAM',
        param: 'diagonal',
        value: toMM(100, 'in'),  // diagonal < height = impossible
      })
      expect(state.results).toBeNull()
      expect(state.error).toBe('Diagonal must be greater than height')
    })
  })

  describe('UNLOCK_PARAM', () => {
    it('unlocks param and clears results', () => {
      let state = reducer(initialState, {
        type: 'LOCK_PARAM',
        param: 'aspectRatio',
        value: 16 / 9,
      })
      state = reducer(state, {
        type: 'LOCK_PARAM',
        param: 'height',
        value: toMM(100, 'in'),
      })
      expect(state.results).not.toBeNull()

      state = reducer(state, { type: 'UNLOCK_PARAM', param: 'height' })
      expect(state.locks.height).toBe(false)
      expect(state.results).toBeNull()
      expect(state.nearestIndex).toBeNull()
      expect(state.selectedIndex).toBeNull()
      expect(state.confirmed).toBeNull()
      expect(state.error).toBeNull()
    })
  })

  describe('SET_UNIT', () => {
    it('changes unit without recalculating', () => {
      let state = reducer(initialState, {
        type: 'LOCK_PARAM',
        param: 'aspectRatio',
        value: 16 / 9,
      })
      state = reducer(state, {
        type: 'LOCK_PARAM',
        param: 'height',
        value: toMM(100, 'in'),
      })
      const resultsBefore = state.results

      state = reducer(state, { type: 'SET_UNIT', unit: 'ft' })
      expect(state.unit).toBe('ft')
      expect(state.results).toBe(resultsBefore)  // same reference, no recalc
    })
  })

  describe('SELECT_OPTION', () => {
    it('sets selectedIndex', () => {
      const state = reducer(initialState, { type: 'SELECT_OPTION', index: 2 })
      expect(state.selectedIndex).toBe(2)
    })
  })

  describe('CONFIRM', () => {
    it('sets confirmed from results[selectedIndex]', () => {
      let state = reducer(initialState, {
        type: 'LOCK_PARAM',
        param: 'aspectRatio',
        value: 16 / 9,
      })
      state = reducer(state, {
        type: 'LOCK_PARAM',
        param: 'height',
        value: toMM(100, 'in'),
      })
      state = reducer(state, { type: 'SELECT_OPTION', index: 0 })
      state = reducer(state, { type: 'CONFIRM' })

      expect(state.confirmed).not.toBeNull()
      expect(state.confirmed).toEqual(state.results![0])
    })

    it('does nothing if no selection', () => {
      const state = reducer(initialState, { type: 'CONFIRM' })
      expect(state.confirmed).toBeNull()
    })
  })

  describe('CANCEL', () => {
    it('clears selectedIndex', () => {
      let state = reducer(initialState, { type: 'SELECT_OPTION', index: 1 })
      state = reducer(state, { type: 'CANCEL' })
      expect(state.selectedIndex).toBeNull()
    })
  })

  describe('OPEN_MODAL / CLOSE_MODAL', () => {
    it('opens and closes modal', () => {
      let state = reducer(initialState, { type: 'OPEN_MODAL', source: 'help' })
      expect(state.modalOpen).toBe(true)
      expect(state.modalSource).toBe('help')

      state = reducer(state, { type: 'CLOSE_MODAL' })
      expect(state.modalOpen).toBe(false)
      expect(state.modalSource).toBeNull()
    })
  })

  describe('DELETE_HISTORY', () => {
    it('removes entry by id', () => {
      const history = [
        { id: 'a', cabinetType: '16:9' as const, rows: 7, cols: 7, widthMM: 4200, heightMM: 2362.5, diagonalMM: 4819, aspectRatio: 1.78, totalCabinets: 49, inputParams: { combo: 'ar_height', values: { aspectRatio: 1.78, height: 2540 }, unit: 'in' as const }, savedAt: 1000 },
        { id: 'b', cabinetType: '1:1' as const, rows: 5, cols: 9, widthMM: 4500, heightMM: 2500, diagonalMM: 5147, aspectRatio: 1.8, totalCabinets: 45, inputParams: { combo: 'ar_height', values: { aspectRatio: 1.78, height: 2540 }, unit: 'in' as const }, savedAt: 2000 },
      ]
      let state: AppState = { ...initialState, history }
      state = reducer(state, { type: 'DELETE_HISTORY', id: 'a' })
      expect(state.history).toHaveLength(1)
      expect(state.history[0]!.id).toBe('b')
    })
  })

  describe('LOAD_HISTORY', () => {
    it('sets history array', () => {
      const history = [
        { id: 'x', cabinetType: '16:9' as const, rows: 7, cols: 7, widthMM: 4200, heightMM: 2362.5, diagonalMM: 4819, aspectRatio: 1.78, totalCabinets: 49, inputParams: { combo: 'ar_height', values: { aspectRatio: 1.78, height: 2540 }, unit: 'in' as const }, savedAt: 1000 },
      ]
      const state = reducer(initialState, { type: 'LOAD_HISTORY', history })
      expect(state.history).toEqual(history)
    })
  })

  describe('all 6 param combos produce results', () => {
    const combos: Array<{ a: { param: 'aspectRatio' | 'height' | 'width' | 'diagonal'; value: number }; b: { param: 'aspectRatio' | 'height' | 'width' | 'diagonal'; value: number } }> = [
      { a: { param: 'aspectRatio', value: 16 / 9 },    b: { param: 'height',   value: toMM(100, 'in') } },
      { a: { param: 'aspectRatio', value: 16 / 9 },    b: { param: 'width',    value: toMM(100, 'in') } },
      { a: { param: 'aspectRatio', value: 16 / 9 },    b: { param: 'diagonal', value: toMM(200, 'in') } },
      { a: { param: 'height',      value: toMM(100, 'in') }, b: { param: 'width',    value: toMM(200, 'in') } },
      { a: { param: 'height',      value: toMM(100, 'in') }, b: { param: 'diagonal', value: toMM(200, 'in') } },
      { a: { param: 'width',       value: toMM(100, 'in') }, b: { param: 'diagonal', value: toMM(200, 'in') } },
    ]

    for (const { a, b } of combos) {
      it(`${a.param} + ${b.param}`, () => {
        let state = reducer(initialState, { type: 'LOCK_PARAM', ...a })
        state = reducer(state, { type: 'LOCK_PARAM', ...b })
        expect(state.results).toHaveLength(4)
        expect(state.nearestIndex).not.toBeNull()
        expect(state.error).toBeNull()
      })
    }
  })
})
```

### Best Practices
- Tests are pure state transitions — no DOM, no rendering, no timers.
- Each action type tested in isolation.
- The "all 6 combos" test ensures `buildCalcInput` correctly maps every pair to a `CalcInput` variant.
- Impossible geometry test verifies the try/catch in `LOCK_PARAM`.

### Validation
- [x] `npm test` — all reducer tests pass
- [x] All 6 param combos produce 4 results
- [x] Impossible geometry error captured in state
- [x] Unit switch preserves results reference (no recalc)

---

## Step 4: Build `ParameterForm` Component — `src/components/ParameterForm.tsx`

### File Created
`src/components/ParameterForm.tsx`

### What
The lock-based input form with 4 parameter fields, lock icons, Apply buttons, a unit dropdown, info banner, and "What to know" box. This is the entire left/top section of the app (PRD Section 5.1).

### Why
This is the primary user interaction surface. It translates user intent (type a number, click Apply) into reducer actions (`LOCK_PARAM`, `UNLOCK_PARAM`, `SET_UNIT`). It must correctly:
1. Show/hide lock states (open = teal, closed = dark)
2. Disable unlocked fields when 2 are already locked
3. Convert user input to mm before dispatching
4. Display locked values in the current unit via `fromMM()`
5. Update labels when unit changes

### Props

```ts
type ParameterFormProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}
```

### Component Structure

```
ParameterForm
├── Header: "Size" title + "Enter at least 2 parameters" subtitle
├── InfoBanner: (!) icon + contextual message + unit dropdown
├── Parameter grid (2x2):
│   ├── DiagonalInput: text input + Apply button + lock icon
│   ├── AspectRatioInput: dropdown + lock icon (no Apply button)
│   ├── WidthInput: text input + Apply button + lock icon
│   └── HeightInput: text input + Apply button + lock icon
├── Error message (if state.error is set)
└── WhatToKnow box: (?) icon + explanatory text
```

### Content

```tsx
import { useState } from 'react'
import { Lock, Unlock, Info, HelpCircle } from 'lucide-react'
import type { AppState, Action, Param, Unit } from '../lib/types'
import { ASPECT_RATIOS } from '../lib/config'
import { toMM, fromMM } from '../lib/units'

type ParameterFormProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const UNIT_LABELS: Record<Unit, string> = {
  mm: 'Millimeters',
  m: 'Meters',
  ft: 'Feet',
  in: 'Inches',
}

const PARAMS: { param: Param; label: string }[] = [
  { param: 'diagonal', label: 'Diagonal' },
  { param: 'aspectRatio', label: 'Aspect Ratio' },
  { param: 'width', label: 'Width' },
  { param: 'height', label: 'Height' },
]

function getInfoMessage(locks: Record<Param, boolean>): string {
  const count = Object.values(locks).filter(Boolean).length
  if (count === 0) return 'Select a measurement to start'
  if (count === 1) return 'Lock one more parameter to see results'
  return 'Results calculated — choose a size below'
}

export default function ParameterForm({ state, dispatch }: ParameterFormProps) {
  // Draft values for unlocked fields (user typing, not yet committed)
  const [drafts, setDrafts] = useState<Record<Param, string>>({
    aspectRatio: '',
    height: '',
    width: '',
    diagonal: '',
  })

  const lockCount = Object.values(state.locks).filter(Boolean).length

  function handleApply(param: Param) {
    if (param === 'aspectRatio') return // AR uses dropdown, not Apply
    const parsed = parseFloat(drafts[param])
    if (isNaN(parsed) || parsed <= 0) return
    const valueMM = toMM(parsed, state.unit)
    dispatch({ type: 'LOCK_PARAM', param, value: valueMM })
  }

  function handleLockAR(arValue: number) {
    dispatch({ type: 'LOCK_PARAM', param: 'aspectRatio', value: arValue })
  }

  function handleUnlock(param: Param) {
    dispatch({ type: 'UNLOCK_PARAM', param })
  }

  function isDisabled(param: Param): boolean {
    return !state.locks[param] && lockCount >= 2
  }

  function displayValue(param: Param): string {
    if (!state.locks[param]) return ''
    if (param === 'aspectRatio') {
      const preset = ASPECT_RATIOS.find(ar => Math.abs(ar.value - state.values.aspectRatio) < 0.001)
      return preset ? preset.label : state.values.aspectRatio.toFixed(2)
    }
    return fromMM(state.values[param], state.unit).toFixed(2)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-400 uppercase tracking-wide">Size</p>
        <h1 className="text-2xl font-bold text-gray-900">
          Enter at least 2 parameters.
        </h1>
      </div>

      {/* Info Banner */}
      <div className="flex items-center justify-between border border-gray-200 bg-gray-50 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            {getInfoMessage(state.locks)}
          </span>
        </div>
        <select
          value={state.unit}
          onChange={e => dispatch({ type: 'SET_UNIT', unit: e.target.value as Unit })}
          className="text-sm border border-gray-300 rounded-md px-2 py-1"
        >
          {(Object.keys(UNIT_LABELS) as Unit[]).map(u => (
            <option key={u} value={u}>{UNIT_LABELS[u]}</option>
          ))}
        </select>
      </div>

      {/* Parameter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PARAMS.map(({ param, label }) => {
          const locked = state.locks[param]
          const disabled = isDisabled(param)

          return (
            <div key={param} className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">
                  {label}
                  {param !== 'aspectRatio' && `. (${UNIT_LABELS[state.unit]})`}
                </label>

                {param === 'aspectRatio' ? (
                  /* Aspect Ratio: dropdown */
                  <select
                    disabled={disabled || locked}
                    value={locked ? String(state.values.aspectRatio) : drafts.aspectRatio}
                    onChange={e => {
                      if (!locked) setDrafts(d => ({ ...d, aspectRatio: e.target.value }))
                    }}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 text-base ${
                      disabled ? 'bg-gray-200 text-gray-400 border-gray-200' :
                      locked ? 'bg-white border-gray-300 text-gray-900' :
                      'bg-white border-gray-300 text-gray-900'
                    } transition-colors duration-200`}
                  >
                    <option value="">Aspect Ratio</option>
                    {ASPECT_RATIOS.map(ar => (
                      <option key={ar.label} value={String(ar.value)}>
                        {ar.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  /* Dimension fields: text input + Apply button */
                  <div className="mt-1 flex">
                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={disabled || locked}
                      value={locked ? displayValue(param) : drafts[param]}
                      onChange={e => {
                        if (!locked) setDrafts(d => ({ ...d, [param]: e.target.value }))
                      }}
                      placeholder="0.00"
                      className={`flex-1 border rounded-l-md px-3 py-2 text-base ${
                        disabled ? 'bg-gray-200 text-gray-400 border-gray-200' :
                        locked ? 'bg-white border-gray-300 text-gray-900' :
                        'bg-white border-gray-300 text-gray-900'
                      } transition-colors duration-200`}
                    />
                    <button
                      disabled={disabled || locked}
                      onClick={() => handleApply(param)}
                      className={`px-4 py-2 border border-l-0 rounded-r-md text-sm font-medium ${
                        disabled || locked
                          ? 'bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      apply
                    </button>
                  </div>
                )}
              </div>

              {/* Lock Icon */}
              <button
                onClick={() => {
                  if (locked) {
                    handleUnlock(param)
                  } else if (param === 'aspectRatio' && drafts.aspectRatio) {
                    handleLockAR(parseFloat(drafts.aspectRatio))
                  }
                }}
                disabled={disabled && !locked}
                aria-label={locked ? 'Unlock parameter' : 'Lock parameter'}
                className="mb-1"
              >
                {locked ? (
                  <Lock className="h-5 w-5 text-gray-900 transition-opacity duration-150" />
                ) : (
                  <Unlock className={`h-5 w-5 transition-opacity duration-150 ${
                    disabled ? 'text-gray-300' : 'text-[#5B9A8B]'
                  }`} />
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Error Message */}
      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      {/* What to Know */}
      <div className="border border-gray-200 bg-gray-50 rounded-lg px-4 py-3">
        <div className="flex items-start gap-2">
          <HelpCircle className="h-4 w-4 text-gray-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900">What to know</p>
            <p className="text-sm text-gray-600 mt-1">
              When you enter your values, this tool will design the largest video
              wall which fits into your dimensions. Initially, you can lock 2
              parameters and the tool will &lsquo;fit&rsquo; a Video Wall to your
              specifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Key Decisions
- **Draft values are local state** (`useState` in component). Only committed to reducer on Apply/lock. Prevents re-renders of the entire app on every keystroke.
- **`displayValue()` converts from mm** using `fromMM(state.values[param], state.unit)` for locked fields. When unit changes, display updates automatically (no recalculation).
- **AR dropdown has no Apply button** — selecting a value sets the draft; clicking the lock icon dispatches `LOCK_PARAM`. PRD Section 3.1: "No Apply button — selecting a value from the dropdown and clicking the lock locks it."
- **Disabled logic**: `isDisabled(param)` returns true when the field is unlocked AND 2 are already locked. PRD Section 3.1: "When 2 are locked: remaining fields disabled."
- **Lock icon click**: if locked → unlock. If unlocked + AR + has draft value → lock AR. For dimension fields, lock happens via Apply button, not lock icon. Lock icon on unlocked dimension fields is display-only.
- **Lucide icons**: `Lock` and `Unlock` for padlock, `Info` for banner, `HelpCircle` for What-to-know. These are the actual export names from `lucide-react`.
- **Colors from PRD Section 5A**: open lock = `#5B9A8B` (teal), closed lock = `text-gray-900` (~`#1A1A1A`), disabled = `bg-gray-200` (`#E5E5E5`).
- **Animations from PRD Section 5C**: lock icon `transition-opacity duration-150`, disabled field `transition-colors duration-200`.

### Validation
- [x] Component renders without errors
- [x] All 4 fields visible with correct labels
- [x] Unit dropdown changes labels (e.g., "Height. (Inches)" → "Height. (Feet)")
- [x] Apply button locks field, shows closed padlock
- [x] Clicking closed padlock unlocks
- [x] When 2 locked, remaining 2 fields are greyed out and disabled
- [x] Unlocking one re-enables disabled fields
- [x] AR dropdown + lock icon flow works
- [x] Impossible geometry shows error message

---

## Step 5: Wire `App.tsx` with `useReducer` — `src/App.tsx`

### File Modified
`src/App.tsx`

### What
Replace the placeholder App with the real layout: `useReducer` for state, `ParameterForm` as the first section. Results table and grid visualization show placeholder text (built in Phase 3).

### Why
This is the wiring step — connects the reducer to the component tree. The `App` component owns the state via `useReducer` and passes `state` + `dispatch` down. No prop drilling of individual values.

### Content

```tsx
import { useReducer } from 'react'
import { reducer, initialState } from './lib/reducer'
import ParameterForm from './components/ParameterForm'

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <ParameterForm state={state} dispatch={dispatch} />

        {/* Phase 3: ResultsTable will go here */}
        {state.results && (
          <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-400">
            <p className="text-sm">Results ready — {state.results.length} configurations calculated.</p>
            <p className="text-sm">Nearest size: index {state.nearestIndex}</p>
            <p className="text-sm">(ResultsTable component — Phase 3)</p>
          </div>
        )}

        {/* Phase 3: WallGrid will go here */}
        {state.confirmed && (
          <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-400">
            <p className="text-sm">Confirmed: {state.confirmed.cols}x{state.confirmed.rows} {state.confirmed.cabinetType}</p>
            <p className="text-sm">(WallGrid component — Phase 3)</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

### Key Decisions
- **`max-w-5xl mx-auto`** — constrains content width on large screens. PRD Section 5A: page padding `px-6 py-8`.
- **`space-y-8`** — 32px gap between sections. PRD Section 5A.
- **Dashed placeholders** for Phase 3 components — clearly visible during development, easy to find-and-replace.
- **No localStorage loading yet** — `LOAD_HISTORY` dispatch will be added in Phase 4 via `useEffect`.

### Validation
- [x] `npm run dev` shows the form
- [x] Locking 2 params shows the results placeholder
- [x] Unit dropdown updates labels
- [x] No console errors

---

## Step 6: Integration Smoke Test — `src/App.test.tsx`

### File Created
`src/App.test.tsx`

### What
A lightweight smoke test that verifies the form renders and the reducer wiring works. Not a full E2E test — just confirms components mount and dispatch flows through.

### Why
Catches wiring bugs (wrong import paths, missing props, bad dispatch). Fast to run because it uses Vitest + jsdom, not a real browser.

### Pre-requisites
Install `@testing-library/react` and `jsdom`:
```bash
npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

Add to `vite.config.ts` (or a `vitest.config.ts`):
```ts
/// <reference types="vitest" />
// In defineConfig:
test: {
  environment: 'jsdom',
  globals: true,
}
```

### Content

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the parameter form', () => {
    render(<App />)
    expect(screen.getByText('Enter at least 2 parameters.')).toBeDefined()
    expect(screen.getByText('Select a measurement to start')).toBeDefined()
  })

  it('shows all 4 parameter labels', () => {
    render(<App />)
    expect(screen.getByText(/Diagonal/)).toBeDefined()
    expect(screen.getByText(/Width/)).toBeDefined()
    expect(screen.getByText(/Height/)).toBeDefined()
    expect(screen.getByText('Aspect Ratio')).toBeDefined()
  })

  it('shows unit dropdown defaulting to Inches', () => {
    render(<App />)
    const select = screen.getByDisplayValue('Inches')
    expect(select).toBeDefined()
  })
})
```

### Validation
- [x] `npm test` — smoke tests pass
- [x] No missing import errors
- [x] All 4 parameter labels found in DOM

---

## Step 7: Final Phase 2 Verification

Run the full suite and verify everything:

```bash
npm run build        # zero errors, zero warnings
npm test             # all tests pass (Phase 1 + Phase 2)
npx tsc --noEmit     # type check passes
npm run dev          # manual check: form renders, locks work, unit switches
```

### Manual Test Script (run in browser via `npm run dev`)

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Page loads | Form visible: 4 unlocked fields, info says "Select a measurement to start", unit = Inches |
| 2 | Type "100" in Height, click Apply | Height field locked (closed padlock, dark). Info: "Lock one more parameter to see results" |
| 3 | Select "16:9" in AR dropdown, click lock icon | AR locked. Both Height and AR show closed padlocks. Diagonal and Width disabled (greyed). Results placeholder appears: "4 configurations calculated" |
| 4 | Click closed lock on Height | Height unlocks. Diagonal and Width re-enable. Results placeholder disappears |
| 5 | Change unit dropdown to "Feet" | Labels change to "Height. (Feet)", "Width. (Feet)", "Diagonal. (Feet)" |
| 6 | Lock Height = 100 ft, lock Diagonal = 50 ft | Error message: "Diagonal must be greater than height" |
| 7 | Unlock Diagonal, lock Diagonal = 200 ft | Error clears, results placeholder appears |

### Checklist
- [x] `src/lib/types.ts` — `AppState` and `Action` types added
- [x] `src/lib/reducer.ts` — all 10 action types handled, `buildCalcInput` maps all 6 combos
- [x] `src/lib/reducer.test.ts` — all reducer tests pass (19 tests)
- [x] `src/components/ParameterForm.tsx` — 4 fields, lock/unlock, unit dropdown, info banner
- [x] `src/App.tsx` — `useReducer` wired, form renders
- [x] `npm run build` — clean (0 errors, 0 warnings)
- [x] `npx tsc --noEmit` — clean (0 errors)
- [x] `npm test` — all 48 green (26 Phase 1 + 19 reducer + 3 smoke = regression clean)

### Files Created/Modified in Phase 2

```
src/
  lib/
    types.ts          ← MODIFIED (added AppState, Action)
    reducer.ts        ← NEW
    reducer.test.ts   ← NEW
  components/
    ParameterForm.tsx ← NEW
  App.tsx             ← MODIFIED (useReducer + ParameterForm)
  App.test.tsx        ← NEW (optional smoke test)
```

**Total: 3 new files, 2 modified.** The form is interactive. Locking 2 params triggers calculation. Unit switching works. All Phase 1 tests still pass.

---

## Phase 2 → Phase 3 Handoff

Phase 2 delivers:
- A tested reducer with all state transitions (`LOCK_PARAM`, `UNLOCK_PARAM`, `SET_UNIT`, `SELECT_OPTION`, `CONFIRM`, `CANCEL`, `OPEN_MODAL`, `CLOSE_MODAL`, `DELETE_HISTORY`, `LOAD_HISTORY`)
- A fully interactive parameter form with lock/unlock, AR dropdown, unit switching, and disabled-field logic
- `state.results` (4 `Config` objects) populated when 2 params are locked — ready for display

Phase 3 picks up from here with:
- `ResultsTable.tsx` — 4-column comparison table, "Nearest Size" badge, radio select, Cancel/Confirm buttons
- `WallGrid.tsx` — SVG grid visualization with dimension arrows + diagonal line
- Row/column counter display
- Wiring `SELECT_OPTION` and `CONFIRM` actions to the table
