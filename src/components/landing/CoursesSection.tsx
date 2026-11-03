'use client'

import { useState } from 'react'
import { Reveal } from './Reveal'

type Course = { id: string; title: string; short_desc: string | null; description: string | null; cover_url: string | null; price: number | null; currency: string | null; instructor: string | null; duration_label: string | null; lessons: number }

export default function CoursesSection({ courses }: { courses: Course[] }) {
  const [sel, setSel] = useState<Course | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [hp, setHp] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [err, setErr] = useState('')
  const [already, setAlready] = useState(false)

  function close() { setSel(null); setState('idle'); setErr(''); setAlready(false) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!sel) return
    setErr(''); setState('busy')
    try {
      const res = await fetch('/api/course-subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ course_id: sel.id, name, phone, code, website: hp }) })
      const j = await res.json()
      if (!res.ok) { setErr(j.error || 'حدث خطأ'); setState('idle'); return }
      setAlready(!!j.already); setState('done')
    } catch { setErr('مشكلة في الاتصال'); setState('idle') }
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c, i) => (
          <Reveal key={c.id} delay={i * 90}>
            <article className="lp-card overflow-hidden h-full flex flex-col">
              <div className="h-44 overflow-hidden bg-gradient-to-br from-[#176b52] to-[#00513c] flex items-center justify-center">
                {c.cover_url ? <img src={c.cover_url} alt={c.title} loading="lazy" className="lp-cover w-full h-full object-cover" /> :
                  <span className="material-symbols-outlined text-white/80 lp-bob" style={{ fontSize: 64 }}>school</span>}
              </div>
              <div className="p-5 flex-1 flex flex-col gap-2">
                <h3 className="font-extrabold text-[18px] text-[#00513c]">{c.title}</h3>
                {c.short_desc && <p className="text-[14px] leading-7 text-[#3f4944] flex-1">{c.short_desc}</p>}
                <div className="flex flex-wrap gap-2 text-[12px] text-[#6f7974]">
                  {c.lessons > 0 && <span>🎬 {c.lessons} درس</span>}
                  {c.duration_label && <span>⏱ {c.duration_label}</span>}
                  {c.instructor && <span>👤 {c.instructor}</span>}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <strong className="text-[18px] text-[#755b1b]">{Number(c.price) > 0 ? `${Number(c.price)} ${c.currency === 'EGP' ? 'ج.م' : c.currency}` : 'مجاني'}</strong>
                  <button onClick={() => setSel(c)} className="lp-btn green !py-2.5 !px-5 !text-[14px]">اشترك الآن</button>
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      {sel && (
        <div className="lp-modal-bg" onClick={close}>
          <div className="lp-modal" onClick={(e) => e.stopPropagation()}>
            {sel.cover_url && <img src={sel.cover_url} alt="" className="w-full h-40 object-cover" />}
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-extrabold text-[20px] text-[#00513c]">{sel.title}</h3>
                <button onClick={close} aria-label="إغلاق" className="bg-transparent border-0 cursor-pointer"><span className="material-symbols-outlined">close</span></button>
              </div>
              {sel.description && <p className="text-[14px] leading-7 text-[#3f4944] whitespace-pre-line">{sel.description}</p>}

              {state === 'done' ? (
                <div className="text-center py-6 space-y-2">
                  <span className="material-symbols-outlined text-[#176b52]" style={{ fontSize: 56, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <p className="font-bold text-[17px] text-[#00513c]">{already ? 'طلبك مسجّل بالفعل' : 'تم استلام طلب الاشتراك'}</p>
                  <p className="text-[13px] text-[#6f7974] leading-6">هتتواصل معاك الإدارة، وبعد التفعيل هيظهر الكورس في بوابة الطالب بكودك.</p>
                  <button onClick={close} className="lp-btn green mt-2">تمام</button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-3">
                  <input className="input" placeholder="الاسم" value={name} onChange={(e) => setName(e.target.value)} />
                  <input className="input" dir="ltr" inputMode="tel" placeholder="رقم الواتساب" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <div className="text-center text-[12px] text-[#6f7974]">— أو لو إنت طالب عندنا —</div>
                  <input className="input text-center" dir="ltr" placeholder="كود الطالب (ST-0001)" value={code} onChange={(e) => setCode(e.target.value)} />
                  <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} className="hidden" aria-hidden />
                  {err && <p className="text-[13px] rounded-lg py-2 text-center" style={{ background: '#ffdad6', color: '#93000a' }}>{err}</p>}
                  <button disabled={state === 'busy'} className="lp-btn green w-full">{state === 'busy' ? 'جاري الإرسال...' : 'تأكيد الاشتراك'}</button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
