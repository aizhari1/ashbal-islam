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
  const [selected, setSelected] = useState<Student | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [loadErr, setLoadErr] = useState('')
  const [preview, setPreview] = useState('')
  const [serverNum, setServerNum] = useState<number | null>(null)
  const previewFor = useRef<string | null>(null)
  const [lastReport, setLastReport] = useState<{ title: string; text: string } | null>(null)

  const [hifzFrom, setHifzFrom] = useState('')
  const [hifzTo, setHifzTo] = useState('')
  const [murajaFrom, setMurajaFrom] = useState('')
  const [murajaTo, setMurajaTo] = useState('')
  const [tajweed, setTajweed] = useState('')
  const [tarbiya, setTarbiya] = useState('')
  const [sharii, setSharii] = useState('')
  const [attend, setAttend] = useState('تم الحضور')
  const [duration, setDuration] = useState('30')
  const [rating, setRating] = useState('5')
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [teacherName, setTeacherName] = useState('')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [scoreNew, setScoreNew] = useState('10')
  const [scoreRecent, setScoreRecent] = useState('10')
  const [scoreFar, setScoreFar] = useState('10')
  const [newMem, setNewMem] = useState('')
  const [recentPast, setRecentPast] = useState('')
  const [farPast, setFarPast] = useState('')
  const [arabicLang, setArabicLang] = useState('')

  async function loadRoom() {
    setLoadErr('')
    setStudents([])
    try {
      let tid: string | null = null
      let tname = ''

      try {
        const ensured = await ensureMyTeacher()
        if (ensured?.teacher?.id) {
          tid = ensured.teacher.id
          tname = ensured.teacher.name || ''
        } else if (ensured?.error) {
          console.warn('ensureMyTeacher:', ensured.error)
        }
      } catch (e: any) {
        console.warn('ensureMyTeacher network:', e?.message)
      }

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoadErr('انتهت الجلسة — سجّل دخول مرة تانية')
        return
      }

      if (!tid) {
        const { data: trow } = await supabase
          .from('teachers')
          .select('id, name')
          .eq('profile_id', user.id)
          .maybeSingle()
        if (trow?.id) {
          tid = trow.id
          tname = trow.name || ''
        }
      }

      if (!tid) {
        setLoadErr('لا يوجد ملف معلم مرتبط بحسابك — كلّم الإدارة لربط الحساب')
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
        setLoadErr(
          error.message === 'Failed to fetch'
            ? 'مشكلة شبكة — تأكد من الإنترنت وحاول تاني'
            : error.message
        )
        return
      }
      setStudents((data as Student[]) || [])
      if (!data?.length) {
        setLoadErr('مفيش طلاب نشطين مربوطين بيك — من الإشراف: تعديل طالب → اختَر هذا المعلم')
      }
    } catch (e: any) {
      const m = String(e?.message || '')
      if (m.includes('Failed to fetch') || m.includes('NetworkError') || m.includes('fetch')) {
        setLoadErr('مشكلة شبكة أو السيرفر مش جاهز — انتظر دقيقة واضغط إعادة المحاولة')
      } else {
        setLoadErr(m || 'فشل تحميل غرفة التسميع')
      }
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
    // رقم الحلقة الحقيقي من السيرفر (نسخة الشاشة ممكن تكون قديمة)
    setServerNum(null)
    previewFor.current = s.id
    getSessionPreview(s.id).then((r: any) => {
      // ردّ متأخر لطالب قديم (المعلم بدّل الطالب) يتجاهل
      if (previewFor.current === s.id && typeof r?.sessionNum === 'number') setServerNum(r.sessionNum)
    })
  }

  const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

  function buildPreview() {
    if (!selected) return ''
    const now = new Date()
    const present = attend === 'تم الحضور' || attend === 'متأخر'
    const quota = packageSize(selected)
    let sessionNum = selected.last_session_num || 0
    if (present && serverNum != null) {
      sessionNum = serverNum
    } else if (present) {
      sessionNum = nextPackageSessionNum(sessionNum, quota).next
    } else if (sessionNum < 1) {
      sessionNum = 1
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
    navigator.clipboard?.writeText(t)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  function waText(t: string, phone: string | null) {
    const p = normalizePhone(phone)
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
                {s.code} · حصة {displaySessionInPackage(s.last_session_num ?? 0, packageSize(s))}
                {packageSize(s) ? ` / ${packageSize(s)}` : ''}
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
        {students.length === 0 && !loadErr && (
          <p className="text-center text-[13px] py-10" style={{ color: '#6f7974' }}>
            لا طلاب نشطين مرتبطين بحسابك
          </p>
        )}
      </main>

      {showForm && selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,.45)' }}>
          <div className="w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-4">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-[15px]" style={{ color: '#00513c' }}>
                حصة — {selected.name}
              </h2>
              <button type="button" onClick={() => setShowForm(false)} className="material-symbols-outlined">
                close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-[12px] font-bold block">الحفظ من</label>
                <input className="input mb-2" value={hifzFrom} onChange={(e) => setHifzFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-[12px] font-bold block">الحفظ إلى</label>
                <input className="input mb-2" value={hifzTo} onChange={(e) => setHifzTo(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-[12px] font-bold block">المراجعة من</label>
                <input className="input mb-2" value={murajaFrom} onChange={(e) => setMurajaFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-[12px] font-bold block">المراجعة إلى</label>
                <input className="input mb-2" value={murajaTo} onChange={(e) => setMurajaTo(e.target.value)} />
              </div>
            </div>

            <label className="text-[12px] font-bold block">التجويد</label>
            <input className="input mb-2" value={tajweed} onChange={(e) => setTajweed(e.target.value)} />

            {attend !== 'لم يحضر' && (
              <>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {([
                    ['درجة الحفظ الجديد', scoreNew, setScoreNew],
                    ['درجة الماضي القريب', scoreRecent, setScoreRecent],
                    ['درجة الماضي البعيد', scoreFar, setScoreFar],
                  ] as const).map(([l, v, set]) => (
                    <div key={l}>
                      <label className="text-[11px] font-bold block">{l} (من 10)</label>
                      <input className="input" type="number" min={0} max={10} value={v} onChange={(e) => set(e.target.value)} />
                    </div>
                  ))}
                </div>
                <label className="text-[12px] font-bold block">الحفظ الجديد (الواجب)</label>
                <input className="input mb-2" value={newMem} onChange={(e) => setNewMem(e.target.value)} placeholder="سورة الدخان من 18 إلى 39" />
                <label className="text-[12px] font-bold block">الماضي القريب</label>
                <input className="input mb-2" value={recentPast} onChange={(e) => setRecentPast(e.target.value)} />
                <label className="text-[12px] font-bold block">الماضي البعيد</label>
                <input className="input mb-2" value={farPast} onChange={(e) => setFarPast(e.target.value)} />
                <label className="text-[12px] font-bold block">لغة عربية</label>
                <input className="input mb-2" value={arabicLang} onChange={(e) => setArabicLang(e.target.value)} />
              </>
            )}

            <label className="text-[12px] font-bold block">البيان التربوي</label>
            <input className="input mb-2" value={tarbiya} onChange={(e) => setTarbiya(e.target.value)} />

            <label className="text-[12px] font-bold block">البيان الشرعي</label>
            <input className="input mb-2" value={sharii} onChange={(e) => setSharii(e.target.value)} />

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-[12px] font-bold block">الحضور</label>
                <select className="input" value={attend} onChange={(e) => setAttend(e.target.value)}>
                  <option value="تم الحضور">تم الحضور</option>
                  <option value="متأخر">متأخر</option>
                  <option value="لم يحضر">لم يحضر</option>
                </select>
              </div>
              <div>
                <label className="text-[12px] font-bold block">المدة (د)</label>
                <input className="input" type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            </div>

            <label className="text-[12px] font-bold block">التقييم</label>
            <select className="input mb-2" value={rating} onChange={(e) => setRating(e.target.value)}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <label className="text-[12px] font-bold block">معاينة</label>
            <textarea className="input min-h-[140px] text-[12px] leading-relaxed mb-2" readOnly value={preview} dir="rtl" />
            {saved && (
              <p className="text-[12px] mb-2" style={{ color: '#6f7974' }}>
                اتحفظت الحصة. لو عايز تعدّل، ادخل سجل حصصي ← تعديل التقرير.
              </p>
            )}

            <div className="flex flex-col gap-2">
              {!saved && (
                <>
                  <button type="button" className="btn-primary py-2.5" onClick={() => buildPreview()}>
                    تحديث المعاينة
                  </button>
                  <button type="button" className="btn-primary py-2.5" disabled={isPending} onClick={save}>
                    {isPending ? 'جاري الحفظ...' : 'حفظ الحضور'}
                  </button>
                </>
              )}
              <button type="button" className="btn-primary py-2.5" onClick={() => copyText(saved ? preview : buildPreview())}>
                {copied ? '✓ تم النسخ' : 'نسخ التقرير'}
              </button>
              <button
                type="button"
                className="btn-primary py-2.5"
                style={{ background: '#25D366' }}
                onClick={() => waText(saved ? preview : buildPreview(), selected.phone)}
              >
                إرسال واتساب
              </button>
              <button type="button" className="py-2.5 text-[13px] font-bold" style={{ color: '#6f7974' }} onClick={() => setShowForm(false)}>
                إغلاق
              </button>
            </div>
            {msg && (
              <p className="mt-3 text-center text-[13px] font-bold" style={{ color: msg.startsWith('خطأ') ? '#ba1a1a' : '#176b52' }}>
                {msg}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
