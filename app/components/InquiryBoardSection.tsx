'use client'

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { InquiryWithDetails } from '@/types/types';
import { MessageSquare, ChevronRight, ChevronLeft } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function InquiryBoardSection() {
  const [inquiries, setInquiries] = useState<InquiryWithDetails[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  useEffect(() => {
    async function fetchInquiries() {
      setLoading(true);

      // Get total count
      const { count } = await supabase
        .from('inquiries')
        .select('*', { count: 'exact', head: true });

      if (count !== null) {
        setTotalCount(count);
      }

      // Fetch inquiries for current page
      const { data } = await supabase
        .from('inquiries')
        .select(`
          *,
          replies:inquiry_replies(id)
        `)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (data) {
        setInquiries(data);
      }

      setLoading(false);
    }

    fetchInquiries();
  }, [currentPage]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return `${diffInHours}시간 전`;
    } else if (diffInHours < 48) {
      return '어제';
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric'
      });
    }
  };

  return (
    <section className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold">문의 게시판</h2>
        </div>
        <Link
          href="/inquiries"
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-black transition"
        >
          전체보기
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-3"></div>
          <p className="text-gray-500">로딩 중...</p>
        </div>
      ) : (
        <>
          {/* Inquiries List */}
          {inquiries && inquiries.length > 0 ? (
            <>
              <div className="space-y-3">
                {inquiries.map((inquiry) => (
                  <Link
                    key={inquiry.id}
                    href={`/inquiries/${inquiry.id}`}
                    className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium line-clamp-1">{inquiry.title}</h3>
                          {inquiry.replies && inquiry.replies.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 ml-2 shrink-0">
                              <MessageSquare className="w-3 h-3" />
                              <span>{inquiry.replies.length}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                          {inquiry.content}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(inquiry.created_at)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                    aria-label="이전 페이지"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`
                          px-3 py-2 rounded-lg transition
                          ${currentPage === page
                            ? 'bg-black text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                    aria-label="다음 페이지"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg p-8 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 mb-4">등록된 문의가 없습니다.</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
