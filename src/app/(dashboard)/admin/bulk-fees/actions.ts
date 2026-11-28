'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth-guards'
import { serviceClient } from '@/lib/supabase/service'
import { fetchAllRows } from '@/lib/fetch-all'

export type BulkFeeRow = {
  id: string; code: string; name: string; teacher: string
  sessions: number; parent: number; teacherRate: number
  ads: number; sup: number; other: number
}

/** الطلاب النشطين + آخر رسوم مسجلة لكل طالب (من سجل student_extra_costs) */
export async function loadBulkFeeRows(): Promise<{ rows?: BulkFeeRow[]; error?: string }> {
  const staff = await requireStaff()
  if (!staff.ok) return { error: staff.error || 'غير مصرح' }
  const sb = serviceClient()
  let students: any[] = []
  const r1 = await fetchAllRows<any>((f, t) => sb.from('students')
    .select('id, code, name, monthly_sessions, price_per_session, teacher_session_rate, teachers(name)')
    .eq('status', 'نشط').order('name').range(f, t))
  students = r1
  const logs = await fetchAllRows<any>((f, t) => sb.from('activity_log')
    .select('entity_id, details, created_at').eq('action', 'student_extra_costs')
    .order('created_at', { ascending: false }).range(f, t))
  const fees = new Map<string, any>()
  for (const l of logs) if (l.entity_id && !fees.has(l.entity_id)) fees.set(l.entity_id, l.details || {})
  const rows: BulkFeeRow[] = students.map((s) => {
    const d = fees.get(s.id) || {}
    const parent = Number(s.price_per_session) || 0
    return {
      id: s.id, code: s.code || '', name: s.name, teacher: s.teachers?.name || '',
      sessions: Number(s.monthly_sessions) || 0, parent,
      teacherRate: s.teacher_session_rate == null ? parent : Number(s.teacher_session_rate) || 0,
      ads: Number(d.ads_fee) || 0, sup: Number(d.supervision_fee) || 0, other: Number(d.other_fee) || 0,
    }
  })
  return { rows }
}

/** تعميم: يضبط الرسوم الإضافية للطلاب المحددين (القيمة الفارغة = ما يتغيّرش) */
export async function applyBulkFees(input: { ids: string[]; ads?: number | null; sup?: number | null; other?: number | null }) {
  const staff = await requireStaff()
  if (!staff.ok) return { error: staff.error || 'غير مصرح' }
  const ids = Array.from(new Set((input.ids || []).filter(Boolean))).slice(0, 3000)
  if (!ids.length) return { error: 'اختار طلاب الأول' }
  const norm = (v: unknown) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Math.max(0, Math.round(Number(v) * 100) / 100))
  const ads = norm(input.ads), sup = norm(input.sup), other = norm(input.other)
  if (ads === null && sup === null && other === null) return { error: 'اكتب قيمة واحدة على الأقل' }

  const sb = serviceClient()
  const logs = await fetchAllRows<any>((f, t) => sb.from('activity_log')
    .select('entity_id, details').eq('action', 'student_extra_costs')
    .order('created_at', { ascending: false }).range(f, t))
  const prev = new Map<string, any>()
  for (const l of logs) if (l.entity_id && !prev.has(l.entity_id)) prev.set(l.entity_id, l.details || {})

  const rows = ids.map((id) => {
    const p = prev.get(id) || {}
    return {
      actor_id: staff.userId, action: 'student_extra_costs', entity_type: 'student', entity_id: id,
      details: {
        ...p,
        ads_fee: ads ?? (Number(p.ads_fee) || 0),
        supervision_fee: sup ?? (Number(p.supervision_fee) || 0),
        other_fee: other ?? (Number(p.other_fee) || 0),
        bulk: true,
      },
    }
  })
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await sb.from('activity_log').insert(rows.slice(i, i + 200))
    if (error) return { error: error.message }
  }
  revalidatePath('/admin/bulk-fees')
  revalidatePath('/supervisor/edit-student')
  return { ok: true as const, count: ids.length }
}
