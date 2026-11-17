import Link from 'next/link'
import { serviceClient } from '@/lib/supabase/service'
import { SettleShell, type SettleStudent } from './SettleShell'

export const dynamic = 'force-dynamic'

async function loadStudents(): Promise<SettleStudent[]> {
  try {
    const sb = serviceClient()
    const { data, error } = await sb
      .from('students')
      .select('id, code, name, last_session_num, monthly_sessions, teacher_id, teachers(name)')
      .in('status', ['نشط', 'موقوف', 'تجريبي'])
      .order('name')
      .limit(1000)
    if (error) {
      console.error('settle students', error.message)
      return []
    }
    return (data || []).map((s: any) => {
      const t = Array.isArray(s.teachers) ? s.teachers[0] : s.teachers
      return {
        id: s.id,
        code: s.code || '',
        name: s.name || '',
        last_session_num: s.last_session_num,
        monthly_sessions: s.monthly_sessions != null ? Number(s.monthly_sessions) : null,
        teacher_id: s.teacher_id,
        teacher_name: t?.name || '—',
      }
    })
  } catch (e) {
    console.error('settle load', e)
    return []
  }
}

export default async function SessionSettlePage() {
  const students = await loadStudents()

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            حصص المعلم عند الطالب
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {students.length} طالب · ابحث · احذف حصة غلط · أضف حصة منسية
          </p>
        </div>
      </header>
      <SettleShell initialStudents={students} />
    </div>
  )
}
