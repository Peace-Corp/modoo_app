'use client'

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';

type ConfirmStatus = 'loading' | 'success' | 'error';

function getErrorDetails(error: unknown): { message: string; code?: string } {
  if (error instanceof Error) {
    const code = (error as { code?: unknown })?.code;
    return {
      message: error.message,
      code: typeof code === 'string' ? code : undefined,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (error && typeof error === 'object') {
    const maybeMessage = (error as { message?: unknown })?.message;
    const maybeError = (error as { error?: unknown })?.error;
    const maybeCode = (error as { code?: unknown })?.code;

    const message =
      typeof maybeMessage === 'string'
        ? maybeMessage
        : typeof maybeError === 'string'
          ? maybeError
          : '결제 확인 중 오류가 발생했습니다';

    return {
      message,
      code: typeof maybeCode === 'string' ? maybeCode : undefined,
    };
  }

  return { message: '결제 확인 중 오류가 발생했습니다' };
}

function CoBuyPaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const rawShareToken = params.shareToken;
  const shareToken = Array.isArray(rawShareToken) ? rawShareToken[0] : (rawShareToken as string);
  const [status, setStatus] = useState<ConfirmStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const confirmPayment = async () => {
      let resolvedParticipantId: string | undefined;
      let resolvedSessionId: string | undefined;

      try {
        const orderId = searchParams.get('orderId');
        const paymentKey = searchParams.get('paymentKey');
        const amountRaw = searchParams.get('amount');
        const amount = amountRaw ? Number(amountRaw) : Number.NaN;

        if (!orderId || !paymentKey || !Number.isFinite(amount)) {
          throw new Error('결제 정보가 올바르지 않습니다.');
        }

        const participantIdFromUrl = searchParams.get('participantId') || undefined;
        const sessionIdFromUrl = searchParams.get('sessionId') || undefined;

        let participantId = participantIdFromUrl;
        let sessionId = sessionIdFromUrl;

        if (!participantId || !sessionId) {
          const pendingPaymentJson = sessionStorage.getItem('pendingCoBuyPayment');
          if (pendingPaymentJson) {
            const pendingPayment = JSON.parse(pendingPaymentJson) as {
              participantId?: string;
              sessionId?: string;
              orderId?: string;
            };
            participantId ||= pendingPayment.participantId;
            sessionId ||= pendingPayment.sessionId;
          }
        }

        if (!participantId || !sessionId) {
          throw new Error('참여자 정보를 찾을 수 없습니다.');
        }

        resolvedParticipantId = participantId;
        resolvedSessionId = sessionId;

        const requestData = {
          orderId,
          amount,
          paymentKey,
          participantId,
          sessionId,
        };

        const response = await fetch('/api/cobuy/payment/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        const responseClone = response.clone();
        let json: unknown;
        try {
          json = await response.json();
        } catch (parseError) {
          const text = await responseClone.text().catch(() => '');
          const error = new Error('결제 확인 응답을 처리하지 못했습니다.');
          (error as { code?: string }).code = 'INVALID_RESPONSE';
          (error as { cause?: unknown }).cause = parseError;
          console.error('CoBuy payment confirmation parse error:', {
            status: response.status,
            text,
          });
          throw error;
        }

        if (!response.ok || !(json as { success?: boolean } | null)?.success) {
          const errorMessage =
            typeof (json as { message?: unknown })?.message === 'string'
              ? (json as { message: string }).message
              : typeof (json as { error?: unknown })?.error === 'string'
                ? (json as { error: string }).error
                : '결제 확인 실패';

          const errorCode = (json as { code?: unknown })?.code;
          const error = new Error(errorMessage);
          if (typeof errorCode === 'string') {
            (error as { code?: string }).code = errorCode;
          }

          console.error('CoBuy payment confirmation failed:', {
            status: response.status,
            errorMessage,
            errorCode,
          });
          throw error;
        }

        sessionStorage.removeItem('pendingCoBuyPayment');
        setStatus('success');
      } catch (error) {
        const { message, code } = getErrorDetails(error);
        console.error('CoBuy payment confirmation error:', message, code);
        setErrorMessage(message);
        setStatus('error');
        const failParams = new URLSearchParams({
          code: code || 'UNKNOWN',
          message,
        });
        const participantId = resolvedParticipantId || searchParams.get('participantId') || undefined;
        const sessionId = resolvedSessionId || searchParams.get('sessionId') || undefined;
        if (participantId) failParams.set('participantId', participantId);
        if (sessionId) failParams.set('sessionId', sessionId);
        router.replace(`/cobuy/${shareToken}/fail?${failParams.toString()}`);
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
