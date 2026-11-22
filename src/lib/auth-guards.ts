import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/supabase/service'

/** يتأكد إن المستخدم الحالي أدمن أو مشرف (الـ server actions بتتنادى مباشرة، فالـ middleware لوحده مش كفاية) */
export async function requireStaff(): Promise<{
  ok: boolean
  userId?: string
  role?: string
  error?: string
}> {
  const supabase = await createClient()
  let userId: string | undefined

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.id) {
    userId = user.id
  } else {
    // بعض الحالات getUser يفشل والجلسة لسه موجودة في الكوكي
    const {
      data: { session },
    } = await supabase.auth.getSession()
    userId = session?.user?.id
  }

  if (!userId) return { ok: false, error: 'غير مصرح — سجّل دخول من جديد' }

  let role = ''
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  role = String(profile?.role || '').trim()

  // لو RLS منعت قراءة البروفايل، نقرأ بالـ service role
  if (!role) {
    try {
      const sb = serviceClient()
      const { data: p2 } = await sb.from('profiles').select('role').eq('id', userId).maybeSingle()
      role = String(p2?.role || '').trim()
    } catch {
      /* ignore */
    }
  }

  if (role !== 'admin' && role !== 'supervisor') {
    return { ok: false, error: 'للإدارة والإشراف فقط' }
  }
  return { ok: true, userId, role }
}
