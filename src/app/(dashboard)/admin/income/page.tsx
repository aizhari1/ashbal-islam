import Link from 'next/link'
import { redirect } from 'next/navigation'
import { serviceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/courses'
import { currentMonthKey, monthBounds, monthLabelAr, todayKey } from '@/lib/dues'

export const dynamic = 'force-dynamic'

const day = (s: string) => new Date(s + 'T12:00:00Z')
const iso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (s: string, n: number) => iso(new Date(day(s).getTime() + n * 86400000))
const span = (a: string, b: string) => Math.round((day(b).getTime() - day(a).getTime()) / 86400000) + 1
const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
const shiftMonth = (key: string, n: number) => { const [y, m] = key.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7) }

/** Supabase بيرجّع 1000 صف بس في الطلب — بنجيب على دفعات */
async function fetchAll<T>(make: (from: number, to: number) => PromiseLike<{ data: any; error: any }>): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < 40; i++) {
    const { data, error } = await make(i * 1000, i * 1000 + 999)
    if (error || !data) break
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

function Delta({ cur, prev, unit = '', invert = false }: { cur: number; prev: number; unit?: string; invert?: boolean }) {
  if (!prev && !cur) return <span className="text-[11px]" style={{ color: '#6f7974' }}>—</span>
  const diff = cur - prev
  const pct = prev ? Math.round((diff / prev) * 100) : null
  const up = diff > 0
  const good = invert ? !up : up
  const color = diff === 0 ? '#6f7974' : good ? '#176b52' : '#ba1a1a'
  return (
    <span className="text-[11px] font-bold" style={{ color }}>
      {diff === 0 ? 'ثابت' : `${up ? '▲ زاد' : '▼ نقص'} ${fmt(Math.abs(diff))}${unit}${pct !== null ? ` (${Math.abs(pct)}%)` : ''}`}
    </span>
  )
}

export default async function IncomePage({ searchParams }: { searchParams: Promise<{ m?: string; d?: string; s?: string; t?: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) redirect('/login')
  const sp = await searchParams
  const today = todayKey()

  // الفترة الحالية + الفترة اللي قبلها (بنفس عدد الأيام)
  let start: string, end: string, label: string
  const dN = [7, 30, 90].includes(Number(sp.d)) ? Number(sp.d) : 0
  let monthKey = ''
  if (dN) { end = today; start = addDays(today, -(dN - 1)); label = `آخر ${dN} يوم` }
  else {
    monthKey = /^\d{4}-\d{2}$/.test(sp.m || '') ? (sp.m as string) : currentMonthKey()
    const b = monthBounds(monthKey)
    start = b.start; end = b.end > today ? today : b.end
    label = monthLabelAr(monthKey)
  }
  const days = span(start, end)
  const pEnd = dN ? addDays(start, -1) : (() => { const pb = monthBounds(shiftMonth(monthKey, -1)); return addDays(pb.start, days - 1) > pb.end ? pb.end : addDays(pb.start, days - 1) })()
  const pStart = dN ? addDays(pEnd, -(days - 1)) : monthBounds(shiftMonth(monthKey, -1)).start

  const sb = serviceClient()
  const [students, teachers, payCur, payPrev, attCur, attPrev] = await Promise.all([
    sb.from('students').select('id, code, name, teacher_id, join_date, last_session_num, monthly_sessions, status').limit(5000).then((r) => r.data || []),
    sb.from('teachers').select('id, name').then((r) => r.data || []),
    fetchAll<any>((f, t) => sb.from('payments').select('student_id, amount, currency, payment_date, method').eq('status', 'مدفوع').gte('payment_date', start).lte('payment_date', end).range(f, t)),
    fetchAll<any>((f, t) => sb.from('payments').select('student_id, amount, currency, payment_date').eq('status', 'مدفوع').gte('payment_date', pStart).lte('payment_date', pEnd).range(f, t)),
    fetchAll<any>((f, t) => sb.from('attendance').select('student_id, teacher_id, session_date').in('status', ['حاضر', 'متأخر']).gte('session_date', start).lte('session_date', end).range(f, t)),
    fetchAll<any>((f, t) => sb.from('attendance').select('student_id, session_date').in('status', ['حاضر', 'متأخر']).gte('session_date', pStart).lte('session_date', pEnd).range(f, t)),
  ])

  const tName = new Map<string, string>((teachers as any[]).map((t) => [t.id, t.name]))
  const stById = new Map<string, any>((students as any[]).map((s) => [s.id, s]))

  const sumBy = (rows: any[]) => { const m: Record<string, number> = {}; for (const r of rows) m[r.currency || 'EGP'] = (m[r.currency || 'EGP'] || 0) + Number(r.amount || 0); return m }
  const cur = sumBy(payCur), prev = sumBy(payPrev)
  const currencies = [...new Set([...Object.keys(cur), ...Object.keys(prev)])].sort((a, b) => (a === 'EGP' ? -1 : b === 'EGP' ? 1 : a.localeCompare(b)))
  const mainCur = currencies[0] || 'EGP'
  const payers = new Set(payCur.map((p) => p.student_id)).size
  const payersPrev = new Set(payPrev.map((p) => p.student_id)).size
  const newCur = (students as any[]).filter((s) => s.join_date && s.join_date >= start && s.join_date <= end).length
  const newPrev = (students as any[]).filter((s) => s.join_date && s.join_date >= pStart && s.join_date <= pEnd).length

  // مخطط يومي (للفترات ≤ 31 يوم)
  const perDay: Record<string, number> = {}
  for (const p of payCur) if ((p.currency || 'EGP') === mainCur) perDay[p.payment_date] = (perDay[p.payment_date] || 0) + Number(p.amount || 0)
  const dayList = days <= 31 ? Array.from({ length: days }, (_, i) => addDays(start, i)) : []
  const maxDay = Math.max(1, ...dayList.map((d) => perDay[d] || 0))

  // دخل لكل معلم (عن طريق معلم الطالب)
  const byTeacher: Record<string, number> = {}
  for (const p of payCur) if ((p.currency || 'EGP') === mainCur) { const tid = stById.get(p.student_id)?.teacher_id || '—'; byTeacher[tid] = (byTeacher[tid] || 0) + Number(p.amount || 0) }
  const teacherRows = Object.entries(byTeacher).sort((a, b) => b[1] - a[1])

  // تحليل لكل طالب
  const sessCur: Record<string, number> = {}, sessPrev: Record<string, number> = {}, paid: Record<string, number> = {}
  for (const a of attCur) sessCur[a.student_id] = (sessCur[a.student_id] || 0) + 1
  for (const a of attPrev) sessPrev[a.student_id] = (sessPrev[a.student_id] || 0) + 1
  for (const p of payCur) if ((p.currency || 'EGP') === mainCur) paid[p.student_id] = (paid[p.student_id] || 0) + Number(p.amount || 0)
  const tFilter = sp.t || ''
  let rows = (students as any[]).filter((s) => (s.status === 'نشط' || sessCur[s.id] || paid[s.id]) && (!tFilter || s.teacher_id === tFilter))
  const sort = ['sessions', 'paid', 'name'].includes(sp.s || '') ? sp.s : 'sessions'
  rows.sort((a, b) => sort === 'paid' ? (paid[b.id] || 0) - (paid[a.id] || 0) : sort === 'name' ? a.name.localeCompare(b.name, 'ar') : (sessCur[b.id] || 0) - (sessCur[a.id] || 0))
  const totalRows = rows.length
  rows = rows.slice(0, 150)

  const q = (o: Record<string, string>) => '?' + new URLSearchParams({ ...(dN ? { d: String(dN) } : { m: monthKey }), ...(sp.s ? { s: sp.s } : {}), ...(sp.t ? { t: sp.t } : {}), ...o }).toString()
  const pill = (href: string, text: string, on: boolean) => (
    <Link href={href} className="px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap" style={{ background: on ? '#176b52' : '#fff', color: on ? '#fff' : '#3f4944', border: '1px solid #e5efe8' }}>{text}</Link>
  )

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto pb-16">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin/more" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"><span className="material-symbols-outlined">arrow_forward</span></Link>
        <div><h1 className="text-[16px] font-bold">تحليل الدخل والطلاب</h1><p className="text-[11px]" style={{ color: '#6f7974' }}>{label}: {start} → {end} · بالمقارنة بـ {pStart} → {pEnd}</p></div>
      </header>

      <div className="px-4 flex gap-2 overflow-x-auto pb-2">
        {pill('/admin/income?m=' + currentMonthKey(), 'الشهر ده', !dN && monthKey === currentMonthKey())}
        {pill('/admin/income?m=' + shiftMonth(currentMonthKey(), -1), 'الشهر اللي فات', !dN && monthKey === shiftMonth(currentMonthKey(), -1))}
        {pill('/admin/income?d=7', '7 أيام', dN === 7)}
        {pill('/admin/income?d=30', '30 يوم', dN === 30)}
        {pill('/admin/income?d=90', '90 يوم', dN === 90)}
      </div>
      {!dN && (
        <div className="px-4 flex items-center justify-between text-[12px] font-bold pb-2" style={{ color: '#176b52' }}>
          <Link href={'/admin/income?m=' + shiftMonth(monthKey, -1)}>‹ {monthLabelAr(shiftMonth(monthKey, -1))}</Link>
          <Link href={'/admin/income?m=' + shiftMonth(monthKey, 1)}>{monthLabelAr(shiftMonth(monthKey, 1))} ›</Link>
        </div>
      )}

      <main className="px-4 space-y-3">
        {/* الدخل */}
        <section className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg,#00513c,#176b52)' }}>
          <p className="text-[12px] opacity-80">إجمالي الدخل ({label})</p>
          {currencies.length === 0 && <p className="text-[26px] font-bold">0</p>}
          {currencies.map((c) => (
            <div key={c} className="flex items-end justify-between mt-1">
              <p className="text-[26px] font-bold">{fmt(cur[c] || 0)} <span className="text-[13px] font-normal">{c}</span></p>
              <p className="text-[12px] rounded-full px-2.5 py-1 bg-white/90"><Delta cur={cur[c] || 0} prev={prev[c] || 0} unit={` ${c}`} /></p>
            </div>
          ))}
          <p className="text-[11px] opacity-80 mt-2">الفترة اللي قبلها: {currencies.map((c) => `${fmt(prev[c] || 0)} ${c}`).join(' · ') || '0'}</p>
        </section>

        <section className="grid grid-cols-2 gap-2">
          {[
            ['عدد الدفعات', payCur.length, payPrev.length],
            ['طلاب دفعوا', payers, payersPrev],
            ['حصص اتنفّذت', attCur.length, attPrev.length],
            ['طلاب جُدد', newCur, newPrev],
          ].map(([l, c, p]) => (
            <div key={l as string} className="bg-white rounded-2xl p-3 shadow-sm">
              <p className="text-[11px]" style={{ color: '#6f7974' }}>{l}</p>
              <p className="text-[20px] font-bold" style={{ color: '#176b52' }}>{fmt(c as number)}</p>
              <Delta cur={c as number} prev={p as number} />
            </div>
          ))}
        </section>

        {dayList.length > 0 && (
          <section className="bg-white rounded-2xl p-3 shadow-sm">
            <p className="text-[12px] font-bold mb-2">الدخل يوم بيوم ({mainCur})</p>
            <div className="flex items-end gap-[2px] h-24">
              {dayList.map((d) => (
                <div key={d} className="flex-1 rounded-t" title={`${d}: ${fmt(perDay[d] || 0)}`} style={{ height: `${Math.max(3, ((perDay[d] || 0) / maxDay) * 100)}%`, background: perDay[d] ? '#176b52' : '#e2f1eb' }} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] mt-1" style={{ color: '#6f7974' }}><span>{start.slice(5)}</span><span>{end.slice(5)}</span></div>
          </section>
        )}

        {teacherRows.length > 0 && (
          <section className="bg-white rounded-2xl p-3 shadow-sm">
            <p className="text-[12px] font-bold mb-2">الدخل حسب معلم الطالب ({mainCur})</p>
            {teacherRows.slice(0, 12).map(([tid, v]) => (
              <div key={tid} className="flex justify-between text-[12px] py-1.5 border-b last:border-0" style={{ borderColor: '#eef5f1' }}>
                <span>{tName.get(tid) || 'بدون معلم'}</span><b>{fmt(v)}</b>
              </div>
            ))}
          </section>
        )}

        {/* تحليل الطلاب */}
        <section className="bg-white rounded-2xl p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] font-bold">الطلاب في الفترة ({totalRows})</p>
            <div className="flex gap-1.5 text-[11px] font-bold">
              {[['sessions', 'حصص'], ['paid', 'مدفوع'], ['name', 'اسم']].map(([k, l]) => (
                <Link key={k} href={'/admin/income' + q({ s: k })} className="px-2 py-1 rounded-full" style={{ background: sort === k ? '#176b52' : '#f4fbf7', color: sort === k ? '#fff' : '#3f4944' }}>{l}</Link>
              ))}
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-2 text-[11px] font-bold">
            <Link href={'/admin/income' + q({ t: '' })} className="px-2 py-1 rounded-full whitespace-nowrap" style={{ background: !tFilter ? '#176b52' : '#f4fbf7', color: !tFilter ? '#fff' : '#3f4944' }}>كل المعلمين</Link>
            {(teachers as any[]).map((t) => (
              <Link key={t.id} href={'/admin/income' + q({ t: t.id })} className="px-2 py-1 rounded-full whitespace-nowrap" style={{ background: tFilter === t.id ? '#176b52' : '#f4fbf7', color: tFilter === t.id ? '#fff' : '#3f4944' }}>{t.name}</Link>
            ))}
          </div>
          <div className="divide-y" style={{ borderColor: '#eef5f1' }}>
            {rows.map((s) => {
              const c = sessCur[s.id] || 0, p = sessPrev[s.id] || 0
              return (
                <Link key={s.id} href={`/admin/students/${s.id}`} className="flex items-center justify-between gap-2 py-2 text-[12px]">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{s.name}</p>
                    <p className="text-[10px] truncate" style={{ color: '#6f7974' }}>{s.code} · {tName.get(s.teacher_id) || 'بدون معلم'} · عدّاد {s.last_session_num ?? 0}{s.monthly_sessions ? `/${s.monthly_sessions}` : ''}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p><b style={{ color: '#176b52' }}>{c}</b> حصة <Delta cur={c} prev={p} /></p>
                    <p className="text-[11px]" style={{ color: '#755b1b' }}>{paid[s.id] ? `دفع ${fmt(paid[s.id])} ${mainCur}` : 'لم يدفع'}</p>
                  </div>
                </Link>
              )
            })}
          </div>
          {totalRows > 150 && <p className="text-[11px] text-center mt-2" style={{ color: '#6f7974' }}>معروض أول 150 من {totalRows} — استخدم فلتر المعلم لتضييق القائمة</p>}
        </section>
      </main>
    </div>
  )
}
