import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';

export function EmptyState({
  title,
  description = 'Thử thay đổi từ khóa hoặc điều kiện lọc để xem kết quả.',
  onReset,
  actionLabel = 'Xóa bộ lọc',
}: {
  title: string;
  description?: string;
  onReset?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-8 text-center">
      <span aria-hidden="true" className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#FF5C00]">
        <SearchX className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1.5 text-xs font-normal leading-5 text-slate-500">{description}</p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50/70 hover:bg-orange-100 text-[#FF5C00] font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
