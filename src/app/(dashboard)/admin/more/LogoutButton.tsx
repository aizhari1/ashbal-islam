'use client'
import { createClient } from '@/lib/supabase/client'
import { clearSessionBackup } from '@/lib/session-persist'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await createClient().auth.signOut({ scope: 'global' })
        } catch {
          /* ignore */
        }
        clearSessionBackup()
        router.push('/login')
        router.refresh()
      }}
      className="w-full mt-4 bg-[#ffdad6] text-[#ba1a1a] py-3 rounded-2xl font-bold text-[14px]"
    >
      تسجيل الخروج
    </button>
  )
}
