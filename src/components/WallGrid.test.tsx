import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import WallGrid from './WallGrid'
import type { Config } from '../lib/types'

const sampleConfig: Config = {
  cabinetType: '16:9',
  rows: 7,
  cols: 7,
  totalCabinets: 49,
  widthMM: 4200,
  heightMM: 2362.5,
  diagonalMM: 4819,
  aspectRatio: 1.78,
}

describe('WallGrid', () => {
  it('renders an SVG element', () => {
    const { container } = render(<WallGrid config={sampleConfig} unit="in" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('renders correct number of cells (rows x cols)', () => {
    const { container } = render(<WallGrid config={sampleConfig} unit="in" />)
    const rects = container.querySelectorAll('rect.grid-cell')
    expect(rects.length).toBe(49) // 7 x 7
  })

  it('contains width label with columns text', () => {
    const { container } = render(<WallGrid config={sampleConfig} unit="in" />)
    const texts = container.querySelectorAll('text')
    const widthLabel = Array.from(texts).find(t => t.textContent?.includes('columns'))
    expect(widthLabel).not.toBeUndefined()
    expect(widthLabel!.textContent).toContain('7 columns')
  })

  it('contains height label with rows text', () => {
    const { container } = render(<WallGrid config={sampleConfig} unit="in" />)
    const texts = container.querySelectorAll('text')
    const heightLabel = Array.from(texts).find(t => t.textContent?.includes('rows'))
    expect(heightLabel).not.toBeUndefined()
    expect(heightLabel!.textContent).toContain('7 rows')
  })

  it('contains diagonal label with unit', () => {
    const { container } = render(<WallGrid config={sampleConfig} unit="in" />)
    const texts = container.querySelectorAll('text')
    const diagLabel = Array.from(texts).find(t =>
      t.textContent?.includes('in') && !t.textContent?.includes('columns') && !t.textContent?.includes('rows')
    )
    expect(diagLabel).not.toBeUndefined()
  })

  it('contains at least 3 lines (width arrow, height arrow, diagonal)', () => {
    const { container } = render(<WallGrid config={sampleConfig} unit="in" />)
    const lines = container.querySelectorAll('line')
    expect(lines.length).toBeGreaterThanOrEqual(3)
  })

  it('caps rendering at MAX_CELLS for large configs', () => {
    const largeConfig: Config = {
      ...sampleConfig,
      rows: 80,
      cols: 80,
      totalCabinets: 6400,
    }
    const { container } = render(<WallGrid config={largeConfig} unit="in" />)
    const rects = container.querySelectorAll('rect.grid-cell')
    // Should be capped at 50 x 50 = 2500 max
    expect(rects.length).toBe(2500)
  })

  it('shows simplified view note for large configs', () => {
    const largeConfig: Config = {
      ...sampleConfig,
      rows: 80,
      cols: 80,
      totalCabinets: 6400,
    }
    const { container } = render(<WallGrid config={largeConfig} unit="in" />)
    expect(container.textContent).toContain('simplified view')
    expect(container.textContent).toContain('80x80')
  })

  it('displays values in correct unit', () => {
    const { container } = render(<WallGrid config={sampleConfig} unit="ft" />)
    const texts = container.querySelectorAll('text')
    const widthLabel = Array.from(texts).find(t => t.textContent?.includes('ft'))
    expect(widthLabel).not.toBeUndefined()
  })
})
