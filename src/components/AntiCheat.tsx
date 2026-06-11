'use client'
import React, { useEffect, useState } from 'react'

interface AntiCheatProps {
  children: React.ReactNode
  enabled?: boolean
}

export default function AntiCheat({ children, enabled = true }: AntiCheatProps) {
  const [violations, setViolations] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [modalMessage, setModalMessage] = useState('')

  useEffect(() => {
    if (!enabled) return

    // 1. Block Context Menu (right click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }
    document.addEventListener('contextmenu', handleContextMenu)

    // 2. Block keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+A, Ctrl+X, F12, Ctrl+Shift+I, Ctrl+Shift+J)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd
      const isCmdOrCtrl = e.ctrlKey || e.metaKey

      if (isCmdOrCtrl) {
        const key = e.key.toLowerCase()
        if (key === 'c' || key === 'v' || key === 'a' || key === 'x' || key === 'i' || key === 'j') {
          e.preventDefault()
        }
      }

      // Block F12
      if (e.key === 'F12') {
        e.preventDefault()
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    // 3. Detect tab/window switches
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setViolations((prev) => {
          const next = prev + 1
          if (next >= 3) {
            setModalMessage('Қауіпсіздік ескертуі! Сіз 3 немесе одан да көп рет басқа қойындыға ауыстыңыз. Бұл әрекет жүйеде тіркелді және нәтижеңізге әсер етуі мүмкін.')
          } else {
            setModalMessage(`Ескерту! Сіз басқа қойындыға ауыстыңыз. Бұл әрекет тіркелді. Қазіргі бұзушылықтар саны: ${next}/3.`)
          }
          setShowModal(true)
          return next
        })
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled])

  const selectNoneStyle = enabled
    ? {
        userSelect: 'none' as const,
        WebkitUserSelect: 'none' as const,
        msUserSelect: 'none' as const,
        MozUserSelect: 'none' as const,
      }
    : {}

  return (
    <div style={selectNoneStyle} className="relative min-h-full">
      {children}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-red-100 transform transition-all duration-300 scale-100">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-4 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-center text-red-600 mb-2">Анти-Списывание</h3>
            <p className="text-sm text-[#475569] text-center mb-6 leading-relaxed">
              {modalMessage}
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl shadow-lg shadow-red-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Түсіндім
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
