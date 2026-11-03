/** تفضيلات التطبيق — آخر دور وكود محفوظين على الجهاز */

export const LAST_ROLE_KEY = 'ashbal_last_role'
export const STUDENT_CODE_KEY = 'ashbal_student_code'

export type AppRole = 'admin' | 'teacher' | 'supervisor' | 'parent' | 'student'

export function saveLastRole(role: AppRole) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LAST_ROLE_KEY, role)
  } catch {
    /* ignore */
  }
}

export function loadLastRole(): AppRole | null {
  if (typeof window === 'undefined') return null
  try {
    const r = localStorage.getItem(LAST_ROLE_KEY)
    if (r === 'admin' || r === 'teacher' || r === 'supervisor' || r === 'parent' || r === 'student') return r
  } catch {
    /* ignore */
  }
  return null
}

export function saveStudentCode(code: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STUDENT_CODE_KEY, code.trim())
    localStorage.setItem(LAST_ROLE_KEY, 'student')
  } catch {
    /* ignore */
  }
}

export function loadStudentCode(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(STUDENT_CODE_KEY)
  } catch {
    return null
  }
}

export function homeForRole(role: string): string {
  if (role === 'teacher') return '/teacher'
  if (role === 'supervisor') return '/supervisor'
  if (role === 'parent') return '/parent'
  if (role === 'student') return '/student'
  return '/admin'
}
