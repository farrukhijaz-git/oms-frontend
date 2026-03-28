import { useState, useEffect } from 'react'

let toastFn = null
export function showToast(message, type = 'success') {
  if (toastFn) toastFn(message, type)
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    toastFn = (message, type) => {
      const id = Date.now()
      setToasts(prev => [...prev, { id, message, type }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
    }
    return () => { toastFn = null }
  }, [])

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm max-w-xs ${t.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
