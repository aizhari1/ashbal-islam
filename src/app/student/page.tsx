'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
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
    const c = code.trim().toUpperCase()
    if (!c) {
      setError('اكتب كود الطالب')
      return
    }
    start(async () => {
      const supabase = createClient()
      const { data: student } = await supabase
        .from('students')
        .select('id, code, name, status, amount_due, subscription_type, monthly_sessions, last_session_num, last_session_date, price_per_session, teachers(name)')
        .ilike('code', c)
        .maybeSingle()

      if (!student) {
        setError('الكود غير موجود')
        return
      }

      const [{ data: schedule }, { data: att }] = await Promise.all([
        supabase
          .from('schedule_entries')
          .select('day_of_week, start_time, duration_minutes, notes')
          .eq('student_id', student.id)
          .order('day_of_week'),
        supabase
          .from('attendance')
          .select('session_date, status, rating, notes, session_num')
          .eq('student_id', student.id)
          .order('session_date', { ascending: false })
          .limit(8),
      ])

      const ratings = (att || []).map((a) => Number(a.rating)).filter((n) => n > 0)
      const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null

      setData({ student, schedule: schedule || [], att: att || [], avg })
    })
  }

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

      {data && (
        <div className="space-y-3">
          <div className="card p-4">
            <h2 className="text-[16px] font-bold" style={{ color: '#00513c' }}>{data.student.name}</h2>
            <p className="text-[12px]" style={{ color: '#6f7974' }}>
              {data.student.code} · {data.student.status} · المعلم: {data.student.teachers?.name || '—'}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="rounded-xl p-3" style={{ background: '#e8f7f0' }}>
                <p className="text-[10px]" style={{ color: '#6f7974' }}>المستحق</p>
                <p className="text-[18px] font-bold" style={{ color: Number(data.student.amount_due) > 0 ? '#ba1a1a' : '#176b52' }}>
                  {Number(data.student.amount_due || 0).toLocaleString('ar-EG')}
                </p>
              </div>
              <div className="rounded-xl p-3" style={{ background: '#e8f7f0' }}>
                <p className="text-[10px]" style={{ color: '#6f7974' }}>تقييم الحصص</p>
                <p className="text-[18px] font-bold" style={{ color: '#c5a45d' }}>{data.avg ?? '—'}</p>
              </div>
            </div>
            <p className="text-[11px] mt-2" style={{ color: '#6f7974' }}>
              الباقة: {data.student.subscription_type || '—'} · {data.student.monthly_sessions || '—'} حصة/شهر
              {data.student.last_session_date ? ` · آخر حصة ${data.student.last_session_date}` : ''}
            </p>
          </div>

          <div className="card p-4">
            <h3 className="text-[13px] font-bold mb-2">المواعيد الثابتة</h3>
            {data.schedule.length === 0 && (
              <p className="text-[12px]" style={{ color: '#6f7974' }}>لا مواعيد مسجّلة</p>
            )}
            {data.schedule.map((s: any, i: number) => (
              <div key={i} className="flex justify-between py-1.5 text-[13px] border-b last:border-0" style={{ borderColor: 'rgba(18,61,50,0.06)' }}>
                <span>{DAYS[s.day_of_week] ?? s.day_of_week}</span>
                <span className="font-bold" dir="ltr">{String(s.start_time || '').slice(0, 5)}</span>
              </div>
            ))}
          </div>

          <div className="card p-4">
            <h3 className="text-[13px] font-bold mb-2">آخر الحصص</h3>
            {data.att.length === 0 && <p className="text-[12px]" style={{ color: '#6f7974' }}>لا سجلات</p>}
            {data.att.map((a: any) => (
              <div key={a.session_date + String(a.session_num)} className="flex justify-between text-[12px] py-1.5 border-b last:border-0" style={{ borderColor: 'rgba(18,61,50,0.06)' }}>
                <span>{a.session_date} · {a.status}</span>
                <span style={{ color: '#c5a45d' }}>{a.rating ? `★ ${a.rating}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-center mt-6">
        <Link href="/login" className="text-[12px]" style={{ color: '#176b52' }}>دخول الإدارة / المعلم</Link>
        {' · '}
        <Link href="/evaluate" className="text-[12px]" style={{ color: '#176b52' }}>تقييم ولي الأمر</Link>
      </p>
    </main>
  )
}
