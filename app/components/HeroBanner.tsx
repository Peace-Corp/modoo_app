'use client';

import { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { createClient } from '@/lib/supabase-client';
import { HeroBanner as HeroBannerType } from '@/types/types';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export default function HeroBanner() {
  const [banners, setBanners] = useState<HeroBannerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBanners() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('hero_banners')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (error) throw error;

        setBanners(data || []);
      } catch (err) {
        console.error('Error fetching hero banners:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch banners');
      } finally {
        setLoading(false);
      }
    }

    fetchBanners();
  }, []);

  if (loading) {
    return (
      <section className="w-full">
        <div className="h-70 sm:h-72 lg:h-84 bg-gray-100 rounded-2xl animate-pulse" />
      </section>
    );
  }

  if (error || banners.length === 0) {
    return null; // Hide banner section if there's an error or no banners
  }
  return (
    <section className="w-full">
      <style dangerouslySetInnerHTML={{
        __html: `
          .hero-swiper .swiper-slide {
            transition: transform 0.3s ease, opacity 0.3s ease;
            transform: scale(0.95);
          }
          .hero-swiper .swiper-slide-active {
            transform: scale(1);
            opacity: 1;
          }
        `
      }} />
      <Swiper
        modules={[Autoplay]}
        slidesPerView={1.3}
        centeredSlides={true}
        initialSlide={1}
        breakpoints={{
          640: {
            slidesPerView: 1.5,
            spaceBetween: 10,
          },
          1024: {
            slidesPerView: 2.8,
            spaceBetween: 8,
            centeredSlides: true,
          },
        }}
        className="h-70 sm:h-72 lg:h-84 hero-swiper"
      >
        {banners.map((banner) => (
          <SwiperSlide key={banner.id}>
            <div
              className={`h-full ${banner.bg_color} rounded-2xl lg:rounded-[20px] flex flex-col items-start justify-end text-white py-5 lg:py-6 px-5 lg:px-6 bg-cover bg-center bg-no-repeat relative overflow-hidden lg:aspect-square lg:max-w-105 lg:mx-auto`}
              style={banner.bg_image ? { backgroundImage: `url(${banner.bg_image})`, backgroundPosition: `${banner.bg_position || 'center'}`, backgroundSize: 'cover' } : undefined}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent rounded-2xl lg:rounded-[20px] pointer-events-none" />

              {/* Content */}
              <div className="relative z-10">
                <h2 className="text-xl lg:text-2xl font-bold mb-1">{banner.title}</h2>
                <p className="text-sm lg:text-base text-white/90">{banner.subtitle}</p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
