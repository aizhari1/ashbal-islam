import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { updateSessionNum } from './actions'

export const dynamic = 'force-dynamic'

export default async function EditSessionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: students } = await supabase
    .from('students')
    .select('id, code, name, last_session_num, last_session_date, monthly_sessions, teachers(name)')
    .in('status', ['نشط', 'موقوف'])
    .order('name')
    .limit(300)

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            تعديل رقم الحصة
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            آخر حصة أو القادمة لأي طالب
          </p>
        </div>
      </header>

      <div className="px-4 space-y-3">
        {(students ?? []).map((s: any) => (
          <div key={s.id} className="card p-3">
            <p className="text-[13px] font-bold" style={{ color: '#00513c' }}>
              {s.name}
            </p>
            <p className="text-[11px] mb-2" style={{ color: '#6f7974' }}>
              {s.code} · {s.teachers?.name || '—'} · باقة {s.monthly_sessions || '—'}
            </p>
            <form action={updateSessionNum} className="grid grid-cols-3 gap-2 items-end">
              <input type="hidden" name="student_id" value={s.id} />
              <div>
                <label className="text-[10px]" style={{ color: '#6f7974' }}>
                  رقم آخر حصة
                </label>
                <input
                  name="last_session_num"
                  type="number"
                  min={0}
                  defaultValue={s.last_session_num ?? 0}
                  className="w-full rounded-lg border px-2 py-1.5 text-[13px]"
                  style={{ borderColor: '#cde8dc' }}
                />
              </div>
              <div>
                <label className="text-[10px]" style={{ color: '#6f7974' }}>
                  التاريخ
                </label>
                <input
                  name="last_session_date"
                  type="date"
                  defaultValue={s.last_session_date ? String(s.last_session_date).slice(0, 10) : ''}
                  className="w-full rounded-lg border px-2 py-1.5 text-[12px]"
                  style={{ borderColor: '#cde8dc' }}
                />
              </div>
              <button
                type="submit"
                className="rounded-lg py-2 text-[12px] font-bold text-white"
                style={{ background: '#176b52' }}
              >
                حفظ
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  )
}
