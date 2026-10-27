import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function EvaluationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: parentEvals } = await supabase
    .from('activity_log')
    .select('*')
    .eq('action', 'parent_evaluation')
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: adminEvals } = await supabase
    .from('activity_log')
    .select('*')
    .eq('action', 'admin_teacher_eval')
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined">arrow_forward</span>
        </Link>
        <div>
          <h1 className="text-[16px] font-bold">التقييمات</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>أولياء الأمور + تقييم الإدارة</p>
        </div>
      </header>

      <main className="px-4 space-y-4">
        <div className="flex gap-2">
          <Link href="/evaluate" className="btn-primary flex-1 text-center py-2.5 text-[13px]">فورم ولي الأمر</Link>
          <Link href="/admin/teacher-eval" className="btn-gold flex-1 text-center py-2.5 text-[13px]">تقييم معلم</Link>
        </div>

        <section>
          <h2 className="text-[14px] font-bold mb-2">تقييمات أولياء الأمور ({parentEvals?.length ?? 0})</h2>
          <div className="space-y-2">
            {(parentEvals ?? []).map((e: any) => {
              const d = e.details || {}
              const answers = d.answers || {}
              return (
                <div key={e.id} className="card p-3.5 text-[13px]">
                  <p className="font-bold">{d.student_name || 'طالب'}</p>
                  <p className="text-[11px]" style={{ color: '#6f7974' }}>
                    {d.parent_name || 'ولي أمر'} · {d.month || ''} · {e.created_at?.slice(0, 10)}
                  </p>
                  <div className="mt-2 space-y-1">
                    {Object.entries(answers).map(([k, v]) => (
                      <p key={k} className="text-[11px]"><span style={{ color: '#6f7974' }}>{k}:</span> {String(v)}</p>
                    ))}
                  </div>
                </div>
              )
            })}
            {(!parentEvals || parentEvals.length === 0) && (
              <p className="card p-4 text-center text-[13px]" style={{ color: '#6f7974' }}>لا تقييمات بعد — شارك رابط /evaluate</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-[14px] font-bold mb-2">تقييمات الإدارة للمعلمين ({adminEvals?.length ?? 0})</h2>
          <div className="space-y-2">
            {(adminEvals ?? []).map((e: any) => {
              const d = e.details || {}
              return (
                <div key={e.id} className="card p-3.5 text-[13px]">
                  <p className="font-bold">{d.teacher_name}</p>
                  <p style={{ color: '#176b52' }}>الدرجة: {Number(d.score || 0).toFixed(1)}/5</p>
                  {d.notes && <p className="text-[12px]" style={{ color: '#6f7974' }}>{d.notes}</p>}
                </div>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
