import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return response
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  const isProtected = pathname.startsWith('/admin') || 
                      pathname.startsWith('/teacher') || 
                      pathname.startsWith('/student') || 
                      pathname.startsWith('/parent')

  if (isProtected) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirectedFrom', pathname)
      return NextResponse.redirect(url)
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Middleware profile fetch error:', error)
      if (error.code === 'PGRST116') {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }
    } else if (!profile) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    } else {
      const role = profile.role

      if (pathname.startsWith('/admin') && role !== 'admin') {
        return NextResponse.redirect(new URL(`/${role}`, request.url))
      }
      if (pathname.startsWith('/teacher') && role !== 'teacher') {
        return NextResponse.redirect(new URL(`/${role}`, request.url))
      }
      if (pathname.startsWith('/student') && role !== 'student') {
        return NextResponse.redirect(new URL(`/${role}`, request.url))
      }
      if (pathname.startsWith('/parent') && role !== 'parent') {
        return NextResponse.redirect(new URL(`/${role}`, request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/teacher/:path*',
    '/student/:path*',
    '/parent/:path*',
  ],
}
