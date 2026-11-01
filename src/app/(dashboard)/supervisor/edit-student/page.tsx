import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supervisorEditStudent } from './actions'

export const dynamic = 'force-dynamic'

export default async function SupervisorEditStudentPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: students }, { data: teachers }] = await Promise.all([
    supabase.from('students').select('id, code, name, phone, monthly_sessions, session_duration, last_session_num, amount_due, price_per_session, teacher_id, status').order('name').limit(400),
    supabase.from('teachers').select('id, name').eq('is_active', true).order('name'),
  ])

  const selected = students?.find((s) => s.id === sp.id) || null

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
        </div>
      </header>

      <div className="px-4 mb-3">
        <div className="card p-3 max-h-48 overflow-y-auto space-y-1">
          {(students ?? []).map((s) => (
            <Link
              key={s.id}
              href={`/supervisor/edit-student?id=${s.id}`}
              className="block text-[13px] py-1.5 px-2 rounded-lg"
              style={{
                background: selected?.id === s.id ? '#e8f7f0' : 'transparent',
                color: '#1a1c1b',
              }}
            >
              {s.name} <span style={{ color: '#6f7974' }}>({s.code})</span>
            </Link>
          ))}
        </div>
      </div>

      {selected && (
        <div className="px-4">
          <form action={supervisorEditStudent} className="card p-4 space-y-2.5">
            <input type="hidden" name="student_id" value={selected.id} />
            <p className="text-[12px]" style={{ color: '#6f7974' }}>
              {selected.code} · {selected.status}
            </p>
            <input name="name" defaultValue={selected.name || ''} className="w-full rounded-xl border px-3 py-2.5 text-[13px]" style={{ borderColor: '#cde8dc' }} placeholder="الاسم" />
            <input name="phone" defaultValue={selected.phone || ''} className="w-full rounded-xl border px-3 py-2.5 text-[13px]" style={{ borderColor: '#cde8dc' }} placeholder="الهاتف" />
            <select name="teacher_id" defaultValue={selected.teacher_id || ''} className="w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white" style={{ borderColor: '#cde8dc' }}>
              <option value="">بدون معلم</option>
              {(teachers ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input name="monthly_sessions" type="number" defaultValue={selected.monthly_sessions ?? 8} className="rounded-xl border px-3 py-2.5 text-[13px]" style={{ borderColor: '#cde8dc' }} placeholder="عدد الحلقات" />
              <input name="session_duration" type="number" defaultValue={selected.session_duration ?? 30} className="rounded-xl border px-3 py-2.5 text-[13px]" style={{ borderColor: '#cde8dc' }} placeholder="مدة الحلقة" />
              <input name="last_session_num" type="number" defaultValue={selected.last_session_num ?? 0} className="rounded-xl border px-3 py-2.5 text-[13px]" style={{ borderColor: '#cde8dc' }} placeholder="رقم آخر حصة" />
              <input name="price_per_session" type="number" defaultValue={selected.price_per_session ?? 25} className="rounded-xl border px-3 py-2.5 text-[13px]" style={{ borderColor: '#cde8dc' }} placeholder="سعر الحصة" />
            </div>
            <input name="amount_due" type="number" defaultValue={selected.amount_due ?? 0} className="w-full rounded-xl border px-3 py-2.5 text-[13px]" style={{ borderColor: '#cde8dc' }} placeholder="المستحق" />
            <button type="submit" className="w-full py-3 rounded-2xl text-white font-bold text-[14px]" style={{ background: '#176b52' }}>
              حفظ التعديلات
            </button>
          </form>
        </div>
      )}

      {!selected && (
        <p className="text-center text-[13px] px-4" style={{ color: '#6f7974' }}>
          اختر طالب من القائمة للتعديل
        </p>
      )}
    </div>
  )
}
