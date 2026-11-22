'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { computeAndSyncDues } from '@/lib/dues-engine'
import { requireFinanceRole } from '@/lib/payments-core'

export async function syncAllStudentDues() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'غير مصرح' }
  const auth = await requireFinanceRole(supabase)
  if (!auth.ok) return { error: auth.error }

  try {
    // كتابة صريحة فقط من زر المزامنة — وبتحافظ على manual_due
    const r = await computeAndSyncDues(supabase, { write: true })

    revalidatePath('/admin')
    revalidatePath('/admin/finance')
    revalidatePath('/admin/students')
    revalidatePath('/supervisor')
    revalidatePath('/admin/monthly')

    return { success: true, due_count: r.count, due_total: r.total, updated: r.updated }
  } catch (e: any) {
    return { error: e?.message || 'تعذّرت مزامنة المستحقات' }
  }
}
