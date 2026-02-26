import type { Cabinet, CabinetType, AspectRatioPreset, Unit } from './types'

export const CABINETS: Record<CabinetType, Cabinet> = {
  '16:9': { width: 600, height: 337.5 },
  '1:1':  { width: 500, height: 500 },
}

export const ASPECT_RATIOS: AspectRatioPreset[] = [
  { label: '16:9',  value: 16 / 9 },
  { label: '16:10', value: 16 / 10 },
  { label: '4:3',   value: 4 / 3 },
  { label: '1:1',   value: 1 },
  { label: '21:9',  value: 21 / 9 },
  { label: '32:9',  value: 32 / 9 },
]

export const MM_PER_UNIT: Record<Unit, number> = {
  mm: 1,
  m:  1000,
  ft: 304.8,
  in: 25.4,
}

export const CABINET_TYPES: CabinetType[] = Object.keys(CABINETS) as CabinetType[]
