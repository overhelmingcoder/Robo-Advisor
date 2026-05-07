function SummaryBanner({ summary }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(232,184,75,0.08) 0%, rgba(45,212,191,0.05) 100%)',
      border: '1px solid rgba(232,184,75,0.2)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px 28px',
      marginBottom: 28,
      animation: 'fadeUp 0.4s ease both',
    }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 28 }}>🤖</span>
        <div>
          <div style={{
            fontFamily: 'var(--font-head)',
            fontWeight: 700,
            fontSize: 13,
            color: 'var(--gold)',
            letterSpacing: '0.05em',
            marginBottom: 8,
          }}>
            AI PORTFOLIO COMMENTARY
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.7 }}>{summary}</p>
        </div>
      </div>
    </div>
  )
}

export default SummaryBanner
