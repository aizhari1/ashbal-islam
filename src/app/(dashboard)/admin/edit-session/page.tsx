import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** عدّاد الطالب يتعدّل من تعديل بيانات طالب */
export default function Page() {
  redirect('/supervisor/edit-student')
}
