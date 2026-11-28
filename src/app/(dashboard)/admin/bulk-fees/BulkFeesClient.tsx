'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { applyBulkFees, type BulkFeeRow } from './actions'

const money = (n: number) => (Math.round(n * 100) / 100).toLocaleString('en-US')
const inp = 'w-full rounded-xl border px-3 py-2 text-[13px] bg-white'

export default function BulkFeesClient({ rows }: { rows: BulkFeeRow[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [ads, setAds] = useState('')
  const [sup, setSup] = useState('')
  const [other, setOther] = useState('')
  const [msg, setMsg] = useState('')
  const [pending, start] = useTransition()

  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? rows.filter((r) => r.name.toLowerCase().includes(t) || r.code.toLowerCase().includes(t) || r.teacher.toLowerCase().includes(t)) : rows
  }, [q, rows])

  const calc = (r: BulkFeeRow) => {
    const on = sel.has(r.id)
    const a = on && ads !== '' ? Number(ads) || 0 : r.ads
    const s = on && sup !== '' ? Number(sup) || 0 : r.sup
    const o = on && other !== '' ? Number(other) || 0 : r.other
    const income = r.parent * r.sessions
    const teacher = r.teacherRate * r.sessions
    const extras = a + s + o
    return { income, teacher, extras, profit: income - teacher - extras }
  }
  const totals = useMemo(() => list.reduce((t, r) => { const c = calc(r); return { income: t.income + c.income, teacher: t.teacher + c.teacher, extras: t.extras + c.extras, profit: t.profit + c.profit } }, { income: 0, teacher: 0, extras: 0, profit: 0 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, sel, ads, sup, other])

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const allOn = list.length > 0 && list.every((r) => sel.has(r.id))
  const toggleAll = () => setSel((s) => { const n = new Set(s); list.forEach((r) => (allOn ? n.delete(r.id) : n.add(r.id))); return n })

  function submit() {
    setMsg('')
    start(async () => {
      const r: any = await applyBulkFees({ ids: Array.from(sel), ads: ads === '' ? null : Number(ads), sup: sup === '' ? null : Number(sup), other: other === '' ? null : Number(other) })
      if (r?.error) return setMsg(r.error)
      setMsg(`تم التعميم على ${r.count} طالب ✓`)
      setAds(''); setSup(''); setOther('')
      router.refresh()
    })
  }

  return (
    <div className="px-4 space-y-3">
      <section className="bg-white rounded-2xl p-4 space-y-3 shadow-sm">
        <p className="text-[12px]" style={{ color: '#6f7974' }}>اكتب الرسوم الشهرية لكل طالب (الخانة الفاضية متتغيّرش)، اختار الطلاب، وبعدين "تعميم".</p>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-[12px] font-bold">إشراف (ج)<input type="number" min={0} inputMode="decimal" className={inp} style={{ borderColor: '#cde8dc' }} value={sup} onChange={(e) => setSup(e.target.value)} /></label>
          <label className="text-[12px] font-bold">إعلانات (ج)<input type="number" min={0} inputMode="decimal" className={inp} style={{ borderColor: '#cde8dc' }} value={ads} onChange={(e) => setAds(e.target.value)} /></label>
          <label className="text-[12px] font-bold">أخرى (ج)<input type="number" min={0} inputMode="decimal" className={inp} style={{ borderColor: '#cde8dc' }} value={other} onChange={(e) => setOther(e.target.value)} /></label>
        </div>
        <button type="button" disabled={pending || sel.size === 0} onClick={submit} className="w-full rounded-xl py-3 text-[14px] font-bold text-white disabled:opacity-50" style={{ background: '#176b52' }}>
          {pending ? 'جاري التعميم...' : `تعميم على ${sel.size} طالب`}
        </button>
        {msg && <p className="text-[12px] text-center" style={{ color: msg.includes('✓') ? '#176b52' : '#93000a' }}>{msg}</p>}
      </section>

      <section className="rounded-2xl p-3 text-[12px] space-y-0.5" style={{ background: totals.profit >= 0 ? '#e8f7f0' : '#ffdad6', color: totals.profit >= 0 ? '#176b52' : '#93000a' }}>
        <p>دخل متوقع (المعروضين): <b>{money(totals.income)} ج</b> · تكلفة معلمين: <b>{money(totals.teacher)} ج</b></p>
        <p>رسوم إضافية: <b>{money(totals.extras)} ج</b></p>
        <p className="font-bold text-[13px]">{totals.profit >= 0 ? 'صافي الربح' : 'صافي الخسارة'}: {money(Math.abs(totals.profit))} ج</p>
      </section>

      <div className="flex gap-2">
        <input className={inp} style={{ borderColor: '#cde8dc' }} placeholder="بحث بالاسم / الكود / المعلم" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" onClick={toggleAll} className="rounded-xl px-3 text-[12px] font-bold whitespace-nowrap" style={{ background: '#e8f7f0', color: '#176b52' }}>{allOn ? 'إلغاء الكل' : 'تحديد الكل'}</button>
      </div>

      <div className="space-y-2">
        {list.map((r) => {
          const c = calc(r)
          return (
            <label key={r.id} className="card p-3 flex gap-3 items-start cursor-pointer">
              <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} className="mt-1 w-5 h-5" />
              <div className="flex-1 min-w-0 text-[12px]">
                <p className="font-bold text-[13px] truncate">{r.name} <span style={{ color: '#6f7974' }} className="font-normal">· {r.code}</span></p>
                <p style={{ color: '#6f7974' }}>{r.teacher || 'بدون معلم'} · {r.sessions} حصة × {money(r.parent)} (معلم {money(r.teacherRate)})</p>
                <p>دخل {money(c.income)} − معلم {money(c.teacher)} − رسوم {money(c.extras)}</p>
                <p className="font-bold" style={{ color: c.profit >= 0 ? '#176b52' : '#93000a' }}>{c.profit >= 0 ? 'فائض/ربح' : 'عجز'}: {money(Math.abs(c.profit))} ج</p>
              </div>
            </label>
          )
        })}
        {list.length === 0 && <p className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>لا يوجد طلاب</p>}
      </div>
    </div>
  )
}
