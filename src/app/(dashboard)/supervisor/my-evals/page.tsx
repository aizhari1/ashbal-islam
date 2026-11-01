import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function SupervisorMyEvalsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('full_name, code').eq('id', user.id).single()

  const { data: evals } = await supabase
    .from('activity_log')
    .select('id, details, created_at, action')
    .in('action', ['supervisor_eval', 'supervisor_rating', 'admin_supervisor_eval'])
    .order('created_at', { ascending: false })
    .limit(50)

  // فلترة الخاصة بالمشرف الحالي إن وُجد اسم/كود
  const mine = (evals ?? []).filter((e) => {
    const d = (e.details || {}) as any
    if (!d) return true
    if (d.supervisor_id === user.id) return true
    if (profile?.code && d.supervisor_code === profile.code) return true
    if (profile?.full_name && d.supervisor_name === profile.full_name) return true
    return !d.supervisor_id && !d.supervisor_code // عامة
  })

  let points = 0
  for (const e of mine) {
    const d = (e.details || {}) as any
    points += Number(d.points || d.score || d.rating || 0)
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/supervisor" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            تقييماتي ونقاطي
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {profile?.full_name || 'مشرف'}
          </p>
        </div>
      </header>

      <div className="px-4 mb-4">
        <div className="card p-4 text-center">
          <p className="text-[12px]" style={{ color: '#6f7974' }}>
            مجموع النقاط
          </p>
          <p className="text-[32px] font-bold" style={{ color: '#c5a45d' }}>
            {points}
          </p>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {mine.length} تقييم
          </p>
        </div>
      </div>

      <div className="px-4 space-y-2">
        {mine.map((e) => {
          const d = (e.details || {}) as any
          return (
            <div key={e.id} className="card p-3">
              <div className="flex justify-between">
                <p className="text-[13px] font-bold" style={{ color: '#00513c' }}>
                  {d.rating || d.score || d.points || '—'} نقطة
                </p>
                <p className="text-[10px]" style={{ color: '#6f7974' }}>
                  {e.created_at ? new Date(e.created_at).toLocaleDateString('ar-EG') : ''}
                </p>
              </div>
              <p className="text-[11px] mt-1" style={{ color: '#3f4944' }}>
                {d.comment || d.notes || d.note || '—'}
              </p>
            </div>
          )
        })}
        {mine.length === 0 && (
          <p className="text-center text-[13px] py-8" style={{ color: '#6f7974' }}>
            لا تقييمات بعد — تظهر هنا تقييمات الإدارة للإشراف
          </p>
        )}
      </div>
    </div>
  )
}
