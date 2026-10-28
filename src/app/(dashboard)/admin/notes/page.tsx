import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { NoteForm } from './NoteForm'

export default async function AdminNotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()

  const { data: notes } = await supabase
    .from('activity_log')
    .select('id, actor_id, details, created_at, entity_type')
    .eq('action', 'note')
    .order('created_at', { ascending: false })
    .limit(100)

  const list = notes ?? []

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-24" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href={profile?.role === 'admin' ? '/admin' : '/supervisor'} className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>الملاحظات</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>ملاحظات الإدارة والمشرفين</p>
        </div>
        <Link href="/admin/chat" className="text-[12px] font-bold" style={{ color: '#176b52' }}>الشات ←</Link>
      </header>

      <div className="px-4 mb-4">
        <NoteForm />
      </div>

      <main className="px-4 space-y-2.5">
        {list.length === 0 && (
          <div className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>لا ملاحظات بعد</div>
        )}
        {list.map((n) => {
          const d = (n.details || {}) as any
          return (
            <div key={n.id} className="card p-3.5">
              <div className="flex justify-between items-start gap-2 mb-1">
                <p className="text-[13px] font-bold">{d.from_name || 'مستخدم'}</p>
                <span className="text-[10px]" style={{ color: '#6f7974' }}>
                  {n.created_at?.slice(0, 16).replace('T', ' ')}
                </span>
              </div>
              <p className="text-[11px] mb-2" style={{ color: '#6f7974' }}>
                {d.from_role === 'admin' ? 'إدارة' : d.from_role === 'supervisor' ? 'إشراف' : d.from_role || ''}
              </p>
              <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{d.body}</p>
            </div>
          )
        })}
      </main>
    </div>
  )
}
