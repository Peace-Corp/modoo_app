'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InquiryWithDetails, InquiryStatus } from '@/types/types';
import { createClient } from '@/lib/supabase-client';
import { ChevronLeft, MessageSquare, Send } from 'lucide-react';
import Image from 'next/image';
import { routes } from '@/lib/routes';

const STATUS_LABELS: Record<InquiryStatus, string> = {
  pending: '대기중',
  ongoing: '진행중',
  completed: '완료'
};

const STATUS_COLORS: Record<InquiryStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  ongoing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800'
};

interface InquiryDetailClientProps {
  inquiryId: string;
}

export default function InquiryDetailClient({ inquiryId }: InquiryDetailClientProps) {
  const router = useRouter();

  const [inquiry, setInquiry] = useState<InquiryWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!inquiryId) {
      setIsLoading(false);
      return;
    }

    checkUserAndFetchInquiry();
  }, [inquiryId]);

  const checkUserAndFetchInquiry = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('로그인이 필요합니다.');
      router.push(`/login?redirect=${encodeURIComponent(routes.inquiryDetail(inquiryId))}`);
      return;
    }

    setUser(user);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdminUser = profile?.role === 'admin';
    setIsAdmin(isAdminUser);

    await fetchInquiry();
  };

  const fetchInquiry = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('inquiries')
      .select(`
        *,
        user:profiles!inquiries_user_id_fkey(email),
        products:inquiry_products(
          id,
          product_id,
          product:products(*)
        ),
        replies:inquiry_replies(
          id,
          content,
          created_at,
          updated_at,
          admin:profiles!inquiry_replies_admin_id_fkey(email)
        )
      `)
      .eq('id', inquiryId)
      .single();

    if (!error && data) {
      setInquiry(data as any);
    } else {
      console.error('Error fetching inquiry:', error);
      alert('문의를 불러올 수 없습니다.');
      router.push('/inquiries');
    }

    setIsLoading(false);
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) {
      alert('답변 내용을 입력해주세요.');
      return;
    }

    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    setIsSubmittingReply(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('inquiry_replies')
        .insert({
          inquiry_id: inquiryId,
          admin_id: user.id,
          content: replyContent.trim()
        });

      if (error) throw error;

      setReplyContent('');
      await fetchInquiry();
    } catch (error) {
      console.error('Error submitting reply:', error);
      alert('답변 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleUpdateStatus = async (newStatus: InquiryStatus) => {
    setIsUpdatingStatus(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('inquiries')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', inquiryId);

      if (error) throw error;

      await fetchInquiry();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProductImageUrl = (product: any) => {
    if (product?.configuration && product.configuration.length > 0) {
      return product.configuration[0].imageUrl;
    }
    return '/placeholder-product.png';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">문의를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition mr-2"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold">문의 상세</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className={
              `px-3 py-1 rounded text-sm font-medium ${STATUS_COLORS[inquiry.status]}`
            }>
              {STATUS_LABELS[inquiry.status]}
            </span>
            {isAdmin && inquiry.user && (
              <span className="text-sm text-gray-500">
                {inquiry.user.email}
              </span>
            )}
          </div>

          <h2 className="text-2xl font-bold mb-2">{inquiry.title}</h2>
          <p className="text-sm text-gray-500 mb-6">
            {formatDate(inquiry.created_at)}
          </p>

          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed mb-6">
            {inquiry.content}
          </div>

          {inquiry.products && inquiry.products.length > 0 && (
            <div className="space-y-3 mb-6">
              <h3 className="text-sm font-semibold text-gray-600">관련 상품</h3>
              {inquiry.products.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => router.push(routes.product(item.product_id))}
                  className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  <Image
                    src={getProductImageUrl(item.product)}
                    alt={item.product?.title || '상품'}
                    width={60}
                    height={60}
                    className="rounded-md object-cover"
                  />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{item.product?.title}</p>
                    <p className="text-sm text-gray-500">상품 보기</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold">답변</h3>
          </div>

          {inquiry.replies && inquiry.replies.length > 0 ? (
            <div className="space-y-4">
              {inquiry.replies.map((reply: any) => (
                <div key={reply.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">관리자</span>
                    <span className="text-xs text-gray-400">{formatDate(reply.created_at)}</span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">아직 답변이 없습니다.</p>
          )}

          {isAdmin && (
            <div className="mt-6">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="답변을 입력하세요"
                className="w-full h-28 border border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSubmitReply}
                disabled={isSubmittingReply}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                답변 등록
              </button>
            </div>
          )}

          {isAdmin && (
            <div className="mt-6 flex gap-2">
              {(['pending', 'ongoing', 'completed'] as InquiryStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => handleUpdateStatus(status)}
                  disabled={isUpdatingStatus}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
