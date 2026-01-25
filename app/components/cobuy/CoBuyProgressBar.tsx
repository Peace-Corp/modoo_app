'use client';

import { CoBuyStatus } from '@/types/types';
import { Check } from 'lucide-react';

// Progress states in order (excludes 'cancelled' as it's not a progress step)
type ProgressStatus = Exclude<CoBuyStatus, 'cancelled'>;

interface ProgressStep {
  key: ProgressStatus;
  label: string;
}

const PROGRESS_STEPS: ProgressStep[] = [
  { key: 'gathering', label: '모집중' },
  { key: 'gather_complete', label: '모집 완료' },
  { key: 'order_complete', label: '주문 완료' },
  { key: 'manufacturing', label: '제작중' },
  { key: 'manufacture_complete', label: '제작 완료' },
  { key: 'delivering', label: '배송중' },
  { key: 'delivery_complete', label: '배송 완료' },
];

interface CoBuyProgressBarProps {
  currentStatus: CoBuyStatus;
}

export default function CoBuyProgressBar({ currentStatus }: CoBuyProgressBarProps) {
  // If cancelled, don't show progress (or show at gathering step)
  const effectiveStatus = currentStatus === 'cancelled' ? 'gathering' : currentStatus;
  const currentIndex = PROGRESS_STEPS.findIndex((step) => step.key === effectiveStatus);

  return (
    <div className="w-full">
      {/* Mobile: Vertical layout */}
      <div className="md:hidden">
        <div className="relative">
          {PROGRESS_STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={step.key} className="flex items-start gap-3 pb-4 last:pb-0">
                {/* Connector line */}
                <div className="flex flex-col items-center">
                  {/* Circle */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isCurrent
                        ? 'bg-[#3B55A5] text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-medium">{index + 1}</span>
                    )}
                  </div>
                  {/* Vertical line */}
                  {index < PROGRESS_STEPS.length - 1 && (
                    <div
                      className={`w-0.5 h-6 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
                {/* Label */}
                <div className="pt-0.5">
                  <span
                    className={`text-sm font-medium ${
                      isCompleted
                        ? 'text-green-600'
                        : isCurrent
                        ? 'text-[#3B55A5]'
                        : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop: Horizontal layout */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between relative">
          {/* Background line */}
          <div className="absolute left-0 right-0 top-4 h-0.5 bg-gray-200" />
          {/* Progress line */}
          <div
            className="absolute left-0 top-4 h-0.5 bg-green-500 transition-all duration-300"
            style={{
              width: `${currentIndex > 0 ? (currentIndex / (PROGRESS_STEPS.length - 1)) * 100 : 0}%`,
            }}
          />

          {PROGRESS_STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={step.key} className="flex flex-col items-center relative z-10">
                {/* Circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-[#3B55A5] text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                {/* Label */}
                <span
                  className={`mt-2 text-xs font-medium whitespace-nowrap ${
                    isCompleted
                      ? 'text-green-600'
                      : isCurrent
                      ? 'text-[#3B55A5]'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
