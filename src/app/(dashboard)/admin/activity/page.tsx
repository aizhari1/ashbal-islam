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
  student_status: 'تغيير حالة طالب',
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
  reduce_session_remove_admin_only: 'حذف حصة تسوية إدارية',
  add_payment: 'إضافة دفعة',
  update_payment: 'تعديل دفعة',
  supervisor_payment: 'دفعة من المشرف',
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
  align_counter: 'مطابقة عدّاد مع آخر حصة',
  set_last_session: 'ضبط رقم آخر حصة',
}

const fieldLabel: Record<string, string> = {
  name: 'الاسم',
  code: 'الكود',
  amount: 'المبلغ',
  method: 'طريقة الدفع',
  notes: 'ملاحظات',
  note: 'ملاحظة',
  student_id: 'الطالب',
  payment_date: 'تاريخ الدفع',
  prepaid_months: 'أشهر مقدّمة',
  due_after: 'الاستحقاق بعد',
  due_before: 'الاستحقاق قبل',
  session_num: 'رقم الحصة',
  date: 'التاريخ',
  session_date: 'تاريخ الحصة',
  status: 'الحالة',
  prev_status: 'الحالة السابقة',
  package_size: 'حجم الباقة',
  package_complete: 'اكتمال الباقة',
  package_id: 'الباقة',
  teacher_id: 'المعلم',
  last_session_num: 'آخر رقم حصة',
  price_per_session: 'سعر الحصة',
  teacher_session_rate: 'سعر حصة المعلم',
  report: 'التقرير',
  evaluation: 'التقييم',
  homework: 'الواجب',
  from: 'من',
  to: 'إلى',
  actor: 'بواسطة',
  new_date: 'التاريخ الجديد',
  old_date: 'التاريخ القديم',
  new_amount: 'المبلغ الجديد',
  old_amount: 'المبلغ السابق',
  new_due: 'المستحق بعد',
  prev_due: 'المستحق قبل',
  partial: 'دفعة جزئية',
  student_name: 'الطالب',
  teacher_name: 'المعلم',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(v: unknown): boolean {
  return typeof v === 'string' && UUID_RE.test(v.trim())
}

function humanAction(action: string | null | undefined): string {
  const a = String(action || '').trim()
  if (!a) return 'إجراء'
  if (actionLabel[a]) return actionLabel[a]
  return a
    .replace(/_/g, ' ')
    .replace(/\bupdate\b/gi, 'تعديل')
    .replace(/\bpayment\b/gi, 'دفعة')
    .replace(/\bsession\b/gi, 'حصة')
    .replace(/\breport\b/gi, 'تقرير')
    .replace(/\bstudent\b/gi, 'طالب')
    .replace(/\bteacher\b/gi, 'معلم')
    .replace(/\bsupervisor\b/gi, 'مشرف')
}

function normalizeDetails(details: unknown): Record<string, unknown> {
  if (!details) return {}
  if (typeof details === 'object' && !Array.isArray(details)) return details as Record<string, unknown>
  if (typeof details === 'string') {
    const t = details.trim()
    if (!t) return {}
    try {
      const parsed = JSON.parse(t)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch {
      /* not JSON */
    }
    // "key: value · key: value" fallback
    const out: Record<string, unknown> = {}
    for (const part of t.split(/\s*[·|]\s*/)) {
      const m = part.match(/^([^:]+):\s*(.*)$/)
      if (m) out[m[1].trim()] = m[2].trim()
    }
    if (Object.keys(out).length) return out
    return { note: t }
  }
  return {}
}

function fmtValue(v: unknown, names?: Record<string, string>): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'نعم' : 'لا'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '—'
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if ('name' in o && o.name != null && String(o.name).trim()) {
      const code = o.code != null ? ` (${o.code})` : ''
      return `${String(o.name)}${code}`
    }
    if ('from' in o && 'to' in o) return `${fmtValue(o.from, names)} ← ${fmtValue(o.to, names)}`
    if ('to' in o && o.to != null) return String(o.to)
    return '—'
  }
  const s = String(v).trim()
  if (isUuid(s)) return names?.[s] || '—'
  if (s === 'حاضر' || s === 'present') return 'حاضر'
  if (s === 'غائب' || s === 'absent') return 'غائب'
  if (s === 'متأخر') return 'متأخر'
  return s
}

function formatDetails(details: unknown, names?: Record<string, string>): string[] {
  const d = normalizeDetails(details)
  const lines: string[] = []
  const preferred = [
    'name',
    'student_name',
    'code',
    'status',
    'prev_status',
    'session_num',
    'date',
    'session_date',
    'payment_date',
    'amount',
    'new_amount',
    'old_amount',
    'method',
    'new_due',
    'prev_due',
    'partial',
    'new_date',
    'old_date',
    'notes',
    'note',
    'package_size',
    'package_complete',
    'last_session_num',
    'price_per_session',
    'teacher_session_rate',
    'teacher_name',
  ]

  const seen = new Set<string>()
  for (const k of preferred) {
    if (!(k in d)) continue
    seen.add(k)
    const val = d[k]
    if (val == null || val === '') continue
    if (isUuid(val) && !(names && names[String(val)])) continue
    lines.push(`${fieldLabel[k] || k}: ${fmtValue(val, names)}`)
  }

  // student_id → اسم إن وُجد
  if (d.student_id && isUuid(d.student_id) && names?.[String(d.student_id)]) {
    if (!seen.has('student_name') && !seen.has('name')) {
      lines.unshift(`الطالب: ${names[String(d.student_id)]}`)
    }
  }

  for (const [k, v] of Object.entries(d)) {
    if (seen.has(k)) continue
    if (v == null || v === '') continue
    if (k.endsWith('_id') || k === 'attendance_id' || k === 'entity_id') continue
    if (isUuid(v) && !(names && names[String(v)])) continue
    if (typeof v === 'object') continue
    lines.push(`${fieldLabel[k] || k}: ${fmtValue(v, names)}`)
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
    .select('id, action, entity_id, entity_type, details, created_at, actor_id')
    .order('created_at', { ascending: false })
    .limit(200)

  const actorIds = Array.from(
    new Set((logs ?? []).map((l) => l.actor_id).filter(Boolean) as string[])
  )

  const studentIds = new Set<string>()
  for (const l of logs ?? []) {
    const d = normalizeDetails(l.details)
    if (isUuid(d.student_id)) studentIds.add(String(d.student_id))
    if (l.entity_type === 'student' && isUuid(l.entity_id)) studentIds.add(String(l.entity_id))
  }

  const names: Record<string, string> = {}
  if (studentIds.size) {
    const { data: students } = await supabase
      .from('students')
      .select('id, name, code')
      .in('id', Array.from(studentIds))
    for (const s of students || []) {
      names[s.id] = s.code ? `${s.name} (${s.code})` : String(s.name)
    }
  }

  const actorNames: Record<string, string> = {}
  if (actorIds.length) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, name, email').in('id', actorIds)
    for (const p of profiles || []) {
      const n = (p as any).full_name || (p as any).name || (p as any).email
      if (n) actorNames[p.id] = String(n)
    }
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
            {logs?.length ?? 0} حدث · آخر 200 · عرض مترجم
          </p>
        </div>
      </header>

      <div className="px-4 space-y-2">
        {(logs ?? []).map((l) => {
          const lines = formatDetails(l.details, names)
          const actor = l.actor_id ? actorNames[l.actor_id] : null
          return (
            <div key={l.id} className="card p-3">
              <div className="flex justify-between gap-2 items-start">
                <p className="text-[13px] font-bold" style={{ color: '#00513c' }}>
                  {humanAction(l.action)}
                </p>
                <p className="text-[10px] shrink-0" style={{ color: '#6f7974' }}>
                  {l.created_at
                    ? new Date(l.created_at).toLocaleString('ar-EG', {
                        timeZone: 'Africa/Cairo',
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })
                    : '—'}
                </p>
              </div>
              {actor && (
                <p className="text-[11px] mt-0.5" style={{ color: '#176b52' }}>
                  بواسطة: {actor}
                </p>
              )}
              {lines.length > 0 ? (
                <ul className="mt-1.5 space-y-0.5">
                  {lines.map((line, i) => (
                    <li key={`${l.id}-${i}`} className="text-[11px] leading-relaxed" style={{ color: '#3f4944' }}>
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
