'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabase-client'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)
  const router = useRouter()
  const { updatePassword, isLoading } = useAuthStore()

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setIsValidSession(true)
      } else {
        setIsValidSession(false)
      }
    }

    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!password || !confirmPassword) {
      setError('모든 필드를 입력해주세요.')
      return
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.')
      return
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    const result = await updatePassword(password)

    if (!result.success) {
      setError(result.error || '비밀번호 변경에 실패했습니다.')
      return
    }

    setSuccess(true)

    setTimeout(() => {
      router.push('/login')
    }, 3000)
  }

  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-[#3B55A5] rounded-full"></div>
      </div>
    )
  }

  if (isValidSession === false) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full text-center">
          <div className="text-center mb-8 flex items-center justify-center">
            <img src="/icons/modoo_logo.png" alt="MODOO Uniform" />
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-800 mb-2">유효하지 않은 링크</h2>
            <p className="text-red-700 mb-4">
              비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다.
            </p>
            <Link
              href="/reset-password"
              className="inline-block py-2 px-4 rounded-md text-sm font-semibold text-white bg-[#3B55A5] hover:bg-[#2D4280]"
            >
              다시 요청하기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full text-center">
          <div className="text-center mb-8 flex items-center justify-center">
            <img src="/icons/modoo_logo.png" alt="MODOO Uniform" />
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-green-800 mb-2">비밀번호가 변경되었습니다</h2>
            <p className="text-green-700">
              새 비밀번호로 로그인하실 수 있습니다.
              잠시 후 로그인 페이지로 이동합니다...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8 flex items-center justify-center">
          <img src="/icons/modoo_logo.png" alt="MODOO Uniform" />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">새 비밀번호 설정</h2>
          <p className="text-center text-sm text-gray-600 mb-6">
            새로운 비밀번호를 입력해주세요.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
                새 비밀번호
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B55A5] focus:border-[#3B55A5] text-gray-900"
                placeholder="최소 6자 이상"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-1">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B55A5] focus:border-[#3B55A5] text-gray-900"
                placeholder="비밀번호를 다시 입력해주세요"
              />
            </div>

            {error && (
              <div className="text-sm p-3 rounded-md bg-red-50 text-red-800 border border-red-200">
                <p className="font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-md text-sm font-semibold text-white bg-[#3B55A5] hover:bg-[#2D4280] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3B55A5] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  처리중...
                </span>
              ) : '비밀번호 변경'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
