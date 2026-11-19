import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { serviceClient } from '@/lib/supabase/service'
import { TEMPLATES, fmtArabicDate } from '@/lib/certificates'
import CertRowActions from './CertRowActions'

export const dynamic = 'force-dynamic'

export default async function CertificatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const role = String(p?.role)
  if (!['admin', 'supervisor'].includes(role)) redirect('/login')

  const { data } = await serviceClient()
    .from('certificates')
    .select('id, student_name, teacher_name, gender, template, title, issue_date, sent_at, sent_count, students(phone)')
    .order('created_at', { ascending: false })
    .limit(200)
  const rows = (data || []) as any[]
  const tname = (k: string) => TEMPLATES.find((t) => t.key === k)?.name || k

  return (
    <div className="min-h-dvh bg-[#eefdf6] max-w-lg mx-auto pb-16">
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href={role === 'admin' ? '/admin' : '/supervisor'} className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm"><span className="material-symbols-outlined">arrow_forward</span></Link>
        <h1 className="text-[16px] font-bold flex-1">شهادات التقدير</h1>
      </header>
      <main className="px-4 space-y-3">
        <Link href="/admin/certificates/new" className="btn-primary block text-center py-3 text-[14px]">
          <span className="material-symbols-outlined text-[18px] ml-1">workspace_premium</span> شهادة جديدة
        </Link>
        {rows.map((c) => (
          <div key={c.id} className="card p-3">
            <div className="flex justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-[14px] truncate">{c.student_name}</p>
                <p className="text-[11px]" style={{ color: '#6f7974' }}>{c.title} · {tname(c.template)} · {fmtArabicDate(c.issue_date)}{c.teacher_name ? ` · ${c.teacher_name}` : ''}</p>
              </div>
              <span className={c.sent_at ? 'badge-ok' : 'badge-warn'}>{c.sent_at ? `اتبعتت${c.sent_count > 1 ? ` ×${c.sent_count}` : ''}` : 'لم تُرسل'}</span>
            </div>
            <CertRowActions id={c.id} name={c.student_name} gender={c.gender} phone={c.students?.phone || null} isAdmin={role === 'admin'} />
          </div>
        ))}
        {rows.length === 0 && <p className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>لسه ما اتعملتش شهادات</p>}
      </main>
    </div>
  )
}
