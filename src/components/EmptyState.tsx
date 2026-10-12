import React from 'react';
import { SearchX } from 'lucide-react';

export function EmptyState({ title, description = 'Thử thay đổi từ khóa hoặc điều kiện lọc để xem kết quả.' }: {
  title: string;
  description?: string;
}) {
  return <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-8 text-center">
    <span aria-hidden="true" className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-500"><SearchX className="h-6 w-6" /></span>
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    <p className="mt-1.5 text-xs font-normal leading-5 text-slate-500">{description}</p>
  </div>;
}
