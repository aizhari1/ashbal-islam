import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/supabase/service'
import { packageSize, validateSessionWithinPackage } from '@/lib/dues'

export const dynamic = 'force-dynamic'

async function requireStaffUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let userId = user?.id
  if (!userId) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    userId = session?.user?.id
  }
  if (!userId) return null
  const sb = serviceClient()
  const { data: prof } = await sb.from('profiles').select('role').eq('id', userId).maybeSingle()
  const role = String(prof?.role || '')
  if (role !== 'admin' && role !== 'supervisor') return null
  return { id: userId, role }
}

export async function POST(req: NextRequest) {
  try {
    const staff = await requireStaffUser()
    if (!staff) return NextResponse.json({ error: 'غير مصرح — سجّل دخول كإدارة أو إشراف' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const studentId = String(body.student_id || '')
    if (!studentId) return NextResponse.json({ error: 'اختر طالب' }, { status: 400 })

    const sb = serviceClient()
    const { data: before } = await sb
      .from('students')
      .select(
        'id, name, code, last_session_num, amount_due, teacher_id, session_duration, price_per_session, monthly_sessions, subscription_type, package_id, join_date'
      )
      .eq('id', studentId)
      .maybeSingle()
    if (!before) return NextResponse.json({ error: 'الطالب غير موجود' }, { status: 404 })

    let oldManual = 0
    try {
      const { data: md } = await sb.from('students').select('manual_due').eq('id', studentId).maybeSingle()
      oldManual = Math.max(0, Number((md as any)?.manual_due) || 0)
    } catch {
      oldManual = 0
    }

    const oldLast = Number(before.last_session_num || 0)
    let newLast =
      body.last_session_num === undefined || body.last_session_num === null || String(body.last_session_num).trim() === ''
        ? oldLast
        : Math.max(0, Math.floor(Number(body.last_session_num) || 0))

    if (
      body.orig_last_session_num !== undefined &&
      String(body.orig_last_session_num).trim() !== '' &&
      Number(body.orig_last_session_num) === newLast
    ) {
      const { data: fresh } = await sb.from('students').select('last_session_num').eq('id', studentId).maybeSingle()
      if (fresh && Number(fresh.last_session_num || 0) !== newLast) {
        newLast = Number(fresh.last_session_num || 0)
      }
    }

    const name = String(body.name || '').trim()
    if (!name) return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 })

    const phone = String(body.phone || '').trim() || null
    const status = String(body.status || '').trim() || null
    const newTeacherId =
      body.teacher_id === undefined ? before.teacher_id : String(body.teacher_id || '').trim() || null
    const packageId = String(body.package_id || '').trim() || null
    const joinDate = String(body.join_date || '').trim() || null

    let sessions: number | null = null
    if (body.monthly_sessions !== undefined && String(body.monthly_sessions).trim() !== '') {
      sessions = Math.max(0, Math.floor(Number(body.monthly_sessions) || 0))
    }

    let duration: number | null = null
    if (body.session_duration !== undefined && String(body.session_duration).trim() !== '') {
      duration = Math.max(0, Math.floor(Number(body.session_duration) || 0))
    }

    let perSession: number | null = null
    if (body.price_per_session !== undefined && String(body.price_per_session).trim() !== '') {
      perSession = Math.round((Number(body.price_per_session) || 0) * 100) / 100
    }
    if (perSession != null && perSession < 0) {
      return NextResponse.json({ error: 'سعر الحصة غير صالح' }, { status: 400 })
    }

    let teacherRate: number | null = null
    if (body.teacher_session_rate !== undefined && String(body.teacher_session_rate).trim() !== '') {
      teacherRate = Math.round((Number(body.teacher_session_rate) || 0) * 100) / 100
    }
    if (teacherRate != null && teacherRate < 0) {
      return NextResponse.json({ error: 'سعر الحصة للمعلم غير صالح' }, { status: 400 })
    }

    let newManual: number | null = null
    const manualSrc = body.manual_due !== undefined ? body.manual_due : body.amount_due
    if (manualSrc !== undefined && String(manualSrc).trim() !== '') {
      newManual = Math.max(0, Math.round((Number(manualSrc) || 0) * 100) / 100)
    }

    const pkgSize = packageSize({
      monthly_sessions: sessions ?? before.monthly_sessions,
      subscription_type: (before as any).subscription_type,
    })
    const check = validateSessionWithinPackage(
      newLast,
      pkgSize || sessions || Number(before.monthly_sessions) || 0
    )
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 })

    const payload: Record<string, unknown> = {
      name,
      phone,
      last_session_num: newLast,
    }
    if (status) payload.status = status
    payload.teacher_id = newTeacherId
    if (packageId) payload.package_id = packageId
    else if (body.package_id === '' || body.package_id === null) payload.package_id = null
    if (sessions != null) payload.monthly_sessions = sessions
    if (duration != null) payload.session_duration = duration
    if (perSession != null) payload.price_per_session = perSession
    if (teacherRate != null) payload.teacher_session_rate = teacherRate
    if (joinDate && /^\d{4}-\d{2}-\d{2}$/.test(joinDate)) payload.join_date = joinDate

    let { error } = await sb.from('students').update(payload).eq('id', studentId)
    if (error) {
      if (/package_id/.test(error.message)) {
        delete payload.package_id
        const r2 = await sb.from('students').update(payload).eq('id', studentId)
        error = r2.error
      }
      if (error && /teacher_session_rate/.test(error.message)) {
        delete payload.teacher_session_rate
        const r3 = await sb.from('students').update(payload).eq('id', studentId)
        error = r3.error
      }
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let manualNote = ''
    if (newManual !== null) {
      const { error: mErr } = await sb.from('students').update({ manual_due: newManual }).eq('id', studentId)
      if (mErr) {
        if (/manual_due/.test(mErr.message)) {
          await sb.from('students').update({ amount_due: newManual }).eq('id', studentId)
          manualNote =
            ' · مستحق ' +
            newManual +
            ' ج (نفّذ SQL: alter table students add column if not exists manual_due numeric not null default 0;)'
        } else {
          manualNote = ` · ⚠️ المستحق: ${mErr.message}`
        }
      } else {
        const cur = Number(before.amount_due || 0)
        const nextTotal = Math.max(0, cur - oldManual + newManual)
        await sb.from('students').update({ amount_due: nextTotal }).eq('id', studentId)
        await sb.from('activity_log').insert({
          actor_id: staff.id,
          action: 'student_manual_due',
          entity_type: 'student',
          entity_id: studentId,
          details: { manual_due: { from: oldManual, to: newManual } },
        })
        manualNote = ` · مستحق يدوي ${oldManual} → ${newManual}`
      }
    }

    const adsFee = Math.round((Number(body.ads_fee || 0) || 0) * 100) / 100
    const supervisionFee = Math.round((Number(body.supervision_fee || 0) || 0) * 100) / 100
    const otherFee = Math.round((Number(body.other_fee || 0) || 0) * 100) / 100

    await sb.from('activity_log').insert({
      actor_id: staff.id,
      action: 'student_extra_costs',
      entity_type: 'student',
      entity_id: studentId,
      details: {
        ads_fee: adsFee,
        supervision_fee: supervisionFee,
        other_fee: otherFee,
        price_per_session: perSession,
        teacher_session_rate: payload.teacher_session_rate ?? null,
        monthly_sessions: sessions,
        manual_due: newManual,
      },
    })

    await sb.from('activity_log').insert({
      actor_id: staff.id,
      action: 'supervisor_edit_student',
      entity_type: 'student',
      entity_id: studentId,
      details: {
        name: payload.name,
        last_session_num: { from: oldLast, to: newLast },
        teacher_id: { from: before.teacher_id, to: newTeacherId },
        package_id: packageId,
        price_per_session: perSession,
        teacher_session_rate: payload.teacher_session_rate ?? null,
        manual_due: newManual,
        monthly_sessions: sessions,
        ads_fee: adsFee,
        supervision_fee: supervisionFee,
        other_fee: otherFee,
      },
    })

    return NextResponse.json({
      success: true,
      message:
        (newLast !== oldLast
          ? `تم الحفظ · رقم الحصة ${oldLast} → ${newLast}`
          : packageId
            ? 'تم حفظ بيانات الطالب والباقة'
            : 'تم حفظ بيانات الطالب') + manualNote,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'فشل الحفظ' }, { status: 500 })
  }
}
