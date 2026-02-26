import { useReducer, useEffect, useState, useCallback } from 'react'
import { reducer, initialState } from './lib/reducer'
import { getSelections, saveSelection, saveQuote } from './lib/storage'
import ParameterForm from './components/ParameterForm'
import ResultsTable from './components/ResultsTable'
import WallGrid from './components/WallGrid'
import ContactModal from './components/ContactModal'
import History from './components/History'
import Toast from './components/Toast'
import type { QuoteRequest, SavedSelection } from './lib/types'

function buildComboString(locks: Record<string, boolean>): string {
  return Object.entries(locks)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .sort()
    .join('_')
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Load history from localStorage on mount
  useEffect(() => {
    const history = getSelections()
    if (history.length > 0) {
      dispatch({ type: 'LOAD_HISTORY', history })
    }
  }, [])

  // Save to localStorage on confirm
  useEffect(() => {
    if (!state.confirmed) return

    const selection: SavedSelection = {
      id: crypto.randomUUID(),
      cabinetType: state.confirmed.cabinetType,
      rows: state.confirmed.rows,
      cols: state.confirmed.cols,
      widthMM: state.confirmed.widthMM,
      heightMM: state.confirmed.heightMM,
      diagonalMM: state.confirmed.diagonalMM,
      aspectRatio: state.confirmed.aspectRatio,
      totalCabinets: state.confirmed.totalCabinets,
      inputParams: {
        combo: buildComboString(state.locks),
        values: { ...state.values },
        unit: state.unit,
      },
      savedAt: Date.now(),
    }

    saveSelection(selection)
    dispatch({ type: 'LOAD_HISTORY', history: getSelections() })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- locks, values, and unit are always in sync when confirmed changes
  }, [state.confirmed])

  const handleQuoteSubmit = useCallback((quote: QuoteRequest) => {
    saveQuote(quote)
    dispatch({ type: 'CLOSE_MODAL' })
    setToastMessage('Quote request received!')
    setToastVisible(true)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-8">
        <ParameterForm state={state} dispatch={dispatch} />

        {state.results && (
          <ResultsTable state={state} dispatch={dispatch} />
        )}

        {state.confirmed && (
          <>
            {/* Confirmed Summary Header */}
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wide">Selected</p>
              <p className="text-lg font-semibold text-gray-900">
                {state.confirmed.cabinetType} Cabinet System
              </p>
            </div>

            {/* Row/Column Counter */}
            <div className="flex items-center justify-center gap-8 sm:gap-12">
              <div className="text-center">
                <p className="text-4xl sm:text-5xl font-black text-gray-900">{state.confirmed.cols}</p>
                <p className="text-sm text-gray-500">Columns</p>
              </div>
              <div className="text-center">
                <p className="text-4xl sm:text-5xl font-black text-gray-900">{state.confirmed.rows}</p>
                <p className="text-sm text-gray-500">Rows</p>
              </div>
            </div>

            {/* SVG Grid Visualization */}
            <WallGrid config={state.confirmed} unit={state.unit} />

            {/* Confirmed Details */}
            <div className="text-sm text-gray-600 space-y-1">
              <p>Total cabinets: {state.confirmed.totalCabinets}</p>
              <p>AR: {state.confirmed.aspectRatio.toFixed(2)}</p>
            </div>

            {/* Receive Quote button */}
            <button
              onClick={() => dispatch({ type: 'OPEN_MODAL', source: 'quote' })}
              className="px-6 py-3 bg-[#D4A843] text-white font-medium rounded-md hover:bg-[#c49a3a] transition-colors"
            >
              Receive Quote
            </button>
          </>
        )}

        {/* History Panel */}
        <History history={state.history} unit={state.unit} dispatch={dispatch} />
      </div>

      {/* Contact Modal */}
      <ContactModal
        open={state.modalOpen}
        source={state.modalSource}
        selectionId={state.history[0]?.id ?? null}
        onClose={() => dispatch({ type: 'CLOSE_MODAL' })}
        onSubmit={handleQuoteSubmit}
      />

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
      />
    </div>
  )
}
