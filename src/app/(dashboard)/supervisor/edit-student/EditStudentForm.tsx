'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
  ads_fee?: number | null
  supervision_fee?: number | null
  other_fee?: number | null
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
  const [adsFee, setAdsFee] = useState(String(student.ads_fee ?? 0))
  const [supervisionFee, setSupervisionFee] = useState(String(student.supervision_fee ?? 0))
  const [otherFee, setOtherFee] = useState(String(student.other_fee ?? 0))

  const pkg = useMemo(
    () => packages.find((p) => p.id === packageId) || null,
    [packages, packageId]
  )

  function onPackageChange(id: string) {
    setPackageId(id)
    const p = packages.find((x) => x.id === id)
    if (!p) return
    setMonthlySessions(String(p.sessions_count || 8))
    setSessionDuration(String(p.duration_minutes || 30))
    setPricePerSession(String(perSession(p)))
    setAmountDue(String(Number(p.price) || 0))
  }

  const profitPreview = useMemo(() => {
    const sessions = Math.max(0, Number(monthlySessions) || 0)
    const parent = Number(pricePerSession) || 0
    const teacher = Number(teacherRate) || 0
    const ads = Number(adsFee) || 0
    const sup = Number(supervisionFee) || 0
    const other = Number(otherFee) || 0
    const income = parent * sessions
    const teacherCost = teacher * sessions
    const extras = ads + sup + other
    const profit = income - teacherCost - extras
    return { sessions, income, teacherCost, extras, profit, parent, teacher, ads, sup, other }
  }, [monthlySessions, pricePerSession, teacherRate, adsFee, supervisionFee, otherFee])

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    setMsg(null)
    startTransition(async () => {
      try {
        const body = {
          student_id: student.id,
          name: String(fd.get('name') || ''),
          phone: String(fd.get('phone') || ''),
          join_date: String(fd.get('join_date') || ''),
          teacher_id: String(fd.get('teacher_id') || ''),
          status: String(fd.get('status') || ''),
          package_id: packageId,
          monthly_sessions: monthlySessions,
          session_duration: sessionDuration,
          price_per_session: pricePerSession,
          teacher_session_rate: teacherRate,
          amount_due: amountDue,
          last_session_num: String(fd.get('last_session_num') || ''),
          orig_last_session_num: String(fd.get('orig_last_session_num') || ''),
          ads_fee: adsFee,
          supervision_fee: supervisionFee,
          other_fee: otherFee,
        }
        const res = await fetch('/api/admin/edit-student', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const r = await res.json().catch(() => ({}))
        if (!res.ok || r.error) {
          setMsg({ type: 'err', text: r.error || `فشل الحفظ (${res.status})` })
          return
        }
        setMsg({ type: 'ok', text: r.message || 'تم الحفظ ✓' })
        router.refresh()
      } catch (err: any) {
        setMsg({ type: 'err', text: err?.message || 'فشل الاتصال بالخادم' })
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="orig_last_session_num" value={student.last_session_num ?? 0} />

      {msg && (
        <p
          className="text-[13px] font-bold text-center rounded-xl py-2"
          style={{
            background: msg.type === 'ok' ? '#e8f7f0' : '#ffdad6',
            color: msg.type === 'ok' ? '#176b52' : '#93000a',
          }}
        >
          {msg.text}
        </p>
      )}

      <div className="card p-3 text-[12px]" style={{ background: '#e8f7f0' }}>
        <p className="font-bold" style={{ color: '#00513c' }}>
          {student.name} · {student.code}
        </p>
        <p style={{ color: '#6f7974' }}>
          انضم: {joinAr} · {tenure}
          {joinDate ? ` · ${joinDate}` : ''}
        </p>
      </div>

      <Field label="الاسم">
        <input name="name" defaultValue={student.name || ''} required className={inputCls} style={inputStyle} />
      </Field>
      <Field label="الهاتف">
        <input name="phone" defaultValue={student.phone || ''} className={inputCls} style={inputStyle} />
      </Field>
      <Field label="تاريخ الانضمام">
        <input
          name="join_date"
          type="date"
          defaultValue={student.join_date ? String(student.join_date).slice(0, 10) : ''}
          className={inputCls}
          style={inputStyle}
        />
      </Field>
      <Field label="المعلم">
        <select name="teacher_id" defaultValue={student.teacher_id || ''} className={inputCls} style={inputStyle}>
          <option value="">— بدون معلم —</option>
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
          onChange={(e) => onPackageChange(e.target.value)}
          className={inputCls}
          style={inputStyle}
        >
          <option value="">— بدون باقة —</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} · {p.sessions_count} حصة · {money(Number(p.price))} {p.currency || 'EGP'}
            </option>
          ))}
        </select>
        {pkg && (
          <p className="text-[11px] mt-1 rounded-lg px-2 py-1.5" style={{ background: '#e8f7f0', color: '#176b52' }}>
            <b>سعر الباقة:</b> {money(Number(pkg.price))} {pkg.currency || 'EGP'} · حصص: {pkg.sessions_count} ·
            للحصة على الولي: {money(perSession(pkg))}
            <br />
            تم ملء الحقول تحت تلقائيًا — تقدر تعدّل يدوي
          </p>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="عدد حلقات الباقة">
          <input
            type="number"
            min={0}
            step="1"
            value={monthlySessions}
            onChange={(e) => setMonthlySessions(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
        </Field>
        <Field label="مدة الحلقة (دقيقة)">
          <input
            type="number"
            min={0}
            step="1"
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
        </p>
      </Field>

      <div className="grid grid-cols-2 gap-2.5">
        <Field label="سعر الحصة على ولي الأمر (ج)">
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={pricePerSession}
            onChange={(e) => setPricePerSession(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
        </Field>
        <Field label="سعر الحصة للمعلم (ج)">
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={teacherRate}
            onChange={(e) => setTeacherRate(e.target.value)}
            placeholder="يُحسب منه راتب المعلم"
            className={inputCls}
            style={inputStyle}
          />
        </Field>
        <Field label="المستحق الحالي (ج)">
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
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

      <div className="rounded-2xl p-3 space-y-2" style={{ background: '#fff8e8', border: '1px solid #f0d9a8' }}>
        <p className="text-[12px] font-bold" style={{ color: '#8a5a00' }}>
          مصاريف إضافية (شهريًا لكل طالب)
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Field label="إعلانات (ج)">
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={adsFee}
              onChange={(e) => setAdsFee(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </Field>
          <Field label="إشراف (ج)">
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={supervisionFee}
              onChange={(e) => setSupervisionFee(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </Field>
          <Field label="أخرى (ج)">
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={otherFee}
              onChange={(e) => setOtherFee(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </Field>
        </div>

        <div
          className="rounded-xl px-3 py-2 text-[12px] space-y-0.5"
          style={{
            background: profitPreview.profit >= 0 ? '#e8f7f0' : '#ffdad6',
            color: profitPreview.profit >= 0 ? '#176b52' : '#93000a',
          }}
        >
          <p>
            دخل متوقع ({profitPreview.sessions} حصة × {money(profitPreview.parent)}):{' '}
            <b>{money(profitPreview.income)} ج</b>
          </p>
          <p>
            تكلفة معلم: <b>{money(profitPreview.teacherCost)} ج</b>
          </p>
          <p>
            مصاريف إضافية: <b>{money(profitPreview.extras)} ج</b>
          </p>
          <p className="font-bold text-[13px] pt-1">
            {profitPreview.profit >= 0 ? 'ربح تقريبي' : 'خسارة تقريبية'}: {money(Math.abs(profitPreview.profit))} ج
          </p>
        </div>
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
