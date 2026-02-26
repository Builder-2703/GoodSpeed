import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

// Helper: lock AR (16:9) + Height (100in) to trigger results
function lockARAndHeight() {
  render(<App />)

  // Lock Aspect Ratio: select 16:9 from dropdown, then click its lock icon
  const arSelect = screen.getAllByDisplayValue('Aspect Ratio')[0] as HTMLSelectElement
  fireEvent.change(arSelect, { target: { value: String(16 / 9) } })
  // Lock buttons are ordered: Diagonal, AR, Width, Height
  const lockButtons = screen.getAllByLabelText('Lock parameter')
  fireEvent.click(lockButtons[1]!) // AR lock

  // Lock Height: the text inputs are ordered Diagonal, Width, Height (AR is a dropdown)
  const textInputs = screen.getAllByPlaceholderText('0.00')
  fireEvent.change(textInputs[2]!, { target: { value: '100' } })
  // Apply buttons are ordered: Diagonal, Width, Height
  const applyButtons = screen.getAllByText('apply')
  fireEvent.click(applyButtons[2]!) // Height apply
}

// Helper: lock → select → confirm (full flow)
function lockSelectConfirm() {
  lockARAndHeight()

  const radios = screen.getAllByRole('radio')
  fireEvent.click(radios[0]!)
  fireEvent.click(screen.getByText('Confirm'))
}

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // --- Phase 2 smoke tests (unchanged) ---

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
    expect(screen.getAllByText('Aspect Ratio').length).toBeGreaterThanOrEqual(1)
  })

  it('shows unit dropdown defaulting to Inches', () => {
    render(<App />)
    const select = screen.getByDisplayValue('Inches')
    expect(select).toBeDefined()
  })

  // --- Phase 3 integration tests ---

  it('does not show results table before locking 2 params', () => {
    render(<App />)
    expect(screen.queryByText('Choose a Size')).toBeNull()
  })

  it('shows results table after locking 2 params', () => {
    lockARAndHeight()

    // Results table should now be visible
    expect(screen.getByText('Choose a Size')).toBeDefined()
    expect(screen.getByText('Nearest Size')).toBeDefined()
    // Should show 4 radio buttons
    expect(screen.getAllByRole('radio').length).toBe(4)
  })

  it('shows grid and counter after selecting and confirming', () => {
    lockSelectConfirm()

    // Counter and grid should appear
    expect(screen.getByText('Columns')).toBeDefined()
    expect(screen.getByText('Rows')).toBeDefined()
    expect(screen.getByText('Selected')).toBeDefined()
    expect(document.querySelector('svg')).not.toBeNull()
  })

  it('hides results and grid when a param is unlocked', () => {
    lockARAndHeight()

    expect(screen.getByText('Choose a Size')).toBeDefined()

    // Unlock AR by clicking its lock icon (now shows as "Unlock parameter")
    const unlockButtons = screen.getAllByLabelText('Unlock parameter')
    fireEvent.click(unlockButtons[0]!)

    // Results should disappear
    expect(screen.queryByText('Choose a Size')).toBeNull()
  })

  // --- Phase 4 integration tests ---

  it('shows "Receive Quote" button after confirming', () => {
    lockSelectConfirm()

    // "Receive Quote" should replace the dashed placeholder
    expect(screen.getByText('Receive Quote')).toBeDefined()
    // Dashed placeholder should be gone
    expect(screen.queryByText(/Receive Quote button — Phase 4/)).toBeNull()
  })

  it('opens quote modal when "Receive Quote" clicked', () => {
    lockSelectConfirm()

    fireEvent.click(screen.getByText('Receive Quote'))

    // Modal should open with "Request a Quote" title
    expect(screen.getByText('Request a Quote')).toBeDefined()
    expect(screen.getByText('Submit')).toBeDefined()
  })

  it('shows history after confirming a selection', () => {
    lockSelectConfirm()

    // History section should appear with the saved selection
    expect(screen.getByText('History')).toBeDefined()
  })
})
