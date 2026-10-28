'use client'

import { useState, useTransition, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function padPwd(code: string) {
  const c = code.trim()
  if (c.length >= 6) return c
  return (c + c + c + c + c + c).slice(0, 6)
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const roleHint = searchParams?.get('role') || null
  const roleTitle =
    roleHint === 'teacher'
      ? 'دخول المعلم'
      : roleHint === 'admin'
        ? 'دخول الإدارة'
        : roleHint === 'supervisor'
          ? 'دخول الإشراف'
          : 'تسجيل الدخول'
  const roleIcon =
    roleHint === 'teacher'
      ? 'record_voice_over'
      : roleHint === 'admin'
        ? 'admin_panel_settings'
        : roleHint === 'supervisor'
          ? 'supervisor_account'
          : 'menu_book'

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const raw = code.trim()
    if (!raw) {
      setError('اكتب كود الدخول')
      return
    }

    startTransition(async () => {
      const upper = raw.toUpperCase()
      const email = `${upper}@ashbal.local`
      const emailLower = `${raw.toLowerCase()}@ashbal.local`

      const attempts: [string, string][] =
        upper === 'ADMIN'
          ? [
              ['ADMIN@ashbal.local', 'AshbalADMIN'],
              ['admin@ashbal.local', 'AshbalADMIN'],
            ]
          : [
              [email, padPwd(raw)],
              [emailLower, padPwd(raw)],
              [email, raw],
              [emailLower, raw],
            ]

      try {
        const supabase = createClient()
        let lastMsg = 'الكود غير صحيح'

        for (const [em, pw] of attempts) {
          const { data, error: err } = await supabase.auth.signInWithPassword({
            email: em,
            password: pw,
          })
          if (!err && data.session) {
            let role = 'admin'
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user!.id)
                .maybeSingle()
              if (profile?.role) role = profile.role
            } catch {
              /* ignore */
            }

            if (role === 'teacher') router.replace('/teacher')
            else if (role === 'supervisor') router.replace('/supervisor')
            else if (role === 'parent') router.replace('/parent')
            else router.replace('/admin')
            return
          }
          if (err) lastMsg = err.message || lastMsg
        }

        if (/invalid login|invalid credentials/i.test(lastMsg)) {
          setError('الكود غير صحيح')
        } else if (/network|fetch|failed to fetch/i.test(lastMsg)) {
          setError('مشكلة في الاتصال بالخادم — جرّب نت تاني')
        } else {
          setError(lastMsg)
        }
      } catch (e: any) {
        const msg = String(e?.message || e || '')
        if (/fetch|network|Failed/i.test(msg)) {
          setError('الاتصال بـ Supabase فشل. تأكد إن النت شغال.')
        } else {
          setError(msg || 'خطأ غير متوقع')
        }
      }
    })
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div
          className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 shadow-lg"
          style={{ background: 'linear-gradient(145deg, #176b52, #00513c)' }}
        >
          <span className="material-symbols-outlined text-4xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
            {roleIcon}
          </span>
        </div>
        <h1 className="text-[22px] font-bold" style={{ color: '#00513c' }}>{roleTitle}</h1>
        <p className="text-[13px] mt-1" style={{ color: '#6f7974' }}>أكاديمية أشبال الإسلام — بالكود فقط</p>
      </div>

      <form onSubmit={submit} className="card p-5 space-y-4">
        <div>
          <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#3f4944' }}>كود الدخول</label>
          <input
            className="input text-center text-[18px] tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="username"
            required
            dir="ltr"
            autoFocus
          />
        </div>
        {error && (
          <p className="text-[12px] text-center rounded-lg py-2 px-2 break-words" style={{ background: '#ffdad6', color: '#93000a' }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={isPending} className="btn-primary w-full py-3.5 text-[15px] disabled:opacity-60">
          {isPending ? 'جاري الدخول...' : 'دخول'}
        </button>
      </form>

      <div className="text-center mt-5 space-y-2">
        <div>
          <Link href="/" className="text-[13px] font-medium" style={{ color: '#176b52' }}>
            ← الصفحة الرئيسية
          </Link>
        </div>
        <div>
          <Link href="/student" className="text-[13px] font-medium" style={{ color: '#176b52' }}>
            بوابة الطالب بالكود
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-5" style={{ background: '#eefdf6' }}>
      <Suspense fallback={<p className="text-[13px]" style={{ color: '#6f7974' }}>جاري التحميل...</p>}>
        <LoginForm />
      </Suspense>
    </main>
  )
}
