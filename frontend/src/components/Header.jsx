function Header() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
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
        <div className="site-header-tagline">
          AI-POWERED · REAL DATA · 2025
        </div>
      </div>
    </header>
  )
}

export default Header
