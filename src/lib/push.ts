import webpush from 'web-push'
import { serviceClient } from '@/lib/supabase/service'

let configured = false

function ensureVapid() {
  if (configured) return true
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@ashbal.local'
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(subject, publicKey, privateKey)
  configured = true
  return true
}

export type PushPayload = {
  title: string
  body: string
  url?: string
}

/** إرسال Push لكل أجهزة المستخدم المسجّلة */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureVapid()) return { sent: 0, skipped: true as const }

  const sb = serviceClient()
  const { data: subs, error } = await sb
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)
  if (error || !subs?.length) return { sent: 0, skipped: false as const }

  let sent = 0
  const dead: string[] = []

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url || '/teacher',
          })
        )
        sent++
        await sb
          .from('push_subscriptions')
          .update({ last_ok_at: new Date().toISOString() })
          .eq('id', s.id)
      } catch (e: any) {
        const status = e?.statusCode || e?.status
        // اشتراك منتهي أو مرفوض → امسحه
        if (status === 404 || status === 410) dead.push(s.id)
      }
    })
  )

  if (dead.length) {
    await sb.from('push_subscriptions').delete().in('id', dead)
  }

  return { sent, skipped: false as const }
}
