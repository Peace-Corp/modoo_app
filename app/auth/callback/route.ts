import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const mode = requestUrl.searchParams.get('mode') ?? 'login'
  const origin = requestUrl.origin

  // Resolve return URL: prefer query param, fall back to cookie
  let next = requestUrl.searchParams.get('next')
  if (!next || next === '/home') {
    const cookieValue = request.cookies.get('login_return_to')?.value
    if (cookieValue) {
      try { next = decodeURIComponent(cookieValue); } catch { /* keep existing */ }
    }
  }
  next = next || '/home'

  const isValidNext = next.startsWith('/') && !next.startsWith('//')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const createdAt = new Date(data.user.created_at)
      const now = new Date()
      const isNewUser = now.getTime() - createdAt.getTime() < 10000

      if (mode === 'login' && isNewUser) {
        await supabase.auth.signOut()
        const resp = NextResponse.redirect(`${origin}/login?error=no_account`)
        // Preserve the return URL cookie so the retry signup can use it
        return resp
      }

      const redirectUrl = `${origin}${isValidNext ? next : '/home'}`
      const resp = NextResponse.redirect(redirectUrl)
      // Clear the cookie now that we've used it
      resp.cookies.set('login_return_to', '', { path: '/', maxAge: 0 })
      return resp
    }
  }

  const resp = NextResponse.redirect(`${origin}/auth/auth-code-error`)
  resp.cookies.set('login_return_to', '', { path: '/', maxAge: 0 })
  return resp
}
