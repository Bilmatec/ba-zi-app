import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface Props {
  user: User | null
}

export default function AuthPanel({ user }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [open, setOpen] = useState(false)

  // After a successful login, fold the form away (and forget what was typed)
  // so a later logout shows the quiet collapsed bar, not an open form.
  useEffect(() => {
    if (user) {
      setOpen(false)
      setEmail('')
      setPassword('')
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
      if (mode === 'signup') {
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
      <label>
        Password
        <input
          type="password"
          value={password}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
      </label>
      <div className="auth-actions">
        <button type="submit" className="submit" disabled={busy}>
          {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Log in'}
        </button>
        <button type="button" className="auth-link" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {message && <div className="auth-message">{message}</div>}
    </form>
  )
}
