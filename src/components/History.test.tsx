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
    expect(screen.getByText('History')).toBeDefined()
    expect(screen.getByText(/7×7/)).toBeDefined()
    expect(screen.getByText(/9×5/)).toBeDefined()
  })

  it('shows relative timestamps', () => {
    const dispatch = vi.fn()
    render(<History history={mockHistory} unit="in" dispatch={dispatch} />)
    expect(screen.getByText(/2m ago/)).toBeDefined()
    expect(screen.getByText(/5m ago/)).toBeDefined()
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
    const loadButtons = screen.getAllByLabelText(/Load .* configuration/)
    fireEvent.click(loadButtons[0]!)
    expect(dispatch).toHaveBeenCalledWith({
      type: 'RELOAD_HISTORY',
      selection: mockHistory[0],
    })
  })

  it('displays dimensions in current unit', () => {
    const dispatch = vi.fn()
    // 4200mm = 165.35in, 2362.5mm = 93.01in
    render(<History history={mockHistory} unit="in" dispatch={dispatch} />)
    expect(screen.getByText(/165\.4/)).toBeDefined()
    expect(screen.getByText(/93\.0/)).toBeDefined()
  })
})
