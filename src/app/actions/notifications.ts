'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'
import {
  countUnread,
  listUserNotifications,
  generateTeacherSessionReminders,
} from '@/lib/notifications'

export async function getMyNotifications() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح', items: [], unread: 0 }

  // حدّث تذكيرات الحصص عند فتح الجرس (خفيف + آمن للتكرار)
  try {
    await generateTeacherSessionReminders()
  } catch {
    /* لا نكسر التحميل */
  }

  try {
    const [items, unread] = await Promise.all([
      listUserNotifications(user.id, 50),
      countUnread(user.id),
    ])
    return { items, unread }
  } catch (e: any) {
    return { error: e?.message || 'فشل التحميل', items: [], unread: 0 }
  }
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }
  const sb = serviceClient()
  const { error } = await sb
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/teacher')
  revalidatePath('/teacher/notifications')
  return { success: true }
}

export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }
  const sb = serviceClient()
  const { error } = await sb
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)
  if (error) return { error: error.message }
  revalidatePath('/teacher')
  revalidatePath('/teacher/notifications')
  return { success: true }
}

export async function savePushSubscription(sub: {
  endpoint: string
  keys: { p256dh: string; auth: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return { error: 'بيانات الاشتراك ناقصة' }
  }
  const sb = serviceClient()
  await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  const { error } = await sb.from('push_subscriptions').insert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    user_agent: '',
    last_ok_at: new Date().toISOString(),
  })
  if (error) return { error: error.message }
  return { success: true }
}

export async function runTeacherRemindersNow() {
  try {
    const stats = await generateTeacherSessionReminders()
    return { success: true, stats }
  } catch (e: any) {
    return { error: e?.message || String(e) }
  }
}
