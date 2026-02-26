import { useState } from 'react'
import { Lock, Unlock, Info, HelpCircle } from 'lucide-react'
import type { AppState, Action, Param, Unit } from '../lib/types'
import { ASPECT_RATIOS } from '../lib/config'
import { toMM, fromMM } from '../lib/units'

type ParameterFormProps = {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const UNIT_LABELS: Record<Unit, string> = {
  mm: 'Millimeters',
  m: 'Meters',
  ft: 'Feet',
  in: 'Inches',
}

const PARAMS: { param: Param; label: string }[] = [
  { param: 'diagonal', label: 'Diagonal' },
  { param: 'aspectRatio', label: 'Aspect Ratio' },
  { param: 'width', label: 'Width' },
  { param: 'height', label: 'Height' },
]

function getInfoMessage(locks: Record<Param, boolean>): string {
  const count = Object.values(locks).filter(Boolean).length
  if (count === 0) return 'Select a measurement to start'
  if (count === 1) return 'Lock one more parameter to see results'
  return 'Results calculated — choose a size below'
}

export default function ParameterForm({ state, dispatch }: ParameterFormProps) {
  // Draft values for unlocked fields (user typing, not yet committed)
  const [drafts, setDrafts] = useState<Record<Param, string>>({
    aspectRatio: '',
    height: '',
    width: '',
    diagonal: '',
  })

  const lockCount = Object.values(state.locks).filter(Boolean).length

  function handleApply(param: Param) {
    if (param === 'aspectRatio') return // AR uses dropdown, not Apply
    const parsed = parseFloat(drafts[param])
    if (isNaN(parsed) || parsed <= 0) return
    const valueMM = toMM(parsed, state.unit)
    dispatch({ type: 'LOCK_PARAM', param, value: valueMM })
  }

  function handleLockAR(arValue: number) {
    dispatch({ type: 'LOCK_PARAM', param: 'aspectRatio', value: arValue })
  }

  function handleUnlock(param: Param) {
    dispatch({ type: 'UNLOCK_PARAM', param })
  }

  function isDisabled(param: Param): boolean {
    return !state.locks[param] && lockCount >= 2
  }

  function displayValue(param: Param): string {
    if (!state.locks[param]) return ''
    if (param === 'aspectRatio') {
      const preset = ASPECT_RATIOS.find(ar => Math.abs(ar.value - state.values.aspectRatio) < 0.001)
      return preset ? preset.label : state.values.aspectRatio.toFixed(2)
    }
    return fromMM(state.values[param], state.unit).toFixed(2)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-400 uppercase tracking-wide">Size</p>
        <h1 className="text-2xl font-bold text-gray-900">
          Enter at least 2 parameters.
        </h1>
      </div>

      {/* Info Banner */}
      <div className="flex items-center justify-between border border-gray-200 bg-gray-50 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">
            {getInfoMessage(state.locks)}
          </span>
        </div>
        <select
          value={state.unit}
          onChange={e => dispatch({ type: 'SET_UNIT', unit: e.target.value as Unit })}
          className="text-sm border border-gray-300 rounded-md px-2 py-1"
        >
          {(Object.keys(UNIT_LABELS) as Unit[]).map(u => (
            <option key={u} value={u}>{UNIT_LABELS[u]}</option>
          ))}
        </select>
      </div>

      {/* Parameter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PARAMS.map(({ param, label }) => {
          const locked = state.locks[param]
          const disabled = isDisabled(param)

          return (
            <div key={param} className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700">
                  {label}
                  {param !== 'aspectRatio' && `. (${UNIT_LABELS[state.unit]})`}
                </label>

                {param === 'aspectRatio' ? (
                  /* Aspect Ratio: dropdown */
                  <select
                    disabled={disabled || locked}
                    value={locked ? String(state.values.aspectRatio) : drafts.aspectRatio}
                    onChange={e => {
                      if (!locked) setDrafts(d => ({ ...d, aspectRatio: e.target.value }))
                    }}
                    className={`mt-1 block w-full border rounded-md px-3 py-2 text-base ${
                      disabled ? 'bg-gray-200 text-gray-400 border-gray-200' :
                      locked ? 'bg-white border-gray-300 text-gray-900' :
                      'bg-white border-gray-300 text-gray-900'
                    } transition-colors duration-200`}
                  >
                    <option value="">Aspect Ratio</option>
                    {ASPECT_RATIOS.map(ar => (
                      <option key={ar.label} value={String(ar.value)}>
                        {ar.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  /* Dimension fields: text input + Apply button */
                  <div className="mt-1 flex">
                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={disabled || locked}
                      value={locked ? displayValue(param) : drafts[param]}
                      onChange={e => {
                        if (!locked) setDrafts(d => ({ ...d, [param]: e.target.value }))
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !disabled && !locked) handleApply(param)
                      }}
                      placeholder="0.00"
                      className={`flex-1 border rounded-l-md px-3 py-2 text-base ${
                        disabled ? 'bg-gray-200 text-gray-400 border-gray-200' :
                        locked ? 'bg-white border-gray-300 text-gray-900' :
                        'bg-white border-gray-300 text-gray-900'
                      } transition-colors duration-200`}
                    />
                    <button
                      disabled={disabled || locked}
                      onClick={() => handleApply(param)}
                      className={`px-4 py-2 border border-l-0 rounded-r-md text-sm font-medium ${
                        disabled || locked
                          ? 'bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      apply
                    </button>
                  </div>
                )}
              </div>

              {/* Lock Icon */}
              <button
                onClick={() => {
                  if (locked) {
                    handleUnlock(param)
                  } else if (param === 'aspectRatio' && drafts.aspectRatio) {
                    const arValue = parseFloat(drafts.aspectRatio)
                    if (!isNaN(arValue) && arValue > 0) handleLockAR(arValue)
                  }
                }}
                disabled={disabled && !locked}
                aria-label={locked ? 'Unlock parameter' : 'Lock parameter'}
                className="mb-1"
              >
                {locked ? (
                  <Lock className="h-5 w-5 text-gray-900 transition-opacity duration-150" />
                ) : (
                  <Unlock className={`h-5 w-5 transition-opacity duration-150 ${
                    disabled ? 'text-gray-300' : 'text-[#5B9A8B]'
                  }`} />
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Error Message */}
      {state.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      {/* What to Know */}
      <div className="border border-gray-200 bg-gray-50 rounded-lg px-4 py-3">
        <div className="flex items-start gap-2">
          <HelpCircle className="h-4 w-4 text-gray-500 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900">What to know</p>
            <p className="text-sm text-gray-600 mt-1">
              When you enter your values, this tool will design the largest video
              wall which fits into your dimensions. Initially, you can lock 2
              parameters and the tool will &lsquo;fit&rsquo; a Video Wall to your
              specifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
