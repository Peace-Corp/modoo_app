'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { resetPasswordForEmail, isLoading } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email) {
      setError('이메일을 입력해주세요.')
      return
    }

    const result = await resetPasswordForEmail(email)

    if (!result.success) {
      setError(result.error || '비밀번호 재설정 요청에 실패했습니다.')
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          <div className="mb-6">
            <Link href="/login" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-[#3B55A5] transition-colors">
              ← 로그인으로 돌아가기
            </Link>
          </div>

          <div className="text-center mb-8 flex items-center justify-center">
            <img src="/icons/modoo_logo.png" alt="MODOO Uniform" />
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-green-800 mb-2">이메일을 확인해주세요</h2>
            <p className="text-green-700">
              {email}로 비밀번호 재설정 링크를 보냈습니다.
              이메일을 확인하여 비밀번호를 재설정해주세요.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="mb-6">
          <Link href="/login" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-[#3B55A5] transition-colors">
            ← 로그인으로 돌아가기
          </Link>
        </div>

        <div className="text-center mb-8 flex items-center justify-center">
          <img src="/icons/modoo_logo.png" alt="MODOO Uniform" />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">비밀번호 찾기</h2>
          <p className="text-center text-sm text-gray-600 mb-6">
            가입한 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
                이메일
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-3 py-3 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3B55A5] focus:border-[#3B55A5] text-gray-900"
                placeholder="example@email.com"
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
              ) : '재설정 링크 보내기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
