import { describe, it, expect } from 'vitest'
import { findNearestIndex } from './nearest'
import { calculate } from './calculate'
import { toMM } from './units'

describe('findNearestIndex', () => {
  it('AR 16:9 + Height 100": nearest is 1:1 lower (index 2, 9x5)', () => {
    const input = {
      combo: 'ar_height' as const,
      ar: 16 / 9,
      height: toMM(100, 'in'),
    }
    const results = calculate(input)
    const nearest = findNearestIndex(results, input)
    // 1:1 lower (9x5) has height ~98.43" which is closest to 100"
    // and AR ~1.8 which is close to 1.778
    expect(nearest).toBe(2)
  })

  it('returns 0 for empty-ish results that still have entries', () => {
    const input = {
      combo: 'height_width' as const,
      height: toMM(50, 'in'),
      width: toMM(100, 'in'),
    }
    const results = calculate(input)
    const nearest = findNearestIndex(results, input)
    // Should return a valid index
    expect(nearest).toBeGreaterThanOrEqual(0)
    expect(nearest).toBeLessThan(results.length)
  })
})
