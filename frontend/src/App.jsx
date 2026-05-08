import { useRef, useState } from 'react'
import { fetchRecommendations, sendSchemeChatMessage } from './services/recommendApi'
import { getSavedSubmissions, saveSubmission } from './utils/localStorage'
import Header from './components/Header'
import Hero from './components/Hero'
import InputForm from './components/InputForm'
import LoadingState from './components/LoadingState'
import ErrorBanner from './components/ErrorBanner'
import ResultsSection from './components/ResultsSection'
import SchemeChat from './components/SchemeChat'
import Ticker from './components/Ticker'

export default function App() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [profile, setProfile] = useState(null)
  const [selectedScheme, setSelectedScheme] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState(null)
  const resultsRef = useRef(null)
  const chatAbortRef = useRef(null)

  const DEFAULT_PROD_API_URL = 'https://robo-advisor-backend-7tds.onrender.com'
  const API_BASE = (
    import.meta?.env?.VITE_API_URL ||
    (import.meta?.env?.DEV ? '' : DEFAULT_PROD_API_URL)
  ).replace(/\/$/, '')

  const handleSubmit = async (profileData) => {
    setLoading(true)
    setError(null)
    setResult(null)
    setProfile(profileData)
    setSelectedScheme(null)
    setChatMessages([])
    setChatError(null)

    try {
      const data = await fetchRecommendations(profileData, API_BASE)
      saveSubmission(profileData)
      setResult(data)
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSchemeSelect = (scheme) => {
    setSelectedScheme(scheme)
    setChatError(null)
    setChatMessages([
      {
        role: 'assistant',
        content: `You selected ${scheme.scheme_name}. Ask me anything about this scheme—returns, risk, duration, liquidity, or whether it matches your profile.`,
      },
    ])
  }

  const handleBackToResults = () => {
    chatAbortRef.current?.abort()
    setSelectedScheme(null)
    setChatMessages([])
    setChatError(null)
    setChatLoading(false)
  }

  const handleSendChatMessage = async (message) => {
    if (!selectedScheme) return

    chatAbortRef.current?.abort()
    const controller = new AbortController()
    chatAbortRef.current = controller
    const nextMessages = [...chatMessages, { role: 'user', content: message }]
    setChatMessages(nextMessages)
    setChatError(null)
    setChatLoading(true)

    try {
      const history = nextMessages.map((msg) => ({
        role: msg.role,
        content: typeof msg.content === 'string'
          ? msg.content
          : msg.content?.recommendation_summary || msg.content?.final_suggestion || JSON.stringify(msg.content),
      }))
      const data = await sendSchemeChatMessage(
        {
          scheme_id: selectedScheme.scheme_id,
          question: message,
          history,
          profile,
        },
        API_BASE,
        { signal: controller.signal },
      )
      setChatMessages((current) => [...current, { role: 'assistant', content: data.reply }])
    } catch (e) {
      if (e.name !== 'AbortError') setChatError(e.message)
    } finally {
      if (chatAbortRef.current === controller) {
        chatAbortRef.current = null
        setChatLoading(false)
      }
    }
  }

  const handlePauseChat = () => {
    chatAbortRef.current?.abort()
    chatAbortRef.current = null
    setChatLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '60%',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,184,75,0.05) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          left: '-10%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,212,191,0.04) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Header />
        <Ticker />

        <main className="app-main">
          <Hero />
          <InputForm onSubmit={handleSubmit} loading={loading} savedSubmissions={getSavedSubmissions()} />

          {error && <ErrorBanner error={error} />}

          {loading && <LoadingState />}

          {result && !selectedScheme && (
            <div ref={resultsRef}>
              <ResultsSection result={result} profile={profile} onSchemeSelect={handleSchemeSelect} />
            </div>
          )}
          {selectedScheme && (
            <div ref={resultsRef}>
              <SchemeChat
                scheme={selectedScheme}
                profile={profile}
                messages={chatMessages}
                loading={chatLoading}
                error={chatError}
                onBack={handleBackToResults}
                onSend={handleSendChatMessage}
                onPause={handlePauseChat}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
