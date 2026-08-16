import { useEffect, useState } from 'react'

interface ToastProps {
  message: string | null
  duration?: number
  onDone?: () => void
  /** When true, fills parent flex cell instead of floating alone */
  embedded?: boolean
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.8)',
  color: '#eee',
  padding: '10px 12px',
  borderRadius: 10,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  fontSize: 13,
  lineHeight: 1.4,
  border: '1px solid rgba(255,255,255,0.1)',
  boxSizing: 'border-box',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
}

export function Toast({ message, duration = 4500, onDone, embedded }: ToastProps) {
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
      setTimeout(() => onDone?.(), 280)
    }, duration)
    return () => clearTimeout(t)
  }, [message, duration, onDone])

  if (!text && !embedded) return null

  const dismiss = () => {
    setVisible(false)
    onDone?.()
  }

  const body = (
    <div
      onClick={text && visible ? dismiss : undefined}
      onTouchEnd={
        text && visible
          ? (e) => {
              e.preventDefault()
              dismiss()
            }
          : undefined
      }
      role={text && visible ? 'button' : undefined}
      aria-label={text && visible ? 'Dismiss message' : undefined}
      style={{
        ...cardStyle,
        opacity: visible && text ? 1 : embedded ? 0.55 : 0,
        cursor: visible && text ? 'pointer' : 'default',
        transition: 'opacity 0.25s ease',
        minHeight: 72,
      }}
    >
      {visible && text ? (
        <>
          <div>{text}</div>
          <div style={{ fontSize: 11, opacity: 0.45, marginTop: 6 }}>Tap to dismiss</div>
        </>
      ) : (
        <div style={{ opacity: 0.6 }}>Tips appear here</div>
      )}
    </div>
  )

  if (embedded) {
    return <div style={{ flex: 1, minWidth: 0, height: '100%' }}>{body}</div>
  }

  if (!text) return null

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
        left: 12,
        right: 12,
        zIndex: 40,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {body}
    </div>
  )
}
