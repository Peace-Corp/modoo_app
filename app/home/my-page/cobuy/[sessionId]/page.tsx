'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import { useAuthStore } from '@/store/useAuthStore';
import { createClient } from '@/lib/supabase-client';
import {
  closeCoBuySession,
  getCoBuySession,
  getParticipants,
  requestCancellation
} from '@/lib/cobuyService';
import { CoBuyParticipant, CoBuySession } from '@/types/types';
import { Calendar, CheckCircle, Clock, Copy, Users } from 'lucide-react';

const statusLabels: Record<CoBuySession['status'], { label: string; color: string }> = {
  open: { label: '모집중', color: 'bg-green-100 text-green-800' },
  closed: { label: '마감', color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: '취소됨', color: 'bg-red-100 text-red-800' },
  finalized: { label: '완료', color: 'bg-blue-100 text-blue-800' },
};

const paymentLabels: Record<CoBuyParticipant['payment_status'], { label: string; color: string }> = {
  pending: { label: '대기', color: 'bg-yellow-100 text-yellow-800' },
  completed: { label: '완료', color: 'bg-green-100 text-green-800' },
  failed: { label: '실패', color: 'bg-red-100 text-red-800' },
  refunded: { label: '환불', color: 'bg-gray-100 text-gray-800' },
};

export default function CoBuyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { isAuthenticated, user } = useAuthStore();

  const [session, setSession] = useState<CoBuySession | null>(null);
  const [participants, setParticipants] = useState<CoBuyParticipant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchSessionData = async () => {
    if (!sessionId || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const [sessionData, participantData] = await Promise.all([
        getCoBuySession(sessionId, user.id),
        getParticipants(sessionId),
      ]);

      if (!sessionData) {
        setError('공동구매 정보를 찾을 수 없습니다.');
        setSession(null);
      } else {
        setSession(sessionData);
      }

      setParticipants(participantData);
    } catch (err) {
      console.error('Error fetching CoBuy session detail:', err);
      setError('공동구매 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    fetchSessionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, sessionId, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !sessionId) return;

    const supabase = createClient();

    const participantsChannel = supabase
      .channel(`cobuy-participants-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cobuy_participants',
          filter: `cobuy_session_id=eq.${sessionId}`,
        },
        (payload) => {
          setParticipants((current) => {
            if (payload.eventType === 'INSERT') {
              const newParticipant = payload.new as CoBuyParticipant;
              return [newParticipant, ...current];
            }

            if (payload.eventType === 'UPDATE') {
              const updatedParticipant = payload.new as CoBuyParticipant;
              return current.map((participant) =>
                participant.id === updatedParticipant.id ? updatedParticipant : participant
              );
            }

            if (payload.eventType === 'DELETE') {
              const removedParticipant = payload.old as CoBuyParticipant;
              return current.filter((participant) => participant.id !== removedParticipant.id);
            }

            return current;
          });
        }
      )
      .subscribe();

    const sessionsChannel = supabase
      .channel(`cobuy-sessions-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cobuy_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new) {
            setSession(payload.new as CoBuySession);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(sessionsChannel);
    };
  }, [isAuthenticated, sessionId]);

  const completedCount = useMemo(
    () => participants.filter((participant) => participant.payment_status === 'completed').length,
    [participants]
  );

  const totalPaid = useMemo(
    () => participants.reduce((sum, participant) => sum + (participant.payment_amount || 0), 0),
    [participants]
  );

  const copyShareLink = () => {
    if (!session) return;
    const shareUrl = `${window.location.origin}/cobuy/${session.share_token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseSession = async () => {
    if (!session || session.status !== 'open') return;
    const confirmed = window.confirm('공동구매를 마감하시겠습니까? 이후에는 참여자가 추가될 수 없습니다.');
    if (!confirmed) return;

    setIsUpdating(true);
    const updated = await closeCoBuySession(session.id);
    if (updated) {
      setSession(updated);
      fetch('/api/cobuy/notify/session-closed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: updated.id }),
      }).catch((error) => console.error('Failed to notify session closed:', error));
    } else {
      alert('공동구매 마감에 실패했습니다.');
    }
    setIsUpdating(false);
  };

  const handleCancelSession = async () => {
    if (!session) return;
    const confirmed = window.confirm('공동구매를 취소 요청하시겠습니까?');
    if (!confirmed) return;

    setIsUpdating(true);
    const updated = await requestCancellation(session.id);
    if (updated) {
      setSession(updated);
    } else {
      alert('공동구매 취소 요청에 실패했습니다.');
    }
    setIsUpdating(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header back />
        <div className="max-w-3xl mx-auto p-6 text-center">
          <p className="text-gray-500 mb-4">로그인이 필요합니다.</p>
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header back />
        <div className="max-w-3xl mx-auto p-6 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="text-gray-500 mt-4">공동구매 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header back />
        <div className="max-w-3xl mx-auto p-6 text-center">
          <p className="text-red-500 mb-4">{error || '공동구매 정보를 찾을 수 없습니다.'}</p>
          <button
            onClick={() => router.push('/home/my-page/cobuy')}
            className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const statusInfo = statusLabels[session.status];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header back />

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-xl font-bold text-gray-900">{session.title}</h1>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              {session.description && (
                <p className="text-gray-600 mb-3">{session.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  시작일: {new Date(session.start_date).toLocaleDateString('ko-KR')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  종료일: {new Date(session.end_date).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={copyShareLink}
                className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>링크 복사</span>
                  </>
                )}
              </button>
              <button
                onClick={handleCloseSession}
                disabled={isUpdating || session.status !== 'open'}
                className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                마감하기
              </button>
              <button
                onClick={handleCancelSession}
                disabled={isUpdating || session.status === 'cancelled'}
                className="px-4 py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소 요청
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">진행 현황</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Users className="w-4 h-4" />
                참여 인원
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {session.current_participant_count}
                {session.max_participants ? (
                  <span className="text-sm text-gray-500"> / {session.max_participants}</span>
                ) : null}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-2">결제 완료 인원</p>
              <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-2">총 결제 금액</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalPaid.toLocaleString('ko-KR')}원
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">참여자 목록</h2>
            <button
              onClick={fetchSessionData}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              새로고침
            </button>
          </div>
          {participants.length === 0 ? (
            <p className="text-gray-500 text-sm">아직 참여한 인원이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-4 font-medium">이름</th>
                    <th className="py-2 pr-4 font-medium">이메일</th>
                    <th className="py-2 pr-4 font-medium">사이즈</th>
                    <th className="py-2 pr-4 font-medium">결제 상태</th>
                    <th className="py-2 pr-4 font-medium">결제 금액</th>
                    <th className="py-2 font-medium">참여일</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant) => {
                    const paymentInfo = paymentLabels[participant.payment_status];
                    return (
                      <tr key={participant.id} className="border-b last:border-b-0">
                        <td className="py-3 pr-4 text-gray-900 font-medium">{participant.name}</td>
                        <td className="py-3 pr-4 text-gray-600">{participant.email}</td>
                        <td className="py-3 pr-4 text-gray-600">{participant.selected_size}</td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentInfo.color}`}>
                            {paymentInfo.label}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {participant.payment_amount ? participant.payment_amount.toLocaleString('ko-KR') + '원' : '-'}
                        </td>
                        <td className="py-3 text-gray-600">
                          {new Date(participant.joined_at).toLocaleDateString('ko-KR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
