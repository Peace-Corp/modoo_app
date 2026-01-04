'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { Mail, Lock, User, Phone } from 'lucide-react'
import { routes } from '@/lib/routes'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()

  const { login, signUp, signInWithOAuth, isLoading } = useAuthStore()

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
          // User is auto-confirmed, redirect to home
          router.push(routes.home())
          router.refresh()
        }
      } else {
        const result = await login(email, password)

        if (!result.success) {
          setError(result.error || '로그인에 실패했습니다')
          return
        }

        // Login successful, redirect to home
        router.push(routes.home())
        router.refresh()
      }
    } catch (err) {
      const error = err as Error
      setError(error.message || '인증 중 오류가 발생했습니다')
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)

    try {
      const result = await signInWithOAuth('google')

      if (!result.success) {
        setError(result.error || '구글 로그인에 실패했습니다')
      }
      // OAuth will redirect automatically
    } catch (err) {
      const error = err as Error
      setError(error.message || '구글 로그인 중 오류가 발생했습니다')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-lg mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white">M</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">모두</h1>
        </div>

        {/* Main Card */}
        <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
          <div className="mb-6">
            <h2 className="text-center text-3xl font-bold text-gray-900">
              {isSignUp ? '회원가입' : '로그인'}
            </h2>
            <p className="mt-3 text-center text-sm text-gray-600">
              {isSignUp ? (
                <>
                  이미 계정이 있으신가요?{' '}
                  <button
                    onClick={() => setIsSignUp(false)}
                    className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    로그인
                  </button>
                </>
              ) : (
                <>
                  계정이 없으신가요?{' '}
                  <button
                    onClick={() => setIsSignUp(true)}
                    className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    회원가입
                  </button>
                </>
              )}
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleAuth}>
            {/* Name Field - Only for Sign Up */}
            {isSignUp && (
              <div className="transform transition-all duration-300 ease-in-out">
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                  이름
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all"
                    placeholder="홍길동"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                이메일
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all"
                  placeholder="example@email.com"
                />
              </div>
            </div>

            {/* Phone Number - Only for Sign Up */}
            {isSignUp && (
              <div className="transform transition-all duration-300 ease-in-out">
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                  전화번호
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all"
                    placeholder="010-1234-5678"
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Error/Success Message */}
            {error && (
              <div className={`text-sm p-4 rounded-md ${
                error.includes('Check your email') || error.includes('이메일을 확인')
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <p className="font-medium">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    처리중...
                  </span>
                ) : (
                  <span>{isSignUp ? '회원가입' : '로그인'}</span>
                )}
              </button>
            </div>
          </form>

          {/* Back to Home Link */}
          <div className="mt-6 text-center">
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
