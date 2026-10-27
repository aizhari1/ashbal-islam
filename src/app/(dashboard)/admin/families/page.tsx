import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function normPhone(p: string | null) {
  if (!p) return ''
  return p.replace(/[^\d]/g, '').replace(/^0+/, '')
}

export default async function FamiliesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: students } = await supabase
    .from('students')
    .select('id, code, name, phone, status, amount_due, teachers(name)')
    .not('phone', 'is', null)
    .order('name')

  const groups: Record<string, any[]> = {}
  for (const s of students ?? []) {
    const key = normPhone(s.phone)
    if (!key || key.length < 8) continue
    if (!groups[key]) groups[key] = []
    groups[key].push(s)
  }

  const families = Object.entries(groups)
    .filter(([, list]) => list.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)

  const singles = Object.entries(groups).filter(([, list]) => list.length === 1).length

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold">العائلات (الإخوة)</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>تجميع برقم الهاتف · تذكير واحد للأسرة</p>
        </div>
      </header>

      <main className="px-4">
        <div className="card p-4 mb-4 grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-[20px] font-bold" style={{ color: '#176b52' }}>{families.length}</p>
            <p className="text-[11px]" style={{ color: '#6f7974' }}>عائلة (إخوة)</p>
          </div>
          <div>
            <p className="text-[20px] font-bold">{singles}</p>
            <p className="text-[11px]" style={{ color: '#6f7974' }}>رقم فردي</p>
          </div>
        </div>

        <div className="space-y-3">
          {families.map(([phone, list]) => {
            const due = list.reduce((s: number, x: any) => s + Number(x.amount_due || 0), 0)
            return (
              <div key={phone} className="card p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-[14px]">{list.length} أشقاء</p>
                    <p className="text-[11px]" dir="ltr" style={{ color: '#6f7974' }}>{list[0].phone}</p>
                  </div>
                  {due > 0 && (
                    <span className="badge-err">مستحق {due.toLocaleString('ar-EG')}</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {list.map((s: any) => (
                    <Link key={s.id} href={`/admin/students/${s.id}`} className="flex justify-between text-[13px] py-1 border-t" style={{ borderColor: 'rgba(18,61,50,0.06)' }}>
                      <span className="truncate">{s.name}</span>
                      <span className="text-[11px]" style={{ color: '#6f7974' }}>{s.status}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
          {families.length === 0 && (
            <p className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>لا عائلات بإخوة (نفس رقم الهاتف)</p>
          )}
        </div>
      </main>
    </div>
  )
}
