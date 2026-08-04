import { useState, type ReactNode } from 'react'

// Light shared-passphrase screen for the test/feedback stage. This is
// deliberately simple protection against casual passers-by, not real
// security: the phrase is checked in the browser and remembered on the
// device. It comes from an environment variable so it never appears in the
// public repository; if the variable is unset (e.g. local development), the
// gate is disabled.

const PASSPHRASE = (import.meta.env.VITE_ACCESS_PASSPHRASE as string | undefined) ?? ''
const STORAGE_KEY = 'bazi-access-granted'

export default function PassGate({ children }: { children: ReactNode }) {
  const [granted, setGranted] = useState(
    () => !PASSPHRASE || localStorage.getItem(STORAGE_KEY) === 'yes',
  )
  const [attempt, setAttempt] = useState('')
  const [wrong, setWrong] = useState(false)

  if (granted) return <>{children}</>

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (attempt.trim() === PASSPHRASE) {
      localStorage.setItem(STORAGE_KEY, 'yes')
      setGranted(true)
    } else {
      setWrong(true)
    }
  }

  return (
    <div className="gate">
      <div className="gate-card">
        <h1>Ba Zi · Four Pillars</h1>
        <p>
          This app is in its test stage, open to the AI Mastery 2026 class. Enter the access
          phrase from the class invitation to continue.
        </p>
        <form onSubmit={submit}>
          <input
            type="text"
            value={attempt}
            placeholder="Access phrase"
            autoFocus
            onChange={(e) => {
              setAttempt(e.target.value)
              setWrong(false)
            }}
          />
          <button type="submit" className="submit">
            Enter
          </button>
        </form>
        {wrong && <p className="gate-wrong">That phrase doesn&apos;t match — check the invitation.</p>}
      </div>
    </div>
  )
}
