'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { supervisorEditStudent } from './actions'
import { tenureLabel } from '@/lib/student-tenure'

type Teacher = { id: string; name: string }
type Pkg = {
  id: string
  name: string
  sessions_count: number
  duration_minutes: number | null
  price: number
  currency: string | null
}

type Student = {
  id: string
  code: string
  name: string
  phone: string | null
  monthly_sessions: number | null
  session_duration: number | null
  last_session_num: number | null
  amount_due: number | null
  price_per_session: number | null
  teacher_session_rate?: number | null
  teacher_id: string | null
  status: string | null
  join_date?: string | null
  created_at?: string | null
  package_id?: string | null
}

const inputCls = 'w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white'
const inputStyle = { borderColor: '#cde8dc' } as const

const perSession = (p: Pkg) =>
  Math.round((Number(p.price) / Math.max(1, p.sessions_count)) * 100) / 100
const money = (n: number) =>
  Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold mb-1" style={{ color: '#3f4944' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

export function EditStudentForm({
  student,
  teachers,
  packages = [],
}: {
  student: Student
  teachers: Teacher[]
  packages?: Pkg[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const { joinAr, tenure, joinDate } = tenureLabel(student)

  const [packageId, setPackageId] = useState(student.package_id || '')
  const [monthlySessions, setMonthlySessions] = useState(String(student.monthly_sessions ?? 8))
  const [sessionDuration, setSessionDuration] = useState(String(student.session_duration ?? 30))
  const [pricePerSession, setPricePerSession] = useState(String(student.price_per_session ?? 25))
  const [teacherRate, setTeacherRate] = useState(
    student.teacher_session_rate != null && student.teacher_session_rate !== undefined
      ? String(student.teacher_session_rate)
      : ''
  )
  const [amountDue, setAmountDue] = useState(String(student.amount_due ?? 0))

  const pkg = useMemo(
    () => packages.find((p) => p.id === packageId) || null,
    [packages, packageId]
  )

  function choosePackage(id: string) {
    if (!id) {
      setPackageId('')
      return
    }
    const p = packages.find((x) => x.id === id)
    if (!p) return
    const ps = perSession(p)
    setPackageId(p.id)
    setMonthlySessions(String(p.sessions_count))
    setSessionDuration(String(p.duration_minutes || 30))
    setPricePerSession(String(ps))
    setAmountDue(String(Number(p.price) || 0))
    setTeacherRate((prev) => (prev && Number(prev) > 0 ? prev : String(ps)))
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    fd.set('package_id', packageId)
    fd.set('monthly_sessions', monthlySessions)
    fd.set('session_duration', sessionDuration)
    fd.set('price_per_session', pricePerSession)
    fd.set('teacher_session_rate', teacherRate)
    fd.set('amount_due', amountDue)
    setMsg(null)
    startTransition(async () => {
      const r = await supervisorEditStudent(fd)
      if (r?.error) {
        setMsg({ type: 'err', text: `فشل الحفظ: ${r.error}` })
      } else {
        setMsg({ type: 'ok', text: (r as any)?.message || 'تم حفظ التعديلات بنجاح ✓' })
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 space-y-3">
      <input type="hidden" name="student_id" value={student.id} />

      <div className="flex justify-between items-center text-[12px]">
        <span className="font-bold" style={{ color: '#00513c' }}>
          {student.code}
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-[11px] font-bold"
          style={{ background: '#e8f7f0', color: '#176b52' }}
        >
          {student.status || '—'}
        </span>
      </div>

      <div
        className="rounded-xl px-3 py-2.5 text-[12px]"
        style={{ background: '#e8f7f0', border: '1px solid #cde8dc' }}
      >
        <p style={{ color: '#6f7974' }}>مدة الاشتراك (تلقائي · مش محتاج تحسبها كل شهر)</p>
        <p className="font-bold mt-0.5" style={{ color: '#00513c' }}>
          انضم: {joinAr}
        </p>
        <p className="font-bold text-[14px]" style={{ color: '#176b52' }}>
          بقاله: {tenure}
        </p>
      </div>

      {msg && (
        <div
          className="rounded-xl px-3 py-2.5 text-[13px] font-bold text-center"
          style={{
            background: msg.type === 'ok' ? '#e8f7f0' : '#fce8e8',
            color: msg.type === 'ok' ? '#176b52' : '#ba1a1a',
          }}
        >
          {msg.text}
        </div>
      )}

      <Field label="اسم الطالب">
        <input
          name="name"
          defaultValue={student.name || ''}
          className={inputCls}
          style={inputStyle}
          required
        />
      </Field>

      <Field label="رقم الهاتف">
        <input
          name="phone"
          defaultValue={student.phone || ''}
          className={inputCls}
          style={inputStyle}
          dir="ltr"
        />
      </Field>

      <Field label="تاريخ الانضمام">
        <input
          name="join_date"
          type="date"
          defaultValue={joinDate || ''}
          className={inputCls}
          style={inputStyle}
        />
        <p className="text-[10px] mt-1" style={{ color: '#6f7974' }}>
          المدة فوق بتتحدّث لوحدها من التاريخ ده
        </p>
      </Field>

      <Field label="المعلم">
        <select
          name="teacher_id"
          defaultValue={student.teacher_id || ''}
          className={inputCls}
          style={inputStyle}
        >
          <option value="">بدون معلم</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="الباقة">
        <select
          value={packageId}
          onChange={(e) => choosePackage(e.target.value)}
          className={inputCls}
          style={inputStyle}
        >
          <option value="">— بدون باقة / يدوي —</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.sessions_count} حصة · {money(Number(p.price))} {p.currency || 'EGP'}
            </option>
          ))}
        </select>
        {pkg && (
          <div
            className="mt-2 rounded-xl px-3 py-2 text-[11px] space-y-0.5"
            style={{ background: '#e8f7f0', border: '1px solid #cde8dc' }}
          >
            <p>
              <b>سعر الباقة:</b> {money(Number(pkg.price))} {pkg.currency || 'EGP'}
            </p>
            <p>
              <b>حصص:</b> {pkg.sessions_count} · <b>للحصة على الولي:</b> {money(perSession(pkg))}
            </p>
            <p style={{ color: '#6f7974' }}>تم ملء الحقول تحت تلقائيًا — تقدر تعدّل يدوي</p>
          </div>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="عدد حلقات الباقة">
          <input
            name="monthly_sessions"
            type="number"
            min={0}
            value={monthlySessions}
            onChange={(e) => setMonthlySessions(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
        </Field>
        <Field label="مدة الحلقة (دقيقة)">
          <input
            name="session_duration"
            type="number"
            min={0}
            value={sessionDuration}
            onChange={(e) => setSessionDuration(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
        </Field>
      </div>

      <Field label="رقم آخر حصة (عداد فقط)">
        <input
          name="last_session_num"
          type="number"
          min={0}
          defaultValue={student.last_session_num ?? 0}
          className={inputCls}
          style={{ ...inputStyle, borderColor: '#176b52', borderWidth: 2 }}
        />
        <p className="text-[10px] mt-1" style={{ color: '#6f7974' }}>
          الحفظ هنا يغيّر الرقم على ملف الطالب فقط — مش بيضيف ولا بيحذف من سجل المعلم.
          للمزامنة مع حصص المعلم استخدم «التسوية» أو «تعديل رقم الحصة».
        </p>
      </Field>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="سعر الحصة على ولي الأمر (ج)">
          <input
            name="price_per_session"
            type="number"
            min={0}
            step="0.5"
            value={pricePerSession}
            onChange={(e) => setPricePerSession(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
          <p className="text-[10px] mt-1" style={{ color: '#6f7974' }}>
            من الباقة: سعر الباقة ÷ عدد الحصص
          </p>
        </Field>
        <Field label="سعر الحصة للمعلم (ج)">
          <input
            name="teacher_session_rate"
            type="number"
            min={0}
            step="0.5"
            value={teacherRate}
            onChange={(e) => setTeacherRate(e.target.value)}
            placeholder="يُحسب منه راتب المعلم"
            className={inputCls}
            style={inputStyle}
          />
        </Field>
        <Field label="المستحق الحالي (ج)">
          <input
            name="amount_due"
            type="number"
            min={0}
            value={amountDue}
            onChange={(e) => setAmountDue(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
          <p className="text-[10px] mt-1" style={{ color: '#6f7974' }}>
            عند اختيار باقة = سعر الباقة كامل
          </p>
        </Field>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 rounded-2xl text-white font-bold text-[14px] disabled:opacity-60"
        style={{ background: '#176b52' }}
      >
        {pending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
      </button>
    </form>
  )
}
