'use client'

import { useState, useTransition } from 'react'
import MediaUploader from '@/components/MediaUploader'
import { saveLanding } from '@/app/actions/courses'
import type { LandingContent } from '@/lib/courses'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-[12px] font-semibold" style={{ color: '#3f4944' }}>{label}</span>{children}</label>
}

function Rows<T extends Record<string, any>>({
  title, items, onChange, blank, fields,
}: {
  title: string; items: T[]; onChange: (v: T[]) => void; blank: T
  fields: { key: keyof T & string; ph: string; area?: boolean; ltr?: boolean; num?: boolean }[]
}) {
  return (
    <div className="space-y-2">
      <p className="text-[12px] font-bold" style={{ color: '#00513c' }}>{title}</p>
      {items.map((it, i) => (
        <div key={i} className="bg-[#f4fbf7] rounded-xl p-2.5 space-y-2">
          {fields.map((f) => f.area ? (
            <textarea key={f.key} rows={2} className="input" placeholder={f.ph} value={it[f.key] ?? ''}
              onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, [f.key]: e.target.value } : x))} />
          ) : (
            <input key={f.key} className="input" placeholder={f.ph} dir={f.ltr || f.num ? 'ltr' : undefined} type={f.num ? 'number' : 'text'} value={it[f.key] ?? ''}
              onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, [f.key]: f.num ? Number(e.target.value) : e.target.value } : x))} />
          ))}
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-[12px] font-semibold" style={{ color: '#93000a' }}>حذف</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, blank])} className="w-full rounded-lg border border-dashed border-[#176b52] py-2 text-[12px] font-bold text-[#176b52]">+ إضافة</button>
    </div>
  )
}

export default function LandingEditor({ initial }: { initial: LandingContent }) {
  const [c, setC] = useState<LandingContent>(initial)
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()
  const set = <K extends keyof LandingContent>(k: K, v: LandingContent[K]) => setC((p) => ({ ...p, [k]: v }))
  const txt = (k: keyof LandingContent, ph = '') => (
    <input className="input" placeholder={ph} value={String(c[k] ?? '')} onChange={(e) => set(k, e.target.value as any)} />
  )

  return (
    <main className="px-4 space-y-4">
      <section className="card p-4 space-y-3">
        <h2 className="font-bold text-[14px]">الواجهة الرئيسية (Hero)</h2>
        <Field label="اسم الأكاديمية">{txt('brand')}</Field>
        <Field label="الشارة الصغيرة">{txt('heroBadge')}</Field>
        <Field label="العنوان">{txt('heroTitle')}</Field>
        <Field label="الجزء المميَّز بالذهبي من العنوان">{txt('heroHighlight')}</Field>
        <Field label="النص التعريفي"><textarea className="input" rows={3} value={c.heroSub} onChange={(e) => set('heroSub', e.target.value)} /></Field>
        <Field label="نص الزر الرئيسي">{txt('ctaPrimary')}</Field>
        <Field label="نص الزر الثاني">{txt('ctaSecondary')}</Field>
        <Field label="رقم واتساب (بصيغة دولية بدون +، مثال 201001234567)">
          <input className="input" dir="ltr" value={c.whatsapp} onChange={(e) => set('whatsapp', e.target.value.replace(/\D/g, ''))} />
        </Field>
        {c.heroImage && <img src={c.heroImage} alt="" className="w-full h-40 object-cover rounded-xl" />}
        <MediaUploader bucket="landing-media" accept="image/*" label={c.heroImage ? 'تغيير صورة الواجهة' : 'رفع صورة للواجهة (اختياري)'} onDone={(r) => set('heroImage', r.publicUrl || '')} />
        {c.heroImage && <button type="button" onClick={() => set('heroImage', '')} className="text-[12px]" style={{ color: '#93000a' }}>إزالة الصورة</button>}
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-bold text-[14px]">الأرقام</h2>
        <div className="grid grid-cols-2 gap-2">
          {([['auto', 'تلقائي من النظام'], ['manual', 'أكتبها بنفسي']] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => set('statsMode', v)}
              className={`rounded-lg py-2 text-[12px] font-bold ${c.statsMode === v ? 'bg-[#176b52] text-white' : 'bg-white border border-[#e5efe8]'}`}>{l}</button>
          ))}
        </div>
        <p className="text-[11px]" style={{ color: '#6f7974' }}>التلقائي بيعرض عدد الطلاب النشطين والمعلمين والحصص المسجّلة الحقيقية.</p>
        {c.statsMode === 'manual' && <Rows title="" items={c.stats} onChange={(v) => set('stats', v)} blank={{ value: 0, suffix: '+', label: '' }}
          fields={[{ key: 'value', ph: 'الرقم', num: true }, { key: 'suffix', ph: 'لاحقة (+ أو %)', ltr: true }, { key: 'label', ph: 'الوصف' }]} />}
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-bold text-[14px]">المميزات</h2>
        <Field label="عنوان القسم">{txt('featuresTitle')}</Field>
        <p className="text-[11px]" style={{ color: '#6f7974' }}>الأيقونة باسم Material Symbols بالإنجليزي مثل: person, star, schedule, school, groups</p>
        <Rows title="" items={c.features} onChange={(v) => set('features', v)} blank={{ icon: 'star', title: '', desc: '' }}
          fields={[{ key: 'icon', ph: 'اسم الأيقونة', ltr: true }, { key: 'title', ph: 'العنوان' }, { key: 'desc', ph: 'الوصف', area: true }]} />
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-bold text-[14px]">قسم الكورسات</h2>
        <p className="text-[11px]" style={{ color: '#6f7974' }}>الكورسات نفسها بتظهر تلقائيًا من صفحة الكورسات (اللي مفعّل لها "ظاهر في اللاندنج").</p>
        <Field label="العنوان">{txt('coursesTitle')}</Field>
        <Field label="النص الفرعي"><textarea className="input" rows={2} value={c.coursesSub} onChange={(e) => set('coursesSub', e.target.value)} /></Field>
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-bold text-[14px]">خطوات البدء</h2>
        <Field label="العنوان">{txt('stepsTitle')}</Field>
        <Rows title="" items={c.steps} onChange={(v) => set('steps', v)} blank={{ title: '', desc: '' }}
          fields={[{ key: 'title', ph: 'عنوان الخطوة' }, { key: 'desc', ph: 'الوصف', area: true }]} />
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-bold text-[14px]">الأسئلة الشائعة</h2>
        <Field label="العنوان">{txt('faqTitle')}</Field>
        <Rows title="" items={c.faq} onChange={(v) => set('faq', v)} blank={{ q: '', a: '' }}
          fields={[{ key: 'q', ph: 'السؤال' }, { key: 'a', ph: 'الإجابة', area: true }]} />
      </section>

      <section className="card p-4 space-y-3">
        <h2 className="font-bold text-[14px]">التذييل</h2>
        {txt('footer')}
      </section>

      <div className="sticky bottom-3">
        <button disabled={pending} onClick={() => start(async () => { const r: any = await saveLanding(c); setMsg(r?.error || 'تم الحفظ ونُشر على اللاندنج ✓') })}
          className="btn-primary w-full py-3.5 shadow-lg text-[14px]">{pending ? 'جاري الحفظ...' : 'حفظ ونشر'}</button>
        {msg && <p className="text-[12px] text-center mt-2 rounded-lg bg-white py-1.5" style={{ color: msg.includes('✓') ? '#176b52' : '#93000a' }}>{msg}</p>}
      </div>
    </main>
  )
}
