import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_COOKIE = 'ashbal_role'
const ROLE_MAX_AGE = 60 * 60 * 24 * 30

function homeForRole(r: string) {
  if (r === 'teacher') return '/teacher'
  if (r === 'supervisor') return '/supervisor'
  if (r === 'parent') return '/parent'
  return '/admin'
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bmemllsjduxlqmwnpfya.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_LM3NJ51Ab6W1gLnE3fKxcQ_T0KOV0Ar'

  const pathname = request.nextUrl.pathname
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/evaluate') ||
    pathname.startsWith('/student') ||
    pathname.startsWith('/app') ||
    pathname.startsWith('/api/student-portal') ||
    pathname.startsWith('/api/student-courses') ||
    pathname.startsWith('/api/course-subscribe') ||
    pathname.startsWith('/api/cron')

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|css|js|woff2?)$/)
  ) {
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              maxAge: options?.maxAge ?? ROLE_MAX_AGE,
              sameSite: 'lax',
              path: '/',
            })
          )
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user && !isPublic) {
      const hasAuthCookie = request.cookies
        .getAll()
        .some((c) => c.name.includes('auth-token') || c.name.startsWith('sb-'))
      if (!hasAuthCookie) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.search = ''
        return NextResponse.redirect(redirectUrl)
      }
      return supabaseResponse
    }

    if (user && !isPublic) {
      let role = request.cookies.get(ROLE_COOKIE)?.value || ''

      const needsFreshRole =
        !role ||
        !['admin', 'teacher', 'supervisor', 'parent'].includes(role) ||
        pathname.startsWith('/admin/session-settle') ||
        pathname.startsWith('/admin/payroll') ||
        pathname.startsWith('/teacher') ||
        pathname.startsWith('/supervisor')

      if (needsFreshRole) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()
          if (profile?.role) role = String(profile.role)
          else if (!role) role = 'admin'
        } catch {
          if (!role) role = 'admin'
        }
        supabaseResponse.cookies.set(ROLE_COOKIE, role, {
          maxAge: ROLE_MAX_AGE,
          sameSite: 'lax',
          path: '/',
          httpOnly: false,
        })
      }

      const deny = () => {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = homeForRole(role)
        redirectUrl.search = ''
        const res = NextResponse.redirect(redirectUrl)
        res.cookies.set(ROLE_COOKIE, role, {
          maxAge: ROLE_MAX_AGE,
          sameSite: 'lax',
          path: '/',
        })
        return res
      }

      if (pathname.startsWith('/admin')) {
        if (role === 'admin') {
          // ok
        } else if (role === 'supervisor') {
          const supervisorAllowed =
            pathname.startsWith('/admin/notes') ||
            pathname.startsWith('/admin/students') ||
            pathname.startsWith('/admin/finance') ||
            pathname.startsWith('/admin/fixed-schedule') ||
            pathname.startsWith('/admin/schedule') ||
            pathname.startsWith('/admin/subscriptions-log') ||
            pathname.startsWith('/admin/transfer') ||
            pathname.startsWith('/admin/supervisor-eval') ||
            pathname.startsWith('/admin/evaluations') ||
            pathname.startsWith('/admin/reports') ||
            pathname.startsWith('/admin/families') ||
            pathname.startsWith('/admin/chat') ||
            pathname.startsWith('/admin/edit-session') ||
            pathname.startsWith('/admin/trials') ||
            pathname.startsWith('/admin/teacher-absences') ||
            pathname.startsWith('/admin/today') ||
            pathname.startsWith('/admin/session-eval') ||
            pathname.startsWith('/admin/session-settle') ||
            pathname.startsWith('/admin/sessions-detail') ||
            pathname.startsWith('/admin/attended')

          if (!supervisorAllowed) return deny()
        } else {
          return deny()
        }
      }

      if (pathname.startsWith('/teacher') && role !== 'teacher' && role !== 'admin') {
        return deny()
      }

      if (pathname.startsWith('/supervisor') && role !== 'supervisor' && role !== 'admin') {
        return deny()
      }
    }

    if (!user && isPublic && request.cookies.get(ROLE_COOKIE)) {
      const hasAuthCookie = request.cookies
        .getAll()
        .some((c) => c.name.includes('auth-token') || c.name.startsWith('sb-'))
      if (!hasAuthCookie) {
        supabaseResponse.cookies.set(ROLE_COOKIE, '', { maxAge: 0, path: '/' })
      }
    }
  } catch {
    return NextResponse.next({ request })
  }

  return supabaseResponse
}
