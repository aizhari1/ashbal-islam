import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SessionEditor } from '../../admin/edit-session/SessionEditor'

export const dynamic = 'force-dynamic'

export default async function SupervisorEditSessionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile && !['supervisor', 'admin'].includes(profile.role || '')) {
    redirect('/login')
  }

  const { data: students } = await supabase
    .from('students')
    .select('id, code, name, last_session_num, last_session_date, monthly_sessions, teachers(name)')
    .in('status', ['نشط', 'موقوف'])
    .order('name')
    .limit(500)

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link
          href="/supervisor"
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            تعديل رقم الحصة
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            ابحث · عدّل رقم آخر حصة · احفظ
          </p>
        </div>
      </header>

      <SessionEditor students={(students as any) ?? []} />
    </div>
  )
}
