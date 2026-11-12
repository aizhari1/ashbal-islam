import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ActivityLogPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: logs } = await supabase
    .from('activity_log')
    .select('id, action, entity_id, details, created_at, actor_id')
    .order('created_at', { ascending: false })
    .limit(200)

  const actionLabel: Record<string, string> = {
    teacher_session_rate: 'سعر حصة معلم',
    teacher_settlement: 'صرف راتب',
    teacher_note: 'ملاحظة معلم',
    chat_message: 'رسالة شات',
    payment_reminder: 'تذكير مالي',
    student_update: 'تعديل طالب',
    session_num: 'تعديل رقم حصة',
    trial_add: 'طالب تجريبي',
    teacher_absence: 'غياب معلم',
    trial_report: 'تقرير حصة تجريبية',
    deleted_session: 'حذف حصة',
    teacher_delete_session: 'حذف حصة (معلم)',
    parent_evaluation: 'تقييم ولي أمر',
    admin_teacher_eval: 'تقييم الإدارة لمعلم',
    supervisor_eval: 'نقاط إشراف',
    cron_daily: 'مهمة يومية تلقائية',
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            سجل النشاط
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {logs?.length ?? 0} حدث · آخر 200
          </p>
        </div>
      </header>

      <div className="px-4 space-y-2">
        {(logs ?? []).map((l) => {
          const d = (l.details || {}) as Record<string, unknown>
          return (
            <div key={l.id} className="card p-3">
              <div className="flex justify-between gap-2">
                <p className="text-[13px] font-bold" style={{ color: '#00513c' }}>
                  {actionLabel[l.action] || l.action}
                </p>
                <p className="text-[10px] shrink-0" style={{ color: '#6f7974' }}>
                  {l.created_at ? new Date(l.created_at).toLocaleString('ar-EG') : '—'}
                </p>
              </div>
              <p className="text-[11px] mt-1 break-all" style={{ color: '#3f4944' }}>
                {Object.entries(d)
                  .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                  .join(' · ') || '—'}
              </p>
            </div>
          )
        })}
        {(logs ?? []).length === 0 && (
          <p className="text-center text-[13px] py-8" style={{ color: '#6f7974' }}>
            لا أحداث بعد
          </p>
        )}
      </div>
    </div>
  )
}
