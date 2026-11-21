import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

/** أحداث الحلقات/الحضور — كتيرة ومش مهمة في السجل الإداري */
const HIDDEN_ACTIONS = new Set([
  'session_report',
  'attendance',
  'mark_attendance',
  'teacher_delete_session',
  'teacher_update_session',
  'add_teacher_session',
  'delete_attendance_settle',
  'reduce_session_remove',
  'reduce_session_remove_admin_only',
  'session_num',
  'session_teacher_eval',
  'align_counter',
  'set_last_session',
  'deleted_session',
  'whatsapp_report',
  'cron_daily',
  'cron_teacher_reminders',
])

const actionLabel: Record<string, string> = {
  teacher_session_rate: 'تعديل سعر حصة معلم',
  teacher_settlement: 'صرف راتب معلم',
  teacher_note: 'ملاحظة على معلم',
  chat_message: 'رسالة شات',
  payment_reminder: 'تذكير مالي',
  student_update: 'تعديل بيانات طالب',
  student_status: 'تغيير حالة طالب',
  change_status: 'تغيير حالة طالب',
  trial_add: 'إضافة طالب تجريبي',
  teacher_absence: 'تسجيل غياب معلم',
  trial_report: 'تقرير حصة تجريبية',
  parent_evaluation: 'تقييم ولي أمر',
  admin_teacher_eval: 'تقييم الإدارة لمعلم',
  supervisor_eval: 'نقاط إشراف',
  delete_payment: 'حذف دفعة',
  supervisor_edit_student: 'تعديل طالب (مشرف)',
  add_payment: 'إضافة دفعة',
  update_payment: 'تعديل دفعة',
  supervisor_payment: 'دفعة من المشرف',
  create_student: 'إضافة طالب',
  add_student: 'إضافة طالب',
  delete_student: 'حذف طالب',
  create_package: 'إنشاء باقة',
  update_package: 'تعديل باقة',
  assign_teacher: 'تعيين معلم',
  unassign_teacher: 'إلغاء تعيين معلم',
  settle_salary: 'تسوية راتب',
  finance_expense: 'مصروف مالي',
  month_archive: 'أرشفة شهر',
  login: 'تسجيل دخول',
  logout: 'تسجيل خروج',
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
  date: 'التاريخ',
  status: 'الحالة',
  prev_status: 'الحالة السابقة',
  package_size: 'حجم الباقة',
  package_id: 'الباقة',
  teacher_id: 'المعلم',
  last_session_num: 'آخر رقم حصة',
  price_per_session: 'سعر الحصة',
  teacher_session_rate: 'سعر حصة المعلم',
  from: 'من',
  to: 'إلى',
  actor: 'بواسطة',
  new_date: 'التاريخ الجديد',
  old_date: 'التاريخ السابق',
  new_amount: 'المبلغ الجديد',
  old_amount: 'المبلغ السابق',
  new_due: 'الاستحقاق الجديد',
  prev_due: 'الاستحقاق السابق',
  student_name: 'الطالب',
  teacher_name: 'المعلم',
  partial: 'دفعة جزئية',
}

function isUuid(s: unknown): boolean {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}

function humanAction(a: string | null | undefined): string {
  if (!a) return 'حدث'
  if (actionLabel[a]) return actionLabel[a]
  return a
    .replace(/_/g, ' ')
    .replace(/\bupdate\b/gi, 'تعديل')
    .replace(/\bpayment\b/gi, 'دفعة')
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
    if ('to' in o && o.to != null) {
      const to = o.to
      if (isUuid(to)) return names?.[String(to)] || '—'
      return String(to)
    }
    return '—'
  }
  const s = String(v).trim()
  if (isUuid(s)) return names?.[s] || '—'
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
    'date',
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
    'package_id',
    'teacher_id',
    'teacher_name',
    'last_session_num',
    'price_per_session',
    'teacher_session_rate',
    'from',
    'to',
  ]
  const used = new Set<string>()
  for (const k of preferred) {
    if (!(k in d)) continue
    used.add(k)
    const v = d[k]
    if (v === null || v === undefined || v === '') continue
    lines.push(`${fieldLabel[k] || k}: ${fmtValue(v, names)}`)
  }
  for (const [k, v] of Object.entries(d)) {
    if (used.has(k)) continue
    if (k === 'actor' || k === 'at' || k === 'actor_id') continue
    if (v === null || v === undefined || v === '') continue
    if (typeof v === 'object' && !('from' in (v as object)) && !('to' in (v as object)) && !('name' in (v as object))) continue
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

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = String(me?.role || '')
  if (!['admin', 'supervisor'].includes(role)) redirect('/login')

  let sb: any = supabase
  try {
    sb = serviceClient()
  } catch {
    sb = supabase
  }

  // نجيب كمية أكبر وبعدين نشيل ضوضاء الحلقات
  const { data: raw } = await sb
    .from('activity_log')
    .select('id, action, entity_id, entity_type, details, created_at, actor_id')
    .order('created_at', { ascending: false })
    .limit(800)

  const logs = (raw || []).filter((l: any) => !HIDDEN_ACTIONS.has(String(l.action || ''))).slice(0, 200)

  const actorIds = Array.from(new Set(logs.map((l: any) => l.actor_id).filter(Boolean) as string[]))

  const idBag = new Set<string>()
  for (const l of logs) {
    const d = normalizeDetails(l.details)
    if (isUuid(d.student_id)) idBag.add(String(d.student_id))
    if (isUuid(d.teacher_id)) idBag.add(String(d.teacher_id))
    if (l.entity_type === 'student' && isUuid(l.entity_id)) idBag.add(String(l.entity_id))
    if (l.entity_type === 'teacher' && isUuid(l.entity_id)) idBag.add(String(l.entity_id))
    // teacher_id: { from, to }
    const tid = d.teacher_id as any
    if (tid && typeof tid === 'object') {
      if (isUuid(tid.from)) idBag.add(String(tid.from))
      if (isUuid(tid.to)) idBag.add(String(tid.to))
    }
  }

  const names: Record<string, string> = {}
  if (idBag.size) {
    const ids = Array.from(idBag)
    const [{ data: students }, { data: teachers }] = await Promise.all([
      sb.from('students').select('id, name, code').in('id', ids),
      sb.from('teachers').select('id, name').in('id', ids),
    ])
    for (const s of students || []) {
      names[s.id] = s.code ? `${s.name} (${s.code})` : String(s.name)
    }
    for (const t of teachers || []) {
      names[t.id] = String(t.name)
    }
  }

  const actorNames: Record<string, string> = {}
  const actorRoles: Record<string, string> = {}
  if (actorIds.length) {
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, full_name, email, role')
      .in('id', actorIds)
    for (const p of profiles || []) {
      const n = p.full_name || p.email || 'مستخدم'
      actorNames[p.id] = String(n)
      actorRoles[p.id] = String(p.role || '')
    }
  }

  const roleAr = (r: string) =>
    r === 'admin' ? 'إدارة' : r === 'supervisor' ? 'إشراف' : r === 'teacher' ? 'معلم' : r || ''

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link
          href={role === 'supervisor' ? '/supervisor' : '/admin'}
          className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            سجل النشاط
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {logs.length} حدث مهم · بدون حلقات الحضور · مين اللي غيّر إيه
          </p>
        </div>
      </header>

      <div className="px-4 space-y-2">
        {logs.map((l: any) => {
          const lines = formatDetails(l.details, names)
          const actor = l.actor_id ? actorNames[l.actor_id] : null
          const aRole = l.actor_id ? roleAr(actorRoles[l.actor_id] || '') : ''
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

              <p className="text-[12px] font-bold mt-1" style={{ color: actor ? '#176b52' : '#9aa5a0' }}>
                {actor ? (
                  <>
                    <span className="material-symbols-outlined text-[14px] align-middle ml-0.5">person</span>
                    بواسطة: {actor}
                    {aRole ? ` · ${aRole}` : ''}
                  </>
                ) : (
                  'بواسطة: نظام / غير معروف'
                )}
              </p>

              {lines.length > 0 ? (
                <ul className="mt-1.5 space-y-0.5">
                  {lines.map((line, i) => (
                    <li key={`${l.id}-${i}`} className="text-[11px] leading-relaxed" style={{ color: '#3f4944' }}>
                      {line}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )
        })}

        {logs.length === 0 && (
          <p className="text-center text-[13px] py-8" style={{ color: '#6f7974' }}>
            لا أحداث مهمة بعد
          </p>
        )}
      </div>
    </div>
  )
}
