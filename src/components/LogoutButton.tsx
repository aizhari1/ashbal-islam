'use client'

import { createClient } from '@/lib/supabase/client'
import { clearSessionBackup } from '@/lib/session-persist'
import { useRouter } from 'next/navigation'

export function LogoutButton({
  className,
  label = 'تسجيل الخروج',
  compact = false,
}: {
  className?: string
  label?: string
  compact?: boolean
}) {
  const router = useRouter()

  async function logout() {
    try {
      await createClient().auth.signOut({ scope: 'global' })
    } catch {
      /* ignore */
    }
    clearSessionBackup()
    router.push('/login')
    router.refresh()
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={logout}
        className={className || 'text-[12px] font-semibold px-3 py-1.5 rounded-full'}
        style={{ background: '#ffdad6', color: '#ba1a1a' }}
      >
        {label}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={logout}
      className={className || 'w-full mt-4 bg-[#ffdad6] text-[#ba1a1a] py-3 rounded-2xl font-bold text-[14px]'}
    >
      {label}
    </button>
  )
}
