import { Fragment } from 'react'
import { HelpCircle } from 'lucide-react'
import type { AppState, Action, Config, Param, Unit } from '../lib/types'
import { ASPECT_RATIOS } from '../lib/config'
import { fromMM } from '../lib/units'

type ResultsTableProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

// --- Helper functions ---

function formatDimension(mm: number, unit: Unit): string {
  return fromMM(mm, unit).toFixed(2)
}

function formatAR(config: Config): string {
  const match = ASPECT_RATIOS.find(
    ar => Math.abs(ar.value - config.aspectRatio) < 0.01
  )
  if (match) return `${match.label} (${config.aspectRatio.toFixed(2)})`
  return `${config.aspectRatio.toFixed(2)}:1`
}

function formatEntryAR(arValue: number): string {
  const match = ASPECT_RATIOS.find(
    ar => Math.abs(ar.value - arValue) < 0.01
  )
  if (match) return `${match.label} (${arValue.toFixed(2)})`
  return `${arValue.toFixed(2)}:1`
}

// --- Row definitions ---

function buildDimensionRows(unit: Unit) {
  const rows: {
    key: string
    label: string
    getValue: (c: Config) => string
    entryParam?: Param
  }[] = [
    {
      key: 'width',
      label: 'Width',
      getValue: (c) => formatDimension(c.widthMM, unit),
      entryParam: 'width',
    },
    {
      key: 'height',
      label: 'Height',
      getValue: (c) => formatDimension(c.heightMM, unit),
      entryParam: 'height',
    },
    {
      key: 'diagonal',
      label: 'Diagonal',
      getValue: (c) => formatDimension(c.diagonalMM, unit),
      entryParam: 'diagonal',
    },
    {
      key: 'ar',
      label: 'Aspect Ratio',
      getValue: (c) => formatAR(c),
      entryParam: 'aspectRatio',
    },
  ]
  return rows
}

const UNIT_SHORT: Record<Unit, string> = {
  mm: 'mm',
  m: 'm',
  ft: 'ft',
  in: 'in',
}

export default function ResultsTable({ state, dispatch }: ResultsTableProps) {
  const results = state.results
  if (!results) return null

  const dimensionRows = buildDimensionRows(state.unit)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Choose a Size</h2>
          <p className="text-sm text-gray-500 mt-1">
            The following size options are the closest configurations to your input parameters.
          </p>
        </div>
        <button
          onClick={() => dispatch({ type: 'OPEN_MODAL', source: 'help' })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D4A843] text-white text-sm font-medium rounded-md hover:bg-[#c49a3a] transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
          Help me choose
        </button>
      </div>

      {/* Table wrapper — horizontal scroll on narrow screens */}
      <div className="relative">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            {/* Column Headers */}
            <thead>
              <tr>
                <th className="w-28" />
                {results.map((config, i) => (
                  <th key={i} className="text-center px-3 pb-3">
                    {/* Nearest Size badge — invisible spacer on non-nearest columns for alignment */}
                    <span
                      className={`inline-block text-xs px-2 py-0.5 mb-2 ${
                        i === state.nearestIndex
                          ? 'bg-[#5B9A8B] text-white font-semibold rounded-full'
                          : 'invisible'
                      }`}
                      aria-hidden={i !== state.nearestIndex}
                    >
                      {i === state.nearestIndex ? 'Nearest Size' : '\u00A0'}
                    </span>
                    {/* Grid size */}
                    <p className="text-4xl font-black text-gray-900">
                      {config.cols}x{config.rows}
                    </p>
                    {/* Cabinet label + lower/upper */}
                    <p className="text-sm text-gray-500 mt-1">
                      {config.cabinetType} Cabinet — {i % 2 === 0 ? 'Lower' : 'Upper'}
                    </p>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Dimension rows */}
            <tbody className="divide-y divide-gray-200">
              {dimensionRows.map((row) => (
                <Fragment key={row.key}>
                  {/* Achieved value row */}
                  <tr>
                    <td className="py-2 pr-3 text-sm font-medium text-gray-700">
                      {row.label}
                      {row.key !== 'ar' && (
                        <span className="text-gray-400 ml-1">({UNIT_SHORT[state.unit]})</span>
                      )}
                    </td>
                    {results.map((config, i) => (
                      <td key={i} className="py-2 text-center text-sm text-gray-900">
                        {row.getValue(config)}
                      </td>
                    ))}
                  </tr>

                  {/* Entry row — only for locked params */}
                  {row.entryParam && state.locks[row.entryParam] && (
                    <tr>
                      <td className="py-1 pr-3 text-sm text-gray-400 italic">
                        Entry
                      </td>
                      {results.map((_config, i) => (
                        <td key={i} className="py-1 text-center text-sm text-gray-400">
                          {row.entryParam === 'aspectRatio'
                            ? formatEntryAR(state.values.aspectRatio)
                            : formatDimension(state.values[row.entryParam!], state.unit)
                          }
                        </td>
                      ))}
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>

            {/* Radio selection row */}
            <tfoot>
              <tr className="border-t border-gray-200">
                <td className="py-3 pr-3 text-sm font-medium text-gray-700">
                  Select
                </td>
                {results.map((_config, i) => (
                  <td key={i} className="py-3 text-center">
                    <input
                      type="radio"
                      name="config-select"
                      checked={state.selectedIndex === i}
                      onChange={() => dispatch({ type: 'SELECT_OPTION', index: i })}
                      className="h-4 w-4 text-[#5B9A8B] focus:ring-[#5B9A8B] cursor-pointer"
                    />
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Right-edge gradient shadow hint when scrollable */}
        <div className="absolute top-0 right-0 bottom-0 w-6 pointer-events-none bg-gradient-to-l from-white to-transparent md:hidden" />
      </div>

      {/* Cancel / Confirm buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => dispatch({ type: 'CANCEL' })}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => dispatch({ type: 'CONFIRM' })}
          disabled={state.selectedIndex === null}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            state.selectedIndex === null
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-[#5B9A8B] text-white hover:bg-[#4e8a7b]'
          }`}
        >
          Confirm
        </button>
      </div>
    </div>
  )
}
