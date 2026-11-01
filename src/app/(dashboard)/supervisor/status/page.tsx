import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { changeStudentStatus } from './actions'

export const dynamic = 'force-dynamic'

export default async function SupervisorStatusPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: students } = await supabase
    .from('students')
    .select('id, code, name, status')
    .order('name')
    .limit(400)

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
            نشط · موقوف · منسحب · تجريبي
          </p>
        </div>
      </header>

      <div className="px-4">
        <form action={changeStudentStatus} className="card p-4 space-y-3">
          <select
            name="student_id"
            required
            className="w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white"
            style={{ borderColor: '#cde8dc' }}
            defaultValue=""
          >
            <option value="" disabled>
              اختر الطالب
            </option>
            {(students ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code}) — {s.status}
              </option>
            ))}
          </select>
          <select
            name="status"
            required
            className="w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white"
            style={{ borderColor: '#cde8dc' }}
            defaultValue="نشط"
          >
            <option value="نشط">نشط</option>
            <option value="موقوف">موقوف مؤقتًا</option>
            <option value="منسحب">منسحب</option>
            <option value="تجريبي">تجريبي</option>
          </select>
          <input
            name="note"
            placeholder="ملاحظة / تاريخ العودة المتوقع"
            className="w-full rounded-xl border px-3 py-2.5 text-[13px]"
            style={{ borderColor: '#cde8dc' }}
          />
          <button type="submit" className="w-full py-3 rounded-2xl text-white font-bold text-[14px]" style={{ background: '#176b52' }}>
            حفظ الحالة
          </button>
        </form>
      </div>
    </div>
  )
}
