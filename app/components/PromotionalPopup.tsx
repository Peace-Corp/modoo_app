"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { X } from "lucide-react";

const STORAGE_KEY = "hidePromoUntil";

export default function PromotionalPopup() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const hideUntil = localStorage.getItem(STORAGE_KEY);
    if (hideUntil) {
      const today = new Date().toDateString();
      if (new Date(hideUntil).toDateString() === today) return;
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  const hideForToday = () => {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    localStorage.setItem(STORAGE_KEY, endOfDay.toISOString());
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      onClick={() => setVisible(false)}
    >
      <div
        className="relative w-[90%] max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => setVisible(false)}
          className="absolute -top-3 -right-3 z-10 rounded-full bg-white p-1 shadow"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        {/* Image */}
        <div
          className="cursor-pointer overflow-hidden rounded-xl"
          onClick={() => {
            setVisible(false);
            router.push("/home/cobuy/request/create");
          }}
        >
          <Image
            src="/pictures/promotional_image.png"
            alt="프로모션"
            width={400}
            height={500}
            className="w-full object-contain"
          />
        </div>

        {/* 오늘 하루 그만보기 */}
        <button
          onClick={hideForToday}
          className="mt-2 w-full rounded-lg bg-white/90 py-2 text-sm text-gray-500 hover:bg-white"
        >
          오늘 하루 그만보기
        </button>
      </div>
    </div>
  );
}
