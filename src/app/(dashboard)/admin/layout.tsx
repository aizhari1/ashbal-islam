import RoutePrefetch from '@/components/RoutePrefetch'

const ROUTES = [
  '/admin',
  '/admin/features',
  '/admin/students',
  '/admin/students/new',
  '/admin/finance',
  '/admin/monthly',
  '/admin/payroll',
  '/admin/payments',
  '/admin/chat',
  '/admin/analytics',
  '/admin/fixed-schedule',
  '/admin/sessions-detail',
  '/admin/notes',
  '/admin/cashbox',
  '/admin/schedule',
  '/admin/users',
  '/admin/more',
  '/admin/activity',
  '/admin/edit-session',
  '/admin/trials',
  '/admin/reports',
  '/admin/evaluations',
  '/admin/packages',
]

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RoutePrefetch routes={ROUTES} />
      {children}
    </>
  )
}
