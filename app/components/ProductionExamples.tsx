'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { ProductionExample } from '@/types/types';
import Image from 'next/image';
import Link from 'next/link';
import { routes } from '@/lib/routes';

const ITEMS_PER_PAGE = 6;

export default function ProductionExamples() {
  const [examples, setExamples] = useState<ProductionExample[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadExamples = useCallback(async (pageNum: number) => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const from = pageNum * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from('production_examples')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .range(from, to);

      if (error) {
        console.error('Error fetching production examples:', error);
        return;
      }

      if (data) {
        if (data.length < ITEMS_PER_PAGE) {
          setHasMore(false);
        }
        setExamples((prev) => [...prev, ...data]);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error loading production examples:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore]);

  useEffect(() => {
    loadExamples(0);
  }, []);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadExamples(page + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, page, loadExamples]);

  if (examples.length === 0 && !loading) {
    return null;
  }

  return (
    <section id="production-examples" className="w-full">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3 lg:mb-4">
          <h2 className="text-lg lg:text-xl font-bold text-gray-900">제작 사례</h2>
        </div>
      </div>

      {/* Horizontal scrolling container */}
      <div className="relative max-w-7xl mx-auto">
        <div className="flex gap-3 lg:gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {examples.map((example, idx) => (
            <Link
              key={example.id+idx} // for unique id
              href={routes.product(example.product_id)}
              className="group shrink-0 w-64 sm:w-80 lg:w-[340px] bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-4/3 w-full overflow-hidden bg-gray-100">
                <Image
                  src={example.image_url}
                  alt={example.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 256px, (max-width: 1024px) 320px, 340px"
                />
              </div>
              <div className="p-3 lg:p-4">
                <h3 className="text-sm lg:text-base font-semibold text-gray-900 mb-1 lg:mb-2 line-clamp-1">
                  {example.title}
                </h3>
                <p className="text-xs lg:text-sm text-gray-600 line-clamp-2">
                  {example.description}
                </p>
              </div>
            </Link>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="shrink-0 w-64 sm:w-80 lg:w-[340px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          )}

          {/* Intersection observer target */}
          {hasMore && (
            <div
              ref={loadMoreRef}
              className="shrink-0 w-4"
              aria-hidden="true"
            />
          )}

          {/* End message */}
          {!hasMore && examples.length > 0 && (
            <div className="shrink-0 w-64 flex items-center justify-center text-gray-500 text-xs lg:text-sm">
              모든 사례를 확인했습니다
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
}
