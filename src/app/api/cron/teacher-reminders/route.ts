import { NextRequest, NextResponse } from 'next/server'
import { generateTeacherSessionReminders } from '@/lib/notifications'
import { serviceClient } from '@/lib/supabase/service'
import { todayKey } from '@/lib/dues'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** تذكير المعلمين بالحصص — كل ساعة */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  const q = req.nextUrl.searchParams.get('secret')
  if (secret && auth !== `Bearer ${secret}` && q !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const stats = await generateTeacherSessionReminders()
    try {
      const sb = serviceClient()
      await sb.from('activity_log').insert({
        action: 'cron_teacher_reminders',
        entity_type: 'system',
        details: { date: todayKey(), ...stats },
      })
    } catch {
      /* ignore */
    }
    return NextResponse.json({ ok: true, date: todayKey(), ...stats })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
