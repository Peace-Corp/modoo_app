'use client'

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';

type ConfirmStatus = 'loading' | 'success' | 'error';

function CoBuyPaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const shareToken = params.shareToken as string;
  const [status, setStatus] = useState<ConfirmStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const confirmPayment = async () => {
      try {
        const pendingPaymentJson = sessionStorage.getItem('pendingCoBuyPayment');
        if (!pendingPaymentJson) {
          throw new Error('결제 정보를 찾을 수 없습니다.');
        }

        const pendingPayment = JSON.parse(pendingPaymentJson) as {
          participantId: string;
          sessionId: string;
          orderId: string;
          amount: number;
          shareToken?: string;
        };

        const requestData = {
          orderId: searchParams.get('orderId'),
          amount: Number(searchParams.get('amount')),
          paymentKey: searchParams.get('paymentKey'),
          participantId: pendingPayment.participantId,
          sessionId: pendingPayment.sessionId,
        };

        const response = await fetch('/api/cobuy/payment/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        const json = await response.json();
        if (!response.ok || !json.success) {
          throw { message: json.message || json.error || '결제 확인 실패', code: json.code };
        }

        sessionStorage.removeItem('pendingCoBuyPayment');
        setStatus('success');
      } catch (error) {
        console.error('CoBuy payment confirmation error:', error);
        const message = error instanceof Error ? error.message : '결제 확인 중 오류가 발생했습니다';
        const code = (error as { code?: string })?.code || 'UNKNOWN';
        setErrorMessage(message);
        setStatus('error');
        router.replace(`/cobuy/${shareToken}/fail?code=${encodeURIComponent(code)}&message=${encodeURIComponent(message)}`);
      }
    };

    confirmPayment();
  }, [router, searchParams, shareToken]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4" />
          <p className="text-lg text-gray-700">결제를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{errorMessage || '결제 확인에 실패했습니다.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">결제가 완료되었습니다</h1>
        <p className="text-gray-600 mb-6">
          공동구매 참여가 정상적으로 접수되었습니다. 함께해주셔서 감사합니다.
        </p>
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

export default function CoBuyPaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4" />
          <p className="text-lg text-gray-700">결제를 확인하고 있습니다...</p>
        </div>
      </div>
    }>
      <CoBuyPaymentSuccessContent />
    </Suspense>
  );
}
