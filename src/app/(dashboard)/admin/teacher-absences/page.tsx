import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logTeacherAbsence } from './actions'

export const dynamic = 'force-dynamic'

export default async function TeacherAbsencesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: absences }, { data: teachers }] = await Promise.all([
    supabase
      .from('activity_log')
      .select('id, details, created_at')
      .eq('action', 'teacher_absence')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('teachers').select('id, name').eq('is_active', true).order('name'),
  ])

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            غيابات المعلمين
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            تسجيل وعرض الغيابات
          </p>
        </div>
      </header>

      <section className="px-4 mb-4">
        <div className="card p-4">
          <h2 className="text-[14px] font-bold mb-3" style={{ color: '#00513c' }}>
            تسجيل غياب
          </h2>
          <form action={logTeacherAbsence} className="space-y-2">
            <select
              name="teacher_id"
              required
              className="w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white"
              style={{ borderColor: '#cde8dc' }}
              defaultValue=""
            >
              <option value="" disabled>
                اختر المعلم
              </option>
              {(teachers ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              name="absence_date"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full rounded-xl border px-3 py-2.5 text-[13px]"
              style={{ borderColor: '#cde8dc' }}
            />
            <input
              name="reason"
              placeholder="السبب (اختياري)"
              className="w-full rounded-xl border px-3 py-2.5 text-[13px]"
              style={{ borderColor: '#cde8dc' }}
            />
            <button
              type="submit"
              className="w-full py-3 rounded-2xl text-white text-[14px] font-bold"
              style={{ background: '#b45309' }}
            >
              تسجيل
            </button>
          </form>
        </div>
      </section>

      <div className="px-4 space-y-2">
        {(absences ?? []).map((a) => {
          const d = (a.details || {}) as any
          return (
            <div key={a.id} className="card p-3 flex justify-between gap-2">
              <div>
                <p className="text-[13px] font-bold">{d.teacher_name || 'معلم'}</p>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>
                  {d.absence_date || '—'} · {d.reason || 'بدون سبب'}
                </p>
              </div>
              <p className="text-[10px]" style={{ color: '#6f7974' }}>
                {a.created_at ? new Date(a.created_at).toLocaleDateString('ar-EG') : ''}
              </p>
            </div>
          )
        })}
        {(absences ?? []).length === 0 && (
          <p className="text-center text-[13px] py-6" style={{ color: '#6f7974' }}>
            لا غيابات مسجّلة
          </p>
        )}
      </div>
    </div>
  )
}
