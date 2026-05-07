function ErrorBanner({ error }) {
  return (
    <div style={{
      marginTop: 24,
      padding: '16px 20px',
      background: 'var(--red-dim)',
      border: '1px solid var(--red)',
      borderRadius: 10,
      color: 'var(--red)',
      fontSize: 14,
      fontFamily: 'var(--font-mono)',
      animation: 'fadeIn 0.3s ease',
    }}>
      ✕ {error}
    </div>
  )
}

export default ErrorBanner
