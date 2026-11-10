import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY غير مضبوط')
  return createServiceClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export type TeacherRow = {
  id: string
  code: string | null
  name: string | null
  profile_id: string | null
  is_active: boolean | null
  rate_percent?: number | null
}

/**
 * يجيب صف المعلم المرتبط بالحساب.
 * لو مش موجود: يحاول الربط بالاسم/الكود من profiles، أو ينشئ صف جديد.
 */
export async function resolveTeacherForUser(
  _supabase: SupabaseClient,
  userId: string
): Promise<{ teacher: TeacherRow | null; linked: boolean; created: boolean; message?: string }> {
  const sb = service()

  const { data: already } = await sb
    .from('teachers')
    .select('id, code, name, profile_id, is_active, rate_percent')
    .eq('profile_id', userId)
    .maybeSingle()

  if (already) {
    if (already.is_active === false) {
      await sb.from('teachers').update({ is_active: true }).eq('id', already.id)
      already.is_active = true
    }
    return { teacher: already as TeacherRow, linked: false, created: false }
  }

  const { data: profile } = await sb
    .from('profiles')
    .select('id, code, full_name, role')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) {
    return { teacher: null, linked: false, created: false, message: 'حساب بدون ملف profiles' }
  }

  if (profile.role !== 'teacher' && profile.role !== 'admin') {
    await sb.from('profiles').update({ role: 'teacher' }).eq('id', userId)
  }

  const code = String(profile.code || '').toUpperCase()
  const tcode = code.startsWith('T-') ? code : code ? `T-${code}` : null
  const name = String(profile.full_name || '').trim()

  const { data: candidates } = await sb
    .from('teachers')
    .select('id, code, name, profile_id, is_active, rate_percent')
    .is('profile_id', null)
    .limit(200)

  let match =
    (candidates || []).find((t) => tcode && t.code === tcode) ||
    (candidates || []).find((t) => name && t.name === name) ||
    null

  if (!match && name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      const key = parts.slice(0, 2).join(' ')
      match =
        (candidates || []).find((t) => String(t.name || '').startsWith(key)) || null
    }
  }

  if (match) {
    await sb.from('teachers').update({ profile_id: userId, is_active: true }).eq('id', match.id)
    return {
      teacher: { ...match, profile_id: userId, is_active: true } as TeacherRow,
      linked: true,
      created: false,
      message: `تم ربط الحساب بالمعلم: ${match.name}`,
    }
  }

  const newCode = tcode || `T-${userId.slice(0, 6).toUpperCase()}`
  const newName = name || `معلم ${newCode}`
  const { data: created, error } = await sb
    .from('teachers')
    .insert({
      code: newCode,
      name: newName,
      profile_id: userId,
      is_active: true,
    })
    .select('id, code, name, profile_id, is_active, rate_percent')
    .single()

  if (error || !created) {
    return {
      teacher: null,
      linked: false,
      created: false,
      message: error?.message || 'فشل إنشاء ملف معلم',
    }
  }

  return {
    teacher: created as TeacherRow,
    linked: false,
    created: true,
    message: `تم إنشاء ملف معلم: ${created.name}`,
  }
}
