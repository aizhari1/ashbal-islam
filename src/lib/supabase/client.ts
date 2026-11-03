import { createBrowserClient } from '@supabase/ssr'
import { COOKIE_MAX_AGE } from '@/lib/session-persist'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bmemllsjduxlqmwnpfya.supabase.co'
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_LM3NJ51Ab6W1gLnE3fKxcQ_T0KOV0Ar'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

/** عميل واحد — جلسة طويلة + تجديد تلقائي حتى يسجّل المستخدم خروج */
export function createClient() {
  if (typeof window !== 'undefined' && browserClient) {
    return browserClient
  }
  const client = createBrowserClient(URL, KEY, {
    cookieOptions: {
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    isSingleton: true,
  } as any)
  if (typeof window !== 'undefined') {
    browserClient = client
  }
  return client
}
