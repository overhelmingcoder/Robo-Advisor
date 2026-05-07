export async function fetchRecommendations(profile, apiBase) {
  const endpoint = apiBase ? `${apiBase}/recommend` : '/api/recommend'

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Server error ${res.status}`)
  }

  return res.json()
}

export async function sendSchemeChatMessage(payload, apiBase) {
  const endpoint = apiBase ? `${apiBase}/chat` : '/api/chat'

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Server error ${res.status}`)
  }

  return res.json()
}
