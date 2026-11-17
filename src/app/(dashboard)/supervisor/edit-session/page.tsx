import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/** تعديل عدّاد الطالب بقى في مكان واحد: تعديل بيانات طالب */
export default function Page() {
  redirect('/supervisor/edit-student')
}
