# Phase 4 — Persistence & Bonus: Implementation Plan ✅ COMPLETE

**Goal**: Build the localStorage persistence layer (`storage.ts`), the contact/quote modal (`ContactModal.tsx`), the history panel (`History.tsx`), and the toast notification (`Toast.tsx`). At the end of Phase 4, confirmed selections auto-save to localStorage, the user can view/delete/reload past selections from a history panel, submit a quote request via a modal form, and see a toast confirmation on success.

**Depends on (Phase 3 deliverables)**:
- `src/lib/types.ts` — `SavedSelection`, `QuoteRequest`, `AppState` (with `history: SavedSelection[]`, `modalOpen: boolean`, `modalSource: 'help' | 'quote' | null`), `Action` (with `OPEN_MODAL`, `CLOSE_MODAL`, `DELETE_HISTORY`, `LOAD_HISTORY`)
- `src/lib/reducer.ts` — `reducer`, `initialState`; handles `OPEN_MODAL` (sets `modalOpen: true`, `modalSource`), `CLOSE_MODAL` (resets both), `DELETE_HISTORY` (filters by id), `LOAD_HISTORY` (replaces history array), `CONFIRM` (sets `state.confirmed`)
- `src/components/ResultsTable.tsx` — dispatches `{ type: 'OPEN_MODAL', source: 'help' }` from "Help me choose" button
- `src/App.tsx` — `useReducer(reducer, initialState)`, passes `state` + `dispatch` to children; contains dashed placeholder for "Receive Quote" button at lines 50–53

**PRD sections covered**: 7 (Persistence — localStorage), 12 (Contact / Quote Modal), 5.4 (History layout), 5C (Animation — modal transitions, toast slide-in), 5.5 (Responsive — modal max-width), 15 (Accessibility — Headless UI focus trap).

**Installed dependencies already available** (no new installs needed):
- `@headlessui/react@2.2.9` — `Dialog`, `DialogBackdrop`, `DialogPanel`, `DialogTitle`
- `lucide-react@0.575.0` — `X`, `Trash2`, `RotateCcw`, `CheckCircle`, `Mail`, `Phone` (available, not yet imported)

---

## Step 1: Build `storage.ts` — `src/lib/storage.ts`

### File Created
`src/lib/storage.ts`

### What
A localStorage wrapper with 5 functions: save/get/delete selections, and save/get quotes. All operations are synchronous. Data is stored as JSON arrays under two keys.

### Why
PRD Section 7: "When the user clicks Select on a result card, we persist the full configuration." The storage layer is a pure utility with no React imports — designed to be swappable for API calls in production (PRD Section 11.5).

### Imports Required

```ts
import type { SavedSelection, QuoteRequest } from './types'
```

### Constants

```ts
const SELECTIONS_KEY = 'videowall_selections'
const QUOTES_KEY = 'videowall_quotes'
```

These keys match PRD Section 7.2 (`'videowall_selections'`) and Section 12.3 (`'videowall_quotes'`).

### Functions

**`saveSelection(selection: SavedSelection): void`**
- Reads existing array from `localStorage.getItem(SELECTIONS_KEY)`
- Parses as `SavedSelection[]` (default `[]` if null or parse error)
- Prepends `selection` to front (newest first, per PRD 7.2)
- Writes back via `localStorage.setItem(SELECTIONS_KEY, JSON.stringify(...))`

**`getSelections(): SavedSelection[]`**
- Reads from `SELECTIONS_KEY`
- Parses and returns, or `[]` on error

**`deleteSelection(id: string): void`**
- Reads array, filters out item with matching `id`, writes back

**`saveQuote(quote: QuoteRequest): void`**
- Same pattern as `saveSelection`, using `QUOTES_KEY`
- Prepends to array

**`getQuotes(): QuoteRequest[]`**
- Reads from `QUOTES_KEY`, returns parsed array or `[]`

### Error Handling
- All reads wrapped in try/catch — corrupted localStorage returns `[]`
- No throws — fail silently with empty arrays

### Validation
- [x] `saveSelection` persists a selection to localStorage
- [x] `getSelections` retrieves all saved selections (newest first)
- [x] `deleteSelection` removes by id, preserving others
- [x] `saveQuote` persists a quote to localStorage
- [x] `getQuotes` retrieves all saved quotes
- [x] Corrupted localStorage returns empty array (no throws)

---

## Step 2: Build `Toast.tsx` — `src/components/Toast.tsx`

### File Created
`src/components/Toast.tsx`

### What
A simple auto-dismiss notification banner that slides in from the top, displays a success message, and fades out after 3 seconds.

### Why
PRD Section 12.3: "On success: close modal, show a brief toast/confirmation: 'Quote request received!'" PRD Section 5C: "Toast: Slide in from top, auto-dismiss after 3s with fade-out. `transition-all duration-300` + `setTimeout`."

### Props

```ts
type ToastProps = {
  message: string
  visible: boolean
  onDismiss: () => void
}
```

The parent (`App.tsx`) controls visibility via local `useState`. `onDismiss` is called after the 3-second auto-dismiss timeout, allowing the parent to set `visible = false`.

### Imports Required

```ts
import { useEffect } from 'react'
import { CheckCircle } from 'lucide-react'
```

### Component Structure

```
Toast
├── Wrapper div (fixed top-4 right-4 z-50, transition-all duration-300)
│   ├── translate-y: visible ? 0 : -100% (slide in/out)
│   ├── opacity: visible ? 1 : 0
│   └── Content row
│       ├── CheckCircle icon (text-white)
│       └── Message text (text-white text-sm font-medium)
└── useEffect: when visible becomes true, setTimeout(onDismiss, 3000)
```

### Key Decisions
- **Fixed positioning**: `fixed top-4 right-4 z-50` — floats above all content
- **Green background**: `bg-[#16A34A]` per PRD Section 5A (`--success: #16A34A`)
- **Auto-dismiss**: `useEffect` with 3000ms `setTimeout`, cleaned up on unmount or when `visible` changes
- **No portal**: simple fixed div, no React portal needed

### Validation
- [x] Toast appears when `visible` is true
- [x] Toast auto-dismisses after 3 seconds
- [x] Toast slides in from top (CSS transition)
- [x] `onDismiss` callback fires after timeout

---

## Step 3: Build `ContactModal.tsx` — `src/components/ContactModal.tsx`

### File Created
`src/components/ContactModal.tsx`

### What
A Headless UI `Dialog` modal that serves two entry points: "Help me choose" (`modalSource: 'help'`) and "Receive Quote" (`modalSource: 'quote'`). Contains a contact form with name, contact method (email/phone radio), and the relevant contact field.

### Why
PRD Section 12: Both triggers open the same modal. If from "Receive Quote", the modal is linked to the confirmed selection (`state.confirmed`). If from "Help me choose", `selectionId` is null. PRD Section 5C: 200ms fade-in backdrop + scale-up dialog, 150ms fade-out.

### Props

```ts
type ContactModalProps = {
  open: boolean
  source: 'help' | 'quote' | null
  selectionId: string | null
  onClose: () => void
  onSubmit: (quote: QuoteRequest) => void
}
```

- `open` — maps to `state.modalOpen`
- `source` — maps to `state.modalSource`
- `selectionId` — the id of the confirmed SavedSelection if source is `'quote'`, else `null`
- `onClose` — dispatches `{ type: 'CLOSE_MODAL' }`
- `onSubmit` — called with the built `QuoteRequest` on valid submission; parent handles saving + toast

### Imports Required

```ts
import { useState } from 'react'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { X } from 'lucide-react'
import type { QuoteRequest } from '../lib/types'
```

### Local State

```ts
const [name, setName] = useState('')
const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email')
const [contactValue, setContactValue] = useState('')
const [errors, setErrors] = useState<{ name?: string; contact?: string }>({})
```

State resets when `open` changes to `true` (via `useEffect`).

### Component Structure (maps to PRD Section 12.2)

```
Dialog (open={open}, onClose={onClose})
├── DialogBackdrop (className="bg-black/50", transition)
└── DialogPanel (className="max-w-md mx-auto bg-white rounded-lg shadow-xl p-6", transition)
    ├── Header row
    │   ├── DialogTitle: "Request a Quote"
    │   └── X close button → onClose()
    ├── Name field
    │   ├── <label> "Name *"
    │   ├── <input type="text"> (value={name}, onChange)
    │   └── Error text if errors.name
    ├── Contact method
    │   ├── <label> "Preferred contact method:"
    │   ├── Radio: Email (native <input type="radio">)
    │   └── Radio: Phone (native <input type="radio">)
    ├── Contact value field (conditional)
    │   ├── If email: <label> "Email *", <input type="email">
    │   └── If phone: <label> "Phone *", <input type="tel">
    │   └── Error text if errors.contact
    └── Button row
        ├── Cancel → onClose()
        └── Submit → validate() → onSubmit(quote)
```

### Validation Logic (PRD Section 12.2–12.3)

```ts
function validate(): boolean {
  const newErrors: { name?: string; contact?: string } = {}
  if (!name.trim()) newErrors.name = 'Name is required'

  if (contactMethod === 'email') {
    // Basic x@y.z format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue))
      newErrors.contact = 'Enter a valid email address'
  } else {
    // Non-empty, digits/dashes/spaces/+
    if (!/^[0-9+\-\s()]+$/.test(contactValue) || contactValue.trim().length < 7)
      newErrors.contact = 'Enter a valid phone number'
  }

  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}
```

### On Submit

```ts
function handleSubmit() {
  if (!validate()) return

  const quote: QuoteRequest = {
    id: crypto.randomUUID(),
    selectionId,
    name: name.trim(),
    contactMethod,
    contactValue: contactValue.trim(),
    submittedAt: Date.now(),
  }

  onSubmit(quote)
}
```

### Transition Props (PRD Section 5C)

Headless UI v2.2.9 `Dialog` and `DialogPanel` support `transition` prop directly:

```tsx
<DialogBackdrop
  transition
  className="fixed inset-0 bg-black/50 transition-opacity duration-200 data-[closed]:opacity-0"
/>

<DialogPanel
  transition
  className="... transition-all duration-200 data-[closed]:opacity-0 data-[closed]:scale-95"
>
```

### Key Decisions
- **Title changes by source**: "Help me choose" when `source === 'help'`, "Request a Quote" when `source === 'quote'`. Subtitle explains context.
- **Native radio buttons**: `<input type="radio" name="contactMethod">` for contact method toggle — same accessibility pattern as ResultsTable
- **Contact field hides** (not disables): PRD 12.2 — "The non-selected contact field is hidden (not disabled — removed from view)."
- **Form resets on open**: `useEffect` watching `open` — clears name, contactValue, errors, resets contactMethod to 'email'
- **`crypto.randomUUID()`**: PRD Section 15 confirms it works on localhost and HTTPS (Vercel)
- **Max width**: `max-w-md` (PRD 5.5: "Contact modal: max-width 480px, centered")

### Validation
- [x] Modal opens when `open` is true
- [x] Modal closes on X button, Cancel, or Esc key
- [x] Title shows "Request a Quote" for quote source, help context for help source
- [x] Name field validates non-empty
- [x] Email validates basic format (`x@y.z`)
- [x] Phone validates digits/dashes/spaces/+ and minimum 7 chars
- [x] Switching contact method hides the other field
- [x] Valid submit calls `onSubmit` with correctly shaped `QuoteRequest`
- [x] Form resets when modal reopens
- [x] Backdrop has fade transition, panel has scale+fade transition

---

## Step 4: Build `History.tsx` — `src/components/History.tsx`

### File Created
`src/components/History.tsx`

### What
A list of previously saved selections. Each row shows the config summary, a relative timestamp, and a delete button. Clicking a row reloads that configuration into the confirmed view.

### Why
PRD Section 5.4: History panel showing saved selections. PRD Section 7.3: "List: read and display in History section. Delete: remove by id. Reload: click a history item to re-display its grid visualization."

### Props

```ts
type HistoryProps = {
  history: SavedSelection[]
  unit: Unit
  dispatch: React.Dispatch<Action>
}
```

### Imports Required

```ts
import { Trash2 } from 'lucide-react'
import type { SavedSelection, Unit, Action } from '../lib/types'
import { fromMM } from '../lib/units'
import { deleteSelection } from '../lib/storage'
```

### Helper Functions

**`formatTimeAgo(savedAt: number): string`**
Returns relative time string: "just now", "2m ago", "1h ago", "3d ago", etc.

```ts
function formatTimeAgo(savedAt: number): string {
  const seconds = Math.floor((Date.now() - savedAt) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
```

### Component Structure (maps to PRD Section 5.4)

```
History
├── Header: "History" (text-sm text-gray-400 uppercase tracking-wide)
└── List (space-y-2)
    └── For each SavedSelection:
        <div> (flex, items-center, justify-between, border, rounded-lg, px-4 py-3)
        ├── Summary text (clickable — reloads config)
        │   └── "{cols}×{rows} {cabinetType} — {width}" × {height}" — {timeAgo}"
        └── Delete button
            └── <Trash2> icon → handleDelete(selection.id)
```

### Handlers

**`handleDelete(id: string)`**:
1. Call `deleteSelection(id)` — removes from localStorage
2. Dispatch `{ type: 'DELETE_HISTORY', id }` — removes from state

**`handleReload(selection: SavedSelection)`**:
The history item contains the full `Config` shape fields. To reload, we need to reconstruct a `Config` and set it as confirmed. We'll add a new `RELOAD_HISTORY` action (see Step 5 for the required reducer change).

Dispatches `{ type: 'RELOAD_HISTORY', selection }`.

### Key Decisions
- **Empty state**: If `history.length === 0`, show nothing (component returns `null`). No "No saved selections" message needed — the section simply doesn't appear.
- **Delete is two-step**: localStorage deletion + state dispatch. This keeps storage and state in sync.
- **Reload sets confirmed**: Clicking a history row populates `state.confirmed` with the saved config, showing the grid visualization. This requires a new reducer action (Step 5).
- **Display units**: Width and height shown in current `unit` via `fromMM()`, matching the rest of the app.

### Validation
- [x] History section only appears when `state.history.length > 0`
- [x] Each row shows grid size, cabinet type, dimensions, and relative time
- [x] Delete button removes from localStorage and state
- [x] Click on row reloads the config as confirmed
- [x] Dimensions display in current unit

---

## Step 5: Add `RELOAD_HISTORY` Action — `src/lib/types.ts` + `src/lib/reducer.ts`

### Files Modified
- `src/lib/types.ts` — add new `Action` variant
- `src/lib/reducer.ts` — add handler

### What
A new action type that restores a `SavedSelection` from history into the confirmed view.

### Why
When a user clicks a history row, we need to populate `state.confirmed` with a `Config` object reconstructed from the `SavedSelection`. This is distinct from the `CONFIRM` action (which reads from `state.results[state.selectedIndex]`).

### Type Addition (`types.ts` line 103)

Add to the `Action` union:

```ts
| { type: 'RELOAD_HISTORY'; selection: SavedSelection }
```

### Reducer Handler (`reducer.ts`)

```ts
case 'RELOAD_HISTORY': {
  const s = action.selection
  return {
    ...state,
    confirmed: {
      cabinetType: s.cabinetType,
      rows: s.rows,
      cols: s.cols,
      totalCabinets: s.totalCabinets,
      widthMM: s.widthMM,
      heightMM: s.heightMM,
      diagonalMM: s.diagonalMM,
      aspectRatio: s.aspectRatio,
    },
  }
}
```

### Validation
- [x] `RELOAD_HISTORY` sets `state.confirmed` from the saved selection
- [x] TypeScript exhaustive check still passes (no unhandled action types)
- [x] Existing reducer tests still pass

---

## Step 6: Wire Everything into `App.tsx`

### File Modified
`src/App.tsx`

### What
- Add `useEffect` to load history from localStorage on mount
- Add `useEffect` to save selection to localStorage on confirm
- Replace "Receive Quote" placeholder with real button
- Render `ContactModal` with state-driven visibility
- Render `Toast` with local visibility state
- Render `History` panel
- Add local state for toast visibility

### Why
This is the integration step — connects all Phase 4 components to the reducer state and storage layer. `App.tsx` remains the single owner of `useReducer(reducer, initialState)` and controls all side effects (localStorage reads/writes) in `useEffect` hooks.

### New Imports

```ts
import { useReducer, useEffect, useState, useCallback } from 'react'
import { reducer, initialState } from './lib/reducer'
import { getSelections, saveSelection, saveQuote } from './lib/storage'
import ParameterForm from './components/ParameterForm'
import ResultsTable from './components/ResultsTable'
import WallGrid from './components/WallGrid'
import ContactModal from './components/ContactModal'
import History from './components/History'
import Toast from './components/Toast'
import type { QuoteRequest, SavedSelection } from './lib/types'
```

### Local State

```ts
const [toastVisible, setToastVisible] = useState(false)
const [toastMessage, setToastMessage] = useState('')
```

### Effects

**Load history on mount:**
```ts
useEffect(() => {
  const history = getSelections()
  if (history.length > 0) {
    dispatch({ type: 'LOAD_HISTORY', history })
  }
}, [])
```

**Save to localStorage on confirm:**
```ts
useEffect(() => {
  if (!state.confirmed) return

  const selection: SavedSelection = {
    id: crypto.randomUUID(),
    cabinetType: state.confirmed.cabinetType,
    rows: state.confirmed.rows,
    cols: state.confirmed.cols,
    widthMM: state.confirmed.widthMM,
    heightMM: state.confirmed.heightMM,
    diagonalMM: state.confirmed.diagonalMM,
    aspectRatio: state.confirmed.aspectRatio,
    totalCabinets: state.confirmed.totalCabinets,
    inputParams: {
      combo: buildComboString(state.locks),
      values: { ...state.values },
      unit: state.unit,
    },
    savedAt: Date.now(),
  }

  saveSelection(selection)

  // Refresh history in state
  dispatch({ type: 'LOAD_HISTORY', history: getSelections() })
}, [state.confirmed])
```

**Helper needed in App.tsx (or import from reducer):**
```ts
function buildComboString(locks: Record<string, boolean>): string {
  const locked = Object.entries(locks)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .sort()
  return locked.join('_')
}
```

### Handlers

**`handleQuoteSubmit`:**
```ts
const handleQuoteSubmit = useCallback((quote: QuoteRequest) => {
  saveQuote(quote)
  dispatch({ type: 'CLOSE_MODAL' })
  setToastMessage('Quote request received!')
  setToastVisible(true)
}, [])
```

### Updated Layout

```tsx
return (
  <div className="min-h-screen bg-white">
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      <ParameterForm state={state} dispatch={dispatch} />

      {state.results && (
        <ResultsTable state={state} dispatch={dispatch} />
      )}

      {state.confirmed && (
        <>
          {/* Confirmed Summary Header */}
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-wide">Selected</p>
            <p className="text-lg font-semibold text-gray-900">
              {state.confirmed.cabinetType} Cabinet System
            </p>
          </div>

          {/* Row/Column Counter */}
          <div className="flex items-center justify-center gap-12">
            <div className="text-center">
              <p className="text-5xl font-black text-gray-900">{state.confirmed.cols}</p>
              <p className="text-sm text-gray-500">Columns</p>
            </div>
            <div className="text-center">
              <p className="text-5xl font-black text-gray-900">{state.confirmed.rows}</p>
              <p className="text-sm text-gray-500">Rows</p>
            </div>
          </div>

          {/* SVG Grid Visualization */}
          <WallGrid config={state.confirmed} unit={state.unit} />

          {/* Confirmed Details */}
          <div className="text-sm text-gray-600 space-y-1">
            <p>Total cabinets: {state.confirmed.totalCabinets}</p>
            <p>AR: {state.confirmed.aspectRatio.toFixed(2)}</p>
          </div>

          {/* Receive Quote button */}
          <button
            onClick={() => dispatch({ type: 'OPEN_MODAL', source: 'quote' })}
            className="px-6 py-3 bg-[#D4A843] text-white font-medium rounded-md hover:bg-[#c49a3a] transition-colors"
          >
            Receive Quote
          </button>
        </>
      )}

      {/* History Panel */}
      <History history={state.history} unit={state.unit} dispatch={dispatch} />
    </div>

    {/* Contact Modal */}
    <ContactModal
      open={state.modalOpen}
      source={state.modalSource}
      selectionId={null}
      onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
      onSubmit={handleQuoteSubmit}
    />

    {/* Toast Notification */}
    <Toast
      message={toastMessage}
      visible={toastVisible}
      onDismiss={() => setToastVisible(false)}
    />
  </div>
)
```

### Key Decisions
- **Save on confirm, not on select**: PRD Section 3.3 says "The selection is saved to localStorage" after confirm. The `useEffect` watching `state.confirmed` handles this.
- **`selectionId` for quote**: When source is `'quote'`, we should pass the id of the most recently saved selection. We can find it via `state.history[0]?.id` (newest first). When source is `'help'`, pass `null`.
- **History below everything**: The History panel renders at the bottom of the page, below the confirmed section or below the form if nothing is confirmed.
- **Toast is controlled by App local state**: Not in the reducer — toast visibility is a transient UI concern, not app state.

### Validation
- [x] History loads from localStorage on mount
- [x] Confirming a selection saves to localStorage
- [x] History panel shows saved selections
- [x] "Receive Quote" button appears below grid (replaces placeholder)
- [x] "Receive Quote" dispatches `OPEN_MODAL` with `source: 'quote'`
- [x] ContactModal opens/closes correctly from both triggers
- [x] Quote submission saves to localStorage + shows toast
- [x] Toast auto-dismisses after 3 seconds

---

## Step 7: Storage Tests — `src/lib/storage.test.ts`

### File Created
`src/lib/storage.test.ts`

### What
Unit tests for the localStorage wrapper functions.

### Why
The storage layer is the persistence boundary. Testing it ensures data is correctly serialized, retrieved, and deleted — and that corrupted data doesn't crash the app.

### Pre-requisite
`jsdom` test environment (already configured in `vite.config.ts`) provides a `localStorage` mock.

### Content

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveSelection,
  getSelections,
  deleteSelection,
  saveQuote,
  getQuotes,
} from './storage'
import type { SavedSelection, QuoteRequest } from './types'

const mockSelection: SavedSelection = {
  id: 'sel-1',
  cabinetType: '16:9',
  rows: 7,
  cols: 7,
  widthMM: 4200,
  heightMM: 2362.5,
  diagonalMM: 4819,
  aspectRatio: 1.78,
  totalCabinets: 49,
  inputParams: {
    combo: 'ar_height',
    values: { aspectRatio: 1.78, height: 2540 },
    unit: 'in',
  },
  savedAt: Date.now(),
}

const mockQuote: QuoteRequest = {
  id: 'quote-1',
  selectionId: 'sel-1',
  name: 'John Doe',
  contactMethod: 'email',
  contactValue: 'john@example.com',
  submittedAt: Date.now(),
}

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('selections', () => {
    it('returns empty array when no selections saved', () => {
      expect(getSelections()).toEqual([])
    })

    it('saves and retrieves a selection', () => {
      saveSelection(mockSelection)
      const result = getSelections()
      expect(result.length).toBe(1)
      expect(result[0]!.id).toBe('sel-1')
    })

    it('prepends new selections (newest first)', () => {
      saveSelection(mockSelection)
      saveSelection({ ...mockSelection, id: 'sel-2' })
      const result = getSelections()
      expect(result[0]!.id).toBe('sel-2')
      expect(result[1]!.id).toBe('sel-1')
    })

    it('deletes a selection by id', () => {
      saveSelection(mockSelection)
      saveSelection({ ...mockSelection, id: 'sel-2' })
      deleteSelection('sel-1')
      const result = getSelections()
      expect(result.length).toBe(1)
      expect(result[0]!.id).toBe('sel-2')
    })

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('videowall_selections', 'not-json')
      expect(getSelections()).toEqual([])
    })
  })

  describe('quotes', () => {
    it('returns empty array when no quotes saved', () => {
      expect(getQuotes()).toEqual([])
    })

    it('saves and retrieves a quote', () => {
      saveQuote(mockQuote)
      const result = getQuotes()
      expect(result.length).toBe(1)
      expect(result[0]!.name).toBe('John Doe')
    })

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('videowall_quotes', '{invalid}')
      expect(getQuotes()).toEqual([])
    })
  })
})
```

### Validation
- [x] All storage tests pass
- [x] CRUD operations verified
- [x] Corrupted data handling verified

---

## Step 8: ContactModal Tests — `src/components/ContactModal.test.tsx`

### File Created
`src/components/ContactModal.test.tsx`

### What
Tests for the ContactModal: rendering, validation, form submission, and close behavior.

### Content

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ContactModal from './ContactModal'

describe('ContactModal', () => {
  const defaultProps = {
    open: true,
    source: 'quote' as const,
    selectionId: 'sel-1',
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  }

  it('renders title when open', () => {
    render(<ContactModal {...defaultProps} />)
    expect(screen.getByText('Request a Quote')).toBeDefined()
  })

  it('shows validation errors for empty submit', () => {
    render(<ContactModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Submit'))
    expect(screen.getByText('Name is required')).toBeDefined()
  })

  it('validates email format', () => {
    render(<ContactModal {...defaultProps} />)
    const nameInput = screen.getByLabelText(/Name/)
    fireEvent.change(nameInput, { target: { value: 'John' } })
    const emailInput = screen.getByLabelText(/Email/)
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } })
    fireEvent.click(screen.getByText('Submit'))
    expect(screen.getByText('Enter a valid email address')).toBeDefined()
  })

  it('calls onSubmit with valid data', () => {
    const onSubmit = vi.fn()
    render(<ContactModal {...defaultProps} onSubmit={onSubmit} />)
    const nameInput = screen.getByLabelText(/Name/)
    fireEvent.change(nameInput, { target: { value: 'John Doe' } })
    const emailInput = screen.getByLabelText(/Email/)
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
    fireEvent.click(screen.getByText('Submit'))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    const quote = onSubmit.mock.calls[0]![0]
    expect(quote.name).toBe('John Doe')
    expect(quote.contactMethod).toBe('email')
    expect(quote.contactValue).toBe('john@example.com')
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    render(<ContactModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('switches contact field when method changes', () => {
    render(<ContactModal {...defaultProps} />)
    // Default is email
    expect(screen.getByLabelText(/Email/)).toBeDefined()
    // Switch to phone
    fireEvent.click(screen.getByLabelText(/Phone/))
    expect(screen.getByLabelText(/Phone number/i)).toBeDefined()
  })

  it('does not render when open is false', () => {
    const { container } = render(<ContactModal {...defaultProps} open={false} />)
    expect(container.querySelector('[role="dialog"]')).toBeNull()
  })
})
```

### Validation
- [x] All ContactModal tests pass
- [x] Form validation verified
- [x] Submit with valid data verified
- [x] Close behavior verified
- [x] Contact method switching verified

---

## Step 9: History & Toast Tests — `src/components/History.test.tsx`

### File Created
`src/components/History.test.tsx`

### What
Tests for the History panel: rendering items, delete dispatch, empty state.

### Content

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import History from './History'
import type { SavedSelection } from '../lib/types'

const mockHistory: SavedSelection[] = [
  {
    id: 'sel-1',
    cabinetType: '16:9',
    rows: 7,
    cols: 7,
    widthMM: 4200,
    heightMM: 2362.5,
    diagonalMM: 4819,
    aspectRatio: 1.78,
    totalCabinets: 49,
    inputParams: { combo: 'ar_height', values: {}, unit: 'in' },
    savedAt: Date.now() - 120000, // 2 minutes ago
  },
  {
    id: 'sel-2',
    cabinetType: '1:1',
    rows: 5,
    cols: 9,
    widthMM: 4500,
    heightMM: 2500,
    diagonalMM: 5147,
    aspectRatio: 1.8,
    totalCabinets: 45,
    inputParams: { combo: 'ar_height', values: {}, unit: 'in' },
    savedAt: Date.now() - 300000, // 5 minutes ago
  },
]

describe('History', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns null when history is empty', () => {
    const dispatch = vi.fn()
    const { container } = render(<History history={[]} unit="in" dispatch={dispatch} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders history items', () => {
    const dispatch = vi.fn()
    render(<History history={mockHistory} unit="in" dispatch={dispatch} />)
    expect(screen.getByText(/7×7/)).toBeDefined()
    expect(screen.getByText(/9×5/)).toBeDefined()
  })

  it('dispatches DELETE_HISTORY when delete clicked', () => {
    const dispatch = vi.fn()
    render(<History history={mockHistory} unit="in" dispatch={dispatch} />)
    const deleteButtons = screen.getAllByLabelText('Delete selection')
    fireEvent.click(deleteButtons[0]!)
    expect(dispatch).toHaveBeenCalledWith({ type: 'DELETE_HISTORY', id: 'sel-1' })
  })

  it('dispatches RELOAD_HISTORY when row clicked', () => {
    const dispatch = vi.fn()
    render(<History history={mockHistory} unit="in" dispatch={dispatch} />)
    const rows = screen.getAllByRole('button', { name: /load/i })
    fireEvent.click(rows[0]!)
    expect(dispatch).toHaveBeenCalledWith({
      type: 'RELOAD_HISTORY',
      selection: mockHistory[0],
    })
  })
})
```

### Validation
- [x] Empty state returns null
- [x] Items render with correct data
- [x] Delete dispatches correctly
- [x] Reload dispatches correctly

---

## Step 10: Update `App.test.tsx` — Integration Tests

### File Modified
`src/App.test.tsx`

### What
Extend existing integration tests to verify the full Phase 4 flow: confirm → auto-save → history appears, quote modal opens from both triggers.

### Additional Tests

```tsx
it('shows "Receive Quote" button after confirming', () => {
  // Lock 2 params → select → confirm
  // Expect "Receive Quote" button to be visible (not dashed placeholder)
})

it('opens quote modal when "Receive Quote" clicked', () => {
  // Confirm, then click "Receive Quote"
  // Expect "Request a Quote" modal title to appear
})

it('shows history after confirming a selection', () => {
  // Confirm a selection
  // Expect History section to appear with the saved selection
})
```

### Validation
- [x] All existing Phase 2 + Phase 3 tests still pass (regression)
- [x] New Phase 4 flow tests pass

---

## Step 11: Final Phase 4 Verification

Run the full suite and verify everything:

```bash
npm run build        # zero errors, zero warnings
npm test             # all tests pass (Phase 1 + Phase 2 + Phase 3 + Phase 4)
npx tsc --noEmit     # type check passes
npm run dev          # manual check: full flow works
```

### Manual Test Script (run in browser via `npm run dev`)

| Step | Action | Expected Result |
|------|--------|----------------|
| 1 | Lock AR=16:9 + Height=100in, select first config, Confirm | Selection saved to localStorage. History panel appears at bottom showing "7×7 16:9 — ...". |
| 2 | Refresh the page | History panel loads from localStorage on mount. Previous selection visible. |
| 3 | Click history row | Confirmed view reloads with that config's grid, counter, and details. |
| 4 | Click delete (×) on history row | Row disappears. localStorage updated. |
| 5 | Lock 2 params, see results table | Click "Help me choose" (gold button). Modal opens with title "Request a Quote". |
| 6 | Fill name "Jane", email "jane@example.com", click Submit | Modal closes. Toast slides in from top: "Quote request received!". Toast auto-dismisses after 3s. |
| 7 | Confirm a selection, click "Receive Quote" | Modal opens. Submit a quote with phone number. Toast appears. |
| 8 | Submit with empty name | Validation error: "Name is required". Submit blocked. |
| 9 | Submit with invalid email "abc" | Validation error: "Enter a valid email address". Submit blocked. |
| 10 | Click Cancel or press Esc in modal | Modal closes. No toast. Form resets on next open. |
| 11 | Change unit to Feet, check History | History dimensions update to feet. |
| 12 | Open DevTools → Application → localStorage | `videowall_selections` contains JSON array. `videowall_quotes` contains quote submissions. |

### Checklist
- [x] `src/lib/storage.ts` — save/get/delete selections + quotes
- [x] `src/lib/storage.test.ts` — all tests pass
- [x] `src/components/Toast.tsx` — auto-dismiss notification
- [x] `src/components/ContactModal.tsx` — form with validation, Headless UI Dialog
- [x] `src/components/ContactModal.test.tsx` — all tests pass
- [x] `src/components/History.tsx` — saved selections list with delete + reload
- [x] `src/components/History.test.tsx` — all tests pass
- [x] `src/lib/types.ts` — `RELOAD_HISTORY` action added
- [x] `src/lib/reducer.ts` — `RELOAD_HISTORY` handler added
- [x] `src/App.tsx` — wired with all Phase 4 components, effects for persist + load
- [x] `src/App.test.tsx` — flow tests extended and passing
- [x] `npm run build` — clean
- [x] `npx tsc --noEmit` — clean
- [x] `npm test` — all green (Phase 1 + Phase 2 + Phase 3 + Phase 4 = regression clean)

### Files Created/Modified in Phase 4

```
src/
  lib/
    storage.ts          ← NEW
    storage.test.ts     ← NEW
    types.ts            ← MODIFIED (add RELOAD_HISTORY action)
    reducer.ts          ← MODIFIED (add RELOAD_HISTORY handler)
  components/
    ContactModal.tsx    ← NEW
    ContactModal.test.tsx ← NEW
    History.tsx         ← NEW
    History.test.tsx    ← NEW
    Toast.tsx           ← NEW
  App.tsx               ← MODIFIED (wire components, effects, toast state)
  App.test.tsx          ← MODIFIED (add Phase 4 flow tests)
```

**Total: 7 new files, 4 modified.** The full flow — input → results → select → confirm → auto-save → history → quote modal → toast — works end-to-end. All prior tests still pass.

### Implementation Notes
- Storage tests created alongside Step 1 (not deferred to Step 7) for immediate validation
- `ContactModal.test.tsx`: uses exact label text (`'Name *'`, `'Email *'`) to disambiguate from radio labels
- Headless UI Dialog `act(...)` warnings in stderr are benign — caused by internal Dialog state transitions, all tests pass correctly
- `App.test.tsx`: added `beforeEach(() => localStorage.clear())` to prevent cross-test contamination from auto-save effects
- All 97 tests pass (Phase 1: 26, Phase 2: 22, Phase 3: 22, Phase 4: 27)

---

## Phase 4 → Phase 5 Handoff

Phase 4 delivers:
- localStorage persistence for selections and quotes
- Contact/quote modal with form validation (accessible via Headless UI Dialog)
- History panel with delete + reload
- Toast notification on quote submission
- Auto-save on confirm, auto-load on mount
- `RELOAD_HISTORY` action for history → confirmed view restoration

Phase 5 picks up from here with:
- Responsive behavior polish (mobile stack, table scroll refinements)
- Edge case manual testing sweep
- Deploy to Vercel
- Record Loom walkthroughs
