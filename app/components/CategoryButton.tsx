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
      <div className={`size-12 rounded-lg flex items-center justify-center transition-colors ${
        isActive ? 'ring-1 ring-blue-500 box-content' : ''
      }`}>
        {icon ? (
          <Image
            src={icon}
            alt={name}
            width={40}
            height={40}
            className="object-contain"
          />
        ) : (
          <span className="text-2xl">📦</span>
        )}
      </div>
      <p className={`text-sm font-medium ${
        isActive ? 'text-blue-600' : 'text-gray-700'
      }`}>
        {name}
      </p>
    </button>
  );
}