function LoadingState() {
  return (
    <div style={{ marginTop: 40, textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: '3px solid var(--border2)',
          borderTopColor: 'var(--gold)',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto',
        }} />
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--text3)',
        marginTop: 16,
        letterSpacing: '0.06em',
      }}>
        FILTERING · SCORING · RANKING
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--text3)',
        opacity: 0.6,
        marginTop: 6,
      }}>
        Analysing 100+ Bangladesh schemes with AI...
      </div>
    </div>
  )
}

export default LoadingState
