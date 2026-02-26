import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ResultsTable from './ResultsTable'
import { initialState, reducer } from '../lib/reducer'
import { toMM } from '../lib/units'
import type { AppState } from '../lib/types'

// Helper: build a state with 2 locked params and results
function stateWithResults(): AppState {
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
  return state
}

describe('ResultsTable', () => {
  it('renders 4 column headers with grid sizes', () => {
    const state = stateWithResults()
    const dispatch = vi.fn()
    render(<ResultsTable state={state} dispatch={dispatch} />)

    // Should show "Choose a Size" heading
    expect(screen.getByText('Choose a Size')).toBeDefined()

    // Should show 4 grid size labels
    const results = state.results!
    for (const config of results) {
      expect(screen.getByText(`${config.cols}x${config.rows}`)).toBeDefined()
    }
  })

  it('shows Nearest Size badge on correct column', () => {
    const state = stateWithResults()
    const dispatch = vi.fn()
    render(<ResultsTable state={state} dispatch={dispatch} />)

    expect(screen.getByText('Nearest Size')).toBeDefined()
  })

  it('shows entry rows only for locked params', () => {
    const state = stateWithResults()
    const dispatch = vi.fn()
    render(<ResultsTable state={state} dispatch={dispatch} />)

    // AR and Height are locked → should show entry rows for them
    expect(state.locks.aspectRatio).toBe(true)
    expect(state.locks.height).toBe(true)
    expect(state.locks.width).toBe(false)
    expect(state.locks.diagonal).toBe(false)

    // Entry rows should exist (2 "Entry" labels: one for Height, one for AR)
    const entryLabels = screen.getAllByText('Entry')
    expect(entryLabels.length).toBe(2) // only height + AR locked
  })

  it('dispatches SELECT_OPTION when radio clicked', () => {
    const state = stateWithResults()
    const dispatch = vi.fn()
    render(<ResultsTable state={state} dispatch={dispatch} />)

    const radios = screen.getAllByRole('radio')
    fireEvent.click(radios[1]!)
    expect(dispatch).toHaveBeenCalledWith({ type: 'SELECT_OPTION', index: 1 })
  })

  it('dispatches CONFIRM when confirm clicked with selection', () => {
    let state = stateWithResults()
    state = { ...state, selectedIndex: 0 }
    const dispatch = vi.fn()
    render(<ResultsTable state={state} dispatch={dispatch} />)

    fireEvent.click(screen.getByText('Confirm'))
    expect(dispatch).toHaveBeenCalledWith({ type: 'CONFIRM' })
  })

  it('confirm button is disabled when no selection', () => {
    const state = stateWithResults()
    const dispatch = vi.fn()
    render(<ResultsTable state={state} dispatch={dispatch} />)

    const confirmBtn = screen.getByText('Confirm')
    expect(confirmBtn.closest('button')!.disabled).toBe(true)
  })

  it('dispatches CANCEL when cancel clicked', () => {
    let state = stateWithResults()
    state = { ...state, selectedIndex: 0 }
    const dispatch = vi.fn()
    render(<ResultsTable state={state} dispatch={dispatch} />)

    fireEvent.click(screen.getByText('Cancel'))
    expect(dispatch).toHaveBeenCalledWith({ type: 'CANCEL' })
  })

  it('dispatches OPEN_MODAL with help source on Help me choose click', () => {
    const state = stateWithResults()
    const dispatch = vi.fn()
    render(<ResultsTable state={state} dispatch={dispatch} />)

    fireEvent.click(screen.getByText(/Help me choose/))
    expect(dispatch).toHaveBeenCalledWith({ type: 'OPEN_MODAL', source: 'help' })
  })

  it('returns null when state.results is null', () => {
    const dispatch = vi.fn()
    const { container } = render(<ResultsTable state={initialState} dispatch={dispatch} />)
    expect(container.innerHTML).toBe('')
  })
})
