import { describe, it, expect } from 'vitest'
import { toMM, fromMM } from './units'

describe('toMM', () => {
  it('mm is identity', () => {
    expect(toMM(100, 'mm')).toBe(100)
  })

  it('meters to mm', () => {
    expect(toMM(1, 'm')).toBe(1000)
    expect(toMM(2.5, 'm')).toBe(2500)
  })

  it('feet to mm', () => {
    expect(toMM(1, 'ft')).toBeCloseTo(304.8)
  })

  it('inches to mm', () => {
    expect(toMM(1, 'in')).toBeCloseTo(25.4)
    expect(toMM(100, 'in')).toBeCloseTo(2540)
  })
})

describe('fromMM', () => {
  it('mm is identity', () => {
    expect(fromMM(100, 'mm')).toBe(100)
  })

  it('mm to inches', () => {
    expect(fromMM(2540, 'in')).toBeCloseTo(100)
    expect(fromMM(25.4, 'in')).toBeCloseTo(1)
  })

  it('mm to meters', () => {
    expect(fromMM(1000, 'm')).toBe(1)
  })

  it('mm to feet', () => {
    expect(fromMM(304.8, 'ft')).toBeCloseTo(1)
  })

  it('round-trip: toMM then fromMM returns original', () => {
    const units: Array<'mm' | 'm' | 'ft' | 'in'> = ['mm', 'm', 'ft', 'in']
    for (const unit of units) {
      expect(fromMM(toMM(42.5, unit), unit)).toBeCloseTo(42.5)
    }
  })
})
