'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'
import { packageSize, validateSessionWithinPackage } from '@/lib/dues'

function revalidateTeacherPaths() {
  for (const p of [
    '/admin',
    '/admin/attended',
    '/admin/sessions-detail',
    '/admin/payroll',
    '/admin/students',
    '/admin/edit-session',
    '/admin/session-settle',
    '/teacher',
    '/teacher/attendance',
    '/teacher/dues',
    '/teacher/students',
    '/teacher/session',
    '/supervisor/edit-student',
    '/supervisor/edit-session',
  ]) {
    revalidatePath(p)
  }
}

function isAdminFabricatedNote(notes: string | null | undefined): boolean {
  const t = String(notes || '')
  return (
    t.includes('تسوية إدارية') ||
    t.includes('تعديل إداري') ||
    t.includes('أُضيفت من لوحة') ||
    t.includes('مزامنة')
  )
}

export async function deleteAttendanceRow(id: string, studentId?: string) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }
    if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: 'معرّف غير صالح' }

    const sb = serviceClient()
    const { data: row } = await sb
      .from('attendance')
      .select('id, student_id, notes, session_date, session_num, status')
      .eq('id', id)
      .maybeSingle()
    if (!row) return { error: 'الحصة مش موجودة أو اتحذفت' }

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
        report: row.notes,
      },
    })

    const { error } = await sb.from('attendance').delete().eq('id', id)
    if (error) return { error: error.message }

    const sid = studentId || row.student_id
    let lastSessionNum = 0
    if (sid) {
      const { data } = await sb
        .from('attendance')
        .select('session_num, session_date')
        .eq('student_id', sid)
        .in('status', ['حاضر', 'متأخر'])
        .order('session_date', { ascending: false })
        .order('session_num', { ascending: false })
        .limit(1)
      const last = data?.[0]
      lastSessionNum = last?.session_num != null ? Number(last.session_num) : 0
      const { error: syncErr } = await sb
        .from('students')
        .update({
          last_session_num: lastSessionNum,
          last_session_date: last?.session_date || null,
        })
        .eq('id', sid)
      if (syncErr) return { error: `اتحذفت الحصة لكن فشل تحديث العداد: ${syncErr.message}` }
    }

    revalidateTeacherPaths()
    return {
      ok: true,
      message: 'اتحذفت من عند الجميع',
      last_session_num: lastSessionNum,
      deleted_id: id,
    }
  } catch (e: any) {
    return { error: e?.message || 'فشل الحذف' }
  }
}

/**
 * مزامنة رقم الهدف مع سجل المعلم:
 * - المرجع للزيادة/النقص = أعلى رقم فعلي في الحضور (maxAtt) مش العداد المتضخّم
 * - لو الهدف أكبر من maxAtt → أضف الأرقام الناقصة فقط (بتاريخ أمس مش النهارده)
 * - لو الهدف أصغر → امسح فقط الحصص الإدارية المُفتعلة فوق الهدف
 * - بعد التسوية من 5→8: التقرير التالي من غرفة التسميع = 9
 */
export async function setStudentLastSession(studentId: string, lastSessionNum: number) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: 'غير مصرح' }

    const target = Math.max(0, Math.floor(Number(lastSessionNum) || 0))
    const sb = serviceClient()
    const { data: before } = await sb
      .from('students')
      .select('last_session_num, teacher_id, name, session_duration, monthly_sessions, subscription_type')
      .eq('id', studentId)
      .maybeSingle()
    if (!before) return { error: 'طالب غير موجود' }

    const quota = packageSize(before)
    // التسوية الإدارية تسمح بأي رقم ≥ 0 (العدّاد المطلق)، مش مقيد بدورة الباقة
    if (!Number.isFinite(target) || target < 0) return { error: 'رقم الحصة غير صالح' }

    const stored = Number(before.last_session_num || 0)
    const teacherId = before.teacher_id
    // تاريخ التسوية = أمس (قاهرة) مش النهارده
    // عشان غرفة التسميع ما تحسبش حصص التسوية كـ «تقرير النهارده» ويبدأ العد من target+1
    const todayCairo = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })
    const [yy, mm, dd] = todayCairo.split('-').map(Number)
    const yest = new Date(Date.UTC(yy, mm - 1, dd))
    yest.setUTCDate(yest.getUTCDate() - 1)
    const settleDate = yest.toISOString().slice(0, 10)

    const { data: allAtt } = await sb
      .from('attendance')
      .select('id, session_num, notes, session_date, status')
      .eq('student_id', studentId)
      .limit(500)

    const existingNums = new Set<number>()
    let maxAtt = 0
    for (const row of allAtt || []) {
      const num = row.session_num != null ? Number(row.session_num) : NaN
      if (Number.isFinite(num) && num > 0) {
        existingNums.add(num)
        if (num > maxAtt) maxAtt = num
      }
    }

    let added = 0
    let removed = 0
    let keptReal = 0

    // زيادة: حصص إدارية بتاريخ أمس (مش النهارده)
    if (target > maxAtt && teacherId) {
      for (let i = maxAtt + 1; i <= target; i++) {
        if (existingNums.has(i)) continue
        const { error: insErr } = await sb.from('attendance').insert({
          student_id: studentId,
          teacher_id: teacherId,
          session_date: settleDate,
          status: 'حاضر',
          session_num: i,
          session_duration: before.session_duration || 30,
          notes: `تسوية إدارية — حصة رقم ${i} · ${before.name}`,
        })
        if (!insErr) {
          added++
          existingNums.add(i)
        }
      }
    }

    // تقليل: امسح الإداري فقط فوق الهدف — حصص المعلم الحقيقية تفضل
    if (target < maxAtt) {
      for (const row of allAtt || []) {
        const num = row.session_num != null ? Number(row.session_num) : NaN
        if (!Number.isFinite(num) || num <= target) continue
        if (!isAdminFabricatedNote(row.notes)) {
          keptReal++
          continue
        }
        await sb.from('activity_log').insert({
          actor_id: user.id,
          action: 'reduce_session_remove_admin_only',
          entity_type: 'attendance',
          entity_id: row.id,
          details: {
            student_id: studentId,
            session_num: row.session_num,
            session_date: row.session_date,
            report: row.notes,
          },
        })
        const { error: delErr } = await sb.from('attendance').delete().eq('id', row.id)
        if (!delErr) removed++
      }
    }

    // حدّث العداد + تاريخ آخر حصة دائماً (حتى لو مفيش إضافة/حذف صفوف)
    const { error } = await sb
      .from('students')
      .update({
        last_session_num: target,
        last_session_date: settleDate,
      })
      .eq('id', studentId)
    if (error) return { error: error.message }

    revalidateTeacherPaths()

    let message = `تم ضبط عداد الطالب على ${target} — التقرير التالي هيبقى ${target + 1}`
    if (added > 0) message = `تم · أُضيفت ${added} حصة لسجل المعلم (من ${maxAtt} → ${target}) · التالي ${target + 1}`
    if (removed > 0) message += ` · اتشالت ${removed} حصة إدارية زيادة`
    if (keptReal > 0)
      message += ` · اتفادت ${keptReal} حصة حقيقية للمعلم (اتمسحتش)`
    if (added === 0 && removed === 0 && stored === target) message = `تم · العداد على ${target} · التالي ${target + 1}`

    return {
      ok: true,
      message,
      added,
      removed,
      maxAtt,
      target,
      keptReal,
      next_session: target + 1,
    }
  } catch (e: any) {
    return { error: e?.message || 'فشل التحديث' }
  }
}
