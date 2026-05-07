import { useEffect, useRef, useState } from 'react'
import { RISK_BG, RISK_COLORS } from '../constants/appConstants'

const COMMON_QUESTIONS = [
  'What is the expected return?',
  'What are the risks?',
  'Is there a lock-in period?',
  'How liquid is this?',
  'Tax implications?',
  'Minimum investment?',
  'Is this better than FDR?',
  'How does it compare to my goal?',
]

const SECTION_TITLES = {
  recommendation_summary: 'Recommendation Summary',
  comparison_table: 'Comparison Table',
  risk_analysis: 'Risk Analysis',
  why_this_fits_user: 'Why This Fits the User',
  final_suggestion: 'Final Suggestion',
}

function riskColor(value) {
  return RISK_COLORS[value] || 'var(--gold)'
}

function riskBg(value) {
  return RISK_BG[value] || 'var(--gold-dim)'
}

function normalizeReply(content) {
  if (!content) return null
  if (typeof content === 'object') return content
  if (typeof content !== 'string') return { markdown: String(content) }
  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === 'object') return parsed
  } catch {
    // Plain markdown/text fallback.
  }
  return { markdown: content, recommendation_summary: content }
}

function renderInlineMarkdown(text) {
  const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    return <span key={index}>{part}</span>
  })
}

function MarkdownFallback({ text }) {
  const lines = String(text || '').split('\n').filter((line) => line.trim())
  if (!lines.length) return null

  return (
    <div className="advisor-markdown">
      {lines.map((line, index) => {
        const trimmed = line.trim()
        if (trimmed.startsWith('### ')) return <h4 key={index}>{trimmed.slice(4)}</h4>
        if (trimmed.startsWith('## ')) return <h3 key={index}>{trimmed.slice(3)}</h3>
        if (trimmed.startsWith('# ')) return <h3 key={index}>{trimmed.slice(2)}</h3>
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return <p key={index} className="advisor-list-line">• {renderInlineMarkdown(trimmed.slice(2))}</p>
        }
        return <p key={index}>{renderInlineMarkdown(trimmed)}</p>
      })}
    </div>
  )
}

function HighlightBadge({ label, value, kind }) {
  if (!value) return null
  const isRisk = kind === 'risk'
  const color = isRisk ? riskColor(value) : kind === 'best' ? 'var(--gold)' : 'var(--teal)'
  const bg = isRisk ? riskBg(value) : kind === 'best' ? 'var(--gold-dim)' : 'var(--teal-dim)'
  return (
    <div className="advisor-badge" style={{ borderColor: `${color}55`, background: bg }}>
      <span>{label}</span>
      <strong style={{ color }}>{value}</strong>
    </div>
  )
}

function AdvisorTable({ table }) {
  const columns = table?.columns || []
  const rows = table?.rows || []
  if (!columns.length || !rows.length) return null

  return (
    <div className="advisor-table-wrap">
      <table className="advisor-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column, columnIndex) => (
                <td key={`${rowIndex}-${columnIndex}`} data-label={column}>
                  {renderInlineMarkdown(row?.[columnIndex] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SectionCard({ title, children, accent = 'var(--teal)' }) {
  if (!children) return null
  return (
    <section className="advisor-section" style={{ borderLeftColor: accent }}>
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function BulletList({ items }) {
  const list = Array.isArray(items) ? items : items ? [items] : []
  if (!list.length) return null
  return (
    <ul className="advisor-list">
      {list.map((item, index) => (
        <li key={index}>{renderInlineMarkdown(item)}</li>
      ))}
    </ul>
  )
}

function StructuredAdvisorReply({ content }) {
  const reply = normalizeReply(content)
  if (!reply) return null

  const hasStructuredContent = Boolean(
    reply.recommendation_summary ||
    reply.comparison_table ||
    reply.risk_analysis ||
    reply.why_this_fits_user ||
    reply.final_suggestion ||
    reply.highlights,
  )

  if (!hasStructuredContent) {
    return <MarkdownFallback text={reply.markdown || content} />
  }

  const highlights = reply.highlights || {}
  return (
    <div className="advisor-response">
      <div className="advisor-highlight-grid">
        <HighlightBadge label="Risk" value={highlights.risk_level} kind="risk" />
        <HighlightBadge label="Expected Return" value={highlights.expected_return} />
        <HighlightBadge label="Duration" value={highlights.duration} />
        <HighlightBadge label="Liquidity" value={highlights.liquidity} />
        <HighlightBadge label="Best Option" value={highlights.best_option} kind="best" />
      </div>

      <SectionCard title={SECTION_TITLES.recommendation_summary} accent="var(--gold)">
        <p>{renderInlineMarkdown(reply.recommendation_summary)}</p>
      </SectionCard>

      <SectionCard title={SECTION_TITLES.comparison_table} accent="var(--teal)">
        <AdvisorTable table={reply.comparison_table} />
      </SectionCard>

      <SectionCard title={SECTION_TITLES.risk_analysis} accent={riskColor(highlights.risk_level)}>
        <BulletList items={reply.risk_analysis} />
      </SectionCard>

      <SectionCard title={SECTION_TITLES.why_this_fits_user} accent="var(--green)">
        <BulletList items={reply.why_this_fits_user} />
      </SectionCard>

      <SectionCard title={SECTION_TITLES.final_suggestion} accent="var(--gold)">
        <p>{renderInlineMarkdown(reply.final_suggestion)}</p>
      </SectionCard>

      {reply.markdown && !reply.recommendation_summary && <MarkdownFallback text={reply.markdown} />}
    </div>
  )
}

function MessageBubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={`chat-row ${isUser ? 'chat-row-user' : 'chat-row-advisor'}`}>
      <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-advisor'}`}>
        <div className="chat-speaker">{isUser ? 'You' : 'Advisor'}</div>
        {isUser ? <div>{content}</div> : <StructuredAdvisorReply content={content} />}
      </div>
    </div>
  )
}

function SchemeChat({ scheme, profile, messages, onSend, onBack, loading, error }) {
  const inputRef = useRef(null)
  const endRef = useRef(null)
  const [draft, setDraft] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const getFilteredSuggestions = (input) => {
    if (!input.trim()) return []
    const lowerInput = input.toLowerCase()
    return COMMON_QUESTIONS.filter((q) => q.toLowerCase().includes(lowerInput)).slice(0, 5)
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setDraft(value)
    setSuggestions(getFilteredSuggestions(value))
    setSelectedSuggestion(-1)
  }

  const selectSuggestion = (suggestion) => {
    setDraft(suggestion)
    setSuggestions([])
    setSelectedSuggestion(-1)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleKeyDown = (e) => {
    if (suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Enter' && selectedSuggestion >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[selectedSuggestion])
    } else if (e.key === 'Escape') {
      setSuggestions([])
      setSelectedSuggestion(-1)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (loading) return
    const message = draft.trim()
    if (!message) return
    onSend(message)
    setDraft('')
    inputRef.current?.focus()
  }

  const canSend = Boolean(draft.trim()) && !loading
  const rate = scheme.interest_rate_typical?.toFixed ? `${Number(scheme.interest_rate_typical).toFixed(2)}%` : 'N/A'

  return (
    <div className="scheme-chat-shell">
      <div className="scheme-chat-header">
        <button type="button" onClick={onBack} className="chat-back-button">
          Back to recommendations
        </button>

        <div className="scheme-chat-title-row">
          <div>
            <h2>Chat About: {scheme.scheme_name}</h2>
            <p>{scheme.provider} · {scheme.scheme_type} · {rate}</p>
            {profile && (
              <p>
                Context: ৳{profile.monthly_investment.toLocaleString()} monthly for {profile.time_range_years} years ({profile.risk_level} risk)
              </p>
            )}
          </div>
          <span className="scheme-chat-risk" style={{ color: riskColor(scheme.risk_level), background: riskBg(scheme.risk_level) }}>
            {scheme.risk_level} Risk
          </span>
        </div>
      </div>

      <div className="scheme-chat-messages">
        {messages.map((msg, index) => (
          <MessageBubble key={`${msg.role}-${index}`} role={msg.role} content={msg.content} />
        ))}
        {loading && <MessageBubble role="assistant" content={{ recommendation_summary: 'Preparing a structured advisor response...', final_suggestion: 'Please wait a moment.' }} />}
        <div ref={endRef} />
      </div>

      {error && <div className="scheme-chat-error">✕ {error}</div>}

      {messages.length <= 1 && (
        <div className="quick-question-panel">
          <div className="quick-question-label">QUICK QUESTIONS</div>
          <div className="quick-question-list">
            {COMMON_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => {
                  onSend(question)
                  setDraft('')
                }}
                disabled={loading}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="scheme-chat-form">
        <div className="scheme-chat-input-wrap">
          <input
            ref={inputRef}
            type="text"
            name="message"
            disabled={loading}
            value={draft}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about returns, risks, lock-in period, liquidity, tax impact..."
          />

          {suggestions.length > 0 && (
            <div className="chat-suggestions">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className={selectedSuggestion === index ? 'selected' : ''}
                  onMouseEnter={() => setSelectedSuggestion(index)}
                >
                  <span>Suggestion</span>
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="submit" disabled={!canSend} className="scheme-chat-send">
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

export default SchemeChat
