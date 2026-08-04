import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

// Test-stage "paywall": the upgrade button instantly unlocks the detailed
// reading for the signed-in account — no payment step. The flag lives in the
// account's metadata, so it follows the user across devices. When real
// billing arrives, only this module needs rewiring.

export function isUnlocked(user: User | null): boolean {
  return user?.user_metadata?.detailed_unlocked === true
}

export async function unlockDetailed(): Promise<void> {
  if (!supabase) throw new Error('Accounts are not configured.')
  const { error } = await supabase.auth.updateUser({ data: { detailed_unlocked: true } })
  if (error) throw new Error(error.message)
}
