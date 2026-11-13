import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import StatusForm from './StatusForm'

export const dynamic = 'force-dynamic'

export default async function SupervisorStatusPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: students } = await supabase
    .from('students')
    .select('id, code, name, status, amount_due, last_session_num, teachers(name)')
    .order('name')
    .limit(800)

  const list = (students ?? []).map((s: any) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    status: s.status,
    amount_due: s.amount_due,
    last_session_num: s.last_session_num,
    teacher_name: s.teachers?.name || null,
  }))

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/supervisor" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            تغيير حالة الطالب
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            ابحث بالاسم أو الكود · نشط · موقوف · منسحب · تجريبي
          </p>
        </div>
      </header>

      <div className="px-4">
        <StatusForm students={list} />
      </div>
    </div>
  )
}
