import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/supabase/service'

/** استخراج user id من كوكي جلسة Supabase لو getUser/getSession فشلوا */
function userIdFromAuthCookies(
  all: { name: string; value: string }[]
): string | undefined {
  for (const c of all) {
    if (!c.name.includes('auth-token') && !c.name.startsWith('sb-')) continue
    const raw = c.value
    if (!raw) continue
    // القيمة ممكن تكون JSON: {"access_token":"...","user":{"id":"..."}}
    // أو base64url لـ JWT
    try {
      const decoded = decodeURIComponent(raw)
      if (decoded.startsWith('{') || decoded.startsWith('[')) {
        const j = JSON.parse(decoded)
        const id =
          j?.user?.id ||
          j?.currentSession?.user?.id ||
          (Array.isArray(j) ? j[0]?.user?.id : null)
        if (id && typeof id === 'string') return id
        const at = j?.access_token || j?.accessToken
        if (typeof at === 'string' && at.includes('.')) {
          const payload = JSON.parse(
            Buffer.from(at.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
          )
          if (payload?.sub) return String(payload.sub)
        }
      }
    } catch {
      /* try jwt path */
    }
    // JWT مباشر
    if (raw.includes('.') && raw.split('.').length >= 2) {
      try {
        const part = raw.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(Buffer.from(part, 'base64').toString('utf8'))
        if (payload?.sub) return String(payload.sub)
      } catch {
        /* ignore */
      }
    }
  }
  return undefined
}

/** يتأكد إن المستخدم الحالي أدمن أو مشرف */
export async function requireStaff(): Promise<{
  ok: boolean
  userId?: string
  role?: string
  error?: string
}> {
  const supabase = await createClient()
  let userId: string | undefined

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.id) userId = user.id
  } catch {
    /* ignore */
  }

  if (!userId) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      userId = session?.user?.id
    } catch {
      /* ignore */
    }
  }

  if (!userId) {
    try {
      const cookieStore = await cookies()
      userId = userIdFromAuthCookies(cookieStore.getAll())
    } catch {
      /* ignore */
    }
  }

  if (!userId) return { ok: false, error: 'غير مصرح — سجّل دخول من جديد' }

  let role = ''
  try {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
    role = String(profile?.role || '').trim()
  } catch {
    /* ignore */
  }

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
