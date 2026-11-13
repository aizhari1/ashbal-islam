import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StudentLastReport from './StudentLastReport'
import { teacherCountWindow } from '@/lib/teacher-window'
import { serviceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

function isAdminNote(notes: string | null | undefined) {
  const t = String(notes || '')
  return (
    t.includes('تسوية إدارية') ||
    t.includes('تعديل إداري') ||
    t.includes('أُضيفت من لوحة') ||
    t.includes('مزامنة')
  )
}

export default async function TeacherStudentsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: teacher } = await supabase.from('teachers').select('id, name').eq('profile_id', user.id).maybeSingle()
  let winStart = '', winAfter: string | null = null
  let students: {
    id: string
    name: string
    code: string
    status: string
    phone: string | null
    last_session_num: number | null
  }[] = []
  const lastByStudent: Record<string, { notes: string; session_date: string; session_num: number | null }> = {}
  /** حضور الشهر الحالي (أو بعد التسوية) */
  const totalByStudent: Record<string, number> = {}
  /** منها تقارير المعلم الحقيقية (مش تسوية إدارية) */
  const realByStudent: Record<string, number> = {}

  if (teacher) {
    let adminSb: any = supabase
    try {
      adminSb = serviceClient()
    } catch {
      adminSb = supabase
    }
    const w = await teacherCountWindow(adminSb, { id: teacher.id, name: teacher.name })
    winStart = w.start
    winAfter = w.settledOn
    const { data } = await supabase
      .from('students')
      .select('id, name, code, status, phone, last_session_num')
      .eq('teacher_id', teacher.id)
      .order('name')
    students = (data as any) ?? []

    const ids = students.map((s) => s.id)
    if (ids.length) {
      const { data: att } = await supabase
        .from('attendance')
        .select('student_id, notes, session_date, session_num, status')
        .eq('teacher_id', teacher.id)
        .in('student_id', ids)
        .order('session_date', { ascending: false })
        .limit(5000)

      for (const a of att ?? []) {
        if (!a.student_id) continue
        const present = a.status === 'حاضر' || a.status === 'متأخر' || a.status === 'تم الحضور'
        const d = String(a.session_date || '').slice(0, 10)
        // العدّ للشهر الحالي (أو بعد التسوية) بس — بيصفّر أول كل شهر
        const inWindow = winAfter ? d > winAfter : d >= winStart
        if (present && inWindow) {
          totalByStudent[a.student_id] = (totalByStudent[a.student_id] || 0) + 1
          if (!isAdminNote(a.notes)) {
            realByStudent[a.student_id] = (realByStudent[a.student_id] || 0) + 1
          }
        }
        if (!lastByStudent[a.student_id] && (a.notes || '').trim() && !isAdminNote(a.notes)) {
          lastByStudent[a.student_id] = {
            notes: a.notes || '',
            session_date: a.session_date,
            session_num: a.session_num,
          }
        }
      }
    }
  }

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/teacher" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold">طلابي ({students.length})</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            حصصك مع كل طالب هذا الشهر — بتبدأ من 1 أول كل شهر وبعد تسوية الراتب
          </p>
        </div>
      </header>
      <main className="px-4 pb-24 space-y-2">
        {students.map((s) => {
          const total = totalByStudent[s.id] || 0
          const real = realByStudent[s.id] || 0
          return (
            <div key={s.id} className="bg-white rounded-2xl p-3.5 shadow-sm">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-[14px]">{s.name}</p>
                  <p className="text-[11px] text-[#6f7974]">
                    {s.code} · {s.status}
                  </p>
                  <p className="text-[12px] font-bold mt-1" style={{ color: '#00513c' }}>
                    حصص هذا الشهر: {total}
                    {real !== total ? (
                      <span className="font-normal" style={{ color: '#6f7974' }}>
                        {' '}
                        (منها {real} تقرير معلم)
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="text-left shrink-0">
                  <Link href={`/teacher/session`} className="text-[11px] font-bold" style={{ color: '#176b52' }}>
                    تحضير
                  </Link>
                </div>
              </div>
              <StudentLastReport phone={s.phone} last={lastByStudent[s.id] || null} />
            </div>
          )
        })}
        {students.length === 0 && (
          <p className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>
            لا طلاب مرتبطين بحسابك
          </p>
        )}
      </main>
    </div>
  )
}
