import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // مفيش مفتاح مكتوب في الكود — لازم يتضبط في Vercel
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('إعدادات Supabase ناقصة')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export async function GET(req: NextRequest) {
  const code = String(req.nextUrl.searchParams.get('code') || '').trim()
  if (!code || code.length < 2) {
    return NextResponse.json({ error: 'اكتب كود الطالب' }, { status: 400 })
  }

  let supabase: ReturnType<typeof serviceClient>
  try {
    supabase = serviceClient()
  } catch {
    return NextResponse.json({ error: 'الخدمة غير متاحة حالياً' }, { status: 503 })
  }
  const { data: student, error } = await supabase
    .from('students')
    .select(
      'id, code, name, status, amount_due, subscription_type, monthly_sessions, last_session_num, last_session_date, price_per_session, teacher_id, teachers(name)'
    )
    .ilike('code', code.replace(/[\\%_]/g, (c) => '\\' + c))
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'تعذر البحث' }, { status: 500 })
  }
  if (!student) {
    return NextResponse.json({ error: 'الكود غير موجود' }, { status: 404 })
  }

  const [{ data: schedule }, { data: att }] = await Promise.all([
    supabase
      .from('schedule_entries')
      .select('day_of_week, start_time, duration_minutes')
      .eq('student_id', student.id)
      .order('day_of_week'),
    supabase
      .from('attendance')
      .select('session_date, status, rating, session_num')
      .eq('student_id', student.id)
      .order('session_date', { ascending: false })
      .limit(8),
  ])

  const ratings = (att || []).map((a) => Number(a.rating)).filter((n) => n > 0)
  const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null

  return NextResponse.json({
    student: {
      code: student.code,
      name: student.name,
      status: student.status,
      amount_due: student.amount_due,
      subscription_type: student.subscription_type,
      monthly_sessions: student.monthly_sessions,
      last_session_num: student.last_session_num,
      last_session_date: student.last_session_date,
      teacher_name: (student as any).teachers?.name || '—',
    },
    schedule: schedule || [],
    attendance: att || [],
    avg_rating: avg,
  })
}
