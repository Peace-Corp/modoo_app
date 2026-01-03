'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const bannerSlides = [
  {
    id: 1,
    title: 'Summer Sale',
    subtitle: 'Up to 50% off on selected items',
    bgColor: 'bg-gray-200',
    bgImage: '/pictures/male_model.png',
    bgPosition: 'top'
  },
  {
    id: 2,
    title: 'New Arrivals',
    subtitle: 'Check out our latest collection',
    bgColor: 'bg-gray-200',
    bgImage: '/pictures/female_model.png',
    bgPosition: 'center'
  },
  {
    id: 3,
    title: 'Flash Deals',
    subtitle: 'Limited time offers',
    bgColor: 'bg-gray-200',
    bgImage: '/pictures/varsity_model.png',
    bgPosition: 'top'
  },
  {
    id: 4,
    title: 'Flash Deals',
    subtitle: 'Limited time offers',
    bgColor: 'bg-gray-200',
  },
  {
    id: 5,
    title: 'Flash Deals',
    subtitle: 'Limited time offers',
    bgColor: 'bg-gray-200',
  },
];

export default function HeroBanner() {
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
        {bannerSlides.map((slide) => (
          <SwiperSlide key={slide.id}>
            <div
              className={`h-full ${slide.bgColor} rounded-2xl lg:rounded-[18px] flex flex-col items-start justify-end text-white py-4 lg:py-5 px-4 lg:px-5 bg-cover bg-center bg-no-repeat relative overflow-hidden lg:aspect-square lg:max-w-[420px] lg:mx-auto`}
              style={slide.bgImage ? { backgroundImage: `url(${slide.bgImage})`, backgroundPosition: `${slide.bgPosition}`, backgroundSize: 'cover' } : undefined}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent rounded-2xl lg:rounded-[20px] pointer-events-none" />

              {/* Content */}
              <div className="relative z-10">
                <h2 className="text-2xl lg:text-2xl font-bold">{slide.title}</h2>
                <p className="text-sm lg:text-sm text-white/90">{slide.subtitle}</p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
