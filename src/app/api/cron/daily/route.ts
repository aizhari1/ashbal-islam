import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/supabase/service'
import { currentMonthKey, previousMonthKey, todayKey } from '@/lib/dues'
import { copyDatedSchedule } from '@/lib/schedule-copy'
import { computeAndSyncDues } from '@/lib/dues-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * مهمة يومية تلقائية (Vercel Cron — الساعة 3 الفجر بتوقيت القاهرة).
 * محمية بـ CRON_SECRET (فيرسل بيبعته تلقائيًا في Authorization).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const sb = serviceClient()
  const out: Record<string, unknown> = { date: todayKey() }

  // 1) المواعيد المرتبطة بتاريخ: ننسخ الشهر اللي فات للشهر الحالي (آمن للتكرار)
  try {
    out.schedule = await copyDatedSchedule(sb, previousMonthKey(), currentMonthKey())
  } catch (e: any) { out.schedule = { error: e?.message || String(e) } }

  // 2) مزامنة المستحقات — مقفولة افتراضيًا لحد ما تراجعها وتفعّلها (DUES_AUTO_SYNC=1)
  if (process.env.DUES_AUTO_SYNC === '1') {
    try {
      const r = await computeAndSyncDues(sb as any)
      out.dues = { count: r.count, total: r.total, updated: r.updated }
    } catch (e: any) { out.dues = { error: e?.message || String(e) } }
  } else {
    out.dues = 'skipped (DUES_AUTO_SYNC not enabled)'
  }

  await sb.from('activity_log').insert({ action: 'cron_daily', entity_type: 'system', details: out })
  return NextResponse.json({ ok: true, ...out })
}
