import { createClient } from '@/lib/supabase/server'

/** يتأكد إن المستخدم الحالي أدمن أو مشرف (الـ server actions بتتنادى مباشرة، فالـ middleware لوحده مش كفاية) */
export async function requireStaff(): Promise<{ ok: boolean; userId?: string; role?: string; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'غير مسجل' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = String(profile?.role || '')
  if (role !== 'admin' && role !== 'supervisor') return { ok: false, error: 'للإدارة والإشراف فقط' }
  return { ok: true, userId: user.id, role }
}
