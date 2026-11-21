'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  getMyNotifications,
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

function timeAgo(iso: string) {
  const t = new Date(iso).getTime()
  const diff = Math.max(0, Date.now() - t)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'الآن'
  if (m < 60) return `منذ ${m} د`
  const h = Math.floor(m / 60)
  if (h < 24) return `منذ ${h} س`
  const d = Math.floor(h / 24)
  return `منذ ${d} ي`
}

export function NotificationBell({ hrefAll = '/teacher/notifications' }: { hrefAll?: string }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [unread, setUnread] = useState(0)
  const [pending, start] = useTransition()
  const [pushOk, setPushOk] = useState(false)
  const [pushMsg, setPushMsg] = useState('')

  const load = useCallback(() => {
    start(async () => {
      const r = await getMyNotifications()
      if (!r.error) {
        setItems(r.items as Item[])
        setUnread(r.unread)
      }
    })
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    const key = 'ashbal_notified_ids'
    let seen: string[] = []
    try {
      seen = JSON.parse(localStorage.getItem(key) || '[]')
    } catch {
      seen = []
    }
    const fresh = items.filter(
      (i) => !i.read_at && (i.kind === 'missed_session' || i.kind === 'today_sessions') && !seen.includes(i.id)
    )
    if (!fresh.length) return
    for (const n of fresh.slice(0, 3)) {
      try {
        new Notification(n.title, {
          body: n.body,
          icon: '/icons/icon-192.png',
          tag: n.id,
          dir: 'rtl',
          lang: 'ar',
        })
        seen.push(n.id)
      } catch {
        /* ignore */
      }
    }
    try {
      localStorage.setItem(key, JSON.stringify(seen.slice(-80)))
    } catch {
      /* ignore */
    }
  }, [items])

  async function enablePush() {
    setPushMsg('')
    if (!('Notification' in window)) {
      setPushMsg('المتصفح لا يدعم الإشعارات')
      return
    }
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      setPushMsg('تم رفض الإذن — فعّله من إعدادات المتصفح')
      return
    }
    setPushOk(true)
    setPushMsg('تم تفعيل تنبيهات المتصفح ✓')
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready
        const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (vapid && reg.pushManager) {
          const padding = '='.repeat((4 - (vapid.length % 4)) % 4)
          const base64 = (vapid + padding).replace(/-/g, '+').replace(/_/g, '/')
          const raw = atob(base64)
          const out = new Uint8Array(raw.length)
          for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i)
          const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: out })
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
    const u = items.find((i) => !i.read_at)
    try {
      if (u) new Notification(u.title, { body: u.body, icon: '/icons/icon-192.png', dir: 'rtl' })
      else
        new Notification('إشعارات أشبال الإسلام', {
          body: 'هتوصلك تنبيهات لو فاتتك حصة أو عندك جدول اليوم',
          icon: '/icons/icon-192.png',
          dir: 'rtl',
        })
    } catch {
      /* ignore */
    }
  }

  function onOpen() {
    setOpen((v) => !v)
    if (!open) load()
  }

  function onRead(id: string) {
    start(async () => {
      await markNotificationRead(id)
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read_at: new Date().toISOString() } : i)))
      setUnread((n) => Math.max(0, n - 1))
    })
  }

  function onReadAll() {
    start(async () => {
      await markAllNotificationsRead()
      setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at || new Date().toISOString() })))
      setUnread(0)
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onOpen}
        className="relative w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.2)' }}
        aria-label="الإشعارات"
      >
        <span className="material-symbols-outlined text-white text-[22px]">notifications</span>
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
            style={{ background: '#ba1a1a' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-12 z-50 w-[min(92vw,340px)] rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: '#fff', border: '1px solid #cde8dc' }}
          >
            <div className="px-3 py-2.5 flex items-center justify-between" style={{ background: '#e8f7f0' }}>
              <p className="text-[13px] font-bold" style={{ color: '#00513c' }}>
                الإشعارات {unread > 0 ? `(${unread})` : ''}
              </p>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button type="button" onClick={onReadAll} disabled={pending} className="text-[11px] font-bold" style={{ color: '#176b52' }}>
                    قراءة الكل
                  </button>
                )}
                <Link href={hrefAll} className="text-[11px] font-bold" style={{ color: '#176b52' }} onClick={() => setOpen(false)}>
                  الكل
                </Link>
              </div>
            </div>

            <div className="px-3 py-2 border-b" style={{ borderColor: '#e8f0ec' }}>
              <button
                type="button"
                onClick={enablePush}
                className="w-full text-[12px] font-bold rounded-xl py-2"
                style={{ background: pushOk ? '#e8f7f0' : '#fff8e8', color: pushOk ? '#176b52' : '#8a5a00' }}
              >
                {pushOk ? '✓ تنبيهات المتصفح مفعّلة' : 'تفعيل الإشعارات الخارجية (المتصفح)'}
              </button>
              {pushMsg && (
                <p className="text-[10px] mt-1 text-center" style={{ color: '#6f7974' }}>
                  {pushMsg}
                </p>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-center text-[12px] py-8" style={{ color: '#6f7974' }}>
                  مفيش إشعارات حالياً
                </p>
              ) : (
                items.slice(0, 15).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (!n.read_at) onRead(n.id)
                      if (n.url) window.location.href = n.url
                      else setOpen(false)
                    }}
                    className="w-full text-right px-3 py-2.5 border-b"
                    style={{ borderColor: '#f0f4f2', background: n.read_at ? '#fff' : '#f3fbf7' }}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="material-symbols-outlined text-[18px] mt-0.5"
                        style={{ color: n.kind === 'missed_session' ? '#ba1a1a' : '#176b52' }}
                      >
                        {n.kind === 'missed_session' ? 'warning' : 'notifications'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold leading-snug" style={{ color: '#1a1c1b' }}>
                          {n.title}
                        </p>
                        <p className="text-[11px] leading-snug mt-0.5" style={{ color: '#6f7974' }}>
                          {n.body}
                        </p>
                        <p className="text-[10px] mt-1" style={{ color: '#9aa5a0' }}>
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                      {!n.read_at && <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#176b52' }} />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
