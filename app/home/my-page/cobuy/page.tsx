'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { getUserCoBuySessions } from '@/lib/cobuyService';
import { CoBuySession } from '@/types/types';
import { Users, Calendar, Clock, Link as LinkIcon, Copy, CheckCircle } from 'lucide-react';
import Header from '@/app/components/Header';

export default function CoBuyListPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [sessions, setSessions] = useState<CoBuySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Fetch CoBuy sessions
  useEffect(() => {
    async function fetchSessions() {
      if (!isAuthenticated || !user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await getUserCoBuySessions();
        setSessions(data);
      } catch (err) {
        console.error('Error fetching CoBuy sessions:', err);
        setError('공동구매 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSessions();
  }, [isAuthenticated, user]);

  const copyShareLink = (shareToken: string) => {
    const shareUrl = `${window.location.origin}/cobuy/${shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedToken(shareToken);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getStatusBadge = (status: CoBuySession['status']) => {
    const badges: Record<CoBuySession['status'], { label: string; color: string }> = {
      gathering: { label: '모집중', color: 'bg-green-100 text-green-800' },
      gather_complete: { label: '모집 완료', color: 'bg-blue-100 text-blue-800' },
      order_complete: { label: '주문 완료', color: 'bg-blue-100 text-blue-800' },
      manufacturing: { label: '제작중', color: 'bg-yellow-100 text-yellow-800' },
      manufacture_complete: { label: '제작 완료', color: 'bg-blue-100 text-blue-800' },
      delivering: { label: '배송중', color: 'bg-purple-100 text-purple-800' },
      delivery_complete: { label: '배송 완료', color: 'bg-gray-100 text-gray-800' },
      cancelled: { label: '취소됨', color: 'bg-red-100 text-red-800' },
    };
    return badges[status];
  };

  const isExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <Header back />

      <div className="max-w-4xl mx-auto p-4">
        {!isAuthenticated ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">로그인이 필요합니다</p>
            <p className="text-sm text-gray-400 mb-6">
              공동구매를 확인하려면 로그인해주세요
            </p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              로그인하기
            </button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="text-gray-500 mt-4">공동구매 목록을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">생성한 공동구매가 없습니다</p>
            <p className="text-sm text-gray-400 mb-6">
              디자인 페이지에서 공동구매를 시작해보세요!
            </p>
            <button
              onClick={() => router.push('/home/designs')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              나의 디자인으로 이동
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const badge = getStatusBadge(session.status);
              const expired = isExpired(session.end_date);
              const isCopied = copiedToken === session.share_token;

              return (
                <div
                  key={session.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold">{session.title}</h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                          {expired && session.status === 'gathering' && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              기간 만료
                            </span>
                          )}
                        </div>
                        {session.description && (
                          <p className="text-sm text-gray-600">{session.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">참여 인원</p>
                        <p className="text-lg font-bold">
                          {session.current_participant_count}
                          {session.max_participants && (
                            <span className="text-sm text-gray-500">
                              {' '}/ {session.max_participants}
                            </span>
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          시작일
                        </p>
                        <p className="text-sm font-medium">
                          {new Date(session.start_date).toLocaleDateString('ko-KR')}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          종료일
                        </p>
                        <p className="text-sm font-medium">
                          {new Date(session.end_date).toLocaleDateString('ko-KR')}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">수집 정보</p>
                        <p className="text-sm font-medium">
                          {session.custom_fields.length}개 필드
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/home/my-page/cobuy/${session.id}`)}
                        className="flex-1 py-2 px-4 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        관리하기
                      </button>

                      <button
                        onClick={() => copyShareLink(session.share_token)}
                        className="py-2 px-4 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        {isCopied ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-green-600">복사됨!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>링크 복사</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="bg-gray-50 px-6 py-3 text-xs text-gray-500 flex items-center gap-4">
                    <span>생성일: {new Date(session.created_at).toLocaleDateString('ko-KR')}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" />
                      공유 링크: /cobuy/{session.share_token.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
