'use server'

import { createClient } from '@/lib/supabase/server'
import { currentMonthKey, previousMonthKey } from '@/lib/dues'

/**
 * أول ما يدخل شهر جديد: يحفظ ملخص الشهر السابق في activity_log
 * (حصص، مدفوعات، مستحقات) مرة واحدة فقط لكل شهر.
 */
export async function ensureMonthArchived() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { skipped: true }

  const cur = currentMonthKey()
  const prev = previousMonthKey()

  // هل اتحفظ ملخص الشهر السابق؟
  const { data: existing } = await supabase
    .from('activity_log')
    .select('id')
    .eq('action', 'month_archive')
    .contains('details', { month: prev })
    .limit(1)

  if (existing && existing.length > 0) {
    return { already: true, month: prev }
  }

  const start = `${prev}-01`
  // آخر يوم في الشهر السابق
  const [y, m] = prev.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${prev}-${String(lastDay).padStart(2, '0')}`

  const [{ data: att }, { data: pays }, { data: students }] = await Promise.all([
    supabase
      .from('attendance')
      .select('id, status, teacher_id, student_id')
      .gte('session_date', start)
      .lte('session_date', end)
      .limit(5000),
    supabase
      .from('payments')
      .select('id, amount, student_id')
      .gte('payment_date', start)
      .lte('payment_date', end)
      .limit(3000),
    supabase.from('students').select('id, amount_due, status').limit(500),
  ])

  const present = (att ?? []).filter((a) => a.status === 'حاضر').length
  const paidTotal = (pays ?? []).reduce((s, p) => s + Number(p.amount || 0), 0)
  const dueTotal = (students ?? []).reduce((s, st) => s + Number(st.amount_due || 0), 0)

  const { error } = await supabase.from('activity_log').insert({
    actor_id: user.id,
    action: 'month_archive',
    entity_type: 'system',
    details: {
      month: prev,
      archived_at: new Date().toISOString(),
      current_month: cur,
      sessions_total: (att ?? []).length,
      sessions_present: present,
      payments_count: (pays ?? []).length,
      payments_total: paidTotal,
      amount_due_total_at_archive: dueTotal,
      note: 'ملخص الشهر محفوظ — البيانات التفصيلية (حضور/دفعات) تفضل في الجداول',
    },
  })

  if (error) return { error: error.message }
  return {
    archived: true,
    month: prev,
    sessions_present: present,
    payments_total: paidTotal,
  }
}
