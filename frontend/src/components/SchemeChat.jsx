import { useEffect, useRef, useState } from 'react'

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

function MessageBubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 10,
    }}>
      <div style={{
        maxWidth: '85%',
        background: isUser ? 'rgba(232,184,75,0.14)' : 'var(--surface2)',
        color: 'var(--text)',
        border: isUser ? '1px solid rgba(232,184,75,0.32)' : '1px solid var(--border)',
        borderRadius: 12,
        padding: '12px 14px',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.55,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
      }}>
        <div style={{ marginBottom: isUser ? 0 : 4, opacity: 0.7, fontSize: 10 }}>
          {isUser ? 'You' : 'Advisor'}
        </div>
        <div>{content}</div>
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

  // Filter suggestions based on input
  const getFilteredSuggestions = (input) => {
    if (!input.trim()) return []
    const lowerInput = input.toLowerCase()
    return COMMON_QUESTIONS.filter((q) =>
      q.toLowerCase().includes(lowerInput)
    ).slice(0, 5) // Limit to 5 suggestions
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

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestion((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        if (selectedSuggestion >= 0) {
          e.preventDefault()
          selectSuggestion(suggestions[selectedSuggestion])
        }
        break
      case 'Escape':
        setSuggestions([])
        setSelectedSuggestion(-1)
        break
      default:
        break
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (loading) return
    const message = draft.trim()
    if (!message) return
    onSend(message)
    setDraft('')
    if (inputRef.current) inputRef.current.focus()
  }

  const canSend = Boolean(draft.trim()) && !loading

  return (
    <div style={{ marginTop: 28, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            marginBottom: 12,
            background: 'none',
            border: 'none',
            color: 'var(--text3)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--gold)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text3)')}
        >
          ← Back to recommendations
        </button>

        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, color: 'var(--text)', marginBottom: 6 }}>
          Chat About: {scheme.scheme_name}
        </h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)' }}>
          {scheme.provider} · {scheme.scheme_type} · {scheme.interest_rate_typical?.toFixed ? `${Number(scheme.interest_rate_typical).toFixed(2)}%` : 'N/A'}
        </p>
        {profile && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
            Context: ৳{profile.monthly_investment.toLocaleString()} monthly for {profile.time_range_years} years
            {' '}({profile.risk_level} risk)
          </p>
        )}
      </div>

      <div style={{ minHeight: 260, maxHeight: 420, overflowY: 'auto', padding: '18px 24px', background: 'var(--bg2)' }}>
        {messages.map((msg, index) => (
          <MessageBubble key={`${msg.role}-${index}`} role={msg.role} content={msg.content} />
        ))}
        {loading && <MessageBubble role="assistant" content="Thinking..." />}
        <div ref={endRef} />
      </div>

      {error && (
        <div style={{
          padding: '0 24px 12px',
          color: 'var(--red)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
        }}>
          ✕ {error}
        </div>
      )}

      {/* Quick Question Suggestions */}
      {messages.length <= 1 && (
        <div style={{ padding: '12px 24px', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: '0.05em', marginBottom: 8 }}>
            QUICK QUESTIONS
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COMMON_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => {
                  onSend(question)
                  setDraft('')
                }}
                disabled={loading}
                style={{
                  padding: '6px 10px',
                  background: 'rgba(45,212,191,0.08)',
                  border: '1px solid rgba(45,212,191,0.2)',
                  borderRadius: 6,
                  color: 'var(--teal)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: loading ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = 'rgba(45,212,191,0.15)'
                    e.currentTarget.style.borderColor = 'rgba(45,212,191,0.4)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(45,212,191,0.08)'
                  e.currentTarget.style.borderColor = 'rgba(45,212,191,0.2)'
                }}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, padding: 16, background: 'var(--surface)', position: 'relative' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            name="message"
            disabled={loading}
            value={draft}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about returns, risks, lock-in period, liquidity, tax impact..."
            style={{
              width: '100%',
              border: suggestions.length > 0 ? '1px solid rgba(45,212,191,0.4)' : '1px solid var(--border)',
              background: 'var(--bg2)',
              color: 'var(--text)',
              borderRadius: 10,
              padding: '12px 14px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'all 0.2s ease',
            }}
          />
          
          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              zIndex: 1000,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              maxHeight: 200,
              overflowY: 'auto',
            }}>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    textAlign: 'left',
                    border: 'none',
                    background: selectedSuggestion === index ? 'rgba(45,212,191,0.1)' : 'transparent',
                    color: 'var(--text)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    borderBottom: index < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    setSelectedSuggestion(index)
                    e.currentTarget.style.background = 'rgba(45,212,191,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    if (selectedSuggestion !== index) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >
                  <div style={{ color: 'var(--teal)', fontSize: 11, marginBottom: 2 }}>✦ Suggestion</div>
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!canSend}
          style={{
            border: 'none',
            borderRadius: 10,
            padding: '12px 16px',
            background: canSend ? 'linear-gradient(135deg, var(--gold) 0%, #d4952a 100%)' : 'var(--surface2)',
            color: canSend ? '#0a0d12' : 'var(--text3)',
            fontFamily: 'var(--font-head)',
            fontWeight: 700,
            fontSize: 12,
            cursor: canSend ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

export default SchemeChat
