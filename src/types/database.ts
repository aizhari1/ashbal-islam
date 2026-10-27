export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type UserRole = 'admin' | 'supervisor' | 'teacher' | 'parent' | 'student'
export type StudentStatus = 'نشط' | 'موقوف' | 'منسحب' | 'تجريبي' | 'مؤجل'
export type AttendanceStatus = 'حاضر' | 'غائب' | 'متأخر' | 'معذور' | 'تجريبي'
