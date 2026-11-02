import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supervisorEditStudent } from './actions'

export const dynamic = 'force-dynamic'

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold mb-1" style={{ color: '#3f4944' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white'
const inputStyle = { borderColor: '#cde8dc' } as const

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
    supabase
      .from('students')
      .select(
        'id, code, name, phone, monthly_sessions, session_duration, last_session_num, amount_due, price_per_session, teacher_id, status'
      )
      .order('name')
      .limit(400),
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
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            اختر طالب ثم عدّل الحقول المحفوظة
          </p>
        </div>
      </header>

      <div className="px-4 mb-3">
        <p className="text-[12px] font-bold mb-1.5" style={{ color: '#3f4944' }}>
          قائمة الطلاب
        </p>
        <div className="card p-2 max-h-44 overflow-y-auto space-y-0.5">
          {(students ?? []).map((s) => (
            <Link
              key={s.id}
              href={`/supervisor/edit-student?id=${s.id}`}
              className="block text-[13px] py-2 px-2.5 rounded-lg"
              style={{
                background: selected?.id === s.id ? '#e8f7f0' : 'transparent',
                color: '#1a1c1b',
                fontWeight: selected?.id === s.id ? 700 : 400,
              }}
            >
              {s.name}{' '}
              <span style={{ color: '#6f7974' }}>
                ({s.code})
              </span>
            </Link>
          ))}
        </div>
      </div>

      {selected && (
        <div className="px-4">
          <form action={supervisorEditStudent} className="card p-4 space-y-3">
            <input type="hidden" name="student_id" value={selected.id} />

            <div className="flex justify-between items-center text-[12px]">
              <span className="font-bold" style={{ color: '#00513c' }}>
                {selected.code}
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                style={{ background: '#e8f7f0', color: '#176b52' }}
              >
                {selected.status || '—'}
              </span>
            </div>

            <Field label="اسم الطالب">
              <input
                name="name"
                defaultValue={selected.name || ''}
                className={inputCls}
                style={inputStyle}
                required
              />
            </Field>

            <Field label="رقم الهاتف">
              <input
                name="phone"
                defaultValue={selected.phone || ''}
                className={inputCls}
                style={inputStyle}
                dir="ltr"
              />
            </Field>

            <Field label="المعلم">
              <select
                name="teacher_id"
                defaultValue={selected.teacher_id || ''}
                className={inputCls}
                style={inputStyle}
              >
                <option value="">بدون معلم</option>
                {(teachers ?? []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-2.5">
              <Field label="عدد حلقات الباقة">
                <input
                  name="monthly_sessions"
                  type="number"
                  min={0}
                  defaultValue={selected.monthly_sessions ?? 8}
                  className={inputCls}
                  style={inputStyle}
                />
              </Field>
              <Field label="مدة الحلقة (دقيقة)">
                <input
                  name="session_duration"
                  type="number"
                  min={0}
                  defaultValue={selected.session_duration ?? 30}
                  className={inputCls}
                  style={inputStyle}
                />
              </Field>
              <Field label="رقم آخر حصة">
                <input
                  name="last_session_num"
                  type="number"
                  min={0}
                  defaultValue={selected.last_session_num ?? 0}
                  className={inputCls}
                  style={inputStyle}
                />
              </Field>
              <Field label="سعر الحصة (ج)">
                <input
                  name="price_per_session"
                  type="number"
                  min={0}
                  defaultValue={selected.price_per_session ?? 25}
                  className={inputCls}
                  style={inputStyle}
                />
              </Field>
            </div>

            <Field label="المستحق الحالي (ج)">
              <input
                name="amount_due"
                type="number"
                min={0}
                defaultValue={selected.amount_due ?? 0}
                className={inputCls}
                style={inputStyle}
              />
            </Field>

            <p className="text-[10px] leading-relaxed" style={{ color: '#6f7974' }}>
              الأرقام الظاهرة هي البيانات المحفوظة حاليًا للطالب. غيّر اللي محتاجه واضغط حفظ.
            </p>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl text-white font-bold text-[14px]"
              style={{ background: '#176b52' }}
            >
              حفظ التعديلات
            </button>
          </form>
        </div>
      )}

      {!selected && (
        <p className="text-center text-[13px] px-4" style={{ color: '#6f7974' }}>
          اختر طالب من القائمة عشان تظهر بياناته
        </p>
      )}
    </div>
  )
}
