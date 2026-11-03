'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { loadSessionBackup, saveSessionBackup, loadRoleBackup, saveRoleBackup } from '@/lib/session-persist'

/**
 * يستعيد الجلسة من localStorage لو الكوكي اختفت مؤقتًا (تحديث / WebView).
 * لا يعمل تسجيل خروج تلقائي.
 */
export function SessionRestorer() {
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.access_token) {
        saveSessionBackup(session)
        return
      }

      const backup = loadSessionBackup()
      if (!backup || cancelled) return

      const { data, error } = await supabase.auth.setSession({
        access_token: backup.access_token,
        refresh_token: backup.refresh_token,
      })
      if (!error && data.session) {
        saveSessionBackup(data.session)
        const role = loadRoleBackup()
        if (role) saveRoleBackup(role)
      }
    })()

    const {
      data: { subscription },
    } = createClient().auth.onAuthStateChange((_event, session) => {
      if (session) saveSessionBackup(session)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return null
}
