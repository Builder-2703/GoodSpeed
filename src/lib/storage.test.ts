import { describe, it, expect, beforeEach } from 'vitest'
import {
  saveSelection,
  getSelections,
  deleteSelection,
  saveQuote,
  getQuotes,
} from './storage'
import type { SavedSelection, QuoteRequest } from './types'

const mockSelection: SavedSelection = {
  id: 'sel-1',
  cabinetType: '16:9',
  rows: 7,
  cols: 7,
  widthMM: 4200,
  heightMM: 2362.5,
  diagonalMM: 4819,
  aspectRatio: 1.78,
  totalCabinets: 49,
  inputParams: {
    combo: 'ar_height',
    values: { aspectRatio: 1.78, height: 2540 },
    unit: 'in',
  },
  savedAt: Date.now(),
}

const mockQuote: QuoteRequest = {
  id: 'quote-1',
  selectionId: 'sel-1',
  name: 'John Doe',
  contactMethod: 'email',
  contactValue: 'john@example.com',
  submittedAt: Date.now(),
}

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('selections', () => {
    it('returns empty array when no selections saved', () => {
      expect(getSelections()).toEqual([])
    })

    it('saves and retrieves a selection', () => {
      saveSelection(mockSelection)
      const result = getSelections()
      expect(result.length).toBe(1)
      expect(result[0]!.id).toBe('sel-1')
    })

    it('prepends new selections (newest first)', () => {
      saveSelection(mockSelection)
      saveSelection({ ...mockSelection, id: 'sel-2', rows: 8, cols: 8, widthMM: 4800, heightMM: 2700 })
      const result = getSelections()
      expect(result[0]!.id).toBe('sel-2')
      expect(result[1]!.id).toBe('sel-1')
    })

    it('skips duplicate configs (same rows, cols, type, dimensions)', () => {
      saveSelection(mockSelection)
      saveSelection({ ...mockSelection, id: 'sel-dup' })
      const result = getSelections()
      expect(result.length).toBe(1)
      expect(result[0]!.id).toBe('sel-1')
    })

    it('deletes a selection by id', () => {
      saveSelection(mockSelection)
      saveSelection({ ...mockSelection, id: 'sel-2', rows: 8, cols: 8, widthMM: 4800, heightMM: 2700 })
      deleteSelection('sel-1')
      const result = getSelections()
      expect(result.length).toBe(1)
      expect(result[0]!.id).toBe('sel-2')
    })

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('videowall_selections', 'not-json')
      expect(getSelections()).toEqual([])
    })
  })

  describe('quotes', () => {
    it('returns empty array when no quotes saved', () => {
      expect(getQuotes()).toEqual([])
    })

    it('saves and retrieves a quote', () => {
      saveQuote(mockQuote)
      const result = getQuotes()
      expect(result.length).toBe(1)
      expect(result[0]!.name).toBe('John Doe')
    })

    it('handles corrupted localStorage gracefully', () => {
      localStorage.setItem('videowall_quotes', '{invalid}')
      expect(getQuotes()).toEqual([])
    })
  })
})
