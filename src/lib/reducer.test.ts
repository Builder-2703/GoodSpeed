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
