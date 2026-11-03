'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createUploadUrl } from '@/app/actions/courses'

export type UploadResult = { path: string; publicUrl: string | null; fileName: string; mime: string }

export default function MediaUploader({
  bucket, accept, label, onDone,
}: {
  bucket: 'landing-media' | 'course-media'
  accept: string
  label: string
  onDone: (r: UploadResult) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [name, setName] = useState('')

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(''); setBusy(true); setName(file.name)
    try {
      const up = await createUploadUrl(bucket, file.name)
      if (!('ok' in up) || !up.ok) { setErr((up as any).error || 'تعذر الرفع'); return }
      const { error } = await createClient().storage.from(bucket).uploadToSignedUrl(up.path, up.token, file, { contentType: file.type || undefined })
      if (error) { setErr(error.message.includes('exceeded') ? 'الملف أكبر من الحد المسموح في Supabase' : error.message); return }
      onDone({ path: up.path, publicUrl: up.publicUrl, fileName: file.name, mime: file.type })
    } catch (ex: any) {
      setErr(ex?.message || 'مشكلة في الاتصال')
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }

  return (
    <div>
      <input ref={ref} type="file" accept={accept} onChange={pick} className="hidden" />
      <button type="button" disabled={busy} onClick={() => ref.current?.click()}
        className="w-full rounded-lg border-2 border-dashed border-[#bec9c2] bg-white py-3 text-[13px] font-semibold text-[#176b52] disabled:opacity-60">
        <span className="material-symbols-outlined text-[18px] ml-1">{busy ? 'progress_activity' : 'upload'}</span>
        {busy ? `جاري رفع ${name}...` : label}
      </button>
      {err && <p className="text-[12px] mt-1.5" style={{ color: '#93000a' }}>{err}</p>}
    </div>
  )
}
