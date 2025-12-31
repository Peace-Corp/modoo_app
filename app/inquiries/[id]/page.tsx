'use client'

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { InquiryWithDetails, InquiryStatus } from '@/types/types';
import { createClient } from '@/lib/supabase-client';
import { ChevronLeft, MessageSquare, Send } from 'lucide-react';
import Image from 'next/image';

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

export default function InquiryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const inquiryId = params.id as string;

  const [inquiry, setInquiry] = useState<InquiryWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    checkUserAndFetchInquiry();
  }, [inquiryId]);

  const checkUserAndFetchInquiry = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('로그인이 필요합니다.');
      router.push('/login?redirect=/inquiries/' + inquiryId);
      return;
    }

    setUser(user);

    // Check if user is admin
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
      {/* Header */}
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

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Inquiry Details */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          {/* Status and User Info */}
          <div className="flex items-center justify-between mb-4">
            <span className={`
              px-3 py-1 rounded text-sm font-medium
              ${STATUS_COLORS[inquiry.status]}
            `}>
              {STATUS_LABELS[inquiry.status]}
            </span>
            {isAdmin && inquiry.user && (
              <span className="text-sm text-gray-500">
                {inquiry.user.email}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold mb-2">{inquiry.title}</h2>

          {/* Date */}
          <p className="text-sm text-gray-500 mb-6">
            {formatDate(inquiry.created_at)}
          </p>

          {/* Content */}
          <div className="prose max-w-none mb-6">
            <p className="text-gray-700 whitespace-pre-wrap">{inquiry.content}</p>
          </div>

          {/* Products */}
          {inquiry.products && inquiry.products.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">관련 제품</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {inquiry.products.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/product/${item.product_id}`)}
                    className="border border-gray-200 rounded-lg p-2 cursor-pointer hover:border-gray-400 transition"
                  >
                    <div className="aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden relative">
                      <Image
                        src={getProductImageUrl(item.product)}
                        alt={item.product?.title || 'Product'}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <p className="text-xs text-center line-clamp-2 font-medium">
                      {item.product?.title}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Status Change */}
          {isAdmin && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">상태 변경</h3>
              <div className="flex gap-2">
                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                  <button
                    key={status}
                    onClick={() => handleUpdateStatus(status as InquiryStatus)}
                    disabled={isUpdatingStatus || inquiry.status === status}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition
                      ${inquiry.status === status
                        ? 'bg-black text-white cursor-default'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Replies */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5" />
            <h3 className="text-lg font-bold">
              답변 ({inquiry.replies?.length || 0})
            </h3>
          </div>

          {inquiry.replies && inquiry.replies.length > 0 ? (
            <div className="space-y-4 mb-6">
              {inquiry.replies.map((reply: any) => (
                <div key={reply.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-blue-600">
                        관리자
                      </span>
                      {reply.admin && (
                        <span className="text-xs text-gray-500">
                          {reply.admin.email}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(reply.created_at)}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 mb-6">
              아직 답변이 없습니다.
            </div>
          )}

          {/* Reply Form (Admin Only) */}
          {isAdmin && (
            <div className="pt-4 border-t border-gray-200">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="답변을 입력해주세요..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition resize-none mb-3"
                disabled={isSubmittingReply}
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSubmitReply}
                  disabled={isSubmittingReply || !replyContent.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {isSubmittingReply ? '등록 중...' : '답변 등록'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
