'use client'

import { useState, useTransition } from 'react'
import {
  addUser,
  setUserRole,
  deactivateUser,
  activateUser,
  linkTeacherProfile,
  setTeacherActive,
  autoLinkOrphanTeachers,
} from '@/app/actions/users'
import { useRouter } from 'next/navigation'

type Profile = {
  id: string
  code?: string | null
  full_name?: string | null
  role?: string | null
  email?: string | null
  is_active?: boolean | null
}

type Teacher = {
  id: string
  code?: string | null
  name?: string | null
  profile_id?: string | null
  is_active?: boolean | null
}

export function UsersClient({
  profiles,
  teachers,
}: {
  profiles: Profile[]
  teachers: Teacher[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  function run(fn: () => Promise<any>, okMsg?: string) {
    startTransition(async () => {
      const r = await fn()
      if (r?.error) setMsg(r.error)
      else {
        setMsg(r?.message || okMsg || 'تم')
        router.refresh()
      }
    })
  }

  const teacherProfiles = profiles.filter((p) => p.role === 'teacher')
  const profileName = (id: string | null | undefined) => {
    if (!id) return null
    const p = profiles.find((x) => x.id === id)
    return p ? `${p.full_name || '—'} (${p.code || ''})` : 'حساب محذوف؟'
  }

  const unlinkedTeachers = teachers.filter((t) => !t.profile_id)
  const linkedCount = teachers.filter((t) => t.profile_id).length

  return (
    <main className="px-4 space-y-4">
      <div className="card p-4" style={{ border: '1px solid #f0c070', background: '#fff8e8' }}>
        <p className="text-[13px] font-bold mb-1" style={{ color: '#8a5a00' }}>
          ربط المعلمين بالحسابات
        </p>
        <p className="text-[11px] mb-3" style={{ color: '#6b5a1a' }}>
          لو المعلم بيفتح ويقول «لا يوجد ملف معلم مرتبط» — اضغط الإصلاح التلقائي، أو اربط يدوياً تحت.
          مربوطة: {linkedCount} · بدون حساب: {unlinkedTeachers.length}
        </p>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => autoLinkOrphanTeachers())}
          className="w-full py-2.5 rounded-xl text-white font-bold text-[13px] disabled:opacity-60"
          style={{ background: '#755b1b' }}
        >
          {isPending ? 'جاري الإصلاح...' : 'إصلاح تلقائي — ربط كل حسابات المعلمين'}
        </button>
      </div>

      <div>
        <p className="text-[12px] font-bold mb-2" style={{ color: '#3f4944' }}>
          ملفات المعلمين ({teachers.length})
        </p>
        <div className="space-y-2">
          {teachers.map((t) => (
            <div key={t.id} className="card p-3.5">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-[14px] truncate">{t.name}</p>
                  <p className="text-[11px]" style={{ color: '#6f7974' }} dir="ltr">
                    {t.code}
                  </p>
                  <p className="text-[11px] mt-1" style={{ color: t.profile_id ? '#176b52' : '#ba1a1a' }}>
                    {t.profile_id ? `مرتبط: ${profileName(t.profile_id)}` : 'غير مرتبط بحساب دخول'}
                  </p>
                </div>
                <span className={t.is_active ? 'badge-ok' : 'badge-err'}>{t.is_active ? 'نشط' : 'موقوف'}</span>
              </div>

              <form
                className="mt-3 flex gap-2 items-center"
                onSubmit={(e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  run(() => linkTeacherProfile(fd), 'تم الربط')
                }}
              >
                <input type="hidden" name="teacher_id" value={t.id} />
                <select name="profile_id" defaultValue={t.profile_id || ''} className="input text-[12px] flex-1" required>
                  <option value="">— اختر حساب الدخول —</option>
                  {teacherProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.code})
                    </option>
                  ))}
                  {profiles
                    .filter((p) => p.role !== 'teacher')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        [دور {p.role}] {p.full_name} ({p.code})
                      </option>
                    ))}
                </select>
                <button type="submit" disabled={isPending} className="btn-primary px-3 py-2 text-[12px] shrink-0">
                  ربط
                </button>
              </form>

              <div className="mt-2">
                <button
                  type="button"
                  disabled={isPending}
                  className="text-[12px] font-semibold"
                  style={{ color: t.is_active ? '#ba1a1a' : '#176b52' }}
                  onClick={() => {
                    const fd = new FormData()
                    fd.set('teacher_id', t.id)
                    fd.set('is_active', t.is_active ? 'false' : 'true')
                    run(() => setTeacherActive(fd))
                  }}
                >
                  {t.is_active ? 'إيقاف المعلم من الرواتب' : 'تفعيل المعلم في الرواتب'}
                </button>
              </div>
            </div>
          ))}
          {teachers.length === 0 && (
            <p className="text-center text-[13px] py-4" style={{ color: '#6f7974' }}>
              مفيش صفوف في جدول المعلمين
            </p>
          )}
        </div>
      </div>

      <hr style={{ borderColor: '#cde8dc' }} />

      <button type="button" onClick={() => setShowAdd(!showAdd)} className="btn-primary w-full py-3 text-[14px]">
        {showAdd ? 'إغلاق' : '+ إضافة مستخدم (مدير / مشرف / معلم)'}
      </button>

      {showAdd && (
        <form
          className="card p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            run(async () => {
              const r = await addUser(fd)
              if (!r?.error) setShowAdd(false)
              return r
            }, 'تم إضافة المستخدم')
          }}
        >
          <input name="code" className="input" placeholder="الكود (مثال: T-099 أو S-01)" required dir="ltr" />
          <input name="full_name" className="input" placeholder="الاسم الكامل" required />
          <input name="password" type="password" className="input" placeholder="كلمة المرور (6+)" required dir="ltr" />
          <select name="role" className="input" defaultValue="teacher">
            <option value="admin">مدير</option>
            <option value="supervisor">مشرف</option>
            <option value="teacher">معلم</option>
            <option value="parent">ولي أمر</option>
          </select>
          <button type="submit" disabled={isPending} className="btn-primary w-full py-2.5">
            حفظ المستخدم
          </button>
        </form>
      )}

      {msg && (
        <p className="text-[13px] text-center font-bold" style={{ color: '#176b52' }}>
          {msg}
        </p>
      )}

      <p className="text-[12px] font-bold" style={{ color: '#3f4944' }}>
        كل الحسابات ({profiles.length})
      </p>
      <div className="space-y-2">
        {profiles.map((p) => (
          <div key={p.id} className="card p-3.5">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-[14px]">{p.full_name}</p>
                <p className="text-[11px]" style={{ color: '#6f7974' }} dir="ltr">
                  {p.code}
                </p>
              </div>
              <span className={p.is_active ? 'badge-ok' : 'badge-err'}>{p.is_active ? 'نشط' : 'معطّل'}</span>
            </div>

            <form
              className="flex gap-2 mt-3 items-center"
              onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                run(() => setUserRole(fd), 'تم تغيير الدور')
              }}
            >
              <input type="hidden" name="id" value={p.id} />
              <select name="role" defaultValue={p.role || 'teacher'} className="input text-[13px] flex-1">
                <option value="admin">مدير</option>
                <option value="supervisor">مشرف</option>
                <option value="teacher">معلم</option>
                <option value="parent">ولي أمر</option>
              </select>
              <button type="submit" disabled={isPending} className="btn-primary px-3 py-2 text-[12px]">
                تغيير
              </button>
            </form>

            <div className="mt-2">
              {p.is_active ? (
                <button
                  type="button"
                  disabled={isPending}
                  className="text-[12px] font-semibold"
                  style={{ color: '#ba1a1a' }}
                  onClick={() => {
                    const fd = new FormData()
                    fd.set('id', p.id)
                    run(() => deactivateUser(fd), 'تم التعطيل')
                  }}
                >
                  تعطيل الحساب
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  className="text-[12px] font-semibold"
                  style={{ color: '#176b52' }}
                  onClick={() => {
                    const fd = new FormData()
                    fd.set('id', p.id)
                    run(() => activateUser(fd), 'تم التفعيل')
                  }}
                >
                  تفعيل الحساب
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
