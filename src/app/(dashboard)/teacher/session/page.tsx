'use client'

import { useEffect, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { recordAttendance } from '@/app/actions/attendance'
import Link from 'next/link'

type Student = {
  id: string
  code: string
  name: string
  status: string
  last_session_num: number | null
  subscription_type: string | null
  monthly_sessions: number | null
  phone: string | null
}

export default function TeacherSessionPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [teacherName, setTeacherName] = useState('')
  const [selected, setSelected] = useState<Student | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [lastReport, setLastReport] = useState<{ title: string; text: string } | null>(null)
  const [scoreNew, setScoreNew] = useState('8')
  const [scoreRecent, setScoreRecent] = useState('8')
  const [scoreFar, setScoreFar] = useState('8')
  const [newMem, setNewMem] = useState('')
  const [recent, setRecent] = useState('')
  const [far, setFar] = useState('')
  const [tarbiya, setTarbiya] = useState('')
  const [sharii, setSharii] = useState('')
  const [attend, setAttend] = useState('تم الحضور')
  const [duration, setDuration] = useState('30')
  const [preview, setPreview] = useState('')
  const [msg, setMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const supabase = createClient()
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      setTeacherName(profile?.full_name || '')
      const { data: teacher } = await supabase.from('teachers').select('id, name').eq('profile_id', user.id).maybeSingle()
      if (teacher) {
        setTeacherId(teacher.id)
        if (teacher.name) setTeacherName(teacher.name)
        const { data } = await supabase
          .from('students')
          .select('id, code, name, status, last_session_num, subscription_type, monthly_sessions, phone')
          .eq('teacher_id', teacher.id)
          .eq('status', 'نشط')
          .order('name')
        setStudents(data ?? [])
      }
    })()
  }, [])

  function openReport(s: Student, status: string) {
    setSelected(s)
    setAttend(status)
    setNewMem('')
    setRecent('')
    setFar('')
    setTarbiya('')
    setSharii('')
    setScoreNew('8')
    setScoreRecent('8')
    setScoreFar('8')
    setMsg('')
    setShowForm(true)
    setTimeout(() => buildPreview(s, status), 50)
  }

  function buildPreview(s?: Student | null, statusOverride?: string) {
    const st = s || selected
    if (!st) return ''
    const att = statusOverride || attend
    let sessionNum = Number(st.last_session_num) || 0
    if (att === 'تم الحضور' || att === 'متأخر') {
      sessionNum += 1
      const q = Number(st.monthly_sessions) || parseInt(String(st.subscription_type || '').replace(/\D/g, ''), 10) || 0
      if (q > 0 && sessionNum > q) sessionNum = 1
    }
    if (sessionNum < 1) sessionNum = 1
    const dateStr = new Date().toLocaleDateString('ar-EG')
    const text = [
      '*💦أشبال الإسلام💦*', '',
      '🌺 المعلم : ' + teacherName, '',
      '🌺 الطالب : ' + st.name, '',
      '*التقييم*',
      '✅️ درجة الحفظ الجديد: ' + (scoreNew || '—') + ' / 10', '',
      '✅️ درجة الماضي القريب: ' + (scoreRecent || '—') + ' / 10', '',
      '✅️ درجة الماضي البعيد: ' + (scoreFar || '—') + ' / 10', '',
      '📚 التربوي: ' + (tarbiya || '—'), '',
      '📖 الشرعي: ' + (sharii || '—'),
      'ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ',
      '*الواجب القادم*',
      '🌱 الحفظ الجديد: ' + (newMem || '—'), '',
      '🌱 الماضي القريب: ' + (recent || '—'), '',
      '🌱 الماضي البعيد: ' + (far || '—'), '',
      'ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ',
      '📅 التاريخ: ' + dateStr,
      '⏱ المدة: ' + duration + ' دقيقة',
      '📌 الحضور: ' + att,
      '🔢 رقم الحصة: ' + sessionNum, '',
      'جزاكم الله خيراً ✨',
      'أكاديمية أشبال الإسلام',
    ].join('\n')
    setPreview(text)
    return text
  }

  function save() {
    if (!selected) return
    if ((attend === 'تم الحضور' || attend === 'متأخر') && !newMem.trim()) {
      setMsg('اكتب الحفظ الجديد')
      return
    }
    const text = buildPreview() || preview
    startTransition(async () => {
      const statusMap: Record<string, string> = {
        'تم الحضور': 'حاضر',
        'لم يحضر': 'غائب',
        متأخر: 'متأخر',
      }
      const scores = [Number(scoreNew), Number(scoreRecent), Number(scoreFar)].filter((n) => n > 0)
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 5

      const r = await recordAttendance({
        student_id: selected.id,
        teacher_id: teacherId,
        status: statusMap[attend] || attend,
        hifz_from: newMem,
        muraja_from: recent,
        muraja_to: far,
        tajweed_notes: sharii,
        rating: Math.round(avg),
        report_text: text,
        notes: tarbiya,
        score_new: Number(scoreNew) || null,
        score_recent: Number(scoreRecent) || null,
        score_far: Number(scoreFar) || null,
      })
      if ((r as any).error) {
        setMsg((r as any).error)
        return
      }
      setMsg((r as any).message || 'تم الحفظ')
      setStudents((prev) =>
        prev.map((s) =>
          s.id === selected.id && (attend === 'تم الحضور' || attend === 'متأخر')
            ? { ...s, last_session_num: (Number(s.last_session_num) || 0) + 1 }
            : s
        )
      )
      setTimeout(() => {
        setShowForm(false)
        setSelected(null)
      }, 900)
    })
  }

  async function showLast(s: Student) {
    const supabase = createClient()
    const { data } = await supabase
      .from('attendance')
      .select('notes, session_date')
      .eq('student_id', s.id)
      .order('session_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data?.notes) {
      setLastReport({ title: s.name, text: 'لا يوجد تقرير سابق' })
      return
    }
    setLastReport({ title: `آخر تقرير — ${s.name} (${data.session_date})`, text: data.notes })
  }

  function copyText(t: string) {
    navigator.clipboard?.writeText(t)
  }

  function waText(t: string, phone?: string | null) {
    let p = String(phone || '').replace(/\D/g, '')
    if (p.startsWith('0')) p = '20' + p.slice(1)
    const url = p
      ? `https://wa.me/${p}?text=${encodeURIComponent(t)}`
      : `https://wa.me/?text=${encodeURIComponent(t)}`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-10" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/teacher" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>تقرير الحلقة</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>حضور + تقرير — حصة واحدة في اليوم</p>
        </div>
      </header>

      <main className="px-3 space-y-2">
        {students.map((s) => (
          <div key={s.id} className="card p-3.5">
            <div className="mb-2">
              <p className="font-bold text-[14px]">{s.name}</p>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>
                {s.code} · حصة {s.last_session_num ?? 0}
                {s.monthly_sessions ? ` / ${s.monthly_sessions}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => openReport(s, 'تم الحضور')} className="px-3 py-1.5 rounded-full text-[12px] font-bold text-white" style={{ background: '#176b52' }}>
                ✓ حضور + تقرير
              </button>
              <button type="button" onClick={() => openReport(s, 'لم يحضر')} className="px-3 py-1.5 rounded-full text-[12px] font-bold text-white" style={{ background: '#ba1a1a' }}>
                ✗ غياب + تقرير
              </button>
              <button type="button" onClick={() => showLast(s)} className="px-3 py-1.5 rounded-full text-[12px] font-bold" style={{ background: '#efe9d8', color: '#3a3a2a' }}>
                📄 آخر تقرير
              </button>
            </div>
          </div>
        ))}
        {students.length === 0 && (
          <p className="text-center text-[13px] py-10" style={{ color: '#6f7974' }}>لا طلاب نشطين مرتبطين بحسابك</p>
        )}
      </main>

      {showForm && selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,.45)' }}>
          <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-[15px]" style={{ color: '#00513c' }}>تقرير الحلقة — {selected.name}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="material-symbols-outlined">close</button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div>
                <label className="text-[11px] font-bold">حفظ جديد /10</label>
                <input className="input text-center" type="number" min={0} max={10} value={scoreNew} onChange={(e) => setScoreNew(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-bold">ماضي قريب /10</label>
                <input className="input text-center" type="number" min={0} max={10} value={scoreRecent} onChange={(e) => setScoreRecent(e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-bold">ماضي بعيد /10</label>
                <input className="input text-center" type="number" min={0} max={10} value={scoreFar} onChange={(e) => setScoreFar(e.target.value)} />
              </div>
            </div>

            <label className="text-[12px] font-bold block">الحفظ الجديد</label>
            <input className="input mb-2" value={newMem} onChange={(e) => setNewMem(e.target.value)} placeholder="سورة الدخان من 18 إلى 39" />

            <label className="text-[12px] font-bold block">الماضي القريب</label>
            <input className="input mb-2" value={recent} onChange={(e) => setRecent(e.target.value)} />

            <label className="text-[12px] font-bold block">الماضي البعيد</label>
            <input className="input mb-2" value={far} onChange={(e) => setFar(e.target.value)} />

            <label className="text-[12px] font-bold block">البيان التربوي</label>
            <input className="input mb-2" value={tarbiya} onChange={(e) => setTarbiya(e.target.value)} />

            <label className="text-[12px] font-bold block">البيان الشرعي</label>
            <input className="input mb-2" value={sharii} onChange={(e) => setSharii(e.target.value)} />

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-[12px] font-bold block">الحضور</label>
                <select className="input" value={attend} onChange={(e) => setAttend(e.target.value)}>
                  <option value="تم الحضور">تم الحضور</option>
                  <option value="لم يحضر">لم يحضر</option>
                  <option value="متأخر">متأخر</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] font-bold block">المدة (د)</label>
                <input className="input" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            </div>

            <label className="text-[12px] font-bold block">معاينة التقرير</label>
            <textarea className="input min-h-[160px] text-[12px] leading-relaxed mb-2" readOnly value={preview} dir="rtl" />

            <div className="flex flex-col gap-2">
              <button type="button" className="btn-primary py-2.5" onClick={() => buildPreview()}>تحديث المعاينة</button>
              <button type="button" className="btn-primary py-2.5" disabled={isPending} onClick={save}>
                {isPending ? 'جاري الحفظ...' : 'حفظ التقرير والحضور'}
              </button>
              <button type="button" className="py-2.5 rounded-lg font-bold text-[13px]" style={{ background: '#c5a45d', color: '#fff' }} onClick={() => copyText(preview || buildPreview())}>
                نسخ التقرير
              </button>
              <button type="button" className="py-2.5 rounded-lg font-bold text-[13px] text-white" style={{ background: '#25D366' }} onClick={() => waText(preview || buildPreview(), selected.phone)}>
                إرسال واتساب
              </button>
              <button type="button" className="py-2 text-[13px]" onClick={() => setShowForm(false)}>إلغاء</button>
            </div>
            {msg && <p className="text-[13px] font-bold mt-2" style={{ color: '#176b52' }}>{msg}</p>}
          </div>
        </div>
      )}

      {lastReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.45)' }}>
          <div className="card w-full max-w-md p-4">
            <h3 className="font-bold mb-2 text-[14px]">{lastReport.title}</h3>
            <textarea className="input min-h-[200px] text-[12px]" readOnly value={lastReport.text} />
            <div className="flex gap-2 mt-3">
              <button type="button" className="btn-primary flex-1 py-2" onClick={() => copyText(lastReport.text)}>نسخ</button>
              <button type="button" className="flex-1 py-2 rounded-lg font-bold" style={{ background: '#e8f7f0' }} onClick={() => setLastReport(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
