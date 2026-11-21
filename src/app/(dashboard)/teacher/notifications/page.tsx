import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listUserNotifications, countUnread } from '@/lib/notifications'
import { NotificationsClient } from './NotificationsClient'

export const dynamic = 'force-dynamic'

export default async function TeacherNotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let items: any[] = []
  let unread = 0
  try {
    ;[items, unread] = await Promise.all([listUserNotifications(user.id, 80), countUnread(user.id)])
  } catch {
    items = []
  }

  return (
    <div className="min-h-dvh max-w-lg mx-auto pb-20" style={{ background: '#eefdf6' }}>
      <header className="px-4 py-3 flex items-center gap-3">
        <Link href="/teacher" className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </Link>
        <div className="flex-1">
          <h1 className="text-[16px] font-bold" style={{ color: '#00513c' }}>
            الإشعارات
          </h1>
          <p className="text-[11px]" style={{ color: '#6f7974' }}>
            {unread > 0 ? `${unread} غير مقروء` : 'كل الإشعارات مقروءة'}
          </p>
        </div>
      </header>

      <div className="px-4">
        <NotificationsClient initialItems={items} initialUnread={unread} />
      </div>
    </div>
  )
}
