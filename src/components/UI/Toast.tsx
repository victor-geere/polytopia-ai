import { useEffect, useState } from 'react'

interface ToastProps {
  message: string | null
  duration?: number
  onDone?: () => void
}

export function Toast({ message, duration = 3500, onDone }: ToastProps) {
  const [visible, setVisible] = useState(false)
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    if (!message) {
      setVisible(false)
      return
    }
    setText(message)
    setVisible(true)
    const t = setTimeout(() => {
      setVisible(false)
      onDone?.()
    }, duration)
    return () => clearTimeout(t)
  }, [message, duration, onDone])

  if (!text) return null

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 90,
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        zIndex: 40,
        pointerEvents: 'none',
        maxWidth: '90vw',
      }}
    >
      <div
        style={{
          background: 'rgba(15,15,30,0.92)',
          color: '#f0f0f0',
          padding: '12px 18px',
          borderRadius: 12,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 14,
          lineHeight: 1.4,
          textAlign: 'center',
          boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {text}
      </div>
    </div>
  )
}
