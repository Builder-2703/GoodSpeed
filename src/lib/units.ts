import type { Unit } from './types'
import { MM_PER_UNIT } from './config'

export function toMM(value: number, unit: Unit): number {
  return value * MM_PER_UNIT[unit]
}

export function fromMM(mm: number, unit: Unit): number {
  return mm / MM_PER_UNIT[unit]
}
