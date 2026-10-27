'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function passwordCandidates(code: string): string[] {
  const c = code.trim()
  const upper = c.toUpperCase()
  const list = [c, upper, (c * 6).slice(0, 6), (upper * 6).slice(0, 6)]
  if (upper === 'ADMIN') list.push('AshbalADMIN')
  return [...new Set(list.filter((x) => x.length >= 6 || upper === 'ADMIN'))]
}

export default function LoginPage() {
  const router = useRouter()
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
      try {
        const supabase = createClient()
        const emails = [
          `${raw.toUpperCase()}@ashbal.local`,
          `${raw.toLowerCase()}@ashbal.local`,
          `${raw}@ashbal.local`,
        ]
        const passwords = passwordCandidates(raw)
        let ok = false
        for (const email of emails) {
          for (const password of passwords) {
            const { error: err } = await supabase.auth.signInWithPassword({ email, password })
            if (!err) {
              ok = true
              break
            }
          }
          if (ok) break
        }
        if (!ok) {
          setError('الكود غير صحيح')
          return
        }
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setError('حصل خطأ في الجلسة — جرّب تاني')
          return
        }
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        const role = profile?.role
        if (role === 'teacher') router.replace('/teacher')
        else if (role === 'supervisor') router.replace('/supervisor')
        else if (role === 'parent') router.replace('/parent')
        else router.replace('/admin')
      } catch {
        setError('مشكلة في الاتصال — تأكد من النت وحاول مرة أخرى')
      }
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
          <p className="text-[13px] mt-1" style={{ color: '#6f7974' }}>دخول بالكود فقط</p>
        </div>

        <form onSubmit={submit} className="card p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold mb-1.5" style={{ color: '#3f4944' }}>كود الدخول</label>
            <input
              className="input text-center text-[18px] tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="مثال: 2468 أو ADMIN"
              autoComplete="username"
              required
              dir="ltr"
              autoFocus
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
