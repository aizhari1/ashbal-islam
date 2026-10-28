import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChatBox } from './ChatBox'

export default async function AdminChatPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string }>
}) {
  const sp = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profile && !['admin', 'supervisor'].includes(profile.role)) redirect('/login')

  const { data: teacherProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, code, role')
    .eq('role', 'teacher')
    .order('full_name')

  const peerId = sp.with || teacherProfiles?.[0]?.id || ''

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

  const peer = teacherProfiles?.find((t) => t.id === peerId)

  return (
    <div className="min-h-dvh max-w-lg mx-auto flex flex-col" style={{ background: '#eefdf6', height: '100dvh' }}>
      <header className="px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href="/admin" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>شات المعلمين</h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>تواصل الإدارة ↔ المعلم</p>
        </div>
        <Link href="/admin/notes" className="text-[12px] font-bold" style={{ color: '#176b52' }}>ملاحظات</Link>
      </header>

      <div className="px-3 pb-2 overflow-x-auto flex gap-2 shrink-0">
        {(teacherProfiles ?? []).map((t) => (
          <Link
            key={t.id}
            href={`/admin/chat?with=${t.id}`}
            className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold"
            style={{
              background: t.id === peerId ? '#176b52' : '#fff',
              color: t.id === peerId ? '#fff' : '#3f4944',
              border: '1px solid rgba(18,61,50,0.1)',
            }}
          >
            {t.full_name || t.code}
          </Link>
        ))}
        {(!teacherProfiles || teacherProfiles.length === 0) && (
          <p className="text-[12px] px-2" style={{ color: '#6f7974' }}>لا يوجد معلمون بحساب دخول بعد</p>
        )}
      </div>

      {peer && (
        <p className="px-4 text-[12px] font-bold shrink-0 mb-1" style={{ color: '#00513c' }}>
          المحادثة مع: {peer.full_name} {peer.code ? `(${peer.code})` : ''}
        </p>
      )}

      <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-2">
        {messages.length === 0 && peerId && (
          <p className="text-center text-[12px] py-8" style={{ color: '#6f7974' }}>ابدأ المحادثة — أول رسالة</p>
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
                <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{d.body}</p>
                <p className="text-[9px] mt-1 opacity-70">{m.created_at?.slice(11, 16)}</p>
              </div>
            </div>
          )
        })}
      </div>

      {peerId && (
        <div className="shrink-0 border-t px-3 py-2 bg-white" style={{ borderColor: 'rgba(18,61,50,0.08)' }}>
          <ChatBox peerId={peerId} />
        </div>
      )}
    </div>
  )
}
