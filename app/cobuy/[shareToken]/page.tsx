'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Info } from 'lucide-react';
import { addParticipant, getCoBuySessionByToken } from '@/lib/cobuyService';
import { CoBuySessionWithDetails, Product, ProductConfig, SavedDesignScreenshot } from '@/types/types';
import CoBuyDesignViewer from '@/app/components/cobuy/CoBuyDesignViewer';
import ParticipantForm, { ParticipantFormData } from '@/app/components/cobuy/ParticipantForm';
import CoBuyClosedScreen from '@/app/components/cobuy/CoBuyClosedScreen';
import TossPaymentWidget from '@/app/components/toss/TossPaymentWidget';

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

export default function CoBuySharePage() {
  const params = useParams();
  const rawShareToken = params.shareToken;
  const shareToken = Array.isArray(rawShareToken) ? rawShareToken[0] : (rawShareToken as string);

  const [session, setSession] = useState<CoBuySessionWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [participantInfo, setParticipantInfo] = useState<ParticipantFormData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isDiscountInfoOpen, setIsDiscountInfoOpen] = useState(false);
  const discountInfoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!shareToken) return;

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

  useEffect(() => {
    if (!isDiscountInfoOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (discountInfoRef.current?.contains(target)) return;
      setIsDiscountInfoOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsDiscountInfoOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDiscountInfoOpen]);

  const design = session?.saved_design_screenshot as DesignWithProduct | undefined;
  const product = design?.product;

  const paidParticipantCount = session?.current_participant_count ?? 0;
  const paidProgressPercent = Math.min(100, Math.round((paidParticipantCount / 100) * 100))

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

    const paymentAmount = Math.round(design?.price_per_item ?? 0);
    const generatedOrderId = `CB-${session.id.slice(0, 8)}-${participant.id.slice(0, 8)}-${Date.now()}`;
    fetch('/api/cobuy/notify/participant-joined', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: session.id,
        participantId: participant.id,
      }),
    }).catch((error) => console.error('Failed to notify participant joined:', error));

    try {
      sessionStorage.setItem('pendingCoBuyPayment', JSON.stringify({
        participantId: participant.id,
        sessionId: session.id,
        shareToken,
        orderId: generatedOrderId,
        amount: paymentAmount,
      }));
    } catch (error) {
      console.error('Failed to persist CoBuy payment context:', error);
    }

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
    <div className="min-h-screen bg-white pb-16">
      <div className="mx-auto pt-6 space-y-3">
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

          {/* Progress Bar */}
          <div className="space-y-2 px-5">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="group relative flex items-center gap-1" ref={discountInfoRef}>
                <span>할인 적용 진행률</span>
                <button
                  type="button"
                  aria-label="할인 정보"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  onClick={() => setIsDiscountInfoOpen((prev) => !prev)}
                >
                  <Info className="h-4 w-4" />
                </button>
                <div
                  role="tooltip"
                  className={[
                    "absolute left-0 top-7 z-10 w-56 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-sm",
                    isDiscountInfoOpen
                      ? "visible opacity-100"
                      : "invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100",
                    "transition-opacity duration-150",
                  ].join(' ')}
                >
                  주문 수가 100개에 도달하면 가격이 내려갑니다.
                </div>
              </div>
              <span>
                {paidParticipantCount} / {100} ({paidProgressPercent}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-500 transition-[width] duration-300"
                style={{ width: `${paidProgressPercent}%` }}
              />
            </div>
          </div>
        </header>

        <div className='flex flex-col md:flex-row'>
          {/* Design Previewer */}
          <section className="rounded-md shadow-sm bg-gray-100">
            <CoBuyDesignViewer
              config={productConfig}
              canvasState={design.canvas_state as Record<string, string>}
              productColor={productColor}
            />
          </section>

          {/* Participant Information Input */}
          <section className="bg-white rounded-md shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">참여자 정보</h2>
            <p className="text-sm text-gray-500 mb-6">
              아래 정보를 입력하면 공동구매 참여가 접수됩니다. 결제는 다음 단계에서 진행됩니다.
            </p>
            {isSubmitted ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700">
                  참여 정보가 접수되었습니다. 결제를 진행해주세요.
                </div>
                {participantInfo && participantId && orderId && (
                  <TossPaymentWidget
                    amount={Math.round(design.price_per_item)}
                    orderId={orderId}
                    orderName={`${session.title} 공동구매`}
                    customerEmail={participantInfo.email}
                    customerName={participantInfo.name}
                    customerMobilePhone={participantInfo.phone}
                    successUrl={typeof window !== 'undefined'
                      ? `${window.location.origin}/cobuy/${shareToken}/success?${new URLSearchParams({
                        participantId,
                        sessionId: session.id,
                      }).toString()}`
                      : `/cobuy/${shareToken}/success?${new URLSearchParams({
                        participantId,
                        sessionId: session.id,
                      }).toString()}`}
                    failUrl={typeof window !== 'undefined'
                      ? `${window.location.origin}/cobuy/${shareToken}/fail?${new URLSearchParams({
                        participantId,
                        sessionId: session.id,
                      }).toString()}`
                      : `/cobuy/${shareToken}/fail?${new URLSearchParams({
                        participantId,
                        sessionId: session.id,
                      }).toString()}`}
                    onBeforePaymentRequest={() => {
                      if (!participantId || !session) {
                        throw new Error('참여자 정보를 찾을 수 없습니다.');
                      }
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
    </div>
  );
}
