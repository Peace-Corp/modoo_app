'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/app/components/Header';
import { createClient } from '@/lib/supabase-client';
import { useAuthStore } from '@/store/useAuthStore';
import { FaStar } from 'react-icons/fa';

type ProductSummary = {
  id: string;
  title: string;
  thumbnail_image_link: string | null;
};

export default function CreateMyReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useAuthStore();

  const productId = searchParams.get('productId') || '';
  const orderId = searchParams.get('orderId') || '';

  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaultAuthorName = useMemo(() => {
    if (user?.name?.trim()) return user.name.trim();
    if (user?.email) return user.email.split('@')[0];
    return '';
  }, [user?.email, user?.name]);

  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAuthorName(defaultAuthorName);
  }, [defaultAuthorName]);

  useEffect(() => {
    const fetchProductAndCheckExisting = async () => {
      setError(null);
      setIsLoading(true);

      if (!productId) {
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      const userId = supabaseUser?.id || user?.id;

      const [{ data: productData, error: productError }, { data: existingData, error: existingError }] = await Promise.all([
        supabase
          .from('products')
          .select('id, title, thumbnail_image_link')
          .eq('id', productId)
          .single(),
        userId
          ? supabase
            .from('reviews')
            .select('id')
            .eq('product_id', productId)
            .eq('user_id', userId)
            .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (productError) {
        console.error('Failed to fetch product for review:', productError);
        setError('상품 정보를 불러오는데 실패했습니다.');
        setIsLoading(false);
        return;
      }

      setProduct(productData as ProductSummary);

      if (existingError) {
        console.error('Failed to check existing review:', existingError);
      } else {
        setExistingReviewId(existingData?.id ?? null);
      }

      setIsLoading(false);
    };

    fetchProductAndCheckExisting();
  }, [productId, user?.id]);

  const handleSubmit = async () => {
    setError(null);

    if (!productId) {
      setError('상품이 선택되지 않았습니다.');
      return;
    }
    if (!authorName.trim()) {
      setError('작성자 이름을 입력해주세요.');
      return;
    }
    if (!title.trim()) {
      setError('리뷰 제목을 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      setError('리뷰 내용을 입력해주세요.');
      return;
    }
    if (rating < 1 || rating > 5) {
      setError('평점을 선택해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      const userId = supabaseUser?.id || user?.id;

      if (!userId) {
        router.push('/login');
        return;
      }

      const { error: insertError } = await supabase
        .from('reviews')
        .insert({
          product_id: productId,
          user_id: userId,
          rating,
          title: title.trim(),
          content: content.trim(),
          author_name: authorName.trim(),
          is_verified_purchase: Boolean(orderId),
        });

      if (insertError) {
        console.error('Failed to create review:', insertError);
        setError('리뷰 작성에 실패했습니다.');
        return;
      }

      router.replace('/reviews/my');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header back />

      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-xl font-bold text-gray-900 mb-4">리뷰 작성</h1>

        {!isAuthenticated ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">로그인이 필요합니다</p>
            <p className="text-sm text-gray-400 mb-6">
              리뷰를 작성하려면 로그인해주세요
            </p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              로그인하기
            </button>
          </div>
        ) : !productId ? (
          <div className="text-center py-20">
            <p className="text-gray-600 mb-6">리뷰를 작성할 상품을 선택해주세요.</p>
            <button
              onClick={() => router.push('/home/my-page/orders')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              주문 내역에서 선택
            </button>
          </div>
        ) : isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="text-gray-500 mt-4">상품 정보를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 mb-4">
            {error}
          </div>
        ) : null}

        {existingReviewId && (
          <div className="bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg p-3 mb-4">
            이미 이 상품에 대한 리뷰를 작성했습니다.{' '}
            <button
              onClick={() => router.push('/reviews/my')}
              className="underline font-medium"
            >
              내 리뷰 보기
            </button>
          </div>
        )}

        {product && (
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 flex items-center gap-3">
            <div className="w-14 h-14 rounded-md border border-gray-200 bg-gray-100 overflow-hidden">
              {product.thumbnail_image_link ? (
                <img
                  src={product.thumbnail_image_link}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                  없음
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-500">선택한 상품</div>
              <div className="font-medium text-gray-900">{product.title}</div>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">평점</label>
            <div className="flex items-center gap-2">
              <div className="flex text-orange-400">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className="p-1"
                    aria-label={`${value}점`}
                  >
                    <FaStar className={value <= rating ? 'text-orange-400' : 'text-gray-300'} size={20} />
                  </button>
                ))}
              </div>
              <span className="text-sm text-gray-600">{rating} / 5</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">작성자</label>
            <input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="이름"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="리뷰 제목"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm min-h-[140px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="리뷰 내용을 입력해주세요."
              maxLength={2000}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || Boolean(existingReviewId)}
            className="w-full px-4 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {existingReviewId ? '이미 작성한 리뷰가 있습니다' : submitting ? '등록 중...' : '리뷰 등록'}
          </button>
        </div>
      </div>
    </div>
  );
}

