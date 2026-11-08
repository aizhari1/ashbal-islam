import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ReminderRow } from './ReminderRow'
import { computeAndSyncDues } from '@/lib/dues-engine'

const DUE_MSG = `السلام عليكم ورحمة الله وبركاته 🌷
أهلًا بحضرتكم، نشكركم على ثقتكم بأكاديمية أشبال الإسلام وعلى متابعتكم الكريمة.
نودّ إخباركم بلطف أن حصص الباقة الحالية قد اكتملت بحمد الله، ويسعدنا جدًا استمرار ابنكم معنا. 🤍
إن رغبتم في تجديد الاشتراك فيُرجى التواصل معنا لتنسيق ذلك في الوقت الذي يناسبكم، وإن كان قد تم السداد فنعتذر عن الإزعاج ونرجو إفادتنا.
جزاكم الله خيرًا ✨
أكاديمية أشبال الإسلام`

function toWhatsApp(phone: string | null): string {
  if (!phone) return ''
  let p = phone.replace(/[^\d+]/g, '')
  if (!p) return ''
  if (p.startsWith('00')) p = p.slice(2)
  if (p.startsWith('+')) p = p.slice(1)
  if (p.startsWith('0') && p.length >= 10) p = '20' + p.slice(1)
  if (!p.startsWith('20') && p.length <= 11) p = '20' + p
  return `https://wa.me/${p}?text=${encodeURIComponent(DUE_MSG)}`
}

export default async function FinanceReminderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = profile?.role || ''
  const backHref = role === 'supervisor' ? '/supervisor' : '/admin'

  // نفس مصدر الحساب الموحّد المستخدم في لوحة الإدارة والإشراف: بيراعي الدفع المقدم والمتبقي من الدفع
  // الجزئي ويقرأ كل الصفحات (القديم كان مقصوص عند 500 طالب و1000 صف حضور/دفع، وبيتجاهل الدفع المقدم
  // فكان بيظهّر طلاب مدفوع لهم مقدّمًا ويكتب لهم amount_due غلط)
  const { dueList } = await computeAndSyncDues(supabase)

  const { data: reminders } = await supabase
    .from('activity_log')
    .select('entity_id, created_at')
    .eq('action', 'payment_reminder')
    .order('created_at', { ascending: false })
    .limit(300)
  const { data: contacts } = await supabase
    .from('activity_log')
    .select('entity_id, details')
    .eq('action', 'contact_status')
    .order('created_at', { ascending: false })
    .limit(400)

  const lastReminder: Record<string, string> = {}
  for (const r of reminders ?? []) {
    if (r.entity_id && !lastReminder[r.entity_id]) lastReminder[r.entity_id] = r.created_at?.slice(0, 10) || ''
  }
  const lastContact: Record<string, string> = {}
  for (const c of contacts ?? []) {
    if (c.entity_id && !lastContact[c.entity_id])
      lastContact[c.entity_id] = String((c.details as any)?.status || 'لم يتم الاتصال')
  }

  const total = dueList.reduce((s, x) => s + x.outstanding, 0)

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href={backHref} className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>طلاب محتاجين تذكير بالدفع</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {dueList.length} طالب أكملوا باقتهم · {total.toLocaleString('ar-EG')} ج.م
          </p>
        </div>
      </header>

      <div className="px-3 mb-3">
        <div className="card p-3 text-[11px] leading-relaxed" style={{ color: '#3f4944', background: '#e8f7f0' }}>
          يظهر الطالب بعد خلص حصص باقته بعد آخر دفعة. أول ما تتسجّل دفعة (من الإدارة أو الإشراف) بيتشال من القائمة عند الطرفين معًا.
        </div>
      </div>

      <main className="px-3 space-y-3">
        {dueList.map((s) => (
          <ReminderRow
            key={s.id}
            student={{
              id: s.id,
              code: s.code,
              name: s.name,
              phone: s.phone,
              amount_due: s.outstanding,
              sessions: s.sessions_taken,
              due_date: s.due_date,
              teacher: s.teacher_name,
              reminded_at: lastReminder[s.id] || '',
              contact_status: lastContact[s.id] || 'لم يتم الاتصال',
              wa: toWhatsApp(s.phone),
              reason: s.reason,
            }}
          />
        ))}
        {dueList.length === 0 && (
          <p className="text-center text-[13px] py-10" style={{ color: '#6f7974' }}>
            مفيش طلاب محتاجين تذكير حالياً
          </p>
        )}
      </main>
    </div>
  )
}
