import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )

          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  let user = null
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    user = authUser
  } catch (err) {
    console.error('Middleware auth error:', err)
    // Treat as unauthenticated
  }

  const isPublicPath = 
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.startsWith('/unauthorized')

  if (!user && !isPublicPath) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Profile completion check
  if (user && !request.nextUrl.pathname.startsWith('/auth')) {
    const isCompleteProfilePage = request.nextUrl.pathname === '/complete-profile'
    
    // Fetch profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, dni, birth_date, phone')
      .eq('id', user.id)
      .single()

    const isProfileComplete = profile && 
      profile.first_name && 
      profile.last_name && 
      profile.dni && 
      profile.birth_date && 
      profile.phone

    if (!isProfileComplete && !isCompleteProfilePage) {
      // If profile is incomplete and user is not on completion page, redirect
      const url = request.nextUrl.clone()
      url.pathname = '/complete-profile'
      return NextResponse.redirect(url)
    }

    if (isProfileComplete && isCompleteProfilePage) {
      // If profile is already complete and user tries to access completion page, redirect to home
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
