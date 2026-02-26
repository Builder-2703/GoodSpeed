import type { CalcInput, Config } from './types'

/**
 * Returns the index (0-3) of the config that is the closest
 * overall match to the user's input.
 *
 * Scoring: sum of normalized errors for each locked parameter.
 * Lower score = closer match.
 */
export function findNearestIndex(
  results: Config[],
  input: CalcInput
): number {
  let bestIndex = 0
  let bestScore = Infinity

  for (let i = 0; i < results.length; i++) {
    const config = results[i]!
    let score = 0

    switch (input.combo) {
      case 'ar_height':
        score += Math.abs(config.heightMM - input.height) / input.height
        score += Math.abs(config.aspectRatio - input.ar) / input.ar
        break
      case 'ar_width':
        score += Math.abs(config.widthMM - input.width) / input.width
        score += Math.abs(config.aspectRatio - input.ar) / input.ar
        break
      case 'ar_diagonal':
        score += Math.abs(config.diagonalMM - input.diagonal) / input.diagonal
        score += Math.abs(config.aspectRatio - input.ar) / input.ar
        break
      case 'height_width':
        score += Math.abs(config.heightMM - input.height) / input.height
        score += Math.abs(config.widthMM - input.width) / input.width
        break
      case 'height_diagonal':
        score += Math.abs(config.heightMM - input.height) / input.height
        score += Math.abs(config.diagonalMM - input.diagonal) / input.diagonal
        break
      case 'width_diagonal':
        score += Math.abs(config.widthMM - input.width) / input.width
        score += Math.abs(config.diagonalMM - input.diagonal) / input.diagonal
        break
    }

    if (score < bestScore) {
      bestScore = score
      bestIndex = i
    }
  }

  return bestIndex
}
