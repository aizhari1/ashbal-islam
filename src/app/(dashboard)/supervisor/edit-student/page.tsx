import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { StudentPicker } from './StudentPicker'
import { EditStudentForm } from './EditStudentForm'
import { loadStudentExtraCosts } from './actions'

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
      .select(`${STUDENT_COLS}, teacher_session_rate, package_id, teachers(name)`)
      .order('name')
      .limit(800)
    if (!r.error) return r
    const r2 = await supabase
      .from('students')
      .select(`${STUDENT_COLS}, teacher_session_rate, teachers(name)`)
      .order('name')
      .limit(800)
    if (!r2.error) return r2
    return supabase.from('students').select(`${STUDENT_COLS}, teachers(name)`).order('name').limit(800) as any
  }
  const [{ data: students }, { data: teachers }, { data: packages }] = await Promise.all([
    loadStudents(),
    supabase.from('teachers').select('id, name, is_active').order('name'),
    supabase
      .from('packages')
      .select('id, name, sessions_count, duration_minutes, price, currency')
      .eq('is_active', true)
      .order('sessions_count'),
  ])

  const selected = students?.find((s) => s.id === sp.id) || null
  const costs = selected ? await loadStudentExtraCosts(selected.id) : null
  const selectedWithCosts = selected
    ? {
        ...selected,
        ads_fee: costs?.ads_fee ?? 0,
        supervision_fee: costs?.supervision_fee ?? 0,
        other_fee: costs?.other_fee ?? 0,
      }
    : null

  const pickerList = (students ?? []).map((s: any) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    last_session_num: s.last_session_num,
    status: s.status,
    teacher_name: s.teachers?.name || null,
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
            باقة · أسعار · مصاريف · عدّاد · ربح تقريبي
          </p>
        </div>
      </header>

      <div className="px-4 space-y-3">
        <Suspense fallback={<p className="text-center text-[13px] py-4">جاري التحميل...</p>}>
          <StudentPicker students={pickerList} selectedId={sp.id || ''} />
        </Suspense>

        {selectedWithCosts ? (
          <EditStudentForm
            key={(selectedWithCosts as any).id}
            student={selectedWithCosts as any}
            teachers={teacherOptions}
            packages={(packages as any) || []}
          />
        ) : (
          <p className="card p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>
            اختار طالب من البحث فوق عشان تعدّل بياناته
          </p>
        )}
      </div>
    </div>
  )
}
