import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { computeOneTeacherPay } from '@/lib/teacher-payroll'

export const dynamic = 'force-dynamic'

export default async function TeacherDuesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: teacher } = await supabase.from('teachers').select('*').eq('profile_id', user.id).maybeSingle()
  if (!teacher) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <Link href="/teacher" className="text-[13px]" style={{ color: '#176b52' }}>
          ← رجوع
        </Link>
        <p className="mt-4">لا يوجد ملف معلم مرتبط بحسابك. تواصل مع الإدارة.</p>
      </div>
    )
  }

  const month = sp.month || 'all'
  const pay = await computeOneTeacherPay(supabase, teacher.id, month)

  const { data: settlements } = await supabase
    .from('activity_log')
    .select('details')
    .eq('action', 'teacher_settlement')

  let settled = 0
  for (const s of settlements ?? []) {
    const d = s.details as any
    if (d?.teacher_name === teacher.name) settled += Number(d.amount || 0)
  }

  const remaining = Math.max(0, pay.salary - settled)

  return (
    <div className="min-h-dvh max-w-lg mx-auto p-4" style={{ background: '#eefdf6' }}>
      <Link href="/teacher" className="text-[13px]" style={{ color: '#176b52' }}>
        ← رجوع
      </Link>
      <h1 className="text-[18px] font-bold mt-2">مستحقاتي</h1>
      <p className="text-[12px] mt-1" style={{ color: '#6f7974' }}>
        {pay.bounds.label} · نفس حساب الإدارة (حصص × سعر طالب)
      </p>

      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
        {['all', '2026-11', '2026-10'].map((m) => (
          <Link
            key={m}
            href={`/teacher/dues?month=${m}`}
            className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold"
            style={{
              background: month === m ? '#176b52' : '#fff',
              color: month === m ? '#fff' : '#176b52',
            }}
          >
            {m === 'all' ? 'الكل' : m}
          </Link>
        ))}
      </div>

      <div className="card p-5 mt-4 space-y-3">
        <div className="flex justify-between text-[14px]">
          <span style={{ color: '#6f7974' }}>الحصص (حاضر)</span>
          <b>{pay.sessions}</b>
        </div>
        <div className="flex justify-between text-[14px]">
          <span style={{ color: '#6f7974' }}>التفصيل</span>
          <b className="text-[12px]">{pay.rateParts}</b>
        </div>
        <hr style={{ borderColor: 'rgba(18,61,50,0.08)' }} />
        <div className="flex justify-between text-[16px]">
          <span className="font-bold">الراتب المستحق</span>
          <b style={{ color: '#176b52' }}>{pay.salary.toLocaleString('ar-EG')} ج.م</b>
        </div>
        <div className="flex justify-between text-[14px]">
          <span style={{ color: '#6f7974' }}>تم صرفه</span>
          <b>{settled.toLocaleString('ar-EG')}</b>
        </div>
        <div className="flex justify-between text-[16px]">
          <span className="font-bold">المتبقي</span>
          <b style={{ color: '#ba1a1a' }}>{remaining.toLocaleString('ar-EG')} ج.م</b>
        </div>
      </div>

      {pay.lines.length > 0 && (
        <div className="card p-4 mt-4">
          <p className="text-[13px] font-bold mb-2">آخر الحصص</p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {[...pay.lines]
              .sort((a, b) => b.session_date.localeCompare(a.session_date))
              .slice(0, 40)
              .map((l, i) => (
                <div key={i} className="flex justify-between text-[12px] gap-2">
                  <span className="truncate">
                    {l.session_date} · {l.student_name}
                  </span>
                  <b>{l.rate} ج</b>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
