import { useEffect, useState } from 'react'

interface ToastProps {
  message: string | null
  duration?: number
  onDone?: () => void
}

export function Toast({ message, duration = 4500, onDone }: ToastProps) {
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
      // clear after fade
      setTimeout(() => onDone?.(), 280)
    }, duration)
    return () => clearTimeout(t)
  }, [message, duration, onDone])

  if (!text) return null

  const dismiss = () => {
    setVisible(false)
    onDone?.()
  }

  return (
    <div
      onClick={dismiss}
      onTouchEnd={(e) => {
        e.preventDefault()
        dismiss()
      }}
      role="button"
      aria-label="Dismiss message"
      style={{
        position: 'absolute',
        // Sit low so it does not cover units / map center
        bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? 0 : 16}px)`,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        zIndex: 40,
        pointerEvents: visible ? 'auto' : 'none',
        maxWidth: 'min(92vw, 360px)',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          background: 'rgba(15,15,30,0.94)',
          color: '#f0f0f0',
          padding: '12px 18px',
          borderRadius: 12,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 14,
          lineHeight: 1.4,
          textAlign: 'center',
          boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        {text}
        <div style={{ fontSize: 11, opacity: 0.45, marginTop: 6 }}>Tap to dismiss</div>
      </div>
    </div>
  )
}
