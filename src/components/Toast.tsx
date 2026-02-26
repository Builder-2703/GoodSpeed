import { useEffect } from 'react'
import { CheckCircle } from 'lucide-react'

type ToastProps = {
  message: string
  visible: boolean
  onDismiss: () => void
}

export default function Toast({ message, visible, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [visible, onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-[#16A34A] px-4 py-3 shadow-lg transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <CheckCircle className="h-5 w-5 text-white" />
      <span className="text-sm font-medium text-white">{message}</span>
    </div>
  )
}
