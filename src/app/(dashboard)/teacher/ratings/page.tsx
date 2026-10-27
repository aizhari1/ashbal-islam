import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function TeacherRatingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: teacher } = await supabase.from('teachers').select('id, name').eq('profile_id', user.id).maybeSingle()

  const { data: adminEvals } = await supabase
    .from('activity_log')
    .select('*')
    .eq('action', 'admin_teacher_eval')
    .order('created_at', { ascending: false })
    .limit(20)

  const mine = (adminEvals ?? []).filter((e: any) => {
    const d = e.details || {}
    return teacher && (e.entity_id === teacher.id || d.teacher_name === teacher.name)
  })

  return (
    <div className="min-h-dvh max-w-lg mx-auto p-4" style={{ background: '#eefdf6' }}>
      <Link href="/teacher" className="text-[13px]" style={{ color: '#176b52' }}>← رجوع</Link>
      <h1 className="text-[18px] font-bold mt-2">تقييماتي</h1>
      <p className="text-[12px] mt-1" style={{ color: '#6f7974' }}>تقييم الإدارة + أولياء الأمور</p>

      <h2 className="text-[14px] font-bold mt-5 mb-2">تقييم الإدارة</h2>
      <div className="space-y-2">
        {mine.map((e: any) => {
          const d = e.details || {}
          return (
            <div key={e.id} className="card p-3 text-[13px]">
              <p style={{ color: '#176b52' }} className="font-bold">الدرجة: {Number(d.score || 0).toFixed(1)}/5</p>
              {d.notes && <p style={{ color: '#6f7974' }}>{d.notes}</p>}
              <p className="text-[11px]" style={{ color: '#6f7974' }}>{e.created_at?.slice(0, 10)}</p>
            </div>
          )
        })}
        {mine.length === 0 && <p className="card p-4 text-[13px] text-center" style={{ color: '#6f7974' }}>لا تقييمات إدارة بعد</p>}
      </div>

      <Link href="/evaluate" className="inline-block mt-4 text-[13px] font-bold" style={{ color: '#176b52' }}>
        فورم تقييم أولياء الأمور ←
      </Link>
    </div>
  )
}
