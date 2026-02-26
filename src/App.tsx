import { useReducer } from 'react'
import { reducer, initialState } from './lib/reducer'
import ParameterForm from './components/ParameterForm'

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <ParameterForm state={state} dispatch={dispatch} />

        {/* Phase 3: ResultsTable will go here */}
        {state.results && (
          <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-400">
            <p className="text-sm">Results ready — {state.results.length} configurations calculated.</p>
            <p className="text-sm">Nearest size: index {state.nearestIndex}</p>
            <p className="text-sm">(ResultsTable component — Phase 3)</p>
          </div>
        )}

        {/* Phase 3: WallGrid will go here */}
        {state.confirmed && (
          <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-400">
            <p className="text-sm">Confirmed: {state.confirmed.cols}x{state.confirmed.rows} {state.confirmed.cabinetType}</p>
            <p className="text-sm">(WallGrid component — Phase 3)</p>
          </div>
        )}
      </div>
    </div>
  )
}
