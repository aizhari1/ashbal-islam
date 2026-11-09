'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addStudent } from '@/app/actions/students'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Teacher = { id: string; name: string }
type Pkg = {
  id: string
  name: string
  sessions_count: number
  duration_minutes: number | null
  price: number
  currency: string | null
}

const perSession = (p: Pkg) =>
  Math.round((Number(p.price) / Math.max(1, p.sessions_count)) * 100) / 100
const money = (n: number) =>
  Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })

export default function NewStudentPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [packages, setPackages] = useState<Pkg[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    age: '',
    country: '',
    teacher_id: '',
    subscription_type: 'شهري',
    session_duration: '30',
    monthly_sessions: '4',
    price_per_session: '60',
    teacher_session_rate: '25',
    currency: 'EGP',
    status: 'نشط',
    package_id: '',
  })

  useEffect(() => {
    const sb = createClient()
    sb.from('teachers')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setTeachers(data ?? []))
    sb.from('packages')
      .select('id, name, sessions_count, duration_minutes, price, currency')
      .eq('is_active', true)
      .order('sessions_count')
      .then(({ data }) => setPackages((data as Pkg[]) ?? []))
  }, [])

  const pkg = packages.find((p) => p.id === form.package_id) || null

  function choosePackage(id: string) {
    if (!id) {
      setForm((f) => ({ ...f, package_id: '', subscription_type: 'شهري' }))
      return
    }
    const p = packages.find((x) => x.id === id)
    if (!p) return
    const ps = String(perSession(p))
    setForm((f) => ({
      ...f,
      package_id: p.id,
      subscription_type: 'باقة',
      monthly_sessions: String(p.sessions_count),
      price_per_session: ps,
      teacher_session_rate: f.teacher_session_rate || ps,
      session_duration: String(p.duration_minutes || 30),
      currency: p.currency || f.currency || 'EGP',
    }))
  }

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function next() {
    if (step === 1 && !form.name.trim()) {
      setError('الاسم مطلوب')
      return
    }
    if (step === 2 && !form.teacher_id) {
      setError('اختَر المعلم')
      return
    }
    setError('')
    setStep((s) => Math.min(3, s + 1))
  }

  function submit() {
    setError('')
    if (!(Number(form.teacher_session_rate) > 0)) {
      setError('اكتب سعر الحصة للمعلم (أكبر من صفر)')
      return
    }
    if (!pkg && !(Number(form.price_per_session) > 0)) {
      setError('اكتب سعر الحصة على ولي الأمر أو اختَر باقة')
      return
    }
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.set(k, v))
    startTransition(async () => {
      const res = await addStudent(fd)
      if (res.error) setError(res.error)
      else router.push('/admin/students')
    })
  }

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link
          href="/admin/students"
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"
        >
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <h1 className="text-[16px] font-bold">إضافة طالب جديد</h1>
      </header>

      <div className="px-4 flex gap-2 mb-4">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`flex-1 h-1.5 rounded-full ${step >= n ? 'bg-[#176b52]' : 'bg-[#bec9c2]'}`}
          />
        ))}
      </div>

      <main className="px-4 pb-28">
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-[13px] font-bold text-[#176b52]">البيانات الأساسية</p>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="اسم الطالب *"
              className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]"
            />
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="هاتف ولي الأمر"
              dir="ltr"
              className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.age}
                onChange={(e) => set('age', e.target.value)}
                placeholder="العمر"
                type="number"
                className="bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]"
              />
              <input
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                placeholder="البلد"
                className="bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-[13px] font-bold text-[#176b52]">المعلم والباقة</p>
            <div>
              <label className="text-[12px] text-[#6f7974] block mb-1">المعلم *</label>
              <select
                value={form.teacher_id}
                onChange={(e) => set('teacher_id', e.target.value)}
                className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]"
              >
                <option value="">— اختر المعلم —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[12px] text-[#6f7974] block mb-1">الباقة</label>
              <select
                value={form.package_id}
                onChange={(e) => choosePackage(e.target.value)}
                className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]"
              >
                <option value="">— بدون باقة / تخصيص يدوي —</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.sessions_count} حصة · {money(Number(p.price))} {p.currency || 'EGP'}
                  </option>
                ))}
              </select>
              {pkg && (
                <div
                  className="mt-2 rounded-xl px-3 py-2.5 text-[12px] space-y-0.5"
                  style={{ background: '#e8f7f0', border: '1px solid #cde8dc' }}
                >
                  <p>
                    <b>سعر الباقة كامل:</b> {money(Number(pkg.price))} {pkg.currency || 'EGP'}
                  </p>
                  <p>
                    <b>عدد الحصص:</b> {pkg.sessions_count}
                  </p>
                  <p>
                    <b>سعر الحصة على ولي الأمر:</b> {money(perSession(pkg))} (الباقة ÷ الحصص)
                  </p>
                </div>
              )}
            </div>

            {!pkg && (
              <select
                value={form.subscription_type}
                onChange={(e) => set('subscription_type', e.target.value)}
                className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]"
              >
                <option value="شهري">شهري</option>
                <option value="باقة">باقة</option>
                <option value="تجريبي">تجريبي</option>
                <option value="حر">حر</option>
              </select>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[12px] text-[#6f7974]">مدة الحلقة (د)</label>
                <input
                  value={form.session_duration}
                  onChange={(e) => set('session_duration', e.target.value)}
                  type="number"
                  disabled={!!pkg}
                  className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px] disabled:opacity-60"
                />
              </div>
              <div>
                <label className="text-[12px] text-[#6f7974]">عدد الحصص</label>
                <input
                  value={form.monthly_sessions}
                  onChange={(e) => set('monthly_sessions', e.target.value)}
                  type="number"
                  disabled={!!pkg}
                  className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px] disabled:opacity-60"
                />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-[13px] font-bold text-[#176b52]">التسعير والحالة</p>

            {pkg && (
              <div
                className="rounded-xl px-3 py-2.5 text-[12px]"
                style={{ background: '#e8f7f0', border: '1px solid #cde8dc' }}
              >
                <p className="font-bold" style={{ color: '#176b52' }}>
                  {pkg.name}
                </p>
                <p>
                  سعر الباقة: <b>{money(Number(pkg.price))}</b> · {pkg.sessions_count} حصة · للحصة على
                  الولي: <b>{money(perSession(pkg))}</b>
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[12px] font-bold block mb-1" style={{ color: '#176b52' }}>
                  سعر الحصة على ولي الأمر (ج)
                </label>
                <input
                  value={form.price_per_session}
                  onChange={(e) => set('price_per_session', e.target.value)}
                  type="number"
                  min={0}
                  step="0.5"
                  disabled={!!pkg}
                  className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px] disabled:opacity-60"
                />
                <p className="text-[11px] mt-1" style={{ color: '#6f7974' }}>
                  {pkg ? 'من الباقة تلقائيًا (مستحقات = الحصص × السعر)' : 'للمستحقات والدفعات'}
                </p>
              </div>
              <div>
                <label className="text-[12px] font-bold block mb-1" style={{ color: '#176b52' }}>
                  سعر الحصة للمعلم (ج) *
                </label>
                <input
                  value={form.teacher_session_rate}
                  onChange={(e) => set('teacher_session_rate', e.target.value)}
                  type="number"
                  min={0}
                  step="0.5"
                  placeholder="مثال: 25"
                  className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]"
                />
                <p className="text-[11px] mt-1" style={{ color: '#6f7974' }}>
                  يُحسب منه راتب المعلم لكل حاضر/متأخر
                </p>
              </div>
            </div>

            <div>
              <label className="text-[12px] text-[#6f7974] block mb-1">العملة</label>
              <select
                value={form.currency}
                onChange={(e) => set('currency', e.target.value)}
                disabled={!!pkg}
                className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]"
              >
                <option value="EGP">ج.م</option>
                <option value="SAR">ر.س</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]"
            >
              <option value="نشط">نشط</option>
              <option value="تجريبي">تجريبي</option>
              <option value="موقوف">موقوف</option>
            </select>

            <div className="bg-white rounded-2xl p-4 text-[13px] space-y-1">
              <p>
                <b>الاسم:</b> {form.name}
              </p>
              <p>
                <b>المعلم:</b> {teachers.find((t) => t.id === form.teacher_id)?.name || '—'}
              </p>
              <p>
                <b>الاشتراك:</b>{' '}
                {pkg
                  ? `${pkg.name} · ${money(Number(pkg.price))} ${form.currency}`
                  : form.subscription_type}{' '}
                · {form.monthly_sessions} حصة
              </p>
              <p>
                <b>سعر الحصة على ولي الأمر:</b> {money(Number(form.price_per_session) || 0)}{' '}
                {form.currency}
              </p>
              <p>
                <b>سعر الحصة للمعلم:</b> {form.teacher_session_rate || '—'} {form.currency}
              </p>
            </div>
          </div>
        )}

        {error && <p className="text-[13px] text-[#ba1a1a] mt-3 font-bold">{error}</p>}

        <div className="flex gap-2 mt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 bg-white border border-[#e5efe8] py-3 rounded-xl font-bold text-[14px]"
            >
              السابق
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              className="flex-1 bg-[#176b52] text-white py-3 rounded-xl font-bold text-[14px]"
            >
              التالي
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={isPending}
              className="flex-1 bg-[#176b52] text-white py-3 rounded-xl font-bold text-[14px] disabled:opacity-50"
            >
              {isPending ? 'جاري الحفظ...' : 'حفظ الطالب'}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
