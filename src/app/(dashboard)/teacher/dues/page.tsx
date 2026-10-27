import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TeacherDuesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: teacher } = await supabase.from('teachers').select('*').eq('profile_id', user.id).maybeSingle()
  if (!teacher) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <Link href="/teacher" className="text-[13px]" style={{ color: '#176b52' }}>← رجوع</Link>
        <p className="mt-4">لا يوجد ملف معلم مرتبط بحسابك. تواصل مع الإدارة.</p>
      </div>
    )
  }

  // أكتوبر فقط
  const monthStart = '2026-10-01'
  const monthEnd = '2026-10-31'

  const { count: sessions } = await supabase
    .from('attendance')
    .select('*', { count: 'exact', head: true })
    .eq('teacher_id', teacher.id)
    .eq('status', 'حاضر')
    .gte('session_date', monthStart)
    .lte('session_date', monthEnd)

  const { data: rateLogs } = await supabase
    .from('activity_log')
    .select('details')
    .eq('action', 'teacher_session_rate')
    .eq('entity_id', teacher.id)
    .limit(1)

  const sessionRate = Number((rateLogs?.[0]?.details as any)?.session_rate) || 25
  const sessionsCount = sessions ?? 0
  const salary = sessionsCount * sessionRate

  const { data: settlements } = await supabase
    .from('activity_log')
    .select('details')
    .eq('action', 'teacher_settlement')

  let settled = 0
  for (const s of settlements ?? []) {
    const d = s.details as any
    if (d?.teacher_name === teacher.name) settled += Number(d.amount || 0)
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto p-4" style={{ background: '#eefdf6' }}>
      <Link href="/teacher" className="text-[13px]" style={{ color: '#176b52' }}>← رجوع</Link>
      <h1 className="text-[18px] font-bold mt-2">مستحقاتي — أكتوبر 2026</h1>
      <p className="text-[12px] mt-1" style={{ color: '#6f7974' }}>الراتب = حصص أكتوبر × 25 ج.م</p>

      <div className="card p-5 mt-4 space-y-3">
        <div className="flex justify-between text-[14px]">
          <span style={{ color: '#6f7974' }}>الحصص (أكتوبر · حاضر)</span>
          <b>{sessionsCount}</b>
        </div>
        <div className="flex justify-between text-[14px]">
          <span style={{ color: '#6f7974' }}>سعر الحصة</span>
          <b>{sessionRate} ج.م</b>
        </div>
        <div className="flex justify-between text-[14px]">
          <span style={{ color: '#6f7974' }}>نسبة الأكاديمية</span>
          <b>{teacher.rate_percent}%</b>
        </div>
        <hr style={{ borderColor: 'rgba(18,61,50,0.08)' }} />
        <div className="flex justify-between text-[16px]">
          <span className="font-bold">الراتب المستحق</span>
          <b style={{ color: '#176b52' }}>{salary.toLocaleString('ar-EG')} ج.م</b>
        </div>
        <div className="flex justify-between text-[14px]">
          <span style={{ color: '#6f7974' }}>تم صرفه</span>
          <b>{settled.toLocaleString('ar-EG')}</b>
        </div>
        <div className="flex justify-between text-[16px]">
          <span className="font-bold">المتبقي</span>
          <b style={{ color: '#ba1a1a' }}>{Math.max(0, salary - settled).toLocaleString('ar-EG')} ج.م</b>
        </div>
      </div>
    </div>
  )
}
