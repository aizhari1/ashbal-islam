import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChatBox } from '@/app/(dashboard)/admin/chat/ChatBox'

export default async function TeacherChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profile && profile.role !== 'teacher' && profile.role !== 'admin') redirect('/login')

  const { data: admins } = await supabase
    .from('profiles')
    .select('id, full_name, code, role')
    .eq('role', 'admin')
    .limit(5)

  const peerId = admins?.[0]?.id || ''

  let messages: any[] = []
  if (peerId) {
    const thread = [user.id, peerId].sort().join(':')
    const { data } = await supabase
      .from('activity_log')
      .select('id, actor_id, details, created_at')
      .eq('action', 'chat_message')
      .eq('entity_id', thread)
      .order('created_at', { ascending: true })
      .limit(200)
    messages = data || []
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto flex flex-col" style={{ background: '#eefdf6', height: '100dvh' }}>
      <header className="px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href="/teacher" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>محادثة الإدارة</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>{admins?.[0]?.full_name || 'الإدارة'}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-2">
        {messages.length === 0 && (
          <p className="text-center text-[12px] py-8" style={{ color: '#6f7974' }}>لا رسائل بعد — اكتب رسالة للإدارة</p>
        )}
        {messages.map((m) => {
          const d = (m.details || {}) as any
          const mine = d.from_id === user.id
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
              <div
                className="max-w-[80%] rounded-2xl px-3.5 py-2.5"
                style={{
                  background: mine ? '#176b52' : '#fff',
                  color: mine ? '#fff' : '#111e1a',
                  border: mine ? 'none' : '1px solid rgba(18,61,50,0.08)',
                }}
              >
                <p className="text-[13px] whitespace-pre-wrap">{d.body}</p>
                <p className="text-[9px] mt-1 opacity-70">{m.created_at?.slice(11, 16)}</p>
              </div>
            </div>
          )
        })}
      </div>

      {peerId && (
        <div className="shrink-0 border-t px-3 py-2 bg-white">
          <ChatBox peerId={peerId} />
        </div>
      )}
    </div>
  )
}
