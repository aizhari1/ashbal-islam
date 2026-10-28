'use client'

import { useState, useTransition } from 'react'
import { sendChatMessage } from '@/app/actions/notes'
import { useRouter } from 'next/navigation'

export function ChatBox({ peerId }: { peerId: string }) {
  const [body, setBody] = useState('')
  const [pending, start] = useTransition()
  const router = useRouter()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    start(async () => {
      const fd = new FormData()
      fd.set('body', body)
      fd.set('peer_id', peerId)
      await sendChatMessage(fd)
      setBody('')
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="flex gap-2 items-end">
      <textarea
        className="input flex-1 text-[14px] min-h-[44px] max-h-[100px] py-2"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="اكتب رسالة..."
        rows={1}
      />
      <button type="submit" disabled={pending} className="btn-primary px-4 py-2.5 text-[13px] shrink-0">
        إرسال
      </button>
    </form>
  )
}
