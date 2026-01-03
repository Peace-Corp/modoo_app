'use client'

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';

function CoBuyPaymentFailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const shareToken = params.shareToken as string;

  const errorCode = searchParams.get('code') || 'UNKNOWN';
  const errorMessage = searchParams.get('message') || '결제에 실패했습니다.';

  useEffect(() => {
    const deleteParticipant = async () => {
      try {
        const pendingPaymentJson = sessionStorage.getItem('pendingCoBuyPayment');
        if (!pendingPaymentJson) return;

        const pendingPayment = JSON.parse(pendingPaymentJson) as {
          participantId: string;
          sessionId: string;
        };

        await fetch('/api/cobuy/participant/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participantId: pendingPayment.participantId,
            sessionId: pendingPayment.sessionId,
          }),
        });
      } catch (error) {
        console.error('Failed to delete CoBuy participant:', error);
      } finally {
        sessionStorage.removeItem('pendingCoBuyPayment');
      }
    };

    deleteParticipant();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">결제가 실패했습니다</h1>
        <p className="text-gray-600 mb-4">
          다시 시도하시거나 잠시 후에 시도해주세요.
        </p>
        <div className="bg-gray-100 rounded-lg p-4 text-left text-sm text-gray-600 mb-6">
          <p>오류 코드: {errorCode}</p>
          <p>메시지: {errorMessage}</p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/cobuy/${shareToken}`)}
          className="w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition"
        >
          공동구매 페이지로 돌아가기
        </button>
      </div>
    </div>
  );
}

export default function CoBuyPaymentFailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">결제 결과를 불러오는 중입니다...</p>
      </div>
    }>
      <CoBuyPaymentFailContent />
    </Suspense>
  );
}
