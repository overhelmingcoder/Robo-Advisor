function Hero() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px 50px', animation: 'fadeUp 0.6s ease both' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--teal)', letterSpacing: '0.08em', marginBottom: 20, fontWeight: 600 }}>
        INVESTMENT INTELLIGENCE
      </div>
      <h1 style={{
        fontFamily: 'var(--font-head)',
        fontWeight: 700,
        fontSize: 'clamp(40px, 7vw, 64px)',
        color: 'var(--text)',
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
        marginBottom: 20,
      }}>
        Smart Money,<br />
        <span style={{ background: 'linear-gradient(90deg, var(--gold) 0%, var(--teal) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Smarter Returns
        </span>
      </h1>
      <p style={{ color: 'var(--text2)', fontSize: 16, maxWidth: 540, margin: '0 auto', lineHeight: 1.7, fontWeight: 400 }}>
        AI-powered recommendations across 100+ Bangladesh investment schemes. Personalized strategies for DPS, FDR, Government Bonds, and more.
      </p>
    </div>
  )
}

export default Hero
