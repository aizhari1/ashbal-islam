import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { serviceClient } from '@/lib/supabase/service'

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

  // تقييمات أولياء الأمور لطلاب المعلم نفسه فقط (بنقرأها بالسيرفر بعد التأكد إن الحساب هو المعلم)
  let parentEvals: any[] = []
  if (teacher) {
    const sb = serviceClient()
    const { data: mine } = await sb.from('students').select('id').eq('teacher_id', teacher.id)
    const ids = (mine || []).map((x: any) => x.id)
    if (ids.length) {
      const { data } = await sb
        .from('activity_log')
        .select('id, entity_id, details, created_at')
        .eq('action', 'parent_evaluation')
        .in('entity_id', ids)
        .order('created_at', { ascending: false })
        .limit(40)
      parentEvals = data || []
    }
  }
  const SCORE: Record<string, number> = { 'ممتاز': 5, 'جيد جداً': 4, 'جيد': 3, 'مقبول': 2, 'ضعيف': 1 }
  const scored = parentEvals.map((e) => SCORE[e.details?.answers?.q2]).filter((n) => typeof n === 'number')
  const avgParent = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null

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

      <h2 className="text-[14px] font-bold mt-6 mb-2">تقييمات أولياء الأمور</h2>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="card p-3 text-center">
          <p className="text-[20px] font-bold" style={{ color: '#176b52' }}>{parentEvals.length}</p>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>عدد التقييمات</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-[20px] font-bold" style={{ color: '#176b52' }}>{avgParent === null ? '—' : avgParent.toFixed(1) + '/5'}</p>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>متوسط أداء الحصة</p>
        </div>
      </div>
      <div className="space-y-2">
        {parentEvals.map((e: any) => {
          const d = e.details || {}
          const a = d.answers || {}
          return (
            <div key={e.id} className="card p-3 text-[13px]">
              <p className="font-bold">{d.student_name || 'طالب'}{d.parent_name ? ` · ${d.parent_name}` : ''}</p>
              <p style={{ color: '#176b52' }}>أداء المعلم: {a.q2 || '—'} · رضا الطالب: {a.q3 || '—'}</p>
              <p style={{ color: '#6f7974' }}>التقدم: {a.q4 || '—'} · الالتزام بالمواعيد: {a.q6 || '—'}</p>
              <p className="text-[11px]" style={{ color: '#6f7974' }}>{d.month || ''} · {e.created_at?.slice(0, 10)}</p>
            </div>
          )
        })}
        {parentEvals.length === 0 && <p className="card p-4 text-[13px] text-center" style={{ color: '#6f7974' }}>لا تقييمات من أولياء الأمور بعد</p>}
      </div>

      <Link href="/evaluate" className="inline-block mt-4 text-[13px] font-bold" style={{ color: '#176b52' }}>
        فورم تقييم أولياء الأمور ←
      </Link>
    </div>
  )
}
