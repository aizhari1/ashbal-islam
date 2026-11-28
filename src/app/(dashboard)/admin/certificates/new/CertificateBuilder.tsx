'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { ScaledCertificate } from '@/components/certificate/CertificateView'
import ShareBar from '@/components/certificate/ShareBar'
import { createCertificate, getCertificateSuggestions } from '@/app/actions/certificates'
import { DEFAULT_SIGNER, DEFAULT_TITLE, TEMPLATES, defaultMessage, type CertificateData, type Gender, type TemplateKey } from '@/lib/certificates'

type Stu = { id: string; code: string; name: string; phone: string | null; teacher: string }
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' })
const input = 'w-full rounded-xl border px-3 py-2.5 text-[13px] bg-white'
const bd = { borderColor: '#cde8dc' }

export default function CertificateBuilder({ students, initialStudentId }: { students: Stu[]; initialStudentId?: string }) {
  const [q, setQ] = useState('')
  const [stu, setStu] = useState<Stu | null>(null)
  const [d, setD] = useState<CertificateData>({
    template: 'gold', gender: 'male', title: DEFAULT_TITLE, studentName: '', teacherName: '', memorized: '', progress: '',
    message: defaultMessage('male'), issueDate: today(), signer: DEFAULT_SIGNER,
  })
  const [created, setCreated] = useState<{ id: string; data: CertificateData; phone: string | null } | null>(null)
  const [msg, setMsg] = useState('')
  const [prefix, setPrefix] = useState<'أستاذ' | 'أستاذة' | ''>('أستاذ')
  const [pending, start] = useTransition()
  const msgIsDefault = useRef(true)
  const withPrefix = (n: string) => { const t = n.trim(); return !t || !prefix || /^(أستاذ|أستاذة|الأستاذ|الأستاذة|شيخ|الشيخ|ماما|مس)\b/.test(t) ? t : `${prefix} ${t}` }
  const shown: CertificateData = { ...d, teacherName: withPrefix(d.teacherName) }
  const set = <K extends keyof CertificateData>(k: K, v: CertificateData[K]) => setD((x) => ({ ...x, [k]: v }))

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return []
    return students.filter((s) => s.name.toLowerCase().includes(t) || s.code.toLowerCase().includes(t)).slice(0, 8)
  }, [q, students])

  function pickStudent(s: Stu) {
    setStu(s); setQ('')
    setD((x) => ({ ...x, studentName: s.name, teacherName: s.teacher }))
    start(async () => {
      const r: any = await getCertificateSuggestions(s.id)
      if (r?.ok) setD((x) => ({ ...x, teacherName: r.teacherName || x.teacherName, memorized: r.memorized || x.memorized, progress: r.progress || x.progress }))
    })
  }
  useEffect(() => {
    if (initialStudentId) { const s = students.find((x) => x.id === initialStudentId); if (s) pickStudent(s) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setGender(g: Gender) {
    setD((x) => ({ ...x, gender: g, message: msgIsDefault.current ? defaultMessage(g) : x.message }))
  }

  function submit() {
    setMsg('')
    if (!d.studentName.trim()) return setMsg('اختار الطالب أو اكتب اسمه')
    start(async () => {
      const r: any = await createCertificate({
        student_id: stu?.id || null, student_name: d.studentName, teacher_name: withPrefix(d.teacherName), gender: d.gender, template: d.template,
        title: d.title, memorized: d.memorized, progress: d.progress, message: d.message, issue_date: d.issueDate, signer: d.signer,
      })
      if (r?.error) return setMsg(r.error)
      setCreated({ id: r.id, data: { ...shown }, phone: stu?.phone || null })
    })
  }

  if (created) {
    return (
      <div className="px-4 space-y-4">
        <div className="rounded-2xl overflow-hidden shadow bg-white"><ScaledCertificate data={created.data} /></div>
        <p className="text-center text-[13px] font-bold" style={{ color: '#176b52' }}>✓ اتعملت الشهادة</p>
        <ShareBar data={created.data} certId={created.id} phone={created.phone} staff showPrint={false} />
        <div className="flex gap-2">
          <Link href={`/certificate/${created.id}`} target="_blank" className="flex-1 text-center rounded-xl py-2.5 text-[13px] font-bold" style={{ background: '#fff4d6', color: '#755b1b' }}>فتح للطباعة / PDF</Link>
          <button type="button" onClick={() => { setCreated(null); setStu(null); msgIsDefault.current = true; setD((x) => ({ ...x, studentName: '', teacherName: '', memorized: '', progress: '', message: defaultMessage(x.gender) })) }} className="flex-1 rounded-xl py-2.5 text-[13px] font-bold" style={{ background: '#e8f7f0', color: '#176b52' }}>شهادة جديدة</button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 space-y-4">
      <div className="rounded-2xl overflow-hidden shadow bg-white sticky top-2 z-10"><ScaledCertificate data={shown} /></div>

      <section className="bg-white rounded-2xl p-4 space-y-3 shadow-sm">
        <h2 className="text-[14px] font-bold">الطالب</h2>
        <input className={input} style={bd} placeholder="ابحث باسم الطالب أو كوده..." value={q} onChange={(e) => setQ(e.target.value)} />
        {matches.map((s) => (
          <button key={s.id} type="button" onClick={() => pickStudent(s)} className="w-full text-right rounded-xl px-3 py-2 text-[13px] bg-[#f4fbf7]">
            <b>{s.name}</b> <span style={{ color: '#6f7974' }}>· {s.code} · {s.teacher || 'بدون معلم'}</span>
          </button>
        ))}
        {stu && <p className="text-[12px]" style={{ color: '#176b52' }}>✓ {stu.name} — اتملّت بيانات الحفظ والتقدّم من تقاريره (تقدر تعدّلها)</p>}
        <div className="grid grid-cols-2 gap-2">
          {([['male', 'طالب'], ['female', 'طالبة']] as const).map(([g, l]) => (
            <button key={g} type="button" onClick={() => setGender(g)} className="rounded-xl py-2 text-[13px] font-bold" style={{ background: d.gender === g ? '#176b52' : '#f4fbf7', color: d.gender === g ? '#fff' : '#3f4944' }}>{l}</button>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl p-4 shadow-sm">
        <h2 className="text-[14px] font-bold mb-3">القالب ({TEMPLATES.length} أشكال)</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {TEMPLATES.map((t) => (
            <button key={t.key} type="button" onClick={() => { set('template', t.key as TemplateKey); if (t.gender) setGender(t.gender) }} className="text-right rounded-xl p-1.5" style={{ border: `2.5px solid ${d.template === t.key ? '#176b52' : '#e5efe8'}`, background: d.template === t.key ? '#e8f7f0' : '#fff' }}>
              <div className="rounded-lg overflow-hidden pointer-events-none"><ScaledCertificate data={{ ...d, template: t.key as TemplateKey, studentName: d.studentName || 'اسم الطالب' }} /></div>
              <p className="text-[12px] font-bold mt-1">{t.name}</p>
              <p className="text-[10px]" style={{ color: '#6f7974' }}>{t.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl p-4 space-y-3 shadow-sm">
        <h2 className="text-[14px] font-bold">محتوى الشهادة</h2>
        <label className="block text-[12px] font-bold">العنوان<input className={input} style={bd} value={d.title} onChange={(e) => set('title', e.target.value)} /></label>
        <label className="block text-[12px] font-bold">اسم الطالب على الشهادة<input className={input} style={bd} value={d.studentName} onChange={(e) => set('studentName', e.target.value)} /></label>
        <div className="grid grid-cols-[110px_1fr] gap-2 items-end">
          <label className="block text-[12px] font-bold">اللقب
            <select className={input} style={bd} value={prefix} onChange={(e) => setPrefix(e.target.value as any)}>
              <option value="أستاذ">أستاذ</option><option value="أستاذة">أستاذة</option><option value="">بدون</option>
            </select>
          </label>
          <label className="block text-[12px] font-bold">المعلّم<input className={input} style={bd} value={d.teacherName} onChange={(e) => set('teacherName', e.target.value)} /></label>
        </div>
        <label className="block text-[12px] font-bold">المحفوظ<input className={input} style={bd} placeholder="مثال: جزء عمّ كاملًا" value={d.memorized} onChange={(e) => set('memorized', e.target.value)} /></label>
        <label className="block text-[12px] font-bold">التقدّم<input className={input} style={bd} placeholder="مثال: أتمّ 12 حصة · متوسط التقييم 9/10" value={d.progress} onChange={(e) => set('progress', e.target.value)} /></label>
        <label className="block text-[12px] font-bold">نص التقدير
          <textarea className={input} style={bd} rows={3} value={d.message} onChange={(e) => { msgIsDefault.current = false; set('message', e.target.value) }} />
        </label>
        <button type="button" className="text-[12px] font-bold" style={{ color: '#176b52' }} onClick={() => { msgIsDefault.current = true; set('message', defaultMessage(d.gender)) }}>استرجاع النص الافتراضي</button>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-[12px] font-bold">التاريخ<input type="date" className={input} style={bd} value={d.issueDate} onChange={(e) => set('issueDate', e.target.value)} /></label>
          <label className="block text-[12px] font-bold">الموقّع<input className={input} style={bd} value={d.signer} onChange={(e) => set('signer', e.target.value)} /></label>
        </div>
      </section>

      <button type="button" disabled={pending} onClick={submit} className="w-full rounded-xl py-3.5 text-[14px] font-bold text-white" style={{ background: '#176b52' }}>{pending ? 'جاري الحفظ...' : 'إنشاء الشهادة'}</button>
      {msg && <p className="text-[13px] text-center" style={{ color: '#93000a' }}>{msg}</p>}
    </div>
  )
}
