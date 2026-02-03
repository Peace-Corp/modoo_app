'use client'

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { InquiryWithDetails } from '@/types/types';
import { MessageSquare, ChevronRight, ChevronLeft, Lock, Paperclip } from 'lucide-react';

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

      const { count } = await supabase
        .from('inquiries')
        .select('*', { count: 'exact', head: true });

      if (count !== null) {
        setTotalCount(count);
      }

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
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return (
    <section className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 lg:mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg lg:text-xl font-bold text-gray-900">문의 게시판</h2>
        </div>
        <Link
          href="/inquiries"
          className="flex items-center gap-1 text-xs lg:text-sm text-gray-600 hover:text-black transition"
        >
          전체보기
          <ChevronRight className="w-3 h-3 lg:w-4 lg:h-4" />
        </Link>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-lg p-8 lg:p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 lg:h-12 lg:w-12 border-b-2 border-gray-900 mx-auto mb-3"></div>
          <p className="text-sm lg:text-base text-gray-500">로딩 중...</p>
        </div>
      ) : (
        <>
          {inquiries && inquiries.length > 0 ? (
            <>
              <div>
                {/* Table Header */}
                <div className="flex items-center px-4 py-2 border-b border-gray-300 bg-gray-50 text-xs text-gray-500 font-medium tracking-wider">
                  <span className="flex-1">제목</span>
                  <span className="w-28 text-center shrink-0">작성자</span>
                  <span className="w-24 text-right shrink-0">날짜</span>
                </div>
                {inquiries.map((inquiry) => (
                  <Link
                    key={inquiry.id}
                    href={`/inquiries/${inquiry.id}`}
                    className="flex items-center px-4 py-3 transition cursor-pointer border-b border-gray-200 hover:bg-gray-50"
                  >
                    {/* Subject */}
                    <div className="flex-1 min-w-0 flex items-center gap-1">
                      <span className="text-sm truncate">{inquiry.title}</span>
                      {inquiry.replies && inquiry.replies.length > 0 && (
                        <span className="text-xs text-red-500 font-bold shrink-0">+{inquiry.replies.length}</span>
                      )}
                      <Lock className="w-3 h-3 text-gray-400 shrink-0" />
                      {inquiry.file_urls && inquiry.file_urls.length > 0 && (
                        <Paperclip className="w-3 h-3 text-gray-400 shrink-0" />
                      )}
                    </div>
                    {/* Writer */}
                    <span className="w-28 text-center text-sm text-gray-700 shrink-0 truncate">
                      {inquiry.manager_name ?? ''}
                    </span>
                    {/* Date */}
                    <span className="w-24 text-right text-sm text-gray-500 shrink-0">
                      {formatDate(inquiry.created_at)}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 lg:gap-2 mt-6 lg:mt-8">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1.5 lg:px-3 lg:py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                    aria-label="이전 페이지"
                  >
                    <ChevronLeft className="w-3 h-3 lg:w-4 lg:h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`
                          px-2 py-1.5 lg:px-3 lg:py-2 rounded-lg text-xs lg:text-sm transition
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
                    className="px-2 py-1.5 lg:px-3 lg:py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                    aria-label="다음 페이지"
                  >
                    <ChevronRight className="w-3 h-3 lg:w-4 lg:h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg p-8 lg:p-12 text-center">
              <MessageSquare className="w-10 h-10 lg:w-12 lg:h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm lg:text-base text-gray-500 mb-4">등록된 문의가 없습니다.</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
