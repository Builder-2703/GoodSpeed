import { describe, it, expect } from 'vitest'
import { calculate } from './calculate'
import { toMM, fromMM } from './units'
import type { Config } from './types'

// Helper: find config by cabinet type and position
function getConfig(results: Config[], cabinetType: string, position: 'lower' | 'upper') {
  const index = cabinetType === '16:9'
    ? (position === 'lower' ? 0 : 1)
    : (position === 'lower' ? 2 : 3)
  return results[index]!
}

describe('calculate', () => {

  // --- PRD Test Case 1: AR 16:9 + Height 100" — 16:9 cabinet ---
  describe('AR 16:9 + Height 100 inches', () => {
    const results = calculate({
      combo: 'ar_height',
      ar: 16 / 9,
      height: toMM(100, 'in'),
    })

    it('returns 4 results', () => {
      expect(results).toHaveLength(4)
    })

    it('16:9 lower: 7x7', () => {
      const c = getConfig(results, '16:9', 'lower')
      expect(c.cols).toBe(7)
      expect(c.rows).toBe(7)
      expect(c.totalCabinets).toBe(49)
      expect(fromMM(c.heightMM, 'in')).toBeCloseTo(93.01, 1)
      expect(c.aspectRatio).toBeCloseTo(1.78, 1)
    })

    it('16:9 upper: 8x8', () => {
      const c = getConfig(results, '16:9', 'upper')
      expect(c.cols).toBe(8)
      expect(c.rows).toBe(8)
      expect(c.totalCabinets).toBe(64)
      expect(fromMM(c.heightMM, 'in')).toBeCloseTo(106.30, 1)
      expect(c.aspectRatio).toBeCloseTo(1.78, 1)
    })

    // --- PRD Test Case 2: same input, 1:1 cabinet ---
    it('1:1 lower: 9x5', () => {
      const c = getConfig(results, '1:1', 'lower')
      expect(c.cols).toBe(9)
      expect(c.rows).toBe(5)
      expect(fromMM(c.heightMM, 'in')).toBeCloseTo(98.43, 1)
      expect(c.aspectRatio).toBeCloseTo(1.8, 1)
    })

    it('1:1 upper: 11x6', () => {
      const c = getConfig(results, '1:1', 'upper')
      expect(c.cols).toBe(11)
      expect(c.rows).toBe(6)
      expect(fromMM(c.heightMM, 'in')).toBeCloseTo(118.11, 1)
      expect(c.aspectRatio).toBeCloseTo(1.83, 1)
    })
  })

  // --- PRD Test Case 3: Width 100" + Diagonal 200" — 16:9 cabinet ---
  describe('Width 100" + Diagonal 200"', () => {
    const results = calculate({
      combo: 'width_diagonal',
      width: toMM(100, 'in'),
      diagonal: toMM(200, 'in'),
    })

    it('16:9 lower: 4x13', () => {
      const c = getConfig(results, '16:9', 'lower')
      expect(c.cols).toBe(4)
      expect(c.rows).toBe(13)
      expect(fromMM(c.widthMM, 'in')).toBeCloseTo(94.49, 1)
      expect(fromMM(c.diagonalMM, 'in')).toBeCloseTo(196.89, 0)
    })

    it('16:9 upper: 5x14', () => {
      const c = getConfig(results, '16:9', 'upper')
      expect(c.cols).toBe(5)
      expect(c.rows).toBe(14)
    })
  })

  // --- Edge cases ---
  describe('edge cases', () => {

    it('exact match: floor === ceil, upper is +1', () => {
      // 16:9 cab height = 337.5mm. 5 rows = 1687.5mm exactly.
      const results = calculate({
        combo: 'ar_height',
        ar: 16 / 9,
        height: 337.5 * 5,  // exactly 5 rows
      })
      const lower = getConfig(results, '16:9', 'lower')
      const upper = getConfig(results, '16:9', 'upper')
      expect(lower.rows).toBe(5)
      expect(upper.rows).toBe(6)
    })

    it('very small input: clamps to minimum 1x1', () => {
      const results = calculate({
        combo: 'height_width',
        height: 1,  // 1mm
        width: 1,   // 1mm
      })
      const lower = getConfig(results, '16:9', 'lower')
      expect(lower.rows).toBeGreaterThanOrEqual(1)
      expect(lower.cols).toBeGreaterThanOrEqual(1)
    })

    it('AR + Width combo works', () => {
      const results = calculate({
        combo: 'ar_width',
        ar: 16 / 9,
        width: toMM(100, 'in'),
      })
      expect(results).toHaveLength(4)
      for (const c of results) {
        expect(c.rows).toBeGreaterThanOrEqual(1)
        expect(c.cols).toBeGreaterThanOrEqual(1)
        expect(c.aspectRatio).toBeGreaterThan(0)
      }
    })

    it('AR + Diagonal combo works', () => {
      const results = calculate({
        combo: 'ar_diagonal',
        ar: 16 / 9,
        diagonal: toMM(200, 'in'),
      })
      expect(results).toHaveLength(4)
    })

    it('Height + Width combo works', () => {
      const results = calculate({
        combo: 'height_width',
        height: toMM(100, 'in'),
        width: toMM(200, 'in'),
      })
      expect(results).toHaveLength(4)
    })

    it('Height + Diagonal combo works', () => {
      const results = calculate({
        combo: 'height_diagonal',
        height: toMM(100, 'in'),
        diagonal: toMM(200, 'in'),
      })
      expect(results).toHaveLength(4)
    })
  })
})
