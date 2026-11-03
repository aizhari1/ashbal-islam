import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// طلب اشتراك من اللاندنج → pending لحد ما الإدارة تفعّله
export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 }) }

  const courseId = String(body.course_id || '')
  const name = String(body.name || '').trim().slice(0, 80)
  const phone = String(body.phone || '').replace(/[^\d+]/g, '').slice(0, 20)
  const code = String(body.code || '').trim().slice(0, 30)
  if (body.website) return NextResponse.json({ ok: true }) // honeypot
  if (!UUID.test(courseId)) return NextResponse.json({ error: 'كورس غير صالح' }, { status: 400 })
  if (!code && (name.length < 2 || phone.length < 8)) return NextResponse.json({ error: 'اكتب الاسم ورقم الواتساب (أو كود الطالب)' }, { status: 400 })

  const sb = serviceClient()
  const { data: course } = await sb.from('courses').select('id').eq('id', courseId).eq('is_published', true).maybeSingle()
  if (!course) return NextResponse.json({ error: 'الكورس غير متاح' }, { status: 404 })

  if (code) {
    const { data: st } = await sb.from('students').select('id').ilike('code', code).maybeSingle()
    if (!st) return NextResponse.json({ error: 'كود الطالب غير موجود' }, { status: 404 })
    const { error } = await sb.from('course_enrollments').insert({ course_id: courseId, student_id: st.id, status: 'pending' })
    if (error && error.code !== '23505') return NextResponse.json({ error: 'تعذر تسجيل الطلب' }, { status: 500 })
    return NextResponse.json({ ok: true, already: error?.code === '23505' })
  }

  const { error } = await sb.from('course_enrollments').insert({ course_id: courseId, guest_name: name, guest_phone: phone, status: 'pending' })
  if (error && error.code !== '23505') return NextResponse.json({ error: 'تعذر تسجيل الطلب' }, { status: 500 })
  return NextResponse.json({ ok: true, already: error?.code === '23505' })
}
