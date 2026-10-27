'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const rawCode = code.trim()
      const email = rawCode.includes('@') ? rawCode : `${rawCode.toLowerCase()}@ashbal.local`

      let pw = password.trim()
      if (!pw) pw = rawCode
      if (pw.length < 6) pw = `Ashbal${rawCode}`

      const { error: authError } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (authError) {
        if (password.trim() && password.trim().length < 6) {
          const { error: e2 } = await supabase.auth.signInWithPassword({ email, password: `Ashbal${rawCode}` })
          if (e2) { setError('الكود أو كلمة المرور غير صحيحة'); setLoading(false); return }
        } else {
          setError('الكود أو كلمة المرور غير صحيحة')
          setLoading(false)
          return
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id || '').single()
      const role = profile?.role || 'admin'
      if (role === 'teacher') router.push('/teacher')
      else if (role === 'supervisor') router.push('/supervisor')
      else if (role === 'parent') router.push('/parent')
      else router.push('/admin')
      router.refresh()
    } catch {
      setError('حدث خطأ في الاتصال')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 bg-[#eefdf6]">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-[rgba(18,61,50,0.06)] max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#176b52] flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-3xl text-white">menu_book</span>
          </div>
          <h1 className="text-[20px] font-bold text-[#00513c]">أكاديمية أشبال الإسلام</h1>
          <p className="text-[13px] text-[#6f7974] mt-1">تسجيل الدخول بالكود</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium mb-1.5 text-[#3f4944]">الكود</label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} required dir="ltr"
              className="w-full bg-[#eefdf6] border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#176b52]"
              placeholder="ADMIN أو كود المعلم" />
          </div>
          <div>
            <label className="block text-[13px] font-medium mb-1.5 text-[#3f4944]">كلمة المرور</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr"
              className="w-full bg-[#eefdf6] border border-[#e5efe8] rounded-xl px-4 py-3 text-[14px] outline-none focus:border-[#176b52]"
              placeholder="للمدير؛ أو اتركها للكود إن كان قصيراً" />
          </div>
          {error && <div className="bg-[#ffdad6] text-[#ba1a1a] text-[13px] rounded-xl px-4 py-3 font-medium">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-[#176b52] text-white py-3.5 rounded-xl text-[15px] font-bold disabled:opacity-50">
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
        <p className="text-center text-[12px] text-[#6f7974] mt-4">
          <Link href="/" className="text-[#176b52] font-medium">العودة للرئيسية</Link>
        </p>
      </div>
    </main>
  )
}
