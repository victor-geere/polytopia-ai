interface SplashProps {
  onStart: () => void
  yourTribe: string
}

export function Splash({ onStart, yourTribe }: SplashProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 100,
        background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a12 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#f0f0f0',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 1,
          marginBottom: 8,
        }}
      >
        Polytopia 3D
      </div>
      <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 28 }}>
        A minimal 4X strategy experiment
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 14,
          padding: '18px 22px',
          maxWidth: 340,
          marginBottom: 28,
          lineHeight: 1.5,
          fontSize: 14,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8, color: '#ffd700' }}>
          Pass-and-play
        </div>
        <div style={{ opacity: 0.9 }}>
          This build is <strong>local pass-and-play</strong>. Two tribes share the
          same device — when one player ends their turn, hand the phone/tablet to
          the other.
        </div>
        <div style={{ marginTop: 12, opacity: 0.85 }}>
          You start as{' '}
          <span style={{ color: '#ffd700', fontWeight: 700 }}>
            {yourTribe.toUpperCase()}
          </span>
          .
        </div>
      </div>

      <button
        onClick={onStart}
        style={{
          padding: '14px 36px',
          fontSize: 17,
          fontWeight: 700,
          background: '#3d8b5e',
          color: 'white',
          border: 'none',
          borderRadius: 12,
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(61,139,94,0.4)',
        }}
      >
        Start Game
      </button>
    </div>
  )
}
