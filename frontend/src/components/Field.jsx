function Field({ label, unit, error, hint, children, suggestions = [] }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <label style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text3)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          {label} {unit && <span style={{ color: 'var(--text3)', opacity: 0.6 }}>({unit})</span>}
        </label>
        {hint && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--teal)' }}>{hint}</span>}
      </div>
      {children}
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={suggestion.onClick}
              style={{
                padding: '5px 10px',
                background: 'rgba(45,212,191,0.08)',
                border: '1px solid rgba(45,212,191,0.25)',
                borderRadius: 6,
                color: 'var(--teal)',
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(45,212,191,0.15)'
                e.currentTarget.style.borderColor = 'rgba(45,212,191,0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(45,212,191,0.08)'
                e.currentTarget.style.borderColor = 'rgba(45,212,191,0.25)'
              }}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--red)', marginTop: 4 }}>
          {error}
        </p>
      )}
    </div>
  )
}

export default Field
