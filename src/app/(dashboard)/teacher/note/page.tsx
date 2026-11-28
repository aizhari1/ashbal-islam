import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** ملاحظة للإدارة اتدمجت مع المحادثة مع الإدارة */
export default function Page() {
  redirect('/teacher/chat')
}
