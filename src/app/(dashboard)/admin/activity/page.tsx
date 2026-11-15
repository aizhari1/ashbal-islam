import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const actionLabel: Record<string, string> = {
  teacher_session_rate: 'تعديل سعر حصة معلم',
  teacher_settlement: 'صرف راتب معلم',
  teacher_note: 'ملاحظة على معلم',
  chat_message: 'رسالة شات',
  payment_reminder: 'تذكير مالي',
  student_update: 'تعديل بيانات طالب',
  session_num: 'تعديل رقم حصة',
  trial_add: 'إضافة طالب تجريبي',
  teacher_absence: 'تسجيل غياب معلم',
  trial_report: 'تقرير حصة تجريبية',
  deleted_session: 'حذف حصة',
  teacher_delete_session: 'حذف حصة (من المعلم)',
  parent_evaluation: 'تقييم ولي أمر',
  admin_teacher_eval: 'تقييم الإدارة لمعلم',
  supervisor_eval: 'نقاط إشراف',
  cron_daily: 'مهمة يومية تلقائية',
  delete_payment: 'حذف دفعة',
  session_report: 'تسجيل حضور / تقرير حصة',
  supervisor_edit_student: 'تعديل طالب (مشرف)',
  delete_attendance_settle: 'حذف حضور مع تسوية',
  add_payment: 'إضافة دفعة',
  update_payment: 'تعديل دفعة',
  create_student: 'إضافة طالب',
  delete_student: 'حذف طالب',
  create_package: 'إنشاء باقة',
  update_package: 'تعديل باقة',
  assign_teacher: 'تعيين معلم',
  unassign_teacher: 'إلغاء تعيين معلم',
  attendance: 'تسجيل حضور',
  mark_attendance: 'تسجيل حضور',
  settle_salary: 'تسوية راتب',
  whatsapp_report: 'إرسال تقرير واتساب',
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
}

const fieldLabel: Record<string, string> = {
  name: 'الاسم',
  amount: 'المبلغ',
  method: 'طريقة الدفع',
  notes: 'ملاحظات',
  student_id: 'معرّف الطالب',
  payment_date: 'تاريخ الدفع',
  prepaid_months: 'أشهر مقدّمة',
  due_after: 'الاستحقاق بعد',
  due_before: 'الاستحقاق قبل',
  session_num: 'رقم الحصة',
  date: 'التاريخ',
  status: 'الحالة',
  package_size: 'حجم الباقة',
  attendance_id: 'معرّف الحضور',
  package_complete: 'اكتمال الباقة',
  package_id: 'معرّف الباقة',
  teacher_id: 'المعلم',
  last_session_num: 'آخر رقم حصة',
  price_per_session: 'سعر الحصة',
  teacher_session_rate: 'سعر حصة المعلم',
  report: 'التقرير',
  evaluation: 'التقييم',
  homework: 'الواجب',
  from: 'من',
  to: 'إلى',
}

function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'boolean') return v ? 'نعم' : 'لا'
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    // common { from, to } or { name, id }
    if ('name' in o && o.name != null) return String(o.name)
    if ('to' in o && 'from' in o) return `${fmtValue(o.from)} ← ${fmtValue(o.to)}`
    if ('to' in o) return String(o.to)
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }
  const s = String(v)
  if (s === 'حاضر' || s === 'present') return 'حاضر'
  if (s === 'غائب' || s === 'absent') return 'غائب'
  return s
}

function formatDetails(details: unknown): string[] {
  if (!details || typeof details !== 'object') return []
  const d = details as Record<string, unknown>
  const lines: string[] = []

  // Prefer a readable summary order
  const preferred = [
    'name',
    'status',
    'session_num',
    'date',
    'amount',
    'method',
    'notes',
    'price_per_session',
    'teacher_session_rate',
    'last_session_num',
    'package_size',
    'package_complete',
    'teacher_id',
    'evaluation',
    'homework',
    'report',
  ]

  const seen = new Set<string>()
  for (const k of preferred) {
    if (!(k in d)) continue
    seen.add(k)
    const label = fieldLabel[k] || k
    lines.push(`${label}: ${fmtValue(d[k])}`)
  }
  for (const [k, v] of Object.entries(d)) {
    if (seen.has(k)) continue
    // skip raw uuids-heavy noise if we already have name
    if ((k.endsWith('_id') || k === 'attendance_id') && lines.length > 0) continue
    const label = fieldLabel[k] || k
    lines.push(`${label}: ${fmtValue(v)}`)
  }
  return lines
}

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
          const lines = formatDetails(l.details)
          return (
            <div key={l.id} className="card p-3">
              <div className="flex justify-between gap-2 items-start">
                <p className="text-[13px] font-bold" style={{ color: '#00513c' }}>
                  {actionLabel[l.action] || l.action}
                </p>
                <p className="text-[10px] shrink-0" style={{ color: '#6f7974' }}>
                  {l.created_at ? new Date(l.created_at).toLocaleString('ar-EG') : '—'}
                </p>
              </div>
              {lines.length > 0 ? (
                <ul className="mt-1.5 space-y-0.5">
                  {lines.map((line) => (
                    <li key={line} className="text-[11px] leading-relaxed" style={{ color: '#3f4944' }}>
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] mt-1" style={{ color: '#6f7974' }}>
                  —
                </p>
              )}
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
