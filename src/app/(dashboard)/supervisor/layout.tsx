import RoutePrefetch from '@/components/RoutePrefetch'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RoutePrefetch routes={['/supervisor','/admin/finance','/admin/students']} />
      {children}
    </>
  )
}
