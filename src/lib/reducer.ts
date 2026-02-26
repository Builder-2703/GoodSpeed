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

    default: {
      // Exhaustive check: compile error if a new action type is unhandled
      action satisfies never
      return state
    }
  }
}
