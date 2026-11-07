import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { currentMonthKey, monthBounds, monthLabelAr } from '@/lib/dues'
import { SettleClient } from './SettleClient'

export const dynamic = 'force-dynamic'

export default async function SessionSettlePage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; month?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const month = sp.month || currentMonthKey()
  const { start, end } = monthBounds(month)

  const { data: students } = await supabase
    .from('students')
    .select('id, code, name, last_session_num, teacher_id, teachers(name)')
    .in('status', ['نشط', 'موقوف', 'تجريبي'])
    .order('name')
    .limit(500)

  let sessions: any[] = []
  let selected: any = null
  if (sp.student) {
    selected = (students ?? []).find((s) => s.id === sp.student) || null
    const { data } = await supabase
      .from('attendance')
      .select(
        'id, session_date, session_num, status, notes, session_duration, teacher_id, teachers(name), students(name, code)'
      )
      .eq('student_id', sp.student)
      .gte('session_date', start)
      .lte('session_date', end)
      .order('session_date', { ascending: false })
      .limit(200)
    sessions = data ?? []
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            تسوية حصص طالب / معلم
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {monthLabelAr(month)} — احذف الحصص الغلط أو عدّل الرقم
          </p>
        </div>
      </header>

      <SettleClient
        students={(students as any) ?? []}
        selectedId={sp.student || ''}
        month={month}
        sessions={sessions}
        selected={selected}
      />
    </div>
  )
}
