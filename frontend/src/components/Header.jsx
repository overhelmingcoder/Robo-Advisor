function Header() {
  return (
    <header style={{
      padding: '0 40px',
      background: 'rgba(6,8,13,0.95)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'linear-gradient(135deg, var(--gold), var(--teal))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
            color: '#06080d',
            fontFamily: 'var(--font-head)',
          }}>৳</div>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.03em' }}>
              BDT Advisor
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', letterSpacing: '0.04em', fontWeight: 500 }}>
              100+ SCHEMES
            </div>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', letterSpacing: '0.03em', fontWeight: 500 }}>
          AI-POWERED · REAL DATA · 2025
        </div>
      </div>
    </header>
  )
}

export default Header
