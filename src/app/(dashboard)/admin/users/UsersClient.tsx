'use client'

import { useState, useTransition } from 'react'
import { addUser, setUserRole, deactivateUser, activateUser } from '@/app/actions/users'
import { useRouter } from 'next/navigation'

export function UsersClient({ profiles }: { profiles: any[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  function onAdd(formData: FormData) {
    startTransition(async () => {
      const r = await addUser(formData)
      if (r?.error) setMsg(r.error)
      else {
        setMsg('تم إضافة المستخدم')
        setShowAdd(false)
        router.refresh()
      }
    })
  }

  function onRole(formData: FormData) {
    startTransition(async () => {
      const r = await setUserRole(formData)
      if (r?.error) setMsg(r.error)
      else { setMsg('تم تغيير الدور'); router.refresh() }
    })
  }

  function onDeactivate(formData: FormData) {
    startTransition(async () => {
      const r = await deactivateUser(formData)
      if (r?.error) setMsg(r.error)
      else { setMsg('تم التعطيل'); router.refresh() }
    })
  }

  function onActivate(formData: FormData) {
    startTransition(async () => {
      const r = await activateUser(formData)
      if (r?.error) setMsg(r.error)
      else { setMsg('تم التفعيل'); router.refresh() }
    })
  }

  return (
    <main className="px-4">
      <button type="button" onClick={() => setShowAdd(!showAdd)} className="btn-primary w-full py-3 mb-4 text-[14px]">
        {showAdd ? 'إغلاق' : '+ إضافة مستخدم (مدير / مشرف / معلم)'}
      </button>

      {showAdd && (
        <form action={onAdd} className="card p-4 mb-4 space-y-3">
          <input name="code" className="input" placeholder="الكود (مثال: T-099 أو S-01)" required dir="ltr" />
          <input name="full_name" className="input" placeholder="الاسم الكامل" required />
          <input name="password" type="password" className="input" placeholder="كلمة المرور (6+)" required dir="ltr" />
          <select name="role" className="input" defaultValue="teacher">
            <option value="admin">مدير</option>
            <option value="supervisor">مشرف</option>
            <option value="teacher">معلم</option>
            <option value="parent">ولي أمر</option>
          </select>
          <button type="submit" disabled={isPending} className="btn-primary w-full py-2.5">حفظ المستخدم</button>
        </form>
      )}

      {msg && <p className="text-[13px] mb-3 text-center" style={{ color: '#176b52' }}>{msg}</p>}

      <div className="space-y-2">
        {profiles.map((p) => (
          <div key={p.id} className="card p-3.5">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-[14px]">{p.full_name}</p>
                <p className="text-[11px]" style={{ color: '#6f7974' }} dir="ltr">{p.code}</p>
              </div>
              <span className={p.is_active ? 'badge-ok' : 'badge-err'}>
                {p.is_active ? 'نشط' : 'معطّل'}
              </span>
            </div>

            <form action={onRole} className="flex gap-2 mt-3 items-center">
              <input type="hidden" name="id" value={p.id} />
              <select name="role" defaultValue={p.role} className="input text-[13px] flex-1">
                <option value="admin">مدير</option>
                <option value="supervisor">مشرف</option>
                <option value="teacher">معلم</option>
                <option value="parent">ولي أمر</option>
              </select>
              <button type="submit" disabled={isPending} className="btn-primary px-3 py-2 text-[12px]">تغيير</button>
            </form>

            <div className="mt-2">
              {p.is_active ? (
                <form action={onDeactivate}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" disabled={isPending} className="text-[12px] font-semibold" style={{ color: '#ba1a1a' }}>
                    تعطيل الحساب
                  </button>
                </form>
              ) : (
                <form action={onActivate}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" disabled={isPending} className="text-[12px] font-semibold" style={{ color: '#176b52' }}>
                    تفعيل الحساب
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
