'use client'

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { InquiryWithDetails } from '@/types/types';
import { createClient } from '@/lib/supabase-client';
import { ChevronLeft, MessageSquare, Plus, Search, ChevronRight } from 'lucide-react';
import Image from 'next/image';

const ITEMS_PER_PAGE = 10;

export default function InquiriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inquiries, setInquiries] = useState<InquiryWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Set initial tab from URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'my') {
      setActiveTab('my');
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchInquiries = async () => {
      setIsLoading(true);
      const supabase = createClient();

      // Build query
      let query = supabase
        .from('inquiries')
        .select(`
          *,
          user:profiles!inquiries_user_id_fkey(name),
          products:inquiry_products(
            id,
            product_id,
            product:products(*)
          ),
          replies:inquiry_replies(
            id,
            content,
            created_at,
            admin:profiles!inquiry_replies_admin_id_fkey(name)
          )
        `, { count: 'exact' });

      // Apply filters
      if (activeTab === 'my' && user) {
        query = query.eq('user_id', user.id);
      }

      if (searchQuery.trim() !== '') {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (!error && data) {
        setInquiries(data as InquiryWithDetails[]);
        setTotalCount(count || 0);
      } else {
        console.error('Error fetching inquiries:', error);
      }

      setIsLoading(false);
    };

    const checkUserAndFetchInquiries = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      setUser(user || null);

      await fetchInquiries();
    };

    checkUserAndFetchInquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, activeTab, searchQuery]);

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
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  const getProductImageUrl = (product: any) => {
    if (product?.configuration && product.configuration.length > 0) {
      return product.configuration[0].imageUrl;
    }
    return '/placeholder-product.png';
  };

  const censorName = (name: string) => {
    if (!name || name.length === 0) return '';
    if (name.length === 1) return name;

    // Show first character and replace the rest with asterisks
    return name[0] + '*'.repeat(name.length - 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition mr-2"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-bold">문의 게시판</h1>
            </div>
            <button
              onClick={() => router.push('/inquiries/new')}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">문의하기</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => {
                setActiveTab('all');
                router.push('/inquiries');
              }}
              className={`
                flex-1 px-4 py-2 rounded-lg text-sm font-medium transition
                ${activeTab === 'all'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              전체
            </button>
            <button
              onClick={() => {
                if (!user) {
                  alert('로그인이 필요합니다.');
                  router.push('/login?redirect=/inquiries?tab=my');
                  return;
                }
                setActiveTab('my');
                router.push('/inquiries?tab=my');
              }}
              className={`
                flex-1 px-4 py-2 rounded-lg text-sm font-medium transition
                ${activeTab === 'my'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              나의 문의
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목이나 내용으로 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : inquiries.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-6">
              {searchQuery
                ? '검색 결과가 없습니다.'
                : activeTab === 'my'
                ? '등록된 문의가 없습니다.'
                : '등록된 문의가 없습니다.'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={() => router.push('/inquiries/new')}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
              >
                첫 문의 등록하기
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="">
              {inquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  onClick={() => router.push(`/inquiries/${inquiry.id}`)}
                  className="bg-white p-4 transition cursor-pointer border-b border-black/30"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{inquiry.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {inquiry.content}
                      </p>
                    </div>
                  </div>

                  {/* Products */}
                  {inquiry.products && inquiry.products.length > 0 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto">
                      {inquiry.products.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden relative"
                        >
                          <Image
                            src={getProductImageUrl(item.product)}
                            alt={item.product?.title || 'Product'}
                            fill
                            className="object-contain"
                          />
                        </div>
                      ))}
                      {inquiry.products.length > 3 && (
                        <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-600 font-medium">
                            +{inquiry.products.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      {inquiry.user && (
                        <span className="font-medium">{censorName(inquiry.user.name)}</span>
                      )}
                      <span>•</span>
                      <span>{formatDate(inquiry.created_at)}</span>
                    </div>
                    {inquiry.replies && inquiry.replies.length > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{inquiry.replies.length}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 py-8">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    const shouldShow =
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1);

                    const shouldShowEllipsis =
                      (page === 2 && currentPage > 3) ||
                      (page === totalPages - 1 && currentPage < totalPages - 2);

                    if (shouldShowEllipsis) {
                      return (
                        <span key={page} className="px-2 text-gray-400">
                          ...
                        </span>
                      );
                    }

                    if (!shouldShow) return null;

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`
                          min-w-[40px] px-3 py-2 rounded-lg transition
                          ${
                            currentPage === page
                              ? 'bg-black text-white'
                              : 'border border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
