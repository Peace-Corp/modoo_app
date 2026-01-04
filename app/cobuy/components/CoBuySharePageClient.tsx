'use client'

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { addParticipant, getCoBuySessionByToken } from '@/lib/cobuyService';
import { CoBuySessionWithDetails, Product, ProductConfig, SavedDesignScreenshot } from '@/types/types';
import CoBuyDesignViewer from '@/app/components/cobuy/CoBuyDesignViewer';
import ParticipantForm, { ParticipantFormData } from '@/app/components/cobuy/ParticipantForm';
import CoBuyClosedScreen from '@/app/components/cobuy/CoBuyClosedScreen';
import TossPaymentWidget from '@/app/components/toss/TossPaymentWidget';
import { api } from '@/lib/api-client';
import { routes } from '@/lib/routes';


type DesignWithProduct = SavedDesignScreenshot & { product?: Product };

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatPrice = (price?: number | null) => {
  if (price === null || price === undefined) return '-';
  return `${price.toLocaleString('ko-KR')}원`;
};

interface CoBuySharePageClientProps {
  shareToken: string;
}

export default function CoBuySharePageClient({ shareToken }: CoBuySharePageClientProps) {

  const [session, setSession] = useState<CoBuySessionWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [participantInfo, setParticipantInfo] = useState<ParticipantFormData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareToken) {
      setFetchError('공동구매 정보를 찾을 수 없습니다.');
      setIsLoading(false);
      return;
    }

    const fetchSession = async () => {
      setIsLoading(true);
      setFetchError(null);

      const data = await getCoBuySessionByToken(shareToken);
      if (!data) {
        setFetchError('공동구매 정보를 찾을 수 없습니다.');
        setSession(null);
      } else {
        setSession(data);
      }

      setIsLoading(false);
    };

    fetchSession();
  }, [shareToken]);

  const design = session?.saved_design_screenshot as DesignWithProduct | undefined;
  const product = design?.product;

  const productConfig: ProductConfig | null = useMemo(() => {
    if (!product?.configuration) return null;
    return {
      productId: product.id,
      sides: product.configuration,
    };
  }, [product]);

  const productColor = useMemo(() => {
    const colorSelections = design?.color_selections as { productColor?: string } | null;
    return colorSelections?.productColor || '#FFFFFF';
  }, [design]);

  const sizeOptions = useMemo(() => {
    return product?.size_options?.map((size) => size.label) || [];
  }, [product]);

  const closedReason = useMemo(() => {
    if (!session) return null;

    if (session.status === 'cancelled') {
      return 'cancelled' as const;
    }

    if (session.status !== 'open') {
      return 'closed' as const;
    }

    const now = new Date();
    const endDate = new Date(session.end_date);
    if (now > endDate) {
      return 'expired' as const;
    }

    if (session.max_participants !== null &&
      session.current_participant_count >= session.max_participants) {
      return 'full' as const;
    }

    return null;
  }, [session]);

  const handleSubmit = async (data: ParticipantFormData) => {
    if (!session) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const participant = await addParticipant({
      sessionId: session.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      fieldResponses: data.fieldResponses,
      selectedSize: data.selectedSize,
    });

    if (!participant) {
      setSubmitError('참여 정보를 저장하지 못했습니다. 다시 시도해주세요.');
      setIsSubmitting(false);
      return;
    }

    const generatedOrderId = `CB-${session.id.slice(0, 8)}-${participant.id.slice(0, 8)}-${Date.now()}`;
    api.cobuy.notifyParticipantJoined({
      sessionId: session.id,
      participantId: participant.id,
    }).catch((error) => console.error('Failed to notify participant joined:', error));

    setParticipantId(participant.id);
    setParticipantInfo(data);
    setOrderId(generatedOrderId);
    setIsSubmitted(true);
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">공동구매 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">{fetchError}</p>
      </div>
    );
  }

  if (!session || !design || !productConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">공동구매 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  if (closedReason) {
    return (
      <CoBuyClosedScreen
        reason={closedReason}
        title={session.title}
        endDate={session.end_date}
        maxParticipants={session.max_participants ?? undefined}
        currentCount={session.current_participant_count}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        <header className="space-y-3">
          <p className="text-sm text-gray-500">공동구매 참여</p>
          <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
          {session.description && (
            <p className="text-gray-600">{session.description}</p>
          )}

          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
            <span>기간: {formatDate(session.start_date)} ~ {formatDate(session.end_date)}</span>
            <span>참여 인원: {session.current_participant_count}{session.max_participants ? ` / ${session.max_participants}` : ''}</span>
            <span>가격: {formatPrice(design.price_per_item)}</span>
          </div>
        </header>

        <section className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-3 mb-4">
            {design.preview_url && (
              <Image
                src={design.preview_url}
                alt={design.title || '공동구매 디자인'}
                width={56}
                height={56}
                className="rounded-lg object-cover"
              />
            )}
            <div>
              <p className="text-sm text-gray-500">디자인 미리보기</p>
              <p className="font-semibold text-gray-900">
                {design.title || product?.title || ''}
              </p>
            </div>
          </div>

          <CoBuyDesignViewer
            config={productConfig}
            canvasState={design.canvas_state as Record<string, string>}
            productColor={productColor}
          />
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">참여자 정보</h2>
          <p className="text-sm text-gray-500 mb-6">
            아래 정보를 입력하면 공동구매 참여가 접수됩니다. 결제는 다음 단계에서 진행됩니다.
          </p>

          {isSubmitted ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700">
                참여 정보가 접수되었습니다. 결제를 진행해주세요.
              </div>
              {participantInfo && orderId && (
                <TossPaymentWidget
                  amount={Math.round(design.price_per_item)}
                  orderId={orderId}
                  orderName={`${session.title} 공동구매`}
                  customerEmail={participantInfo.email}
                  customerName={participantInfo.name}
                  customerMobilePhone={participantInfo.phone}
                  successUrl={typeof window !== 'undefined'
                    ? `${window.location.origin}${routes.cobuyShareSuccess(shareToken)}`
                    : routes.cobuyShareSuccess(shareToken)}
                  failUrl={typeof window !== 'undefined'
                    ? `${window.location.origin}${routes.cobuyShareFail(shareToken)}`
                    : routes.cobuyShareFail(shareToken)}
                  onBeforePaymentRequest={() => {
                    if (!participantId || !session) return;
                    sessionStorage.setItem('pendingCoBuyPayment', JSON.stringify({
                      participantId,
                      sessionId: session.id,
                      shareToken,
                      orderId,
                      amount: Math.round(design.price_per_item),
                    }));
                  }}
                  onError={(error) => {
                    console.error('Toss payment error:', error);
                  }}
                />
              )}
            </div>
          ) : (
            <>
              <ParticipantForm
                customFields={session.custom_fields || []}
                sizeOptions={sizeOptions}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
              {submitError && (
                <p className="text-red-500 text-sm mt-3">{submitError}</p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
