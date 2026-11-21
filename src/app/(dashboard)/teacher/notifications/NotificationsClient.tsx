'use client'

import { useState, useTransition } from 'react'
import {
  markAllNotificationsRead,
  markNotificationRead,
  savePushSubscription,
} from '@/app/actions/notifications'

type Item = {
  id: string
  kind: string
  title: string
  body: string
  url: string | null
  read_at: string | null
  created_at: string
}

export function NotificationsClient({
  initialItems,
  initialUnread,
}: {
  initialItems: Item[]
  initialUnread: number
}) {
  const [items, setItems] = useState(initialItems)
  const [unread, setUnread] = useState(initialUnread)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState('')

  async function enablePush() {
    if (!('Notification' in window)) {
      setMsg('المتصفح لا يدعم الإشعارات')
      return
    }
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      setMsg('ارفض الإذن — فعّله من إعدادات المتصفح')
      return
    }
    setMsg('تم تفعيل تنبيهات المتصفح ✓')
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready
        const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (vapid && reg.pushManager) {
          const padding = '='.repeat((4 - (vapid.length % 4)) % 4)
          const base64 = (vapid + padding).replace(/-/g, '+').replace(/_/g, '/')
          const raw = atob(base64)
          const key = new Uint8Array(raw.length)
          for (let i = 0; i < raw.length; ++i) key[i] = raw.charCodeAt(i)
          const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
          const json = sub.toJSON()
          if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
            await savePushSubscription({
              endpoint: json.endpoint,
              keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
            })
          }
        }
      }
    } catch {
      /* optional */
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={enablePush}
          className="flex-1 py-2.5 rounded-xl text-[12px] font-bold"
          style={{ background: '#fff8e8', color: '#8a5a00' }}
        >
          تفعيل إشعارات المتصفح
        </button>
        {unread > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await markAllNotificationsRead()
                setItems((p) => p.map((i) => ({ ...i, read_at: i.read_at || new Date().toISOString() })))
                setUnread(0)
              })
            }
            className="px-3 py-2.5 rounded-xl text-[12px] font-bold"
            style={{ background: '#e8f7f0', color: '#176b52' }}
          >
            قراءة الكل
          </button>
        )}
      </div>
      {msg && (
        <p className="text-[12px] text-center font-bold" style={{ color: '#176b52' }}>
          {msg}
        </p>
      )}

      {items.length === 0 ? (
        <p className="card p-6 text-center text-[13px]" style={{ color: '#6f7974' }}>
          مفيش إشعارات — لما يكون عندك حصص النهاردة أو حصة فاتت هتظهر هنا
        </p>
      ) : (
        items.map((n) => (
          <button
            key={n.id}
            type="button"
            className="card p-3 w-full text-right"
            style={{ background: n.read_at ? '#fff' : '#f3fbf7', borderColor: n.read_at ? undefined : '#a8d5c4' }}
            onClick={() => {
              start(async () => {
                if (!n.read_at) {
                  await markNotificationRead(n.id)
                  setItems((p) => p.map((i) => (i.id === n.id ? { ...i, read_at: new Date().toISOString() } : i)))
                  setUnread((u) => Math.max(0, u - 1))
                }
                if (n.url) window.location.href = n.url
              })
            }}
          >
            <div className="flex gap-2 items-start">
              <span
                className="material-symbols-outlined text-[22px]"
                style={{ color: n.kind === 'missed_session' ? '#ba1a1a' : '#176b52' }}
              >
                {n.kind === 'missed_session' ? 'warning' : 'notifications'}
              </span>
              <div className="flex-1">
                <p className="text-[13px] font-bold" style={{ color: '#1a1c1b' }}>
                  {n.title}
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: '#6f7974' }}>
                  {n.body}
                </p>
                <p className="text-[10px] mt-1" style={{ color: '#9aa5a0' }}>
                  {new Date(n.created_at).toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}
                </p>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  )
}
