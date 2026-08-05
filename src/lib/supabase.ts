import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Connection settings come from environment variables (set in .env.local for
// local development, and in the Vercel dashboard for the deployed site).
// The "anon" key is Supabase's publishable client key — it is designed to be
// public and is safe to ship in the browser bundle; per-user data access is
// enforced server-side by row level security policies.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * True when this page load came from a password-reset email link. Captured
 * synchronously at module load, before the auth client processes (and strips)
 * the URL fragment — the app uses it to show the set-new-password panel even
 * though the fragment is gone by the time components mount.
 */
export const openedViaRecoveryLink =
  typeof window !== 'undefined' && window.location.hash.includes('type=recovery')

/** Null until Supabase is configured — the UI degrades gracefully. */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null
