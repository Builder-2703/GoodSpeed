// --- Domain Constants ---

export type CabinetType = '16:9' | '1:1'

export type Unit = 'mm' | 'm' | 'ft' | 'in'

export type Param = 'aspectRatio' | 'height' | 'width' | 'diagonal'

// --- Cabinet ---

export type Cabinet = {
  readonly width: number   // mm
  readonly height: number  // mm
}

// --- Aspect Ratio Preset ---

export type AspectRatioPreset = {
  readonly label: string   // e.g. "16:9"
  readonly value: number   // e.g. 1.7778
}

// --- Calculation Input ---

export type CalcInput =
  | { combo: 'ar_height';       ar: number; height: number }
  | { combo: 'ar_width';        ar: number; width: number }
  | { combo: 'ar_diagonal';     ar: number; diagonal: number }
  | { combo: 'height_width';    height: number; width: number }
  | { combo: 'height_diagonal'; height: number; diagonal: number }
  | { combo: 'width_diagonal';  width: number; diagonal: number }

// --- Calculation Output ---

export type Config = {
  cabinetType: CabinetType
  rows: number
  cols: number
  totalCabinets: number
  widthMM: number
  heightMM: number
  diagonalMM: number
  aspectRatio: number
}

// --- Persistence ---

export type SavedSelection = {
  id: string
  cabinetType: CabinetType
  rows: number
  cols: number
  widthMM: number
  heightMM: number
  diagonalMM: number
  aspectRatio: number
  totalCabinets: number
  inputParams: {
    combo: string
    values: Record<string, number>
    unit: Unit
  }
  savedAt: number
}

export type QuoteRequest = {
  id: string
  selectionId: string | null
  name: string
  contactMethod: 'email' | 'phone'
  contactValue: string
  submittedAt: number
}
