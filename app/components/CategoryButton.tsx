'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";

type CategoryButtonProps = {
  name: string;
  icon?: string;
  onClick?: () => void;
  href?: string;
  isActive?: boolean;
};

export default function CategoryButton({ name, icon, onClick, href, isActive = false }: CategoryButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`flex flex-col items-center gap-1 min-w-fit transition-all ${
        isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'
      }`}
    >
      <div className={`size-14 sm:size-16 lg:size-20 rounded-xl lg:rounded-2xl flex items-center justify-center transition-colors ${
        isActive ? 'ring-1 ring-blue-500 box-content' : ''
      }`}>
        {icon ? (
          <Image
            src={icon}
            alt={name}
            width={56}
            height={56}
            className="object-contain w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14"
          />
        ) : (
          <span className="text-3xl sm:text-4xl">📦</span>
        )}
      </div>
      <p className={`text-sm sm:text-base font-medium ${
        isActive ? 'text-blue-600' : 'text-gray-700'
      }`}>
        {name}
      </p>
    </button>
  );
}
