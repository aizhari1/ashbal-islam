'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { recordAttendance, getSessionPreview } from '@/app/actions/attendance'
import { ensureMyTeacher } from '@/app/actions/ensure-teacher'
import Link from 'next/link'
import { normalizePhone } from '@/lib/whatsapp'
import { displaySessionInPackage, nextPackageSessionNum, packageSize } from '@/lib/dues'

type Student = {
  id: string
  code: string
  name: string
  phone: string | null
  last_session_num: number | null
  monthly_sessions: number | null
  subscription_type?: string | null
  session_duration: number | null
}

export default function TeacherSessionPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [teacherId, setTeacherId] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [selected, setSelected] = useState<Student | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [attend, setAttend] = useState('تم الحضور')
  const [duration, setDuration] = useState('30')
  const [hifzFrom, setHifzFrom] = useState('')
  const [hifzTo, setHifzTo] = useState('')
  const [murajaFrom, setMurajaFrom] = useState('')
  const [murajaTo, setMurajaTo] = useState('')
  const [tajweed, setTajweed] = useState('')
  const [tarbiya, setTarbiya] = useState('')
  const [sharii, setSharii] = useState('')
  const [rating, setRating] = useState('5')
  const [scoreNew, setScoreNew] = useState('10')
  const [scoreRecent, setScoreRecent] = useState('10')
  const [scoreFar, setScoreFar] = useState('10')
  const [newMem, setNewMem] = useState('')
  const [recentPast, setRecentPast] = useState('')
  const [farPast, setFarPast] = useState('')
  const [arabicLang, setArabicLang] = useState('')
  const [preview, setPreview] = useState('')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState('')
  const [loadErr, setLoadErr] = useState('')
  const [serverNum, setServerNum] = useState<number | null>(null)
  const [todayExisting, setTodayExisting] = useState(false)
  const previewFor = useRef<string | null>(null)
  const [pending, startTransition] = useTransition()

  async function loadRoom() {
    setLoadErr('')
    try {
      const supabase = createClient()
      const ensured = await ensureMyTeacher()
      if ((ensured as any)?.error) {
        setLoadErr((ensured as any).error)
        return
      }
      // ensureMyTeacher بترجّع { teacher: { id, name, code } } — الصفحة كانت بتدوّر على id بره الكائن
      const ensT = (ensured as any)?.teacher
      const tid = ensT?.id || (ensured as any)?.teacherId || (ensured as any)?.id
      const tname = ensT?.name || (ensured as any)?.name || ''
      if (!tid) {
        setLoadErr('لا يوجد ملف معلم مرتبط بحسابك')
        return
      }
      setTeacherId(tid)
      setTeacherName(tname)
      const { data, error } = await supabase
        .from('students')
        .select('id, code, name, phone, last_session_num, monthly_sessions, session_duration, subscription_type')
        .eq('status', 'نشط')
        .eq('teacher_id', tid)
        .order('name')
      if (error) {
        setLoadErr(error.message)
        return
      }
      setStudents((data as Student[]) || [])
    } catch (e: any) {
      setLoadErr(e?.message || 'فشل تحميل الغرفة')
    }
  }

  useEffect(() => {
    loadRoom()
  }, [])

  function openReport(s: Student, status: string) {
    setSelected(s)
    setAttend(status === 'لم يحضر' ? 'لم يحضر' : 'تم الحضور')
    setDuration(String(s.session_duration || 30))
    setHifzFrom('')
    setHifzTo('')
    setMurajaFrom('')
    setMurajaTo('')
    setTajweed('')
    setTarbiya('')
    setSharii('')
    setRating('5')
    setSaved(false)
    setCopied(false)
    setScoreNew('10')
    setScoreRecent('10')
    setScoreFar('10')
    setNewMem('')
    setRecentPast('')
    setFarPast('')
    setArabicLang('')
    setPreview('')
    setMsg('')
    setShowForm(true)
    setServerNum(null)
    setTodayExisting(false)
    previewFor.current = s.id
    getSessionPreview(s.id).then((r: any) => {
      if (previewFor.current === s.id && typeof r?.sessionNum === 'number') {
        setServerNum(r.sessionNum)
        setTodayExisting(!!r.alreadyToday)
      }
    })
  }

  const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

  function buildPreview(numOverride?: number) {
    if (!selected) return ''
    const now = new Date()
    const present = attend === 'تم الحضور' || attend === 'متأخر'
    const quota = packageSize(selected)
    const localNext = nextPackageSessionNum(selected.last_session_num || 0, quota).next
    let sessionNum = selected.last_session_num || 0
    if (present && typeof numOverride === 'number') {
      sessionNum = numOverride
    } else if (present && serverNum != null) {
      sessionNum = serverNum
    } else if (present) {
      sessionNum = localNext
    } else if (sessionNum < 1) {
      sessionNum = 1
    }
    // لا تسمح برقم أقل من المتوقع من عدّاد الطالب (حالات تقرير نهارده برقم غلط)
    if (present && sessionNum < localNext) {
      if (!todayExisting || sessionNum !== (selected.last_session_num || 0)) {
        sessionNum = localNext
      }
    }
    const sc = (v: string) => (v === '' ? '—' : `${v} / 10`)
    const pad = (n: number) => String(n).padStart(2, '0')
    const line = 'ـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ'
    const text = [
      '*💦أشبال الإسلام💦*',
      '',
      '🌺 المعلم : ' + (teacherName || ''),
      '',
      '🌺 الطالب : ' + selected.name,
      '',
      '*التقييم*',
      '✅️ درجة الحفظ الجديد: ' + sc(scoreNew),
      '',
      '✅️ درجة الماضي القريب: ' + sc(scoreRecent),
      '',
      '✅️ درجة الماضي البعيد: ' + sc(scoreFar),
      '',
      '📚 التربوي: ' + (tarbiya.trim() || '—'),
      '',
      '📖 الشرعي: ' + (sharii.trim() || '—'),
      line,
      '*الواجب القادم*',
      '🌱 الحفظ الجديد: ' + (newMem.trim() || '—'),
      '',
      '🌱 الماضي القريب: ' + (recentPast.trim() || '—'),
      '',
      '🌱 الماضي البعيد: ' + (farPast.trim() || '—'),
      '',
      '',
      '',
      '',
      '',
      line,
      '🗓 حلقة يوم: ' + DAYS[now.getDay()],
      '',
      '📝 الموافق: ' + `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`,
      '',
      '#️⃣ رقم الحلقة: ' + sessionNum,
      '',
      '📋 الحضور: ' + attend,
      '',
      '⏱️ مدة الحلقة: ' + (duration || '60'),
      '',
      'وتزودوا فإن خير الزاد التقوى 🌹🌹🌹',
    ].join('\n')
    setPreview(text)
    return text
  }

  async function refreshPreview() {
    if (!selected) return
    const id = selected.id
    try {
      const r: any = await getSessionPreview(id)
      if (previewFor.current === id && typeof r?.sessionNum === 'number') {
        setServerNum(r.sessionNum)
        setTodayExisting(!!r.alreadyToday)
        buildPreview(r.sessionNum)
        return
      }
    } catch {
      /* نكمل بآخر رقم معروف */
    }
    buildPreview()
  }

  function save() {
    if (!selected) return
    if (attend !== 'لم يحضر' && !newMem.trim()) {
      setMsg('اكتب الحفظ الجديد (الواجب القادم).')
      return
    }
    const text = buildPreview()
    const statusMap: Record<string, string> = {
      'تم الحضور': 'حاضر',
      'لم يحضر': 'غائب',
      متأخر: 'متأخر',
    }
    startTransition(async () => {
      const res = await recordAttendance({
        student_id: selected.id,
        status: statusMap[attend] || 'حاضر',
        teacher_id: teacherId,
        session_duration: Number(duration) || null,
        score_new: attend === 'لم يحضر' ? null : Number(scoreNew),
        score_recent: attend === 'لم يحضر' ? null : Number(scoreRecent),
        score_far: attend === 'لم يحضر' ? null : Number(scoreFar),
        new_memorization: newMem || null,
        recent_past: recentPast || null,
        far_past: farPast || null,
        arabic_lang: arabicLang || null,
        tarbiya_note: tarbiya || null,
        sharii_note: sharii || null,
        hifz_from: hifzFrom || null,
        hifz_to: hifzTo || null,
        muraja_from: murajaFrom || null,
        muraja_to: murajaTo || null,
        tajweed_notes: tajweed || null,
        rating: Number(rating) || null,
        notes: text,
        report_text: text,
      } as any)
      if ((res as any)?.error) {
        setMsg('خطأ: ' + (res as any).error)
        return
      }
      const nextNum = (res as any)?.next_session_num
      let finalText = (res as any)?.data?.notes || text
      if (typeof nextNum === 'number' && finalText) {
        finalText = finalText.replace(/رقم الحلقة:\s*\d+/g, `رقم الحلقة: ${nextNum}`)
      }
      setPreview(finalText)
      setSaved(true)
      setMsg('✓ ' + ((res as any)?.message || 'تم الحفظ'))
      if (typeof nextNum === 'number') {
        setServerNum(nextNum)
        setStudents((prev) =>
          prev.map((s) => (s.id === selected.id ? { ...s, last_session_num: nextNum } : s))
        )
        setSelected((s) => (s ? { ...s, last_session_num: nextNum } : s))
      }
    })
  }

  function copyText(t: string) {
    navigator.clipboard?.writeText(t).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function waText(t: string, phone: string | null) {
    const p = normalizePhone(phone || '')
    if (!p) {
      copyText(t)
      setMsg('رقم ولي الأمر غير موجود أو غير صالح — تم نسخ التقرير')
      return
    }
    window.open(`https://wa.me/${p}?text=${encodeURIComponent(t)}`, '_blank')
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/teacher" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            غرفة التسميع
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            تسجيل الحضور — حصة واحدة في اليوم
          </p>
        </div>
      </header>

      <main className="px-3 space-y-2">
        {students.map((s) => (
          <div key={s.id} className="card p-3.5">
            <div className="mb-2">
              <p className="font-bold text-[14px]">{s.name}</p>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>
                {s.code} · آخر حصة{' '}
                {displaySessionInPackage(s.last_session_num ?? 0, packageSize(s))}
                {packageSize(s) ? ` / ${packageSize(s)}` : ''}
                {' · القادمة '}
                {nextPackageSessionNum(s.last_session_num ?? 0, packageSize(s)).next}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => openReport(s, 'تم الحضور')}
                className="px-3 py-1.5 rounded-full text-[12px] font-bold text-white"
                style={{ background: '#176b52' }}
              >
                ✓ حضور
              </button>
              <button
                type="button"
                onClick={() => openReport(s, 'لم يحضر')}
                className="px-3 py-1.5 rounded-full text-[12px] font-bold"
                style={{ background: '#ffdad6', color: '#93000a' }}
              >
                ✗ غياب
              </button>
            </div>
          </div>
        ))}
        {loadErr && (
          <div className="text-center py-4 px-3 rounded-xl" style={{ background: '#fff8e8' }}>
            <p className="text-[13px] font-bold mb-2" style={{ color: '#8a5a00' }}>
              {loadErr}
            </p>
            <button
              type="button"
              onClick={() => loadRoom()}
              className="px-4 py-2 rounded-xl text-[13px] font-bold text-white"
              style={{ background: '#176b52' }}
            >
              إعادة المحاولة
            </button>
          </div>
        )}
        {!loadErr && students.length === 0 && (
          <p className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>
            لا طلاب نشطين مرتبطين بحسابك
          </p>
        )}
      </main>

      {showForm && selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-[15px]">
                حصة — {selected.name}
                {serverNum != null ? ` · رقم ${serverNum}` : ''}
              </h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-[13px]" style={{ color: '#6f7974' }}>
                إغلاق
              </button>
            </div>

            {todayExisting && (
              <p className="text-[12px] font-bold px-3 py-2 rounded-xl" style={{ background: '#fff4d6', color: '#7a5600' }}>
                الطالب ده عنده تقرير النهارده بالفعل (حصة رقم {serverNum}) — الحفظ هيعدّل تقرير النهارده ومش هيضيف حصة جديدة.
              </p>
            )}

            <div className="flex gap-2">
              {(['تم الحضور', 'متأخر', 'لم يحضر'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setAttend(st)}
                  className="flex-1 py-2 rounded-xl text-[12px] font-bold"
                  style={{
                    background: attend === st ? '#176b52' : '#eefdf6',
                    color: attend === st ? '#fff' : '#176b52',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <label className="block text-[12px] font-bold">مدة الحلقة (دقيقة)</label>
            <input className="input" type="number" min={5} max={300} value={duration} onChange={(e) => setDuration(e.target.value)} />

            {attend !== 'لم يحضر' && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-bold">حفظ جديد /10</label>
                    <input className="input" type="number" min={0} max={10} value={scoreNew} onChange={(e) => setScoreNew(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold">قريب /10</label>
                    <input className="input" type="number" min={0} max={10} value={scoreRecent} onChange={(e) => setScoreRecent(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold">بعيد /10</label>
                    <input className="input" type="number" min={0} max={10} value={scoreFar} onChange={(e) => setScoreFar(e.target.value)} />
                  </div>
                </div>
                <label className="block text-[12px] font-bold">التربوي</label>
                <input className="input" value={tarbiya} onChange={(e) => setTarbiya(e.target.value)} />
                <label className="block text-[12px] font-bold">الشرعي</label>
                <input className="input" value={sharii} onChange={(e) => setSharii(e.target.value)} />
                <label className="block text-[12px] font-bold">الحفظ الجديد (واجب) *</label>
                <input className="input" value={newMem} onChange={(e) => setNewMem(e.target.value)} placeholder="مطلوب" />
                <label className="block text-[12px] font-bold">الماضي القريب</label>
                <input className="input" value={recentPast} onChange={(e) => setRecentPast(e.target.value)} />
                <label className="block text-[12px] font-bold">الماضي البعيد</label>
                <input className="input" value={farPast} onChange={(e) => setFarPast(e.target.value)} />
              </>
            )}

            {msg && (
              <p
                className="text-[13px] font-bold px-3 py-2 rounded-xl"
                style={{
                  background: msg.startsWith('خطأ') ? '#ffdad6' : '#e8f8ef',
                  color: msg.startsWith('خطأ') ? '#93000a' : '#176b52',
                }}
              >
                {msg}
              </p>
            )}

            {preview && (
              <pre className="text-[11px] whitespace-pre-wrap p-3 rounded-xl" style={{ background: '#f5f5f5' }}>
                {preview}
              </pre>
            )}

            <div className="grid grid-cols-2 gap-2">
              {!saved ? (
                <>
                  <button type="button" className="btn-primary py-2.5" onClick={() => refreshPreview()} disabled={pending}>
                    معاينة
                  </button>
                  <button type="button" className="btn-primary py-2.5" onClick={() => save()} disabled={pending}>
                    {pending ? '...' : 'حفظ'}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn-primary py-2.5" onClick={() => copyText(saved ? preview : buildPreview())}>
                    {copied ? '✓ تم النسخ' : 'نسخ'}
                  </button>
                  <button
                    type="button"
                    className="btn-primary py-2.5"
                    onClick={() => waText(saved ? preview : buildPreview(), selected.phone)}
                  >
                    واتساب
                  </button>
                </>
              )}
            </div>
            {saved && (
              <p className="text-[11px] text-center" style={{ color: '#6f7974' }}>
                اتحفظت الحصة. لو عايز تعدّل، ادخل سجل حصصي ← تعديل التقرير.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
