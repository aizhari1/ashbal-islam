'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export default function StudentPortalPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)
  const [pending, start] = useTransition()

  function lookup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setData(null)
    const c = code.trim()
    if (!c) {
      setError('اكتب كود الطالب')
      return
    }
    start(async () => {
      try {
        const res = await fetch('/api/student-portal?code=' + encodeURIComponent(c))
        const json = await res.json()
        if (!res.ok) {
          setError(json.error || 'تعذر البحث')
          return
        }
        setData(json)
      } catch {
        setError('مشكلة في الاتصال — حاول مرة أخرى')
      }
    })
  }

  const s = data?.student

  return (
    <main className="min-h-dvh max-w-lg mx-auto p-4" style={{ background: '#eefdf6' }}>
      <div className="text-center mb-6 pt-4">
        <div
          className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3"
          style={{ background: 'linear-gradient(145deg, #176b52, #00513c)' }}
        >
          <span className="material-symbols-outlined text-3xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
            school
          </span>
        </div>
        <h1 className="text-[20px] font-bold" style={{ color: '#00513c' }}>بوابة الطالب</h1>
        <p className="text-[12px]" style={{ color: '#6f7974' }}>أكاديمية أشبال الإسلام — بالكود فقط</p>
      </div>

      <form onSubmit={lookup} className="card p-4 space-y-3 mb-4">
        <label className="text-[12px] font-semibold" style={{ color: '#3f4944' }}>كود الطالب</label>
        <input
          className="input text-center text-[18px] tracking-widest"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="مثال: ST-0001"
          dir="ltr"
          autoFocus
        />
        <button type="submit" disabled={pending} className="btn-primary w-full py-3">
          {pending ? 'جاري البحث...' : 'عرض بياناتي'}
        </button>
        {error && (
          <p className="text-[12px] text-center rounded-lg py-2" style={{ background: '#ffdad6', color: '#93000a' }}>
            {error}
          </p>
        )}
      </form>

      {s && (
        <div className="space-y-3">
          <div className="card p-4">
            <h2 className="text-[16px] font-bold" style={{ color: '#00513c' }}>{s.name}</h2>
            <p className="text-[12px]" style={{ color: '#6f7974' }}>
              {s.code} · {s.status} · المعلم: {s.teacher_name}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="rounded-xl p-3" style={{ background: '#e8f7f0' }}>
                <p className="text-[10px]" style={{ color: '#6f7974' }}>المستحق</p>
                <p className="text-[18px] font-bold" style={{ color: Number(s.amount_due) > 0 ? '#ba1a1a' : '#176b52' }}>
                  {Number(s.amount_due || 0).toLocaleString('ar-EG')}
                </p>
              </div>
              <div className="rounded-xl p-3" style={{ background: '#e8f7f0' }}>
                <p className="text-[10px]" style={{ color: '#6f7974' }}>تقييم الحصص</p>
                <p className="text-[18px] font-bold" style={{ color: '#c5a45d' }}>{data.avg_rating ?? '—'}</p>
              </div>
            </div>
            <p className="text-[11px] mt-2" style={{ color: '#6f7974' }}>
              الباقة: {s.subscription_type || '—'} · {s.monthly_sessions || '—'} حصة/شهر
              {s.last_session_date ? ` · آخر حصة ${s.last_session_date}` : ''}
            </p>
          </div>

          <div className="card p-4">
            <h3 className="text-[13px] font-bold mb-2">المواعيد الثابتة</h3>
            {(data.schedule || []).length === 0 && (
              <p className="text-[12px]" style={{ color: '#6f7974' }}>لا مواعيد مسجّلة</p>
            )}
            {(data.schedule || []).map((row: any, i: number) => (
              <div key={i} className="flex justify-between py-1.5 text-[13px] border-b last:border-0" style={{ borderColor: 'rgba(18,61,50,0.06)' }}>
                <span>{DAYS[row.day_of_week] ?? row.day_of_week}</span>
                <span className="font-bold" dir="ltr">{String(row.start_time || '').slice(0, 5)}</span>
              </div>
            ))}
          </div>

          <div className="card p-4">
            <h3 className="text-[13px] font-bold mb-2">آخر الحصص</h3>
            {(data.attendance || []).length === 0 && (
              <p className="text-[12px]" style={{ color: '#6f7974' }}>لا سجلات</p>
            )}
            {(data.attendance || []).map((a: any) => (
              <div key={a.session_date + String(a.session_num)} className="flex justify-between text-[12px] py-1.5 border-b last:border-0" style={{ borderColor: 'rgba(18,61,50,0.06)' }}>
                <span>{a.session_date} · {a.status}</span>
                <span style={{ color: '#c5a45d' }}>{a.rating ? `★ ${a.rating}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center mt-6 text-[12px]">
        <Link href="/login" style={{ color: '#176b52' }}>دخول الإدارة / المعلم</Link>
        {' · '}
        <Link href="/evaluate" style={{ color: '#176b52' }}>تقييم ولي الأمر</Link>
      </p>
    </main>
  )
}
