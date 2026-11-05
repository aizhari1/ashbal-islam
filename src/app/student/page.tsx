'use client'

import { formatTime12 } from '@/lib/time-format'
import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import MyCourses from '@/components/MyCourses'
import { saveStudentCode, loadStudentCode } from '@/lib/app-prefs'

const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export default function StudentPortalPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)
  const [pending, start] = useTransition()
  const [booting, setBooting] = useState(true)

  function fetchStudent(c: string) {
    setError('')
    start(async () => {
      try {
        const res = await fetch('/api/student-portal?code=' + encodeURIComponent(c))
        const json = await res.json()
        if (!res.ok) {
          setError(json.error || 'تعذر البحث')
          setData(null)
          return
        }
        setData(json)
        saveStudentCode(c)
      } catch {
        setError('مشكلة في الاتصال — حاول مرة أخرى')
      }
    })
  }

  useEffect(() => {
    const saved = loadStudentCode()
    if (saved) {
      setCode(saved)
      fetchStudent(saved)
    }
    setBooting(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function lookup(e: React.FormEvent) {
    e.preventDefault()
    const c = code.trim()
    if (!c) {
      setError('اكتب كود الطالب')
      return
    }
    fetchStudent(c)
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
        <h1 className="text-[20px] font-bold" style={{ color: '#00513c' }}>
          بوابة الطالب
        </h1>
        <p className="text-[12px]" style={{ color: '#6f7974' }}>
          أكاديمية أشبال الإسلام — بالكود فقط
        </p>
      </div>

      {!s && (
        <form onSubmit={lookup} className="card p-4 space-y-3 mb-4">
          <label className="text-[12px] font-semibold" style={{ color: '#3f4944' }}>
            كود الطالب
          </label>
          <input
            className="input text-center text-[18px] tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="مثال: ST-0001"
            dir="ltr"
            autoFocus
          />
          <button type="submit" disabled={pending || booting} className="btn-primary w-full py-3">
            {pending || booting ? 'جاري التحميل...' : 'عرض بياناتي'}
          </button>
          {error && (
            <p className="text-[12px] text-center rounded-lg py-2" style={{ background: '#ffdad6', color: '#93000a' }}>
              {error}
            </p>
          )}
        </form>
      )}

      {s && (
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex justify-between items-start gap-2">
              <div>
                <h2 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
                  {s.name}
                </h2>
                <p className="text-[12px]" style={{ color: '#6f7974' }}>
                  {s.code} · {s.status} · المعلم: {s.teacher_name}
                </p>
              </div>
              <button
                type="button"
                className="text-[11px] underline"
                style={{ color: '#176b52' }}
                onClick={() => {
                  setData(null)
                  setCode('')
                  try {
                    localStorage.removeItem('ashbal_student_code')
                  } catch {
                    /* ignore */
                  }
                }}
              >
                تغيير الكود
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="rounded-xl p-3" style={{ background: '#e8f7f0' }}>
                <p className="text-[10px]" style={{ color: '#6f7974' }}>
                  المستحق
                </p>
                <p className="text-[18px] font-bold" style={{ color: Number(s.amount_due) > 0 ? '#ba1a1a' : '#176b52' }}>
                  {Number(s.amount_due || 0).toLocaleString('ar-EG')}
                </p>
              </div>
              <div className="rounded-xl p-3" style={{ background: '#e8f7f0' }}>
                <p className="text-[10px]" style={{ color: '#6f7974' }}>
                  تقييم الحصص
                </p>
                <p className="text-[18px] font-bold" style={{ color: '#c5a45d' }}>
                  {data.avg_rating ?? '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-[13px] font-bold mb-2">المواعيد الثابتة</h3>
            {(data.schedule || []).length === 0 && (
              <p className="text-[12px]" style={{ color: '#6f7974' }}>
                لا مواعيد مسجّلة
              </p>
            )}
            {(data.schedule || []).map((row: any, i: number) => (
              <div
                key={i}
                className="flex justify-between py-1.5 text-[13px] border-b last:border-0"
                style={{ borderColor: 'rgba(18,61,50,0.06)' }}
              >
                <span>{DAYS[row.day_of_week] ?? row.day_of_week}</span>
                <span className="font-bold" dir="ltr">
                  {formatTime12(row.start_time)}
                </span>
              </div>
            ))}
          </div>

          <div className="card p-4">
            <h3 className="text-[13px] font-bold mb-2">آخر الحصص</h3>
            {(data.attendance || []).length === 0 && (
              <p className="text-[12px]" style={{ color: '#6f7974' }}>
                لا سجلات
              </p>
            )}
            {(data.attendance || []).map((a: any) => (
              <div
                key={a.session_date + String(a.session_num)}
                className="flex justify-between text-[12px] py-1.5 border-b last:border-0"
                style={{ borderColor: 'rgba(18,61,50,0.06)' }}
              >
                <span>
                  {a.session_date} · {a.status}
                </span>
                <span style={{ color: '#c5a45d' }}>{a.rating ? `★ ${a.rating}` : ''}</span>
              </div>
            ))}
          </div>

          <MyCourses code={s.code} />
        </div>
      )}

      <p className="text-center mt-6 text-[12px]">
        <Link href="/app" style={{ color: '#176b52' }}>
          قائمة الأدوار
        </Link>
        {' · '}
        <Link href="/login" style={{ color: '#176b52' }}>
          دخول الإدارة / المعلم
        </Link>
      </p>
    </main>
  )
}
