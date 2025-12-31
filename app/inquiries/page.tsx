'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InquiryWithDetails, InquiryStatus } from '@/types/types';
import { createClient } from '@/lib/supabase-client';
import { ChevronLeft, MessageSquare, Plus, Search } from 'lucide-react';
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

export default function InquiriesPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<InquiryWithDetails[]>([]);
  const [filteredInquiries, setFilteredInquiries] = useState<InquiryWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<InquiryStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkUserAndFetchInquiries();
  }, []);

  useEffect(() => {
    filterInquiries();
  }, [inquiries, selectedStatus, searchQuery]);

  const checkUserAndFetchInquiries = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('로그인이 필요합니다.');
      router.push('/login?redirect=/inquiries');
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

    await fetchInquiries(isAdminUser);
  };

  const fetchInquiries = async (isAdminUser: boolean) => {
    setIsLoading(true);
    const supabase = createClient();

    // Fetch inquiries with related data
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
          admin:profiles!inquiry_replies_admin_id_fkey(email)
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInquiries(data as any);
    } else {
      console.error('Error fetching inquiries:', error);
    }

    setIsLoading(false);
  };

  const filterInquiries = () => {
    let filtered = [...inquiries];

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(inquiry => inquiry.status === selectedStatus);
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inquiry =>
        inquiry.title.toLowerCase().includes(query) ||
        inquiry.content.toLowerCase().includes(query)
      );
    }

    setFilteredInquiries(filtered);
  };

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

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목이나 내용으로 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap
                ${selectedStatus === 'all'
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              전체
            </button>
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status as InquiryStatus)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap
                  ${selectedStatus === status
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : filteredInquiries.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 mb-6">
              {searchQuery || selectedStatus !== 'all'
                ? '검색 결과가 없습니다.'
                : '등록된 문의가 없습니다.'
              }
            </p>
            {!searchQuery && selectedStatus === 'all' && (
              <button
                onClick={() => router.push('/inquiries/new')}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
              >
                첫 문의 등록하기
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInquiries.map((inquiry) => (
              <div
                key={inquiry.id}
                onClick={() => router.push(`/inquiries/${inquiry.id}`)}
                className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition cursor-pointer"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`
                        px-2 py-1 rounded text-xs font-medium
                        ${STATUS_COLORS[inquiry.status]}
                      `}>
                        {STATUS_LABELS[inquiry.status]}
                      </span>
                      {isAdmin && inquiry.user && (
                        <span className="text-xs text-gray-500">
                          {inquiry.user.email}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-lg mb-1">{inquiry.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {inquiry.content}
                    </p>
                  </div>
                </div>

                {/* Products */}
                {inquiry.products && inquiry.products.length > 0 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto">
                    {inquiry.products.slice(0, 3).map((item: any) => (
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
                  <span>{formatDate(inquiry.created_at)}</span>
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
        )}
      </div>
    </div>
  );
}
