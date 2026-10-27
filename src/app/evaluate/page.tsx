'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

const MONTH = 'تقييم شهر أكتوبر 2026'

const Q_TEACHER = [
  { id: 'q1', label: '1) مدى تصحيح الأخطاء أو تنفيذ الاقتراحات من آخر استبيان', options: ['تم معالجة الأمر', 'لم يتم تنفيذ ما طلبته', 'لم أشارك في الاستبيان'] },
  { id: 'q2', label: '2) تقييم أداء المعلم/ة أثناء الحصة', options: ['ممتاز', 'جيد جداً', 'جيد', 'مقبول', 'ضعيف'] },
  { id: 'q3', label: '3) مدى رضا الطالب عن المعلم/ة وتفاعله معه', options: ['رضا تام', 'الرضا والتفاعل مقبول', 'عدم الرضا أو التفاعل'] },
  { id: 'q4', label: '4) هل هناك تقدم ملحوظ في مستوى الطالب؟', options: ['تقدم ملحوظ بمستوى كبير', 'تقدم بطيء', 'لم يتقدم مستوى الطالب'] },
  { id: 'q5', label: '5) رأيك في وقت الحصة', options: ['مناسب جداً', 'الوقت طويل يحتاج إلى التقليل', 'قليل يحتاج إلى الزيادة'] },
  { id: 'q6', label: '6) مدى التزام المعلم/ة بمدة الحصة ومواعيدها', options: ['ملتزم تماماً', 'ملتزم غالباً', 'غير ملتزم'] },
]

export default function PublicEvaluatePage() {
  const [done, setDone] = useState(false)
  const [query, setQuery] = useState('')
  const [parentName, setParentName] = useState('')
  const [phone, setPhone] = useState('')
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<{ id: string; code: string; name: string }[]>([])
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')

  function search() {
    if (!query.trim()) return
    startTransition(async () => {
      const supabase = createClient()
      const q = query.trim()
      const { data } = await supabase.from('students').select('id, code, name').or(`name.ilike.%${q}%,code.ilike.%${q}%`).limit(10)
      setResults(data ?? [])
    })
  }

  function pick(s: { id: string; code: string; name: string }) {
    setStudentId(s.id)
    setStudentName(`${s.code} — ${s.name}`)
    setResults([])
    setQuery(s.name)
  }

  function submit() {
    if (!studentId) { setMsg('اختر الطالب أولاً'); return }
    startTransition(async () => {
      const supabase = createClient()
      const { error } = await supabase.from('activity_log').insert({
        action: 'parent_evaluation',
        entity_type: 'student',
        entity_id: studentId,
        details: { month: MONTH, parent_name: parentName, phone, student_name: studentName, answers },
      })
      if (error) setMsg(error.message)
      else setDone(true)
    })
  }

  if (done) {
    return (
      <main className="min-h-dvh bg-[#f5f0e8] flex flex-col items-center p-4">
        <div className="w-full max-w-md bg-[#0f5c4c] text-white rounded-2xl p-5 mb-4">
          <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">{MONTH}</span>
          <h1 className="text-[18px] font-bold mt-2">التقييم الشهري لأولياء الأمور</h1>
        </div>
        <div className="w-full max-w-md bg-white rounded-2xl p-8 text-center shadow-sm">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-[18px] font-bold">شكراً لتقييمك!</h2>
          <p className="text-[13px] text-[#6f7974] mt-2">تم استلام تقييمك لشهر أكتوبر 2026 بنجاح.</p>
          <button type="button" onClick={() => { setDone(false); setAnswers({}); setStudentId(null) }}
            className="mt-6 w-full bg-[#0d9b8a] text-white py-3 rounded-full font-bold">تقييم آخر</button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-[#f5f0e8] flex flex-col items-center p-4 pb-16">
      <div className="w-full max-w-md bg-[#0f5c4c] text-white rounded-2xl p-5 mb-4">
        <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">{MONTH}</span>
        <h1 className="text-[18px] font-bold mt-3">التقييم الشهري لأولياء الأمور</h1>
        <p className="text-[12px] text-white/85 mt-2 leading-relaxed">سعداء بشراكتنا مع حضرتك. عند وجود أي مشكلة لا تتردد في إخبارنا.</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-sm space-y-3 mb-4">
        <h2 className="font-bold text-[15px] border-b pb-2">بيانات الطالب</h2>
        <div className="flex gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="اسم الطالب أو رقم المجموعة..."
            className="flex-1 border rounded-xl px-3 py-2.5 text-[14px]" />
          <button type="button" onClick={search} className="bg-[#0f5c4c] text-white px-4 rounded-xl text-[13px] font-bold">بحث</button>
        </div>
        {results.length > 0 && (
          <div className="border rounded-xl divide-y max-h-40 overflow-auto">
            {results.map((s) => (
              <button key={s.id} type="button" onClick={() => pick(s)} className="w-full text-right px-3 py-2 text-[13px]">{s.code} — {s.name}</button>
            ))}
          </div>
        )}
        {studentName && <p className="text-[13px] text-[#0f5c4c] font-semibold">المختار: {studentName}</p>}
        <input value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="اسم ولي الأمر (اختياري)" className="w-full border rounded-xl px-3 py-2.5 text-[14px]" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم التواصل" dir="ltr" className="w-full border rounded-xl px-3 py-2.5 text-[14px]" />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-sm space-y-5">
        <h2 className="font-bold text-[15px]">⭐ أولاً: تقييم المعلم</h2>
        {Q_TEACHER.map((q) => (
          <div key={q.id}>
            <p className="text-[13px] font-medium mb-2">{q.label}</p>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => (
                <button key={opt} type="button" onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                  className={`px-3 py-1.5 rounded-full text-[12px] border ${answers[q.id] === opt ? 'bg-[#0f5c4c] text-white border-[#0f5c4c]' : 'bg-white border-[#d0d7d3]'}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
        {msg && <p className="text-[13px] text-[#ba1a1a]">{msg}</p>}
        <button type="button" onClick={submit} disabled={isPending}
          className="w-full bg-[#0d9b8a] text-white py-3.5 rounded-full font-bold disabled:opacity-50">
          {isPending ? 'جاري الإرسال...' : 'إرسال التقييم'}
        </button>
      </div>
    </main>
  )
}
