'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { ProductionExample } from '@/types/types';
import Image from 'next/image';

export default function ProductionExamples() {
  const [examples, setExamples] = useState<ProductionExample[]>([]);

  useEffect(() => {
    async function fetchExamples() {
      const supabase = createClient();
      const { data } = await supabase
        .from('production_examples')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (data) setExamples(data);
    }
    fetchExamples();
  }, []);

  if (examples.length === 0) return null;

  return (
    <section id="production-examples" className="w-full">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-3 lg:mb-4">제작 사례</h2>
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="flex gap-3 lg:gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {examples.map((example) => (
            <div
              key={example.id}
              className="group shrink-0 w-64 sm:w-80 lg:w-85 bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
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
                <h3 className="text-md lg:text-base font-semibold text-gray-900 mb-1 lg:mb-2 line-clamp-1">
                  {example.title}
                </h3>
              </div>
            </div>
          ))}
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
