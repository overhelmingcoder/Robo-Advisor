function NumberInput({ value, onChange, placeholder, step = '1', suggestions = [], preview }) {
  const listId = suggestions.length ? `number-options-${placeholder.replace(/\W+/g, '-').toLowerCase()}` : undefined

  return (
    <>
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          step={step}
          list={listId}
          style={{
            width: '100%',
            padding: preview ? '10px 78px 10px 14px' : '10px 14px',
            background: 'var(--bg2)',
            border: '1px solid var(--border2)',
            borderRadius: 8,
            color: 'var(--text)',
            fontSize: 14,
            fontFamily: 'var(--font-mono)',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--gold)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border2)')}
        />
        {preview && (
          <span
            aria-label={`Entered amount: ${preview}`}
            title={`Entered amount: ${preview}`}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              maxWidth: 64,
              padding: '4px 7px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              borderRadius: 6,
              border: '1px solid rgba(232,184,75,0.34)',
              background: 'rgba(232,184,75,0.11)',
              color: 'var(--gold)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 700,
              pointerEvents: 'none',
            }}
          >
            {preview}
          </span>
        )}
      </div>
      {preview && (
        <div
          style={{
            marginTop: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            minHeight: 18,
            color: 'var(--gold)',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          Amount: {preview}
        </div>
      )}
      {listId && (
        <datalist id={listId}>
          {suggestions.map((suggestion) => (
            <option key={suggestion.value ?? suggestion.label} value={suggestion.value ?? suggestion.label} />
          ))}
        </datalist>
      )}
    </>
  )
}

export default NumberInput
