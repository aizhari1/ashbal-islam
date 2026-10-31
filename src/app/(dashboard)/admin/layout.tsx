import RoutePrefetch from '@/components/RoutePrefetch'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RoutePrefetch routes={['/admin','/admin/students','/admin/finance','/admin/monthly','/admin/payroll','/admin/chat','/admin/analytics','/admin/fixed-schedule']} />
      {children}
    </>
  )
}
