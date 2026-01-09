'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { Mail, Lock, User, Phone } from 'lucide-react'

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

  const { login, signUp, isLoading } = useAuthStore()

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
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-lg mb-4 shadow-lg">
            <span className="text-6xl font-bold text-white">M</span>
          </div>
          <h1 className="text-sm text-gray-900">모두의 굿즈 플렛폼</h1>
          <h1 className="text-3xl font-bold text-gray-900">모두굿즈</h1>
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
                      className="font-semibold text-blue-600 hover:text-blue-700"
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
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        placeholder="example@email.com"
                        tabIndex={isSignUp ? -1 : 0}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700 mb-1">
                      비밀번호
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        placeholder="••••••••"
                        tabIndex={isSignUp ? -1 : 0}
                      />
                    </div>
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
                    className="w-full py-3 px-4 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="font-semibold text-blue-600 hover:text-blue-700"
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
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="signup-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        placeholder="홍길동"
                        tabIndex={isSignUp ? 0 : -1}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-email" className="block text-sm font-semibold text-gray-700 mb-1">
                      이메일
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        placeholder="example@email.com"
                        tabIndex={isSignUp ? 0 : -1}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-phone" className="block text-sm font-semibold text-gray-700 mb-1">
                      전화번호
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="signup-phone"
                        type="tel"
                        autoComplete="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        placeholder="010-1234-5678"
                        tabIndex={isSignUp ? 0 : -1}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="signup-password" className="block text-sm font-semibold text-gray-700 mb-1">
                      비밀번호
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        placeholder="••••••••"
                        tabIndex={isSignUp ? 0 : -1}
                      />
                    </div>
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
                    className="w-full py-3 px-4 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                </form>
              </div>
            </div>
          </div>

          {/* Back to Home Link */}
          <div className="py-4 text-center border-t border-gray-100">
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
              ← 홈으로 돌아가기
            </Link>
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
