import { Trash2 } from 'lucide-react'
import type { SavedSelection, Unit, Action } from '../lib/types'
import { fromMM } from '../lib/units'
import { deleteSelection } from '../lib/storage'

type HistoryProps = {
  history: SavedSelection[]
  unit: Unit
  dispatch: React.Dispatch<Action>
}

const UNIT_LABELS: Record<Unit, string> = {
  mm: 'mm',
  m: 'm',
  ft: 'ft',
  in: 'in',
}

function formatTimeAgo(savedAt: number): string {
  const seconds = Math.floor((Date.now() - savedAt) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function History({ history, unit, dispatch }: HistoryProps) {
  if (history.length === 0) return null

  function handleDelete(id: string) {
    deleteSelection(id)
    dispatch({ type: 'DELETE_HISTORY', id })
  }

  function handleReload(selection: SavedSelection) {
    dispatch({ type: 'RELOAD_HISTORY', selection })
  }

  const unitLabel = UNIT_LABELS[unit]

  return (
    <div>
      <p className="text-sm text-gray-400 uppercase tracking-wide mb-3">History</p>
      <div className="space-y-2">
        {history.map(s => {
          const w = fromMM(s.widthMM, unit).toFixed(1)
          const h = fromMM(s.heightMM, unit).toFixed(1)
          return (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
            >
              <button
                onClick={() => handleReload(s)}
                className="flex-1 text-left text-sm text-gray-700 hover:text-gray-900"
                aria-label={`Load ${s.cols}×${s.rows} ${s.cabinetType} configuration`}
              >
                <span className="font-medium">{s.cols}×{s.rows}</span>
                {' '}{s.cabinetType} — {w}×{h} {unitLabel}
                <span className="ml-2 text-gray-400">{formatTimeAgo(s.savedAt)}</span>
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="ml-3 rounded p-1 text-gray-400 hover:text-red-500"
                aria-label="Delete selection"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
