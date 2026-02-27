import type { Config, Unit } from '../lib/types'
import { CABINETS } from '../lib/config'
import { fromMM } from '../lib/units'

type WallGridProps = {
  config: Config
  unit: Unit
}

// --- SVG Layout Constants ---
const PADDING = 80
const CELL_BASE = 40 // base size for the shorter dimension
const MAX_CELLS = 50
const ARROW_OFFSET = 30
const ARROWHEAD_SIZE = 8

const UNIT_LABELS: Record<Unit, string> = {
  mm: 'mm',
  m: 'm',
  ft: 'ft',
  in: 'in',
}

export default function WallGrid({ config, unit }: WallGridProps) {
  const displayCols = Math.min(config.cols, MAX_CELLS)
  const displayRows = Math.min(config.rows, MAX_CELLS)

  // Use actual cabinet proportions for cell dimensions
  const cab = CABINETS[config.cabinetType]
  const cabAR = cab.width / cab.height // e.g. 1.78 for 16:9, 1.0 for 1:1
  const cellW = cabAR >= 1 ? CELL_BASE * cabAR : CELL_BASE
  const cellH = cabAR >= 1 ? CELL_BASE : CELL_BASE / cabAR

  const gridWidth = displayCols * cellW
  const gridHeight = displayRows * cellH
  const totalWidth = gridWidth + PADDING * 2
  const totalHeight = gridHeight + PADDING * 2

  const widthDisplay = fromMM(config.widthMM, unit).toFixed(2)
  const heightDisplay = fromMM(config.heightMM, unit).toFixed(2)
  const diagonalDisplay = fromMM(config.diagonalMM, unit).toFixed(2)

  const unitLabel = UNIT_LABELS[unit]

  // Diagonal angle: bottom-left to top-right
  const diagonalAngle = -Math.atan2(gridHeight, gridWidth) * (180 / Math.PI)

  // Diagonal midpoint
  const diagMidX = PADDING + gridWidth / 2
  const diagMidY = PADDING + gridHeight / 2

  const isCapped = config.rows > MAX_CELLS || config.cols > MAX_CELLS

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        className="max-w-full"
      >
        <defs>
          {/* Outward-pointing arrowhead for line start (points away from line) */}
          <marker
            id="arrowhead-start"
            markerWidth={ARROWHEAD_SIZE}
            markerHeight={ARROWHEAD_SIZE}
            refX={ARROWHEAD_SIZE}
            refY={ARROWHEAD_SIZE / 2}
            orient="auto"
          >
            <polygon
              points={`${ARROWHEAD_SIZE},0 0,${ARROWHEAD_SIZE / 2} ${ARROWHEAD_SIZE},${ARROWHEAD_SIZE}`}
              fill="#6B7280"
            />
          </marker>
          {/* Outward-pointing arrowhead for line end (points away from line) */}
          <marker
            id="arrowhead-end"
            markerWidth={ARROWHEAD_SIZE}
            markerHeight={ARROWHEAD_SIZE}
            refX={0}
            refY={ARROWHEAD_SIZE / 2}
            orient="auto"
          >
            <polygon
              points={`0,0 ${ARROWHEAD_SIZE},${ARROWHEAD_SIZE / 2} 0,${ARROWHEAD_SIZE}`}
              fill="#6B7280"
            />
          </marker>
        </defs>

        {/* Grid cells */}
        <g transform={`translate(${PADDING}, ${PADDING})`}>
          {Array.from({ length: displayRows }, (_, row) =>
            Array.from({ length: displayCols }, (_, col) => (
              <rect
                key={`${row}-${col}`}
                className="grid-cell"
                x={col * cellW}
                y={row * cellH}
                width={cellW}
                height={cellH}
                fill="#F5F5F5"
                stroke="#D1D5DB"
                strokeWidth={1}
              />
            ))
          )}
        </g>

        {/* Width arrow (horizontal, above grid) */}
        <line
          x1={PADDING}
          y1={PADDING - ARROW_OFFSET}
          x2={PADDING + gridWidth}
          y2={PADDING - ARROW_OFFSET}
          stroke="#6B7280"
          strokeWidth={1.5}
          markerStart="url(#arrowhead-start)"
          markerEnd="url(#arrowhead-end)"
        />
        <text
          x={PADDING + gridWidth / 2}
          y={PADDING - ARROW_OFFSET - 10}
          textAnchor="middle"
          fill="#374151"
          fontSize={12}
          fontWeight={600}
        >
          {widthDisplay} {unitLabel} ({config.cols} columns)
        </text>

        {/* Height arrow (vertical, left of grid) */}
        <line
          x1={PADDING - ARROW_OFFSET}
          y1={PADDING}
          x2={PADDING - ARROW_OFFSET}
          y2={PADDING + gridHeight}
          stroke="#6B7280"
          strokeWidth={1.5}
          markerStart="url(#arrowhead-start)"
          markerEnd="url(#arrowhead-end)"
        />
        <text
          x={PADDING - ARROW_OFFSET - 10}
          y={PADDING + gridHeight / 2}
          textAnchor="middle"
          fill="#374151"
          fontSize={12}
          fontWeight={600}
          transform={`rotate(-90, ${PADDING - ARROW_OFFSET - 10}, ${PADDING + gridHeight / 2})`}
        >
          {heightDisplay} {unitLabel} ({config.rows} rows)
        </text>

        {/* Diagonal line (bottom-left to top-right) */}
        <line
          x1={PADDING}
          y1={PADDING + gridHeight}
          x2={PADDING + gridWidth}
          y2={PADDING}
          stroke="#9CA3AF"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        {/* Diagonal label */}
        <text
          x={diagMidX}
          y={diagMidY}
          textAnchor="middle"
          fill="#6B7280"
          fontSize={11}
          fontWeight={500}
          transform={`rotate(${diagonalAngle}, ${diagMidX}, ${diagMidY})`}
          dy={-8}
        >
          {diagonalDisplay} {unitLabel}
        </text>
      </svg>

      {/* Capped note */}
      {isCapped && (
        <p className="text-xs text-gray-400 text-center mt-1">
          (simplified view — actual grid is {config.cols}x{config.rows})
        </p>
      )}
    </div>
  )
}
