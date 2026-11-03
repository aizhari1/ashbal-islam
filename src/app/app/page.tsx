'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { loadLastRole, loadStudentCode, saveLastRole, homeForRole, type AppRole } from '@/lib/app-prefs'
import { loadSessionBackup, loadRoleBackup } from '@/lib/session-persist'
import { BRAND_LOGO_SRC, BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand-logo'

/**
 * بوابة التطبيق:
 * - لو فيه جلسة محفوظة → يدخل لوحة الدور مباشرة
 * - لو طالب محفوظ كوده → بوابة الطالب
 * - غير كده → اختيار الدور مرة واحدة (معلم / إدارة / إشراف / طالب)
 */
export default function AppEntryPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()

        // استعادة جلسة من النسخة الاحتياطية إن لزم
        let {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          const backup = loadSessionBackup()
          if (backup?.access_token && backup?.refresh_token) {
            const { data } = await supabase.auth.setSession({
              access_token: backup.access_token,
              refresh_token: backup.refresh_token,
            })
            session = data.session
          }
        }

        if (cancelled) return

        if (session?.user) {
          let role = loadRoleBackup() || loadLastRole() || ''
          if (!role || role === 'student') {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .maybeSingle()
              if (profile?.role) role = profile.role
            } catch {
              role = role || 'admin'
            }
          }
          if (role && role !== 'student') {
            saveLastRole(role as AppRole)
            router.replace(homeForRole(role))
            return
          }
        }

        // طالب محفوظ
        const last = loadLastRole()
        if (last === 'student' && loadStudentCode()) {
          router.replace('/student')
          return
        }

        // آخر دور بدون جلسة → صفحة دخول الدور
        if (last === 'teacher' || last === 'admin' || last === 'supervisor') {
          router.replace('/login?role=' + last)
          return
        }

        setShowPicker(true)
      } catch {
        setShowPicker(true)
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router])

  function pick(role: AppRole) {
    saveLastRole(role)
    if (role === 'student') router.replace('/student')
    else router.replace('/login?role=' + role)
  }

  if (checking && !showPicker) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center p-6" style={{ background: '#eefdf6' }}>
        <img src={BRAND_LOGO_SRC} alt="" width={120} height={120} className="mb-4 object-contain" />
        <p className="text-[14px] font-medium" style={{ color: '#00513c' }}>
          جاري فتح أشبال الإسلام...
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-5" style={{ background: '#eefdf6' }}>
      <img src={BRAND_LOGO_SRC} alt={BRAND_NAME} width={140} height={140} className="mb-3 object-contain" />
      <h1 className="text-[22px] font-bold" style={{ color: '#00513c' }}>
        {BRAND_NAME}
      </h1>
      <p className="text-[13px] mb-6" style={{ color: '#6f7974' }}>
        {BRAND_TAGLINE}
      </p>

      <div className="w-full max-w-sm space-y-3">
        <p className="text-center text-[13px] font-semibold mb-1" style={{ color: '#3f4944' }}>
          اختر نوع الدخول (مرة واحدة)
        </p>

        <button type="button" onClick={() => pick('teacher')} className="card w-full p-4 flex items-center gap-3 text-right">
          <span className="material-symbols-outlined text-3xl" style={{ color: '#176b52' }}>
            record_voice_over
          </span>
          <span>
            <span className="block font-bold text-[15px]" style={{ color: '#00513c' }}>
              معلم
            </span>
            <span className="text-[12px]" style={{ color: '#6f7974' }}>
              بالكود — ويُحفظ الدخول تلقائيًا
            </span>
          </span>
        </button>

        <button type="button" onClick={() => pick('admin')} className="card w-full p-4 flex items-center gap-3 text-right">
          <span className="material-symbols-outlined text-3xl" style={{ color: '#176b52' }}>
            admin_panel_settings
          </span>
          <span>
            <span className="block font-bold text-[15px]" style={{ color: '#00513c' }}>
              إدارة
            </span>
            <span className="text-[12px]" style={{ color: '#6f7974' }}>
              بالكود — ويُحفظ الدخول تلقائيًا
            </span>
          </span>
        </button>

        <button type="button" onClick={() => pick('supervisor')} className="card w-full p-4 flex items-center gap-3 text-right">
          <span className="material-symbols-outlined text-3xl" style={{ color: '#176b52' }}>
            supervisor_account
          </span>
          <span>
            <span className="block font-bold text-[15px]" style={{ color: '#00513c' }}>
              إشراف
            </span>
            <span className="text-[12px]" style={{ color: '#6f7974' }}>
              بالكود — ويُحفظ الدخول تلقائيًا
            </span>
          </span>
        </button>

        <button type="button" onClick={() => pick('student')} className="card w-full p-4 flex items-center gap-3 text-right">
          <span className="material-symbols-outlined text-3xl" style={{ color: '#176b52' }}>
            school
          </span>
          <span>
            <span className="block font-bold text-[15px]" style={{ color: '#00513c' }}>
              طالب
            </span>
            <span className="text-[12px]" style={{ color: '#6f7974' }}>
              بالكود — ويُحفظ على الجهاز
            </span>
          </span>
        </button>

        <div className="text-center pt-2">
          <Link href="/" className="text-[12px]" style={{ color: '#176b52' }}>
            ← الموقع التعريفي
          </Link>
        </div>
      </div>
    </main>
  )
}
