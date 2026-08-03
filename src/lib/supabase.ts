import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Connection settings come from environment variables (set in .env.local for
// local development, and in the Vercel dashboard for the deployed site).
// The "anon" key is Supabase's publishable client key — it is designed to be
// public and is safe to ship in the browser bundle; per-user data access is
// enforced server-side by row level security policies.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Null until Supabase is configured — the UI degrades gracefully. */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null
