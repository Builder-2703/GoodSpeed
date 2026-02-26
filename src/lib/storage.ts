import type { SavedSelection, QuoteRequest } from './types'

const SELECTIONS_KEY = 'videowall_selections'
const QUOTES_KEY = 'videowall_quotes'

export function saveSelection(selection: SavedSelection): void {
  const existing = getSelections()
  const isDuplicate = existing.some(
    s =>
      s.rows === selection.rows &&
      s.cols === selection.cols &&
      s.cabinetType === selection.cabinetType &&
      s.widthMM === selection.widthMM &&
      s.heightMM === selection.heightMM
  )
  if (isDuplicate) return
  existing.unshift(selection)
  localStorage.setItem(SELECTIONS_KEY, JSON.stringify(existing))
}

export function getSelections(): SavedSelection[] {
  try {
    const raw = localStorage.getItem(SELECTIONS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavedSelection[]
  } catch {
    return []
  }
}

export function deleteSelection(id: string): void {
  const existing = getSelections()
  const filtered = existing.filter(s => s.id !== id)
  localStorage.setItem(SELECTIONS_KEY, JSON.stringify(filtered))
}

export function saveQuote(quote: QuoteRequest): void {
  const existing = getQuotes()
  existing.unshift(quote)
  localStorage.setItem(QUOTES_KEY, JSON.stringify(existing))
}

export function getQuotes(): QuoteRequest[] {
  try {
    const raw = localStorage.getItem(QUOTES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as QuoteRequest[]
  } catch {
    return []
  }
}
