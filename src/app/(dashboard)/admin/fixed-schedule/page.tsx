import { createClient } from '@/lib/supabase/server'
import { fetchAll } from '@/lib/dues-engine'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FixedScheduleForm } from './FixedScheduleForm'
import { ScheduleList } from './ScheduleList'
import { CopyMonthButton } from './CopyMonthButton'

export const dynamic = 'force-dynamic'

export default async function FixedSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const entries = await fetchAll<any>((f, t) =>
    supabase
      .from('schedule_entries')
      .select('*, students(name, code), teachers(name)')
      .order('day_of_week')
      .order('start_time')
      .order('id')
      .range(f, t)
  )

  const { data: students } = await supabase
    .from('students')
    .select('id, name, code')
    .in('status', ['نشط', 'تجريبي'])
    .order('name')
    .limit(800)

  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-28" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold">المواعيد الثابتة</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            إضافة دفعة · بحث · تعديل
          </p>
        </div>
      </header>

      <main className="px-4">
        <CopyMonthButton />

        <div className="card p-4 mb-4">
          <h2 className="text-[13px] font-bold mb-3">إضافة مواعيد (دفعة واحدة)</h2>
          <FixedScheduleForm
            students={students ?? []}
            teachers={teachers ?? []}
            defaultStudentId={sp.student || ''}
          />
        </div>

        <h2 className="text-[13px] font-bold mb-2">الجدول ({entries?.length ?? 0})</h2>
        <ScheduleList entries={entries ?? []} teachers={teachers ?? []} />
      </main>
    </div>
  )
}
