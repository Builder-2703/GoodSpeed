import type { CalcInput, Config, Cabinet, CabinetType } from './types'
import { CABINETS, CABINET_TYPES } from './config'

// --- Helper: build a Config from (rows, cols) ---

function buildConfig(
  rows: number,
  cols: number,
  cabinetType: CabinetType,
  cabinet: Cabinet
): Config {
  const widthMM = cols * cabinet.width
  const heightMM = rows * cabinet.height
  return {
    cabinetType,
    rows,
    cols,
    totalCabinets: rows * cols,
    widthMM,
    heightMM,
    diagonalMM: Math.sqrt(widthMM ** 2 + heightMM ** 2),
    aspectRatio: widthMM / heightMM,
  }
}

// --- Helper: lower/upper for a single axis ---

function floorCeil(exact: number): [number, number] {
  const lower = Math.max(Math.floor(exact), 1)
  let upper = Math.ceil(exact)
  if (upper <= lower) upper = lower + 1
  return [lower, upper]
}

// --- Category A: AR + one dimension ---

function calcARHeight(
  targetAR: number,
  targetH: number,
  cabinetType: CabinetType,
  cab: Cabinet
): [Config, Config] {
  const [rowsLower, rowsUpper] = floorCeil(targetH / cab.height)

  function colsForRows(rows: number): number {
    const actualH = rows * cab.height
    const desiredW = actualH * targetAR
    return Math.max(Math.round(desiredW / cab.width), 1)
  }

  return [
    buildConfig(rowsLower, colsForRows(rowsLower), cabinetType, cab),
    buildConfig(rowsUpper, colsForRows(rowsUpper), cabinetType, cab),
  ]
}

function calcARWidth(
  targetAR: number,
  targetW: number,
  cabinetType: CabinetType,
  cab: Cabinet
): [Config, Config] {
  const [colsLower, colsUpper] = floorCeil(targetW / cab.width)

  function rowsForCols(cols: number): number {
    const actualW = cols * cab.width
    const desiredH = actualW / targetAR
    return Math.max(Math.round(desiredH / cab.height), 1)
  }

  return [
    buildConfig(rowsForCols(colsLower), colsLower, cabinetType, cab),
    buildConfig(rowsForCols(colsUpper), colsUpper, cabinetType, cab),
  ]
}

function calcARDiagonal(
  targetAR: number,
  targetD: number,
  cabinetType: CabinetType,
  cab: Cabinet
): [Config, Config] {
  const targetH = targetD / Math.sqrt(1 + targetAR ** 2)
  return calcARHeight(targetAR, targetH, cabinetType, cab)
}

// --- Category B: two physical dimensions ---

function calcHeightWidth(
  targetH: number,
  targetW: number,
  cabinetType: CabinetType,
  cab: Cabinet
): [Config, Config] {
  const [rowsLower, rowsUpper] = floorCeil(targetH / cab.height)
  const [colsLower, colsUpper] = floorCeil(targetW / cab.width)

  return [
    buildConfig(rowsLower, colsLower, cabinetType, cab),
    buildConfig(rowsUpper, colsUpper, cabinetType, cab),
  ]
}

function calcHeightDiagonal(
  targetH: number,
  targetD: number,
  cabinetType: CabinetType,
  cab: Cabinet
): [Config, Config] {
  const targetW = Math.sqrt(targetD ** 2 - targetH ** 2)
  return calcHeightWidth(targetH, targetW, cabinetType, cab)
}

function calcWidthDiagonal(
  targetW: number,
  targetD: number,
  cabinetType: CabinetType,
  cab: Cabinet
): [Config, Config] {
  const targetH = Math.sqrt(targetD ** 2 - targetW ** 2)
  return calcHeightWidth(targetH, targetW, cabinetType, cab)
}

// --- Router: dispatch to correct combo ---

function calculateForCabinet(
  input: CalcInput,
  cabinetType: CabinetType,
  cab: Cabinet
): [Config, Config] {
  switch (input.combo) {
    case 'ar_height':
      return calcARHeight(input.ar, input.height, cabinetType, cab)
    case 'ar_width':
      return calcARWidth(input.ar, input.width, cabinetType, cab)
    case 'ar_diagonal':
      return calcARDiagonal(input.ar, input.diagonal, cabinetType, cab)
    case 'height_width':
      return calcHeightWidth(input.height, input.width, cabinetType, cab)
    case 'height_diagonal':
      return calcHeightDiagonal(input.height, input.diagonal, cabinetType, cab)
    case 'width_diagonal':
      return calcWidthDiagonal(input.width, input.diagonal, cabinetType, cab)
  }
}

// --- Public API ---
// Returns [16:9 lower, 16:9 upper, 1:1 lower, 1:1 upper]

export function calculate(input: CalcInput): Config[] {
  const results: Config[] = []

  for (const cabinetType of CABINET_TYPES) {
    const cab = CABINETS[cabinetType]
    const [lower, upper] = calculateForCabinet(input, cabinetType, cab)
    results.push(lower, upper)
  }

  return results
}
