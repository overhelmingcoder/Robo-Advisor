import { TICKER_ITEMS } from '../constants/appConstants'

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]

  return (
    <div style={{
      background: 'linear-gradient(90deg, var(--bg) 0%, var(--surface) 10%, var(--surface) 90%, var(--bg) 100%)',
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
      overflow: 'hidden',
      padding: '8px 0',
      position: 'relative',
    }}>
      <div style={{
        display: 'flex',
        gap: '60px',
        width: 'max-content',
        animation: 'ticker 28s linear infinite',
      }}>
        {items.map((item, i) => (
          <span key={i} style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--gold)',
            whiteSpace: 'nowrap',
            letterSpacing: '0.04em',
          }}>
            <span style={{ color: 'var(--text3)', marginRight: 8 }}>◆</span>{item}
          </span>
        ))}
      </div>
    </div>
  )
}

export default Ticker
