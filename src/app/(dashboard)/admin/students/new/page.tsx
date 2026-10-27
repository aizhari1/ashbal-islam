'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addStudent } from '@/app/actions/students'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Teacher = { id: string; name: string }

export default function NewStudentPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', phone: '', age: '', country: '',
    teacher_id: '', subscription_type: 'شهري', session_duration: '30',
    monthly_sessions: '4', price_per_session: '60', currency: 'EGP', status: 'نشط',
  })

  useEffect(() => {
    createClient().from('teachers').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setTeachers(data ?? []))
  }, [])

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function next() {
    if (step === 1 && !form.name.trim()) { setError('الاسم مطلوب'); return }
    setError('')
    setStep((s) => Math.min(3, s + 1))
  }

  function submit() {
    setError('')
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
        <Link href="/admin/students" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <h1 className="text-[16px] font-bold">إضافة طالب جديد</h1>
      </header>

      <div className="px-4 flex gap-2 mb-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`flex-1 h-1.5 rounded-full ${step >= n ? 'bg-[#176b52]' : 'bg-[#bec9c2]'}`} />
        ))}
      </div>

      <main className="px-4 pb-28">
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-[13px] font-bold text-[#176b52]">البيانات الأساسية</p>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="اسم الطالب *"
              className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]" />
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="هاتف ولي الأمر" dir="ltr"
              className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]" />
            <div className="grid grid-cols-2 gap-2">
              <input value={form.age} onChange={(e) => set('age', e.target.value)} placeholder="العمر" type="number"
                className="bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]" />
              <input value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="البلد"
                className="bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]" />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-[13px] font-bold text-[#176b52]">الحلقة والمعلم</p>
            <select value={form.teacher_id} onChange={(e) => set('teacher_id', e.target.value)}
              className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]">
              <option value="">— اختر المعلم —</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={form.subscription_type} onChange={(e) => set('subscription_type', e.target.value)}
              className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]">
              <option value="شهري">شهري</option>
              <option value="باقة">باقة</option>
              <option value="تجريبي">تجريبي</option>
              <option value="حر">حر</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[12px] text-[#6f7974]">مدة الحلقة (د)</label>
                <input value={form.session_duration} onChange={(e) => set('session_duration', e.target.value)} type="number"
                  className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]" />
              </div>
              <div>
                <label className="text-[12px] text-[#6f7974]">حصص/شهر</label>
                <input value={form.monthly_sessions} onChange={(e) => set('monthly_sessions', e.target.value)} type="number"
                  className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]" />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-[13px] font-bold text-[#176b52]">التسعير والحالة</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[12px] text-[#6f7974]">سعر الحصة</label>
                <input value={form.price_per_session} onChange={(e) => set('price_per_session', e.target.value)} type="number"
                  className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]" />
              </div>
              <div>
                <label className="text-[12px] text-[#6f7974]">العملة</label>
                <select value={form.currency} onChange={(e) => set('currency', e.target.value)}
                  className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]">
                  <option value="EGP">ج.م</option>
                  <option value="SAR">ر.س</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}
              className="w-full bg-white border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px]">
              <option value="نشط">نشط</option>
              <option value="تجريبي">تجريبي</option>
              <option value="موقوف">موقوف</option>
            </select>
            <div className="bg-white rounded-2xl p-4 text-[13px] space-y-1">
              <p><b>الاسم:</b> {form.name}</p>
              <p><b>المعلم:</b> {teachers.find((t) => t.id === form.teacher_id)?.name || '—'}</p>
              <p><b>الاشتراك:</b> {form.subscription_type} · {form.monthly_sessions} حصة</p>
              <p><b>السعر:</b> {form.price_per_session} {form.currency}/حصة</p>
            </div>
          </div>
        )}

        {error && <p className="text-[13px] text-[#ba1a1a] mt-3">{error}</p>}

        <div className="flex gap-2 mt-6">
          {step > 1 && (
            <button type="button" onClick={() => setStep((s) => s - 1)}
              className="flex-1 bg-white border border-[#e5efe8] py-3 rounded-xl font-bold text-[14px]">السابق</button>
          )}
          {step < 3 ? (
            <button type="button" onClick={next}
              className="flex-1 bg-[#176b52] text-white py-3 rounded-xl font-bold text-[14px]">التالي</button>
          ) : (
            <button type="button" onClick={submit} disabled={isPending}
              className="flex-1 bg-[#176b52] text-white py-3 rounded-xl font-bold text-[14px] disabled:opacity-50">
              {isPending ? 'جاري الحفظ...' : 'حفظ الطالب'}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
