import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Props {
  user: User | null
}

export default function AuthPanel({ user }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [open, setOpen] = useState(false)

  // After a successful login, fold the form away (and forget what was typed)
  // so a later logout shows the quiet collapsed bar, not an open form.
  useEffect(() => {
    if (user) {
      setOpen(false)
      setMode('signin')
      setEmail('')
      setPassword('')
      setShowPassword(false)
      setMessage('')
    }
  }, [user])

  if (!supabase) {
    return <div className="auth-note">Accounts aren’t set up yet — charts can’t be saved.</div>
  }

  if (user) {
    return (
      <div className="auth-bar">
        <span className="auth-email">{user.email}</span>
        <button
          type="button"
          className="auth-link"
          onClick={() => supabase!.auth.signOut()}
        >
          Log out
        </button>
      </div>
    )
  }

  if (!open) {
    return (
      <div className="auth-bar">
        <span className="auth-note">Log in to save charts</span>
        <button type="button" className="auth-link" onClick={() => setOpen(true)}>
          Log in / Sign up
        </button>
      </div>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setBusy(true)
    try {
      if (mode === 'reset') {
        const { error } = await supabase!.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setMessage(
          'If an account exists for that email, a reset link is on its way. Open it on this device and you can choose a new password.',
        )
      } else if (mode === 'signup') {
        const { data, error } = await supabase!.auth.signUp({ email, password })
        if (error) throw error
        if (!data.session) {
          setMessage('Account created — check your email for a confirmation link, then log in.')
        }
      } else {
        const { error } = await supabase!.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === 'signin' ? 'active' : ''}
          onClick={() => setMode('signin')}
        >
          Log in
        </button>
        <button
          type="button"
          className={mode === 'signup' ? 'active' : ''}
          onClick={() => setMode('signup')}
        >
          Sign up
        </button>
      </div>

      {mode === 'reset' && (
        <p className="auth-note">
          Enter your account&apos;s email and we&apos;ll send you a link to set a new password.
        </p>
      )}

      <label>
        Email
        <input
          type="email"
          value={email}
          autoComplete="email"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      {mode !== 'reset' && (
        <label>
          Password
          <span className="pw-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            <button
              type="button"
              className={`pw-eye${showPassword ? ' pw-eye-on' : ''}`}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((s) => !s)}
            >
              👁
            </button>
          </span>
        </label>
      )}

      <div className="auth-actions">
        <button type="submit" className="submit" disabled={busy}>
          {busy
            ? 'Working…'
            : mode === 'reset'
              ? 'Send reset link'
              : mode === 'signup'
                ? 'Create account'
                : 'Log in'}
        </button>
        <button type="button" className="auth-link" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>

      {mode === 'signin' && (
        <button type="button" className="auth-link auth-forgot" onClick={() => { setMode('reset'); setMessage('') }}>
          Forgot password?
        </button>
      )}
      {mode === 'reset' && (
        <button type="button" className="auth-link auth-forgot" onClick={() => { setMode('signin'); setMessage('') }}>
          Back to log in
        </button>
      )}

      {message && <div className="auth-message">{message}</div>}
    </form>
  )
}

/**
 * Shown when the page was opened from a password-reset email link: the person
 * is signed in through the link's temporary session and chooses a new password.
 */
export function RecoveryPanel({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setBusy(true)
    try {
      const { error } = await supabase!.auth.updateUser({ password })
      if (error) throw error
      setMessage('Password updated — you are logged in.')
      setTimeout(onDone, 1500)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-form recovery-panel" onSubmit={submit}>
      <p className="auth-note">
        You followed a password-reset link. Choose a new password for your account:
      </p>
      <label>
        New password
        <span className="pw-wrap">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            autoFocus
          />
          <button
            type="button"
            className={`pw-eye${showPassword ? ' pw-eye-on' : ''}`}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((s) => !s)}
          >
            👁
          </button>
        </span>
      </label>
      <div className="auth-actions">
        <button type="submit" className="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Set new password'}
        </button>
      </div>
      {message && <div className="auth-message">{message}</div>}
    </form>
  )
}
