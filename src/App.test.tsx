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
    // "Aspect Ratio" appears in both the label and the dropdown placeholder
    expect(screen.getAllByText('Aspect Ratio').length).toBeGreaterThanOrEqual(1)
  })

  it('shows unit dropdown defaulting to Inches', () => {
    render(<App />)
    const select = screen.getByDisplayValue('Inches')
    expect(select).toBeDefined()
  })
})
