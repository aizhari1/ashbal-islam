'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { serviceClient } from '@/lib/supabase/service'
import { dueAfterPackageComplete, nextPackageSessionNum, packageSize, todayKey, validateSessionWithinPackage } from '@/lib/dues'

/** حالات الحضور الفعلي (تُحسب في العداد والتقارير) */
const PRESENT_STATUSES = new Set(['حاضر', 'متأخر', 'تم الحضور'])

function normalizeStatus(status: string): string {
  if (status === 'تم الحضور') return 'حاضر'
  if (status === 'لم يحضر') return 'غائب'
  return status
}

function isPresentStatus(status: string): boolean {
  return PRESENT_STATUSES.has(status) || PRESENT_STATUSES.has(normalizeStatus(status))
}
