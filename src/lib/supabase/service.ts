import { createClient } from '@supabase/supabase-js'

/** عميل service-role — للسيرفر فقط. يتطلب SUPABASE_SERVICE_ROLE_KEY في Vercel (موجود). */
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bmemllsjduxlqmwnpfya.supabase.co'
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY غير مضبوط')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
