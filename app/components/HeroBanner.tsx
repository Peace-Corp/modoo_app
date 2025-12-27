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
    <section className="max-w-7xl mx-auto ">
      <Swiper
        modules={[Autoplay]}
        spaceBetween={10}
        slidesPerView={1.3}
        centeredSlides={true}
        // navigation={true}
        // pagination={{ clickable: true }}
        // autoplay={{
        //   delay: 3000,
        //   disableOnInteraction: false,
        // }}
        // loop={true}
        breakpoints={{
          640: {
            slidesPerView: 1.5,
            spaceBetween: 20,
          },
          1024: {
            slidesPerView: 1,
            spaceBetween: 0,
            centeredSlides: false,
          },
        }}
        className="h-96"
      >
        {bannerSlides.map((slide) => (
          <SwiperSlide key={slide.id}>
            <div
              className={`h-full ${slide.bgColor} rounded-2xl flex flex-col items-start justify-end text-white py-8 px-6 bg-cover bg-center bg-no-repeat relative overflow-hidden`}
              style={slide.bgImage ? { backgroundImage: `url(${slide.bgImage})`, backgroundPosition: `${slide.bgPosition}`, backgroundSize: 'cover' } : undefined}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent rounded-2xl pointer-events-none" />

              {/* Content */}
              <div className="relative z-10">
                <h2 className="text-2xl font-bold">{slide.title}</h2>
                <p className="text-sm">{slide.subtitle}</p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}