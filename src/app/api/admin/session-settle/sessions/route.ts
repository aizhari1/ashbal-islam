import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase/service'
import { requireStaff } from '@/lib/auth-guards'

export const dynamic = 'force-dynamic'

/** GET ?studentId=&month=YYYY-MM */
export async function GET(req: NextRequest) {
  try {
    const staff = await requireStaff()
    if (!staff.ok || !staff.userId) {
      return NextResponse.json({ error: staff.error || 'غير مصرح', sessions: [] }, { status: 401 })
    }

    const studentId = req.nextUrl.searchParams.get('studentId') || ''
    const month = req.nextUrl.searchParams.get('month') || ''
    if (!/^[0-9a-f-]{36}$/i.test(studentId)) {
      return NextResponse.json({ error: 'معرّف غير صالح', sessions: [] }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'شهر غير صالح', sessions: [] }, { status: 400 })
    }

    const [y, m] = month.split('-').map(Number)
    const last = new Date(y, m, 0).getDate()
    const sb = serviceClient()
    const { data, error } = await sb
      .from('attendance')
      .select('id, session_date, session_num, status, notes, session_duration, teachers(name)')
      .eq('student_id', studentId)
      .gte('session_date', `${month}-01`)
      .lte('session_date', `${month}-${String(last).padStart(2, '0')}`)
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300)

    if (error) return NextResponse.json({ error: error.message, sessions: [] }, { status: 500 })

    const sessions = (data || []).map((r: any) => {
      const t = Array.isArray(r.teachers) ? r.teachers[0] : r.teachers
      return {
        id: r.id as string,
        session_date: String(r.session_date).slice(0, 10),
        session_num: r.session_num as number | null,
        status: r.status as string,
        notes: r.notes as string | null,
        session_duration: r.session_duration as number | null,
        teacher_name: (t?.name as string) || '—',
      }
    })

    return NextResponse.json({ sessions })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'فشل تحميل الحصص', sessions: [] }, { status: 500 })
  }
}

/** POST { studentId, date } — إضافة حصة منسية */
export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaff()
    if (!staff.ok || !staff.userId) {
      return NextResponse.json({ error: staff.error || 'غير مصرح' }, { status: 401 })
    }
    const user = { id: staff.userId }

    const body = await req.json().catch(() => ({}))
    const studentId = String(body.studentId || '')
    const date = String(body.date || '')
    if (!/^[0-9a-f-]{36}$/i.test(studentId)) return NextResponse.json({ error: 'معرّف غير صالح' }, { status: 400 })
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'تاريخ غير صالح' }, { status: 400 })

    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })
    if (date > today) return NextResponse.json({ error: 'لا يمكن إضافة حصة بتاريخ مستقبلي' }, { status: 400 })

    const sb = serviceClient()
    const { data: st } = await sb
      .from('students')
      .select('id, teacher_id, session_duration')
      .eq('id', studentId)
      .maybeSingle()
    if (!st) return NextResponse.json({ error: 'طالب غير موجود' }, { status: 404 })
    if (!st.teacher_id) return NextResponse.json({ error: 'الطالب مالوش معلم' }, { status: 400 })

    const { data: same } = await sb
      .from('attendance')
      .select('id')
      .eq('student_id', studentId)
      .eq('session_date', date)
      .limit(1)
    if (same && same.length) {
      return NextResponse.json({ error: 'فيه حصة مسجّلة للطالب في اليوم ده بالفعل' }, { status: 400 })
    }

    const { data: row, error } = await sb
      .from('attendance')
      .insert({
        student_id: studentId,
        teacher_id: st.teacher_id,
        session_date: date,
        status: 'حاضر',
        notes: 'أُضيفت من لوحة الإدارة (حصة منسية)',
        session_duration: st.session_duration || 30,
      })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await sb.from('activity_log').insert({
      actor_id: user.id,
      action: 'add_teacher_session',
      entity_type: 'attendance',
      entity_id: row?.id,
      details: { student_id: studentId, teacher_id: st.teacher_id, session_date: date },
    })

    return NextResponse.json({
      ok: true,
      message: `اتضافت حصة ${date} لسجل المعلم (عدّاد الطالب ما اتغيّرش)`,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'فشل الإضافة' }, { status: 500 })
  }
}

/** DELETE ?id=&studentId= — حذف حصة من سجل المعلم */
export async function DELETE(req: NextRequest) {
  try {
    const staff = await requireStaff()
    if (!staff.ok || !staff.userId) {
      return NextResponse.json({ error: staff.error || 'غير مصرح' }, { status: 401 })
    }
    const user = { id: staff.userId }

    const id = req.nextUrl.searchParams.get('id') || ''
    const studentId = req.nextUrl.searchParams.get('studentId') || ''
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'معرّف غير صالح' }, { status: 400 })

    const sb = serviceClient()
    const { data: row } = await sb
      .from('attendance')
      .select('id, student_id, notes, session_date, session_num, status')
      .eq('id', id)
      .maybeSingle()
    if (!row) return NextResponse.json({ error: 'الحصة مش موجودة أو اتحذفت' }, { status: 404 })

    await sb.from('activity_log').insert({
      actor_id: user.id,
      action: 'delete_attendance_settle',
      entity_type: 'attendance',
      entity_id: id,
      details: {
        student_id: studentId || row.student_id,
        session_date: row.session_date,
        session_num: row.session_num,
        status: row.status,
      },
    })

    const { error } = await sb.from('attendance').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      ok: true,
      message: 'اتحذفت الحصة من سجل المعلم (عدّاد الطالب ما اتغيّرش)',
      deleted_id: id,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'فشل الحذف' }, { status: 500 })
  }
}
