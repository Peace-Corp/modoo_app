'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'

const LOGIN_RETURN_TO_KEY = 'login:returnTo'

function getSafeRedirectPath(value: string | null) {
  if (!value) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  if (value.startsWith('/login')) return null
  return value
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const { login, signUp, signInWithOAuth, isLoading } = useAuthStore()

  // Check for no_account error from OAuth callback
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'no_account') {
      setError('계정이 존재하지 않습니다. 먼저 회원가입을 진행해주세요.')
      setIsSignUp(true)
    }
  }, [searchParams])

  // OAuth Login handlers (for existing users only)
  const handleGoogleLogin = async () => {
    setError(null)
    const result = await signInWithOAuth('google', 'login')
    if (!result.success) {
      setError(result.error || '구글 로그인에 실패했습니다')
    }
  }

  const handleKakaoLogin = async () => {
    setError(null)
    const result = await signInWithOAuth('kakao', 'login')
    if (!result.success) {
      setError(result.error || '카카오 로그인에 실패했습니다')
    }
  }

  // OAuth Signup handlers (for new users)
  const handleGoogleSignup = async () => {
    setError(null)
    const result = await signInWithOAuth('google', 'signup')
    if (!result.success) {
      setError(result.error || '구글 회원가입에 실패했습니다')
    }
  }

  const handleKakaoSignup = async () => {
    setError(null)
    const result = await signInWithOAuth('kakao', 'signup')
    if (!result.success) {
      setError(result.error || '카카오 회원가입에 실패했습니다')
    }
  }

  const loginFormRef = useRef<HTMLDivElement>(null)
  const signupFormRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    const updateHeight = () => {
      const activeRef = isSignUp ? signupFormRef : loginFormRef
      if (activeRef.current) {
        setContainerHeight(activeRef.current.offsetHeight)
      }
    }
    updateHeight()
  }, [isSignUp, error])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      if (isSignUp) {
        const result = await signUp(email, password, name, phoneNumber)

        if (!result.success) {
          setError(result.error || '회원가입에 실패했습니다')
          return
        }

        if (result.needsEmailConfirmation) {
          setError('이메일을 확인하여 인증을 완료해주세요!')
        } else {
          const redirectFromQuery = getSafeRedirectPath(searchParams.get('redirect'))
          const redirectFromSession = (() => {
            try {
              return getSafeRedirectPath(sessionStorage.getItem(LOGIN_RETURN_TO_KEY))
            } catch {
              return null
            }
          })()
          const redirectTo = redirectFromSession || redirectFromQuery || '/home'

          router.replace(redirectTo)
          router.refresh()

          try {
            sessionStorage.removeItem(LOGIN_RETURN_TO_KEY)
          } catch {
            // ignore
          }
        }
      } else {
        const result = await login(email, password)

        if (!result.success) {
          setError(result.error || '로그인에 실패했습니다')
          return
        }

        const redirectFromQuery = getSafeRedirectPath(searchParams.get('redirect'))
        const redirectFromSession = (() => {
          try {
            return getSafeRedirectPath(sessionStorage.getItem(LOGIN_RETURN_TO_KEY))
          } catch {
            return null
          }
        })()
        const redirectTo = redirectFromSession || redirectFromQuery || '/home'

        router.replace(redirectTo)
        router.refresh()

        try {
          sessionStorage.removeItem(LOGIN_RETURN_TO_KEY)
        } catch {
          // ignore
        }
      }
    } catch (err) {
      const error = err as Error
      setError(error.message || '인증 중 오류가 발생했습니다')
    }
  }


  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Back to Home Link */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-[#3B55A5] transition-colors">
            ← 홈으로 돌아가기
          </Link>
        </div>

        {/* Logo/Brand Section */}
        <div className="text-center mb-8 flex items-center justify-center">
          <img src="/icons/modoo_logo.png" alt="MODOO Uniform" />
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {/* Sliding Container */}
          <div
            className="overflow-hidden transition-[height] duration-300 ease-out"
            style={{ height: containerHeight ? `${containerHeight}px` : 'auto' }}
          >
            <div
              className={`flex transition-transform duration-300 ease-out ${
                isSignUp ? '-translate-x-1/2' : 'translate-x-0'
              }`}
              style={{ width: '200%' }}
            >
              {/* Login Form */}
              <div ref={loginFormRef} className="w-1/2 p-6">
                <div className="mb-6">
                  <h2 className="text-center text-2xl font-bold text-gray-900">로그인</h2>
                  <p className="mt-2 text-center text-sm text-gray-600">
                    계정이 없으신가요?{' '}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className="font-semibold text-[#3B55A5] hover:text-[#2D4280]"
                    >
                      회원가입
                    </button>
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleAuth}>
                  <div>
                    <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700 mb-1">
                      이메일
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B55A5] focus:border-[#3B55A5] text-gray-900"
                      placeholder="example@email.com"
                      tabIndex={isSignUp ? -1 : 0}
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700">
                        비밀번호
                      </label>
                      <Link
                        href="/reset-password"
                        className="text-xs text-[#3B55A5] hover:text-[#2D4280]"
                        tabIndex={isSignUp ? -1 : 0}
                      >
                        비밀번호를 잊으셨나요?
                      </Link>
                    </div>
                    <input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B55A5] focus:border-[#3B55A5] text-gray-900"
                      placeholder="••••••••"
                      tabIndex={isSignUp ? -1 : 0}
                    />
                  </div>

                  {error && !isSignUp && (
                    <div className={`text-sm p-3 rounded-md ${
                      error.includes('이메일을 확인')
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      <p className="font-medium">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || isSignUp}
                    className="w-full py-3 px-4 rounded-md text-sm font-semibold text-white bg-[#3B55A5] hover:bg-[#2D4280] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3B55A5] disabled:opacity-50 disabled:cursor-not-allowed"
                    tabIndex={isSignUp ? -1 : 0}
                  >
                    {isLoading && !isSignUp ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        처리중...
                      </span>
                    ) : '로그인'}
                  </button>

                  {/* OAuth Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">또는</span>
                    </div>
                  </div>

                  {/* OAuth Buttons */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full py-3 px-4 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3B55A5] disabled:opacity-50 flex items-center justify-center gap-3"
                      tabIndex={isSignUp ? -1 : 0}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      구글로 로그인
                    </button>

                    <button
                      type="button"
                      onClick={handleKakaoLogin}
                      disabled={isLoading}
                      className="w-full py-3 px-4 rounded-md text-sm font-medium text-[#3C1E1E] bg-[#FEE500] hover:bg-[#FDD800] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FEE500] disabled:opacity-50 flex items-center justify-center gap-3"
                      tabIndex={isSignUp ? -1 : 0}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#3C1E1E">
                        <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.84 5.18 4.6 6.54-.2.76-.72 2.76-.82 3.19-.13.54.2.53.42.39.17-.11 2.72-1.85 3.83-2.6.64.09 1.29.13 1.97.13 5.52 0 10-3.48 10-7.8S17.52 3 12 3z"/>
                      </svg>
                      카카오로 로그인
                    </button>
                  </div>
                </form>
              </div>

              {/* Sign Up Form */}
              <div ref={signupFormRef} className="w-1/2 p-6">
                <div className="mb-6">
                  <h2 className="text-center text-2xl font-bold text-gray-900">회원가입</h2>
                  <p className="mt-2 text-center text-sm text-gray-600">
                    이미 계정이 있으신가요?{' '}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className="font-semibold text-[#3B55A5] hover:text-[#2D4280]"
                    >
                      로그인
                    </button>
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleAuth}>
                  <div>
                    <label htmlFor="signup-name" className="block text-sm font-semibold text-gray-700 mb-1">
                      이름
                    </label>
                    <input
                      id="signup-name"
                      type="text"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B55A5] focus:border-[#3B55A5] text-gray-900"
                      placeholder="홍길동"
                      tabIndex={isSignUp ? 0 : -1}
                    />
                  </div>

                  <div>
                    <label htmlFor="signup-email" className="block text-sm font-semibold text-gray-700 mb-1">
                      이메일
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B55A5] focus:border-[#3B55A5] text-gray-900"
                      placeholder="example@email.com"
                      tabIndex={isSignUp ? 0 : -1}
                    />
                  </div>

                  <div>
                    <label htmlFor="signup-phone" className="block text-sm font-semibold text-gray-700 mb-1">
                      전화번호
                    </label>
                    <input
                      id="signup-phone"
                      type="tel"
                      autoComplete="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      className="block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B55A5] focus:border-[#3B55A5] text-gray-900"
                      placeholder="01012345678"
                      tabIndex={isSignUp ? 0 : -1}
                    />
                  </div>

                  <div>
                    <label htmlFor="signup-password" className="block text-sm font-semibold text-gray-700 mb-1">
                      비밀번호
                    </label>
                    <input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B55A5] focus:border-[#3B55A5] text-gray-900"
                      placeholder="••••••••"
                      tabIndex={isSignUp ? 0 : -1}
                    />
                  </div>

                  {error && isSignUp && (
                    <div className={`text-sm p-3 rounded-md ${
                      error.includes('이메일을 확인')
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      <p className="font-medium">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !isSignUp}
                    className="w-full py-3 px-4 rounded-md text-sm font-semibold text-white bg-[#3B55A5] hover:bg-[#2D4280] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3B55A5] disabled:opacity-50 disabled:cursor-not-allowed"
                    tabIndex={isSignUp ? 0 : -1}
                  >
                    {isLoading && isSignUp ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        처리중...
                      </span>
                    ) : '회원가입'}
                  </button>

                  {/* OAuth Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">또는</span>
                    </div>
                  </div>

                  {/* OAuth Signup Buttons */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleGoogleSignup}
                      disabled={isLoading}
                      className="w-full py-3 px-4 rounded-md text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3B55A5] disabled:opacity-50 flex items-center justify-center gap-3"
                      tabIndex={isSignUp ? 0 : -1}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      구글로 회원가입
                    </button>

                    <button
                      type="button"
                      onClick={handleKakaoSignup}
                      disabled={isLoading}
                      className="w-full py-3 px-4 rounded-md text-sm font-medium text-[#3C1E1E] bg-[#FEE500] hover:bg-[#FDD800] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FEE500] disabled:opacity-50 flex items-center justify-center gap-3"
                      tabIndex={isSignUp ? 0 : -1}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#3C1E1E">
                        <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.84 5.18 4.6 6.54-.2.76-.72 2.76-.82 3.19-.13.54.2.53.42.39.17-.11 2.72-1.85 3.83-2.6.64.09 1.29.13 1.97.13 5.52 0 10-3.48 10-7.8S17.52 3 12 3z"/>
                      </svg>
                      카카오로 회원가입
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-500">
          계속 진행함으로써 이용약관 및 개인정보 처리방침에 동의합니다
        </p>
      </div>
    </div>
  )
}
