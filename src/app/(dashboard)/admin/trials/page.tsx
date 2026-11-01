import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { addTrial } from './actions'

export const dynamic = 'force-dynamic'

export default async function TrialsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: trials }, { data: teachers }] = await Promise.all([
    supabase
      .from('students')
      .select('id, code, name, phone, notes, status, teacher_id, teachers(name), created_at')
      .or('status.eq.تجريبي,subscription_type.eq.تجريبي')
      .order('created_at', { ascending: false }),
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
            الحصص التجريبية
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            متابعة الطلاب المحتملين
          </p>
        </div>
      </header>

      <section className="px-4 mb-4">
        <div className="card p-4">
          <h2 className="text-[14px] font-bold mb-3" style={{ color: '#00513c' }}>
            إضافة طالب تجريبي
          </h2>
          <form action={addTrial} className="space-y-2">
            <input
              name="name"
              required
              placeholder="اسم الطالب"
              className="w-full rounded-xl border px-3 py-2.5 text-[13px]"
              style={{ borderColor: '#cde8dc' }}
            />
            <select
              name="teacher_id"
              className="w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white"
              style={{ borderColor: '#cde8dc' }}
              defaultValue=""
            >
              <option value="">المعلم (اختياري)</option>
              {(teachers ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                name="phone"
                placeholder="هاتف ولي الأمر"
                className="rounded-xl border px-3 py-2.5 text-[13px]"
                style={{ borderColor: '#cde8dc' }}
              />
              <input
                name="trial_date"
                type="date"
                className="rounded-xl border px-3 py-2.5 text-[13px]"
                style={{ borderColor: '#cde8dc' }}
              />
            </div>
            <input
              name="notes"
              placeholder="ملاحظات / رابط الحلقة"
              className="w-full rounded-xl border px-3 py-2.5 text-[13px]"
              style={{ borderColor: '#cde8dc' }}
            />
            <button
              type="submit"
              className="w-full py-3 rounded-2xl text-white text-[14px] font-bold"
              style={{ background: '#176b52' }}
            >
              إضافة
            </button>
          </form>
        </div>
      </section>

      <div className="px-4 space-y-2">
        <p className="text-[12px] font-bold" style={{ color: '#3f4944' }}>
          القائمة ({trials?.length ?? 0})
        </p>
        {(trials ?? []).map((t: any) => (
          <div key={t.id} className="card p-3">
            <p className="text-[13px] font-bold">{t.name}</p>
            <p className="text-[11px]" style={{ color: '#6f7974' }}>
              {t.code} · {t.teachers?.name || '—'} · {t.phone || 'بدون هاتف'}
            </p>
            {t.notes && (
              <p className="text-[11px] mt-1" style={{ color: '#3f4944' }}>
                {t.notes}
              </p>
            )}
          </div>
        ))}
        {(trials ?? []).length === 0 && (
          <p className="text-center text-[13px] py-6" style={{ color: '#6f7974' }}>
            لا طلاب تجريبيين بعد
          </p>
        )}
      </div>
    </div>
  )
}
