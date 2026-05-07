import { useState } from 'react'
import { fmt } from '../utils/format'
import { RISK_BG, RISK_COLORS, TYPE_ICONS, VAR_RADIUS_LG } from '../constants/appConstants'

function SchemeCard({ scheme, rank, onSelect }) {
  const [expanded, setExpanded] = useState(false)
  const profit = scheme.projected_profit || 0
  const invested = scheme.total_invested || 0
  const roi = invested > 0 ? ((profit / invested) * 100).toFixed(1) : '0.0'
  const color = RISK_COLORS[scheme.risk_level] || 'var(--gold)'
  const bg = RISK_BG[scheme.risk_level] || 'var(--gold-dim)'
  const icon = TYPE_ICONS[scheme.scheme_type] || '💼'
  const canSelect = typeof onSelect === 'function'

  const bars = 5
  const fillBars = Math.round((scheme.score / 100) * bars)
  const schemeName = scheme.scheme_name || 'Unnamed scheme'
  const cardId = `scheme-card-${scheme.scheme_id}`

  return (
    <div
      role={canSelect ? 'button' : 'article'}
      tabIndex={canSelect ? 0 : -1}
      onClick={() => canSelect && onSelect?.(scheme)}
      onKeyDown={(e) => {
        if (canSelect && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onSelect?.(scheme)
        }
      }}
      aria-label={canSelect ? `Open chat for ${schemeName}` : schemeName}
      id={cardId}
      style={{
      background: rank === 1
        ? 'linear-gradient(135deg, rgba(232,184,75,0.07) 0%, var(--surface) 60%)'
        : 'var(--surface)',
      border: rank === 1 ? '1px solid rgba(232,184,75,0.3)' : '1px solid var(--border)',
      borderRadius: VAR_RADIUS_LG,
      overflow: 'hidden',
      animation: `fadeUp 0.5s ease ${rank * 0.08}s both`,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'pointer',
      outline: 'none',
    }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = ''
      }}
      onFocus={(e) => {
        if (!canSelect) return
        e.currentTarget.style.borderColor = `${color}55`
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)'
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = rank === 1 ? 'rgba(232,184,75,0.3)' : 'var(--border)'
        e.currentTarget.style.boxShadow = ''
      }}
    >
      <div style={{ padding: '22px 24px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              flexShrink: 0,
              background: `linear-gradient(135deg, ${bg}, ${bg})`,
              border: `1px solid ${color}33`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}>{icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  {schemeName}
                </span>
                {rank === 1 && (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 500,
                    background: 'linear-gradient(90deg, var(--gold), var(--gold2))',
                    color: '#0a0d12',
                    padding: '2px 8px',
                    borderRadius: 4,
                    letterSpacing: '0.06em',
                  }}>TOP PICK</span>
                )}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                {scheme.provider} · {scheme.scheme_type}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 500, color, lineHeight: 1 }}>
              {scheme.interest_rate_typical?.toFixed ? `${Number(scheme.interest_rate_typical).toFixed(2)}%` : '—'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
              annual return
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: bars }).map((_, i) => (
              <div key={i} style={{
                width: 28,
                height: 4,
                borderRadius: 2,
                background: i < fillBars ? color : 'var(--border2)',
                transition: 'background 0.3s ease',
              }} />
            ))}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)' }}>
            Score {scheme.score}
          </span>
          <span style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            padding: '2px 8px',
            borderRadius: 4,
            background: bg,
            color,
          }}>
            {scheme.risk_level} Risk
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid var(--border)' }}>
        {[
          { label: 'Maturity Value', val: fmt(scheme.projected_maturity_value), highlight: true },
          { label: 'Total Invested', val: fmt(scheme.total_invested) },
          { label: 'Est. Profit', val: fmt(scheme.projected_profit), sub: `ROI ${roi}%`, green: true },
        ].map((metric, i) => (
          <div key={i} style={{ padding: '14px 18px', borderRight: i < 2 ? '1px solid var(--border)' : 'none' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text3)',
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              {metric.label}
            </div>
            <div style={{
              fontFamily: 'var(--font-head)',
              fontWeight: 700,
              fontSize: 16,
              color: metric.highlight ? 'var(--gold)' : metric.green ? 'var(--green)' : 'var(--text)',
            }}>
              {metric.val}
            </div>
            {metric.sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--green)', marginTop: 2 }}>{metric.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 24px' }}>
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
          {scheme.why}
        </p>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={`${cardId}-details`}
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((x) => !x)
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text3)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text3)')}
          >
            {expanded ? '▲ Hide details' : '▼ Show details'}
          </button>

          {canSelect && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSelect?.(scheme)
              }}
              style={{
                borderRadius: 8,
                border: `1px solid ${color}55`,
                background: `${color}14`,
                color,
                fontFamily: 'var(--font-head)',
                fontWeight: 600,
                fontSize: 11,
                padding: '8px 12px',
                letterSpacing: '0.02em',
              }}
            >
              💬 Chat now
            </button>
          )}
        </div>

        {expanded && (
          <div id={`${cardId}-details`} style={{ marginTop: 12, padding: '12px 14px', background: 'var(--bg2)', borderRadius: 8, animation: 'fadeIn 0.2s ease' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              {[
                ['Liquidity', scheme.liquidity],
                ['Duration', scheme.duration_min != null ? `${scheme.duration_min}–${scheme.duration_max || '∞'} yr` : '—'],
                ['Min Monthly', scheme.min_monthly_invest ? fmt(scheme.min_monthly_invest) : 'Any'],
                ['Scheme ID', scheme.scheme_id],
              ].map(([k, v]) => (
                <div key={k}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)' }}>{k}: </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text)' }}>{v}</span>
                </div>
              ))}
            </div>
            {scheme.notes && (
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--text3)',
                lineHeight: 1.5,
                borderTop: '1px solid var(--border)',
                paddingTop: 10,
              }}>
                {scheme.notes}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SchemeCard
