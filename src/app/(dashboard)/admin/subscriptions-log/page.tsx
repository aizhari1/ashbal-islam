import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SubscriptionsLogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, payment_date, method, notes, students(name, code)')
    .order('payment_date', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-dvh max-w-lg mx-auto p-4 pb-20" style={{ background: '#eefdf6' }}>
      <Link href="/supervisor" className="text-[13px]" style={{ color: '#176b52' }}>← رجوع</Link>
      <h1 className="text-[18px] font-bold mt-2">سجل الاشتراكات</h1>
      <p className="text-[12px]" style={{ color: '#6f7974' }}>{payments?.length ?? 0} دفعة</p>
      <div className="space-y-2 mt-4">
        {(payments ?? []).map((p: any) => (
          <div key={p.id} className="card p-3 text-[13px] flex justify-between">
            <div>
              <p className="font-bold">{p.students?.name || '—'}</p>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>{p.payment_date} · {p.method || '—'}</p>
            </div>
            <b style={{ color: '#176b52' }}>{Number(p.amount).toLocaleString('ar-EG')}</b>
          </div>
        ))}
      </div>
    </div>
  )
}
