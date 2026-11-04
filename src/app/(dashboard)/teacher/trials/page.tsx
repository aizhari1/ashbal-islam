import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/supabase/service'
import TrialReportForm from './TrialReportForm'

export const dynamic = 'force-dynamic'

export default async function TeacherTrialsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: teacher } = await supabase.from('teachers').select('id').eq('profile_id', user.id).maybeSingle()

  let pending: any[] = []
  let done: any[] = []
  if (teacher) {
    const sb = serviceClient()
    const { data: trials } = await sb.from('students').select('id, code, name, phone, notes, created_at').eq('teacher_id', teacher.id).eq('status', 'تجريبي').order('created_at', { ascending: false })
    const ids = (trials || []).map((t) => t.id)
    const { data: reports } = ids.length
      ? await sb.from('activity_log').select('entity_id, details, created_at').eq('action', 'trial_report').in('entity_id', ids)
      : { data: [] as any[] }
    const byStudent = new Map((reports || []).map((r: any) => [r.entity_id, r]))
    for (const t of trials || []) (byStudent.has(t.id) ? done : pending).push({ ...t, report: byStudent.get(t.id) })

    // تجارب اتقفلت بنتيجة (اشترك/لم يشترك) وبقت خارج قائمة التجريبي — نعرضها للمرجع
    const { data: closed } = await sb.from('activity_log').select('entity_id, details, created_at').eq('action', 'trial_report').filter('details->>teacher_id', 'eq', teacher.id).order('created_at', { ascending: false }).limit(30)
    const shown = new Set(done.map((d) => d.id))
    for (const c of closed || []) if (!shown.has(c.entity_id)) done.push({ id: c.entity_id, name: c.details?.student_name, code: c.details?.student_code, report: c })
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto p-4 pb-20" style={{ background: '#eefdf6' }}>
      <Link href="/teacher" className="text-[13px]" style={{ color: '#176b52' }}>← رجوع</Link>
      <h1 className="text-[18px] font-bold mt-2">حصصي التجريبية</h1>
      <p className="text-[12px] mt-1" style={{ color: '#6f7974' }}>
        لو الطالب اشترك الحصة بتتحسب لك، ولو ما اشتركش مبتتحسبش وبيتشال من التجريبي.
      </p>

      <h2 className="text-[14px] font-bold mt-5 mb-2">بانتظار التقرير ({pending.length})</h2>
      <div className="space-y-2">
        {pending.map((t) => (
          <div key={t.id} className="card p-3">
            <p className="font-bold text-[14px]">{t.name}</p>
            <p className="text-[11px]" style={{ color: '#6f7974' }} dir="ltr">{t.phone || ''}</p>
            {t.notes && <p className="text-[12px] mt-1" style={{ color: '#6f7974' }}>{t.notes}</p>}
            <div className="mt-2"><TrialReportForm studentId={t.id} name={t.name} /></div>
          </div>
        ))}
        {pending.length === 0 && <p className="card p-4 text-[13px] text-center" style={{ color: '#6f7974' }}>لا توجد تجارب بانتظار تقرير</p>}
      </div>

      <h2 className="text-[14px] font-bold mt-6 mb-2">تجارب تم تقريرها</h2>
      <div className="space-y-2">
        {done.map((t) => {
          const d = t.report?.details || {}
          return (
            <div key={t.id} className="card p-3 text-[13px]">
              <div className="flex justify-between"><p className="font-bold">{t.name}</p><span className={d.result === 'اشترك' ? 'badge-ok' : d.result === 'لم يشترك' ? 'badge-err' : 'badge-warn'}>{d.result || '—'}</span></div>
              <p className="text-[12px]" style={{ color: '#6f7974' }}>{d.attendance} · تفاعل: {d.interaction || '—'}{d.level ? ` · ${d.level}` : ''}</p>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>{t.report?.created_at?.slice(0, 10)}</p>
            </div>
          )
        })}
        {done.length === 0 && <p className="card p-4 text-[13px] text-center" style={{ color: '#6f7974' }}>لا توجد تقارير بعد</p>}
      </div>
    </div>
  )
}
