'use client';

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const LOGIN_RETURN_TO_KEY = 'login:returnTo';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export default function LoginPromptModal({
  isOpen,
  onClose,
  title = "로그인이 필요합니다",
  message = "이 기능을 사용하려면 로그인이 필요합니다."
}: LoginPromptModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!isOpen) return null;

  const handleLoginClick = () => {
    onClose();

    try {
      const search = searchParams?.toString();
      const currentRoute = `${pathname}${search ? `?${search}` : ''}`;
      sessionStorage.setItem(LOGIN_RETURN_TO_KEY, currentRoute);
    } catch {
      // ignore
    }

    router.push('/login');
  };

  return (
    <div
      className="fixed inset-0 w-full h-full bg-black/50 z-9999 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full h-full flex flex-col items-center justify-center p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-md w-full text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">{title}</h3>
          <p className=" text-gray-600 mb-8 whitespace-pre-line w-65 mx-auto">
            {message}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleLoginClick}
              className="w-full px-6 py-4 bg-[#3B55A5] text-white rounded-lg font-semibold text-lg hover:bg-[#2D4280] transition"
            >
              로그인하기
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
