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
  },
  {
    id: 2,
    title: 'New Arrivals',
    subtitle: 'Check out our latest collection',
    bgColor: 'bg-gray-200',
  },
  {
    id: 3,
    title: 'Flash Deals',
    subtitle: 'Limited time offers',
    bgColor: 'bg-gray-200',
  },
];

export default function HeroBanner() {
  return (
    <section className="max-w-7xl mx-auto ">
      <Swiper
        modules={[Pagination, Autoplay]}
        spaceBetween={3}
        slidesPerView={1.2}
        centeredSlides={true}
        navigation
        pagination={{ clickable: true }}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
        }}
        loop={true}
        className="h-96"
      >
        {bannerSlides.map((slide) => (
          <SwiperSlide key={slide.id}>
            <div className={`h-full ${slide.bgColor} rounded-2xl flex flex-col items-center justify-center text-white p-8`}>
              <h2 className="text-4xl md:text-6xl font-bold mb-4">{slide.title}</h2>
              <p className="text-xl md:text-2xl">{slide.subtitle}</p>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}