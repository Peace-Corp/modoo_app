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
  requestCancellation,
  updateParticipantPickupStatus,
  updateDeliverySettings
} from '@/lib/cobuyService';
import { CoBuyParticipant, CoBuySession, CoBuyDeliverySettings } from '@/types/types';
import { Calendar, CheckCircle, Clock, Copy, Users, PackageCheck, ShoppingBag, Info, ChevronDown, Truck, MapPin, Check, Pencil } from 'lucide-react';
import CoBuyProgressBar from '@/app/components/cobuy/CoBuyProgressBar';
import CoBuyOrderModal from '@/app/components/cobuy/CoBuyOrderModal';
import DeliverySettingsEditModal from '@/app/components/cobuy/DeliverySettingsEditModal';

const statusLabels: Record<CoBuySession['status'], { label: string; color: string }> = {
  gathering: { label: '모집중', color: 'bg-green-100 text-green-800' },
  gather_complete: { label: '모집 완료', color: 'bg-blue-100 text-blue-800' },
  order_complete: { label: '주문 완료', color: 'bg-blue-100 text-blue-800' },
  manufacturing: { label: '제작중', color: 'bg-yellow-100 text-yellow-800' },
  manufacture_complete: { label: '제작 완료', color: 'bg-blue-100 text-blue-800' },
  delivering: { label: '배송중', color: 'bg-purple-100 text-purple-800' },
  delivery_complete: { label: '배송 완료', color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: '취소됨', color: 'bg-red-100 text-red-800' },
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
  const [expandedParticipants, setExpandedParticipants] = useState<Set<string>>(new Set());
  const [updatingPickupStatus, setUpdatingPickupStatus] = useState<Set<string>>(new Set());
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isDeliverySettingsModalOpen, setIsDeliverySettingsModalOpen] = useState(false);

  // Check if editing is allowed (before order_complete)
  const canEditDeliverySettings = session && !['order_complete', 'manufacturing', 'manufacture_complete', 'delivering', 'delivery_complete', 'cancelled'].includes(session.status);

  const handleSaveDeliverySettings = async (settings: CoBuyDeliverySettings) => {
    if (!session) return;
    const updated = await updateDeliverySettings(session.id, settings);
    if (updated) {
      setSession(updated);
    } else {
      throw new Error('Failed to update delivery settings');
    }
  };

  const toggleParticipantExpand = (participantId: string) => {
    setExpandedParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });
  };

  const handlePickupStatusToggle = async (participant: CoBuyParticipant) => {
    if (updatingPickupStatus.has(participant.id)) return;

    const newStatus = participant.pickup_status === 'picked_up' ? 'pending' : 'picked_up';

    setUpdatingPickupStatus((prev) => new Set(prev).add(participant.id));

    const updated = await updateParticipantPickupStatus(participant.id, newStatus);

    if (updated) {
      setParticipants((current) =>
        current.map((p) => (p.id === participant.id ? { ...p, pickup_status: newStatus } : p))
      );
    } else {
      alert('수령 상태 변경에 실패했습니다.');
    }

    setUpdatingPickupStatus((prev) => {
      const next = new Set(prev);
      next.delete(participant.id);
      return next;
    });
  };

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

  const totalQuantity = useMemo(
    () => participants
      .filter((p) => p.payment_status === 'completed')
      .reduce((sum, p) => sum + (p.total_quantity || 0), 0),
    [participants]
  );

  // Helper to render selected items
  const renderSelectedItems = (participant: CoBuyParticipant) => {
    const items = participant.selected_items;
    if (!items || items.length === 0) {
      // Fallback to legacy selected_size
      return participant.selected_size || '-';
    }

    return (
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium">
              {item.size}
            </span>
            <span className="text-gray-500">×</span>
            <span className="font-medium">{item.quantity}</span>
          </div>
        ))}
        <div className="text-xs text-gray-500 pt-1 border-t border-gray-100">
          총 {participant.total_quantity || items.reduce((sum, i) => sum + i.quantity, 0)}벌
        </div>
      </div>
    );
  };

  // Helper to render custom field responses
  const renderFieldResponses = (participant: CoBuyParticipant, variant: 'mobile' | 'desktop' = 'desktop') => {
    const customFields = session?.custom_fields || [];
    const responses = participant.field_responses || {};

    // Filter out fixed fields (like size) since we show those separately
    const fieldsToShow = customFields.filter((f) => !f.fixed && responses[f.id]);

    if (fieldsToShow.length === 0) return null;

    if (variant === 'mobile') {
      return (
        <div className="space-y-1.5 pt-2 mt-2 border-t border-gray-100">
          {fieldsToShow.map((field) => (
            <div key={field.id} className="flex justify-between text-sm">
              <span className="text-gray-500">{field.label}</span>
              <span className="text-gray-700">{responses[field.id]}</span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-0.5 text-xs text-gray-500">
        {fieldsToShow.map((field) => (
          <div key={field.id}>
            <span className="text-gray-400">{field.label}:</span>{' '}
            <span>{responses[field.id]}</span>
          </div>
        ))}
      </div>
    );
  };

  // Helper to render pickup status toggle button for pickup participants (checkmark icon)
  const renderPickupStatusToggle = (participant: CoBuyParticipant) => {
    // Only show for pickup participants
    if (participant.delivery_method !== 'pickup') return null;

    const pickupStatus = participant.pickup_status || 'pending';
    const isPickedUp = pickupStatus === 'picked_up';
    const isUpdating = updatingPickupStatus.has(participant.id);

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handlePickupStatusToggle(participant);
        }}
        disabled={isUpdating}
        title={isPickedUp ? '수령 완료 (클릭하여 미수령으로 변경)' : '미수령 (클릭하여 수령 완료로 변경)'}
        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
          isPickedUp
            ? 'bg-green-500 text-white hover:bg-green-600'
            : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
        } ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {isUpdating ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Check className="w-4 h-4" strokeWidth={3} />
        )}
      </button>
    );
  };

  // Helper to render delivery info
  const renderDeliveryInfo = (participant: CoBuyParticipant, variant: 'mobile' | 'desktop' = 'desktop') => {
    if (!participant.delivery_method) return null;

    const isDelivery = participant.delivery_method === 'delivery';
    const deliveryInfo = participant.delivery_info;

    if (variant === 'mobile') {
      return (
        <div className="space-y-1.5 pt-2 mt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm">
            {isDelivery ? (
              <Truck className="w-4 h-4 text-[#3B55A5]" />
            ) : (
              <MapPin className="w-4 h-4 text-green-600" />
            )}
            <span className="font-medium">
              {isDelivery ? '배송' : '직접 수령'}
            </span>
            {participant.delivery_fee > 0 && (
              <span className="text-xs text-gray-500">
                (+₩{participant.delivery_fee.toLocaleString()})
              </span>
            )}
          </div>
          {isDelivery && deliveryInfo && (
            <div className="pl-6 text-sm text-gray-600 space-y-0.5">
              <p>{deliveryInfo.recipientName} / {deliveryInfo.phone}</p>
              <p>({deliveryInfo.postalCode}) {deliveryInfo.address}</p>
              <p>{deliveryInfo.addressDetail}</p>
              {deliveryInfo.memo && (
                <p className="text-xs text-gray-500">요청: {deliveryInfo.memo}</p>
              )}
            </div>
          )}
        </div>
      );
    }

    // Desktop variant
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          {isDelivery ? (
            <Truck className="w-3.5 h-3.5 text-[#3B55A5]" />
          ) : (
            <MapPin className="w-3.5 h-3.5 text-green-600" />
          )}
          <span className="text-xs font-medium">
            {isDelivery ? '배송' : '직접 수령'}
          </span>
          {participant.delivery_fee > 0 && (
            <span className="text-xs text-gray-500">
              (+₩{participant.delivery_fee.toLocaleString()})
            </span>
          )}
        </div>
        {isDelivery && deliveryInfo && (
          <div className="text-xs text-gray-500 space-y-0.5">
            <p>{deliveryInfo.recipientName} / {deliveryInfo.phone}</p>
            <p className="truncate max-w-48" title={`${deliveryInfo.address} ${deliveryInfo.addressDetail}`}>
              {deliveryInfo.address}
            </p>
          </div>
        )}
      </div>
    );
  };

  const copyShareLink = () => {
    if (!session) return;
    const shareUrl = `${window.location.origin}/cobuy/${session.share_token}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseSession = async () => {
    if (!session || session.status !== 'gathering') return;
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

  const handleCreateOrders = () => {
    if (!session) return;
    setIsOrderModalOpen(true);
  };

  const handleOrderCreated = () => {
    // Refresh the session data after order creation
    fetchSessionData();
  };

  const handleSessionUpdated = (updatedSession: CoBuySession) => {
    setSession(updatedSession);
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
              {session.status !== 'delivery_complete' && (
                <>
                  <button
                    onClick={handleCloseSession}
                    disabled={isUpdating || session.status !== 'gathering'}
                    className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    마감하기
                  </button>
                  <button
                    onClick={handleCancelSession}
                    disabled={isUpdating || session.status === 'cancelled' || ['order_complete', 'manufacturing', 'manufacture_complete', 'delivering'].includes(session.status)}
                    className="px-4 py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    취소 요청
                  </button>
                  <button
                    onClick={handleCreateOrders}
                    disabled={session.status === 'cancelled' || ['order_complete', 'manufacturing', 'manufacture_complete', 'delivering'].includes(session.status)}
                    className="px-4 py-2 bg-[#3B55A5] text-white text-sm rounded-lg hover:bg-[#2D4280] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>주문 생성</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Delivery Settings Section */}
        {session.delivery_settings && (
          <section className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">수령/배송 장소</h2>
              {canEditDeliverySettings && (
                <button
                  onClick={() => setIsDeliverySettingsModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  수정
                </button>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {/* 배송받을 장소 */}
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-[#3B55A5]" />
                  <p className="text-sm font-medium text-gray-700">배송받을 장소</p>
                </div>
                {session.delivery_settings.deliveryAddress ? (
                  <div className="text-sm text-gray-600 space-y-0.5">
                    <p>({session.delivery_settings.deliveryAddress.postalCode}) {session.delivery_settings.deliveryAddress.roadAddress}</p>
                    {session.delivery_settings.deliveryAddress.addressDetail && (
                      <p>{session.delivery_settings.deliveryAddress.addressDetail}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">미설정</p>
                )}
              </div>

              {/* 배부 장소 */}
              <div className="rounded-xl bg-gray-50 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-gray-700">배부 장소</p>
                </div>
                {session.delivery_settings.pickupAddress ? (
                  <div className="text-sm text-gray-600 space-y-0.5">
                    <p>({session.delivery_settings.pickupAddress.postalCode}) {session.delivery_settings.pickupAddress.roadAddress}</p>
                    {session.delivery_settings.pickupAddress.addressDetail && (
                      <p>{session.delivery_settings.pickupAddress.addressDetail}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">미설정</p>
                )}
              </div>
            </div>
            {!canEditDeliverySettings && (
              <p className="text-xs text-gray-400 mt-3">주문 완료 후에는 수정할 수 없습니다.</p>
            )}
          </section>
        )}

        {/* Progress Bar Section */}
        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">진행 상태</h2>
          <CoBuyProgressBar currentStatus={session.status} />
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">진행 현황</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <ShoppingBag className="w-4 h-4" />
                총 주문 수량
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {totalQuantity}
                <span className="text-sm text-gray-500">벌</span>
                {session.max_quantity ? (
                  <span className="text-sm text-gray-500"> / {session.max_quantity}</span>
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

          {/* Pricing Tiers Info */}
          {session.pricing_tiers && session.pricing_tiers.length > 0 && (
            <div className="mt-4 p-4 bg-[#3B55A5]/10 rounded-xl">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-[#3B55A5] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 mb-2">수량별 단가</p>
                  <div className="flex flex-wrap gap-2">
                    {[...session.pricing_tiers].sort((a, b) => a.minQuantity - b.minQuantity).map((tier, idx) => {
                      const isActive = totalQuantity >= tier.minQuantity;
                      return (
                        <span
                          key={idx}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            isActive
                              ? 'bg-[#3B55A5]/100 text-white font-medium'
                              : 'bg-white border border-gray-200 text-gray-600'
                          }`}
                        >
                          {tier.minQuantity}벌↑ ₩{tier.pricePerItem.toLocaleString()}
                        </span>
                      );
                    })}
                  </div>
                  {session.min_quantity && (
                    <p className="text-xs text-gray-600 mt-2">
                      최소 수량: {session.min_quantity}벌
                      {totalQuantity < session.min_quantity && (
                        <span className="text-red-600 ml-2">
                          ({session.min_quantity - totalQuantity}벌 더 필요)
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              참여자 목록
              <span className="ml-2 text-sm font-normal text-gray-500">({participants.length}명)</span>
            </h2>
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
            <>
              {/* Mobile view - Accordion layout */}
              <div className="md:hidden space-y-2">
                {participants.map((participant) => {
                  const paymentInfo = paymentLabels[participant.payment_status];
                  const isExpanded = expandedParticipants.has(participant.id);
                  const totalQty = participant.total_quantity || participant.selected_items?.reduce((sum, i) => sum + i.quantity, 0) || 1;

                  return (
                    <div key={participant.id} className="flex items-stretch gap-2">
                      {/* Pickup status toggle - outside the accordion on the left */}
                      <div className="flex items-center shrink-0">
                        {participant.delivery_method === 'pickup' ? (
                          renderPickupStatusToggle(participant)
                        ) : (
                          <div className="w-7" /> // Spacer for non-pickup participants
                        )}
                      </div>

                      {/* Accordion item */}
                      <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden">
                        {/* Accordion Header - Always visible */}
                        <button
                          type="button"
                          onClick={() => toggleParticipantExpand(participant.id)}
                          className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="min-w-0 text-left">
                              <p className="font-medium text-gray-900 truncate">{participant.name}</p>
                              <p className="text-xs text-gray-500">{totalQty}벌 · {participant.payment_amount ? `₩${participant.payment_amount.toLocaleString()}` : '미결제'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentInfo.color}`}>
                              {paymentInfo.label}
                            </span>
                            <ChevronDown
                              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                        </button>

                      {/* Accordion Content - Expandable */}
                      <div
                        className={`overflow-hidden transition-all duration-200 ${
                          isExpanded ? 'max-h-96' : 'max-h-0'
                        }`}
                      >
                        <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50 space-y-3">
                          {/* Contact Info */}
                          <div className="text-sm">
                            <p className="text-gray-600">{participant.email}</p>
                            {participant.phone && (
                              <p className="text-gray-600">{participant.phone}</p>
                            )}
                          </div>

                          {/* Order Details */}
                          <div className="text-sm">
                            <p className="text-xs text-gray-500 mb-1">주문 내역</p>
                            <div className="bg-white rounded-lg p-2">
                              {renderSelectedItems(participant)}
                            </div>
                          </div>

                          {/* Payment & Date */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">결제 금액</p>
                              <p className="font-medium text-gray-900">
                                {participant.payment_amount ? `₩${participant.payment_amount.toLocaleString()}` : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">참여일</p>
                              <p className="text-gray-700">
                                {new Date(participant.joined_at).toLocaleDateString('ko-KR')}
                              </p>
                            </div>
                          </div>

                          {/* Delivery info */}
                          {renderDeliveryInfo(participant, 'mobile')}

                          {/* Custom field responses */}
                          {renderFieldResponses(participant, 'mobile')}
                        </div>
                      </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop view - Table layout */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-4 font-medium">참여자 정보</th>
                      <th className="py-2 pr-4 font-medium">주문 내역</th>
                      <th className="py-2 pr-4 font-medium">수령 방법</th>
                      <th className="py-2 pr-4 font-medium">추가 정보</th>
                      <th className="py-2 pr-4 font-medium">결제 상태</th>
                      <th className="py-2 pr-4 font-medium">결제 금액</th>
                      <th className="py-2 pr-4 font-medium">참여일</th>
                      <th className="py-2 font-medium text-center">배부</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((participant) => {
                      const paymentInfo = paymentLabels[participant.payment_status];
                      return (
                        <tr key={participant.id} className="border-b last:border-b-0 align-top">
                          <td className="py-3 pr-4">
                            <div className="text-gray-900 font-medium">{participant.name}</div>
                            <div className="text-gray-500 text-xs">{participant.email}</div>
                            {participant.phone && (
                              <div className="text-gray-500 text-xs">{participant.phone}</div>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {renderSelectedItems(participant)}
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {renderDeliveryInfo(participant, 'desktop') || (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {renderFieldResponses(participant, 'desktop') || (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentInfo.color}`}>
                              {paymentInfo.label}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {participant.payment_amount ? participant.payment_amount.toLocaleString('ko-KR') + '원' : '-'}
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {new Date(participant.joined_at).toLocaleDateString('ko-KR')}
                          </td>
                          <td className="py-3 text-center">
                            {renderPickupStatusToggle(participant) || (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {/* Order Modal */}
      {session && (
        <CoBuyOrderModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          session={session}
          participants={participants}
          onOrderCreated={handleOrderCreated}
          onSessionUpdated={handleSessionUpdated}
        />
      )}

      {/* Delivery Settings Edit Modal */}
      {session && (
        <DeliverySettingsEditModal
          isOpen={isDeliverySettingsModalOpen}
          onClose={() => setIsDeliverySettingsModalOpen(false)}
          deliverySettings={session.delivery_settings}
          onSave={handleSaveDeliverySettings}
        />
      )}
    </div>
  );
}
