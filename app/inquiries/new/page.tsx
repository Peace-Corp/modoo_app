'use client'

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Product } from '@/types/types';
import { createClient } from '@/lib/supabase-client';
import ProductSelectionModal from '@/app/components/ProductSelectionModal';
import { ChevronLeft, X } from 'lucide-react';
import Image from 'next/image';

function InquiryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
    // Check if products are passed as URL parameter
    const productIdsParam = searchParams.get('products');
    if (productIdsParam) {
      fetchProductsByIds(productIdsParam.split(','));
    }
  }, [searchParams]);

  const checkUser = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      alert('로그인이 필요합니다.');
      router.push('/login?redirect=/inquiries/new');
      return;
    }

    setUser(user);
  };

  const fetchProductsByIds = async (productIds: string[]) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (!error && data) {
      setSelectedProducts(data as Product[]);
    }
  };

  const handleProductsConfirm = (products: Product[]) => {
    setSelectedProducts(products);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
  };

  const getProductImageUrl = (product: Product) => {
    if (product.configuration && product.configuration.length > 0) {
      return product.configuration[0].imageUrl ?? '/placeholder-product.png';
    }
    return '/placeholder-product.png';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    if (!content.trim()) {
      alert('문의 내용을 입력해주세요.');
      return;
    }

    if (!user) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Create inquiry
      const { data: inquiry, error: inquiryError } = await supabase
        .from('inquiries')
        .insert({
          user_id: user.id,
          title: title.trim(),
          content: content.trim(),
          status: 'pending'
        })
        .select()
        .single();

      if (inquiryError) throw inquiryError;

      // Add products to inquiry
      if (selectedProducts.length > 0) {
        const inquiryProducts = selectedProducts.map(product => ({
          inquiry_id: inquiry.id,
          product_id: product.id
        }));

        const { error: productsError } = await supabase
          .from('inquiry_products')
          .insert(inquiryProducts);

        if (productsError) throw productsError;
      }

      alert('문의가 등록되었습니다.');
      router.push('/inquiries');
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      alert('문의 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition mr-2"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">문의하기</h1>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-4xl mx-auto p-4 pb-20">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력해주세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition"
              disabled={isSubmitting}
              maxLength={100}
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {title.length}/100
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              문의 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="문의 내용을 입력해주세요"
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition resize-none"
              disabled={isSubmitting}
              maxLength={1000}
            />
            <div className="text-xs text-gray-500 mt-1 text-right">
              {content.length}/1000
            </div>
          </div>

          {/* Product Selection */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                관련 제품 선택
              </label>
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition"
                disabled={isSubmitting}
              >
                제품 선택
              </button>
            </div>

            {selectedProducts.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                선택된 제품이 없습니다
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {selectedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="relative border border-gray-200 rounded-lg p-2 group"
                  >
                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => removeProduct(product.id)}
                      className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      disabled={isSubmitting}
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Product Image */}
                    <div className="aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden relative">
                      <Image
                        src={product.thumbnail_image_link as string}
                        alt={product.title}
                        fill
                        className="object-contain"
                      />
                    </div>

                    {/* Product Name */}
                    <p className="text-xs text-center line-clamp-2 font-medium">
                      {product.title}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-4">
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className="w-full py-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '등록 중...' : '문의 등록하기'}
            </button>
          </div>
        </form>
      </div>

      {/* Product Selection Modal */}
      <ProductSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleProductsConfirm}
        initialSelectedProducts={selectedProducts}
      />
    </div>
  );
}

export default function NewInquiryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InquiryForm />
    </Suspense>
  );
}