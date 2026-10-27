import { createBrowserClient } from '@supabase/ssr'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bmemllsjduxlqmwnpfya.supabase.co'
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_LM3NJ51Ab6W1gLnE3fKxcQ_T0KOV0Ar'

export function createClient() {
  return createBrowserClient(URL, KEY)
}
