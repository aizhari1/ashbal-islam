'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const supabase = createClient()
      const tryLogin = async (email: string) =>
        supabase.auth.signInWithPassword({ email, password })

      let res = await tryLogin(`${code.trim().toUpperCase()}@ashbal.local`)
      if (res.error) res = await tryLogin(`${code.trim().toLowerCase()}@ashbal.local`)
      if (res.error) {
        setError('الكود أو كلمة المرور غير صحيحة')
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/admin'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      const role = profile?.role
      if (role === 'teacher') router.push('/teacher')
      else if (role === 'supervisor') router.push('/supervisor')
      else if (role === 'parent') router.push('/parent')
      else router.push('/admin')
      router.refresh()
    })
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-5" style={{ background: '#eefdf6' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 shadow-lg"
            style={{ background: 'linear-gradient(145deg, #176b52, #00513c)' }}
          >
            <span className="material-symbols-outlined text-4xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
              menu_book
            </span>
          </div>
          <h1 className="text-[22px] font-bold" style={{ color: '#00513c' }}>أكاديمية أشبال الإسلام</h1>
          <p className="text-[13px] mt-1" style={{ color: '#6f7974' }}>تحفيظ القرآن · إدارة الحلقات والطلاب</p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#3f4944' }}>كود الدخول</label>
            <input
              className="input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="مثال: ADMIN أو كود المعلم"
              autoComplete="username"
              required
              dir="ltr"
              style={{ textAlign: 'center', letterSpacing: '0.05em' }}
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#3f4944' }}>كلمة المرور</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              dir="ltr"
              style={{ textAlign: 'center' }}
            />
          </div>

          {error && (
            <p className="text-[13px] text-center rounded-lg py-2" style={{ background: '#ffdad6', color: '#93000a' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={isPending} className="btn-primary w-full py-3.5 text-[15px] disabled:opacity-60">
            {isPending ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>

        <div className="text-center mt-5">
          <Link href="/evaluate" className="text-[13px] font-medium" style={{ color: '#176b52' }}>
            تقييم أولياء الأمور ←
          </Link>
        </div>
      </div>
    </main>
  )
}
