import Link from 'next/link'
import { redirect } from 'next/navigation'
import { serviceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/courses'
import { currentMonthKey, monthBounds, monthLabelAr } from '@/lib/dues'
import { fetchAll } from '@/lib/dues-engine'

export const dynamic = 'force-dynamic'

const PARENT_SCORE: Record<string, number> = { 'ممتاز': 5, 'جيد جداً': 4, 'جيد': 3, 'مقبول': 2, 'ضعيف': 1 }
const r1 = (n: number) => Math.round(n * 10) / 10

export default async function CumulativePage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const auth = await requireAdmin()
  if (!auth.ok) redirect('/login')
  const sp = await searchParams
  const month = /^\d{4}-\d{2}$/.test(sp.m || '') ? (sp.m as string) : currentMonthKey()
  const { start, end } = monthBounds(month)
  const from = start + 'T00:00:00', to = end + 'T23:59:59.999'

  const sb = serviceClient()
  const [{ data: teachers }, { data: students }, { data: logs }, { data: sessions }] = await Promise.all([
    sb.from('teachers').select('id, name').eq('is_active', true),
    fetchAll<any>((f, t) => sb.from('students').select('id, teacher_id').order('id').range(f, t)).then((data) => ({ data })),
    fetchAll<any>((f, t) =>
      sb.from('activity_log').select('id, action, entity_id, details, created_at').in('action', ['parent_evaluation', 'supervisor_eval', 'admin_teacher_eval', 'admin_supervisor_eval']).gte('created_at', from).lte('created_at', to).order('id').range(f, t)
    ).then((data) => ({ data })),
    fetchAll<any>((f, t) =>
      sb.from('attendance').select('id, teacher_id').in('status', ['حاضر', 'متأخر']).gte('session_date', start).lte('session_date', end).order('id').range(f, t)
    ).then((data) => ({ data })),
  ])

  const teacherOfStudent = new Map((students || []).map((s: any) => [s.id, s.teacher_id]))
  const T = new Map<string, any>((teachers || []).map((t: any) => [t.id, { id: t.id, name: t.name, pSum: 0, pN: 0, sPts: 0, sN: 0, aSum: 0, aN: 0, sessions: 0 }]))
  for (const a of sessions || []) if (a.teacher_id && T.has(a.teacher_id)) T.get(a.teacher_id).sessions++

  const supervisors = new Map<string, { name: string; pts: number; n: number }>()
  for (const l of logs || []) {
    const d: any = l.details || {}
    if (l.action === 'parent_evaluation') {
      const t = T.get(teacherOfStudent.get(l.entity_id) as string)
      const sc = PARENT_SCORE[d.answers?.q2]
      if (t && sc) { t.pSum += sc; t.pN++ }
    } else if (l.action === 'supervisor_eval') {
      const t = T.get(l.entity_id)
      if (t) { t.sPts += Number(d.points || 0); t.sN++ }
    } else if (l.action === 'admin_teacher_eval') {
      const t = T.get(l.entity_id)
      if (t && Number(d.score)) { t.aSum += Number(d.score); t.aN++ }
    } else if (l.action === 'admin_supervisor_eval') {
      const k = d.supervisor_name || d.supervisor || '—'
      const s = supervisors.get(k) || { name: k, pts: 0, n: 0 }
      s.pts += Number(d.points || 0); s.n++; supervisors.set(k, s)
    }
  }

  const rows = [...T.values()].map((t) => {
    const parent = t.pN ? r1(t.pSum / t.pN) : null
    const sess = t.sN ? r1(t.sPts / t.sN / 4) : null
    const admin = t.aN ? r1(t.aSum / t.aN) : null
    let c = 0, w = 0
    if (parent != null) { c += parent * 0.4; w += 0.4 }
    if (sess != null) { c += sess * 0.35; w += 0.35 }
    if (admin) { c += admin * 0.25; w += 0.25 }
    return { ...t, parent, sess, admin, composite: w ? r1(c / w) : null }
  }).sort((a, b) => (b.composite || 0) - (a.composite || 0))

  const total = (k: 'pN' | 'sN' | 'aN') => rows.reduce((a, r) => a + r[k], 0)
  const prev = (() => { const [y, m] = month.split('-').map(Number); const d = new Date(Date.UTC(y, m - 2, 1)); return d.toISOString().slice(0, 7) })()
  const next = (() => { const [y, m] = month.split('-').map(Number); const d = new Date(Date.UTC(y, m, 1)); return d.toISOString().slice(0, 7) })()

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto pb-12">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin/more" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"><span className="material-symbols-outlined">arrow_forward</span></Link>
        <div><h1 className="text-[16px] font-bold">تقرير وتحليلات تراكمية</h1><p className="text-[11px]" style={{ color: '#6f7974' }}>أولياء الأمور + تقييم الحصص + تقييم الإدارة</p></div>
      </header>
      <main className="px-4 space-y-3">
        <div className="flex items-center justify-between card p-2.5">
          <Link href={`/admin/cumulative?m=${prev}`} className="px-3 py-1.5 text-[13px] font-bold">‹ السابق</Link>
          <span className="font-bold text-[14px]">{monthLabelAr(month)}</span>
          <Link href={`/admin/cumulative?m=${next}`} className="px-3 py-1.5 text-[13px] font-bold">التالي ›</Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[['أولياء الأمور', total('pN')], ['تقييم الحصص', total('sN')], ['تقييم الإدارة', total('aN')]].map(([l, n]) => (
            <div key={l as string} className="card p-3 text-center"><p className="text-[20px] font-bold" style={{ color: '#176b52' }}>{n}</p><p className="text-[11px]" style={{ color: '#6f7974' }}>{l}</p></div>
          ))}
        </div>

        <h2 className="text-[14px] font-bold">ترتيب المعلمين (درجة مركبة من 5)</h2>
        {rows.map((t, i) => (
          <div key={t.id} className="card p-3 text-[13px]">
            <div className="flex justify-between items-center">
              <p className="font-bold">{i + 1}. {t.name}</p>
              <span className="badge-ok">{t.composite == null ? '—' : t.composite + ' / 5'}</span>
            </div>
            <p className="text-[11px] mt-1" style={{ color: '#6f7974' }}>
              أولياء أمور: {t.parent ?? '—'} ({t.pN}) · حصص: {t.sess ?? '—'} ({t.sN}) · إدارة: {t.admin ?? '—'} ({t.aN}) · حصص منفّذة: {t.sessions}
            </p>
          </div>
        ))}
        {rows.length === 0 && <p className="card p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>لا بيانات</p>}

        <h2 className="text-[14px] font-bold pt-2">نقاط الأشراف (الشهر)</h2>
        {[...supervisors.values()].sort((a, b) => b.pts - a.pts).map((s) => (
          <div key={s.name} className="card p-3 text-[13px] flex justify-between"><span className="font-bold">{s.name}</span><span>{s.pts} نقطة ({s.n})</span></div>
        ))}
        {supervisors.size === 0 && <p className="card p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>لا نقاط للأشراف هذا الشهر</p>}
      </main>
    </div>
  )
}
