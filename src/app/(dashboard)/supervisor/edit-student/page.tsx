import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { StudentPicker } from './StudentPicker'
import { EditStudentForm } from './EditStudentForm'

export const dynamic = 'force-dynamic'

export default async function SupervisorEditStudentPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; q?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const STUDENT_COLS =
    'id, code, name, phone, monthly_sessions, session_duration, last_session_num, amount_due, price_per_session, teacher_id, status, join_date, created_at'
  const loadStudents = async () => {
    const r = await supabase
      .from('students')
      .select(`${STUDENT_COLS}, teacher_session_rate`)
      .order('name')
      .limit(800)
    if (!r.error) return r
    // لو migration 009 لسه ماتنفّذتش نرجع للأعمدة القديمة بدل ما الصفحة تفضى
    return supabase.from('students').select(STUDENT_COLS).order('name').limit(800) as any
  }
  const [{ data: students }, { data: teachers }] = await Promise.all([
    loadStudents(),
    // كل المعلمين (نشط وغير نشط) عشان نقدر نربط طالب بمعلم حتى لو is_active=false مؤقتاً
    supabase.from('teachers').select('id, name, is_active').order('name'),
  ])

  const selected = students?.find((s) => s.id === sp.id) || null
  const pickerList = (students ?? []).map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    last_session_num: s.last_session_num,
    status: s.status,
  }))

  const teacherOptions = (teachers ?? []).map((t: any) => ({
    id: t.id,
    name: t.is_active === false ? `${t.name} (غير نشط)` : t.name,
  }))

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/supervisor" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            تعديل بيانات طالب
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            ابحث · عدّل · احفظ · غيّر طالب من غير ما تخرج
          </p>
        </div>
      </header>

      <Suspense fallback={<p className="px-4 text-[13px]" style={{ color: '#6f7974' }}>جاري التحميل...</p>}>
        <StudentPicker students={pickerList} selectedId={selected?.id} />
      </Suspense>

      {selected && (
        <div className="px-4">
          {/* key: لما الطالب يتغيّر (أو بياناته تتحدّث بعد الحفظ) الفورم يتبني من جديد —
              الخانات defaultValue ومش بتتحدّث لوحدها، وكانت بتفضل بيانات الطالب اللي قبله */}
          <EditStudentForm
            key={[selected.id, selected.name, selected.phone, selected.teacher_id, selected.monthly_sessions, selected.session_duration, selected.last_session_num, selected.amount_due, selected.price_per_session, (selected as any).teacher_session_rate, selected.join_date].join('|')}
            student={selected as any}
            teachers={teacherOptions}
          />
        </div>
      )}

      {!selected && (
        <p className="text-center text-[13px] px-4" style={{ color: '#6f7974' }}>
          ابحث واختر طالب عشان تظهر بياناته ورقم الحصة
        </p>
      )}
    </div>
  )
}
