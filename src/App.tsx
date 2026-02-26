import { useReducer } from 'react'
import { reducer, initialState } from './lib/reducer'
import ParameterForm from './components/ParameterForm'
import ResultsTable from './components/ResultsTable'
import WallGrid from './components/WallGrid'

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
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
            <div className="flex items-center justify-center gap-12">
              <div className="text-center">
                <p className="text-5xl font-black text-gray-900">{state.confirmed.cols}</p>
                <p className="text-sm text-gray-500">Columns</p>
              </div>
              <div className="text-center">
                <p className="text-5xl font-black text-gray-900">{state.confirmed.rows}</p>
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

            {/* Phase 4: "Receive Quote" button will go here */}
            <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-400">
              <p className="text-sm">(Receive Quote button — Phase 4)</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
