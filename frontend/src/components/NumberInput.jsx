function NumberInput({ value, onChange, placeholder, step = '1', suggestions = [] }) {
  const listId = suggestions.length ? `number-options-${placeholder.replace(/\W+/g, '-').toLowerCase()}` : undefined

  return (
    <>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        list={listId}
        style={{
          width: '100%',
          padding: '10px 14px',
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
