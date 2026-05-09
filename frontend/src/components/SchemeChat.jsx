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

function riskColor(value) {
  return RISK_COLORS[value] || 'var(--gold)'
}

function riskBg(value) {
  return RISK_BG[value] || 'var(--gold-dim)'
}

function looksLikeJson(value) {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))
}

function stripCodeFence(value) {
  return String(value || '')
    .replace(/^```(?:json|markdown|md)?\s*/i, '')
    .replace(/```$/i, '')
    .trim()
}

function parseJsonMaybe(value) {
  if (typeof value !== 'string') return null
  const cleaned = stripCodeFence(value)
  if (!looksLikeJson(cleaned)) return null
  try {
    const parsed = JSON.parse(cleaned)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.flatMap((item) => normalizeArray(item))
  if (typeof value === 'string') {
    const parsed = parseJsonMaybe(value)
    if (parsed) return normalizeArray(parsed)
    return value
      .split('\n')
      .map((line) => line.replace(/^[-*]\s+/, '').trim())
      .filter(Boolean)
  }
  if (value == null) return []
  return [String(value)]
}

function normalizeTable(table) {
  const parsed = typeof table === 'string' ? parseJsonMaybe(table) : table
  if (!parsed || typeof parsed !== 'object') return null

  const columns = parsed.columns || parsed.headers || []
  const rows = parsed.rows || parsed.data || []
  if (Array.isArray(columns) && Array.isArray(rows) && columns.length && rows.length) {
    return {
      columns: columns.map(String),
      rows: rows.map((row) => {
        if (Array.isArray(row)) return row.map((cell) => String(cell ?? ''))
        if (row && typeof row === 'object') return columns.map((column) => String(row[column] ?? row[String(column).toLowerCase()] ?? ''))
        return [String(row)]
      }),
    }
  }

  if (Array.isArray(parsed)) {
    const objectRows = parsed.filter((row) => row && typeof row === 'object' && !Array.isArray(row))
    if (objectRows.length) {
      const objectColumns = [...new Set(objectRows.flatMap((row) => Object.keys(row)))]
      return {
        columns: objectColumns,
        rows: objectRows.map((row) => objectColumns.map((column) => String(row[column] ?? ''))),
      }
    }
  }

  return null
}

function markdownTableToTable(lines, startIndex) {
  const header = splitMarkdownTableRow(lines[startIndex])
  const separator = splitMarkdownTableRow(lines[startIndex + 1] || '')
  if (!header.length || !separator.length || !separator.every((cell) => /^:?-{3,}:?$/.test(cell.trim()))) {
    return null
  }

  const rows = []
  let index = startIndex + 2
  while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
    rows.push(splitMarkdownTableRow(lines[index]))
    index += 1
  }

  return {
    table: { columns: header, rows },
    nextIndex: index,
  }
}

function splitMarkdownTableRow(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function tableToMarkdown(table) {
  const normalized = normalizeTable(table)
  if (!normalized) return ''
  const header = `| ${normalized.columns.join(' | ')} |`
  const separator = `| ${normalized.columns.map(() => '---').join(' | ')} |`
  const rows = normalized.rows.map((row) => `| ${normalized.columns.map((_, index) => row[index] || '').join(' | ')} |`)
  return [header, separator, ...rows].join('\n')
}

function normalizeReply(content) {
  if (!content) return null
  const parsedContent = typeof content === 'string' ? parseJsonMaybe(content) : null
  const source = parsedContent || (typeof content === 'object' ? content : null)

  if (!source) {
    return { markdown: stripCodeFence(content), recommendation_summary: stripCodeFence(content) }
  }

  const nestedReply =
    parseJsonMaybe(source.reply) ||
    parseJsonMaybe(source.content) ||
    parseJsonMaybe(source.message) ||
    parseJsonMaybe(source.markdown) ||
    parseJsonMaybe(source.recommendation_summary)

  if (nestedReply) {
    return normalizeReply(nestedReply)
  }

  const summary = source.recommendation_summary || source.summary || ''
  return {
    recommendation_summary: looksLikeJson(summary) ? '' : summary,
    highlights: source.highlights || {},
    comparison_table: normalizeTable(source.comparison_table || source.table || source.markdown_table),
    risk_analysis: normalizeArray(source.risk_analysis),
    why_this_fits_user: normalizeArray(source.why_this_fits_user || source.why_this_fits || source.fit_analysis),
    final_suggestion: source.final_suggestion || source.recommendation || '',
    markdown: looksLikeJson(source.markdown) ? '' : source.markdown || '',
  }
}

function replyToMarkdown(reply) {
  if (!reply) return ''

  const existingMarkdown = stripCodeFence(reply.markdown || '')
  if (existingMarkdown && !looksLikeJson(existingMarkdown)) {
    const tableMarkdown = tableToMarkdown(reply.comparison_table)
    return [existingMarkdown, tableMarkdown].filter(Boolean).join('\n\n')
  }

  const chunks = []
  const highlights = reply.highlights || {}
  if (reply.recommendation_summary) {
    chunks.push(reply.recommendation_summary)
  }

  const highlightLines = [
    highlights.risk_level && `- **Risk:** ${highlights.risk_level}`,
    highlights.expected_return && `- **Expected return:** ${highlights.expected_return}`,
    highlights.duration && `- **Duration:** ${highlights.duration}`,
    highlights.liquidity && `- **Liquidity:** ${highlights.liquidity}`,
    highlights.best_option && `- **Best option:** ${highlights.best_option}`,
  ].filter(Boolean)
  if (highlightLines.length) chunks.push(highlightLines.join('\n'))

  const tableMarkdown = tableToMarkdown(reply.comparison_table)
  if (tableMarkdown) chunks.push(tableMarkdown)

  const riskItems = normalizeArray(reply.risk_analysis)
  if (riskItems.length) chunks.push(`**Risk analysis**\n${riskItems.map((item) => `- ${item}`).join('\n')}`)

  const fitItems = normalizeArray(reply.why_this_fits_user)
  if (fitItems.length) chunks.push(`**Why this fits**\n${fitItems.map((item) => `- ${item}`).join('\n')}`)

  if (reply.final_suggestion) chunks.push(`**Final suggestion:** ${reply.final_suggestion}`)

  return chunks.filter(Boolean).join('\n\n')
}

function renderInlineMarkdown(text) {
  const safeText = looksLikeJson(text) ? '' : String(text || '')
  const parts = safeText.split(/(\*\*[^*]+\*\*|_[^_]+_)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }
    return <span key={index}>{part}</span>
  })
}

function MarkdownRenderer({ text }) {
  if (looksLikeJson(text)) return null
  const lines = String(text || '').split('\n')
  if (!lines.length) return null

  const nodes = []
  let listItems = []
  let orderedItems = []

  const flushList = () => {
    if (!listItems.length) return
    nodes.push(
      <ul key={`list-${nodes.length}`} className="chat-md-list">
        {listItems.map((item, index) => (
          <li key={index}>{renderInlineMarkdown(item)}</li>
        ))}
      </ul>,
    )
    listItems = []
  }

  const flushOrderedList = () => {
    if (!orderedItems.length) return
    nodes.push(
      <ol key={`ordered-list-${nodes.length}`} className="chat-md-list chat-md-list-ordered">
        {orderedItems.map((item, index) => (
          <li key={index}>{renderInlineMarkdown(item)}</li>
        ))}
      </ol>,
    )
    orderedItems = []
  }

  const flushAllLists = () => {
    flushList()
    flushOrderedList()
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()
    if (!trimmed) {
      flushAllLists()
      continue
    }

    const tableResult = markdownTableToTable(lines, index)
    if (tableResult) {
      flushAllLists()
      nodes.push(<ComparisonTable key={`table-${nodes.length}`} table={tableResult.table} />)
      index = tableResult.nextIndex - 1
      continue
    }

    if (trimmed.startsWith('### ')) {
      flushAllLists()
      nodes.push(<h4 key={`h-${nodes.length}`}>{trimmed.slice(4)}</h4>)
      continue
    }
    if (trimmed.startsWith('## ')) {
      flushAllLists()
      nodes.push(<h3 key={`h-${nodes.length}`}>{trimmed.slice(3)}</h3>)
      continue
    }
    if (trimmed.startsWith('# ')) {
      flushAllLists()
      nodes.push(<h3 key={`h-${nodes.length}`}>{trimmed.slice(2)}</h3>)
      continue
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      flushOrderedList()
      listItems.push(trimmed.slice(2))
      continue
    }
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/)
    if (orderedMatch) {
      flushList()
      orderedItems.push(orderedMatch[1])
      continue
    }

    flushAllLists()
    nodes.push(<p key={`p-${nodes.length}`}>{renderInlineMarkdown(trimmed)}</p>)
  }

  flushAllLists()
  return <div className="chat-markdown">{nodes}</div>
}

function MarkdownFallback({ text }) {
  if (looksLikeJson(text)) return null
  return (
    <MarkdownRenderer text={text} />
  )
}

function ComparisonTable({ table }) {
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

function StructuredAdvisorReply({ content }) {
  const reply = normalizeReply(content)
  if (!reply) return null
  return <MarkdownRenderer text={replyToMarkdown(reply)} />
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

function SchemeChat({ scheme, profile, messages, onSend, onBack, onPause, loading, error }) {
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
        {loading && <MessageBubble role="assistant" content={{ markdown: 'Checking this scheme against your question...' }} />}
        <div ref={endRef} />
      </div>

      {error && <div className="scheme-chat-error">✕ {error}</div>}
      {loading && (
        <div className="scheme-chat-pause-row">
          <button type="button" onClick={onPause} className="scheme-chat-pause">
            Pause response
          </button>
        </div>
      )}

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
