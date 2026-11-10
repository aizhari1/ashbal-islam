'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/courses'
import { serviceClient } from '@/lib/supabase/service'

function revalidate() {
  revalidatePath('/admin/packages')
  revalidatePath('/admin/students/new')
}

export async function savePackage(input: {
  id?: string
  name: string
  sessions_count: number
  duration_minutes?: number | null
  price: number
  description?: string | null
}) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error || 'للإدارة فقط' }
  const name = String(input.name || '').trim()
  const sessions = Math.round(Number(input.sessions_count))
  const price = Number(input.price)
  const dur = input.duration_minutes ? Math.round(Number(input.duration_minutes)) : null
  if (!name) return { error: 'اكتب اسم الباقة' }
  if (!Number.isFinite(sessions) || sessions <= 0) return { error: 'عدد الحصص غير صحيح' }
  if (!Number.isFinite(price) || price < 0) return { error: 'السعر غير صحيح' }
  const row: Record<string, unknown> = {
    name,
    sessions_count: sessions,
    price,
    duration_minutes: dur,
    description: input.description?.trim() || null,
  }
  const sb = serviceClient()
  const q = input.id
    ? sb.from('packages').update(row).eq('id', input.id)
    : sb.from('packages').insert({ ...row, is_active: true, currency: 'EGP' })
  const { error } = await q
  if (error) return { error: error.message }
  revalidate()
  return { success: true }
}

export async function archivePackage(id: string) {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.error || 'للإدارة فقط' }
  const { error } = await serviceClient().from('packages').update({ is_active: false }).eq('id', id)
  if (error) return { error: error.message }
  revalidate()
  return { success: true }
}
