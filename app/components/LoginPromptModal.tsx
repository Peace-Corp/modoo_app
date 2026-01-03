'use client';

import { useRouter } from "next/navigation";

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

  if (!isOpen) return null;

  const handleLoginClick = () => {
    onClose();
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
          <p className="text-base text-gray-600 mb-8">
            {message}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleLoginClick}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition"
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