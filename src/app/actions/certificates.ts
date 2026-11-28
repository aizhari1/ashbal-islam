'use server'

import { revalidatePath } from 'next/cache'
import { requireStaff as guardStaff } from '@/lib/auth-guards'
import { serviceClient } from '@/lib/supabase/service'
import { TEMPLATES } from '@/lib/certificates'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const KEYS = TEMPLATES.map((t) => t.key as string)
const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n)

async function requireStaff(): Promise<{ ok: true; userId: string; role: string } | { ok: false; error: string }> {
  const r = await guardStaff()
  if (!r.ok || !r.userId) return { ok: false, error: r.error || 'غير مصرح' }
  return { ok: true, userId: r.userId, role: String(r.role || '') }
}

/** اقتراحات تلقائية للشهادة من بيانات الطالب وتقارير حصصه */
export async function getCertificateSuggestions(studentId: string) {
  const auth = await requireStaff()
  if (!auth.ok) return { error: (auth as any).error as string }
  if (!UUID.test(studentId)) return { error: 'معرّف غير صالح' }
  const sb = serviceClient()
  const { data: st } = await sb.from('students').select('id, name, phone, teacher_id, teachers(name)').eq('id', studentId).maybeSingle()
  if (!st) return { error: 'الطالب غير موجود' }

  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const { data: rows } = await sb
    .from('attendance')
    .select('session_date, status, new_memorization, score_new, score_recent, score_far')
    .eq('student_id', studentId)
    .in('status', ['حاضر', 'متأخر'])
    .order('session_date', { ascending: false })
    .limit(80)
  const list = rows || []
  const memorized = list.map((r: any) => String(r.new_memorization || '').trim()).find((x) => x) || ''
  const recent = list.filter((r: any) => r.session_date >= since)
  const scores = recent.flatMap((r: any) => [r.score_new, r.score_recent, r.score_far]).filter((x: any) => typeof x === 'number')
  const avg = scores.length ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10 : null
  const progress = recent.length
    ? `أتمّ ${recent.length} حصة خلال آخر 30 يومًا${avg !== null ? ` · متوسط التقييم ${avg}/10` : ''}`
    : ''
  return {
    ok: true as const,
    name: st.name as string,
    phone: (st.phone as string) || '',
    teacherName: ((st as any).teachers?.name as string) || '',
    memorized,
    progress,
  }
}

export async function createCertificate(input: {
  student_id?: string | null
  student_name: string
  teacher_name?: string
  gender: 'male' | 'female'
  template: string
  title?: string
  memorized?: string
  progress?: string
  message?: string
  issue_date?: string
  signer?: string
}) {
  const auth = await requireStaff()
  if (!auth.ok) return { error: (auth as any).error as string }
  const student_name = clip(input.student_name, 80)
  if (!student_name) return { error: 'اسم الطالب مطلوب' }
  if (!KEYS.includes(input.template)) return { error: 'القالب غير صالح' }
  if (!['male', 'female'].includes(input.gender)) return { error: 'النوع غير صالح' }
  const sid = input.student_id && UUID.test(input.student_id) ? input.student_id : null
  const issue = /^\d{4}-\d{2}-\d{2}$/.test(String(input.issue_date || '')) ? String(input.issue_date) : undefined

  const sb = serviceClient()
  let teacher_id: string | null = null
  if (sid) {
    const { data: st } = await sb.from('students').select('teacher_id').eq('id', sid).maybeSingle()
    teacher_id = st?.teacher_id || null
  }
  const row: Record<string, unknown> = {
    student_id: sid,
    teacher_id,
    student_name,
    teacher_name: clip(input.teacher_name, 80) || null,
    gender: input.gender,
    template: input.template,
    title: clip(input.title, 60) || 'شهادة تقدير',
    memorized: clip(input.memorized, 200) || null,
    progress: clip(input.progress, 200) || null,
    message: clip(input.message, 400) || null,
    signer: clip(input.signer, 60) || null,
    issued_by: auth.userId,
  }
  if (issue) row.issue_date = issue
  const { data, error } = await sb.from('certificates').insert(row).select('id').single()
  if (error) return { error: error.message }
  revalidatePath('/admin/certificates')
  return { ok: true as const, id: data.id as string }
}

export async function markCertificateSent(id: string) {
  const auth = await requireStaff()
  if (!auth.ok) return { error: (auth as any).error as string }
  if (!UUID.test(id)) return { error: 'معرّف غير صالح' }
  const sb = serviceClient()
  const { data: c } = await sb.from('certificates').select('sent_count').eq('id', id).maybeSingle()
  if (!c) return { error: 'الشهادة غير موجودة' }
  await sb.from('certificates').update({ sent_at: new Date().toISOString(), sent_count: (c.sent_count || 0) + 1 }).eq('id', id)
  revalidatePath('/admin/certificates')
  return { ok: true as const }
}

export async function deleteCertificate(id: string) {
  const auth = await requireStaff()
  if (!auth.ok) return { error: (auth as any).error as string }
  if (auth.role !== 'admin') return { error: 'الحذف للإدارة فقط' }
  if (!UUID.test(id)) return { error: 'معرّف غير صالح' }
  const { error } = await serviceClient().from('certificates').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/certificates')
  return { ok: true as const }
}
