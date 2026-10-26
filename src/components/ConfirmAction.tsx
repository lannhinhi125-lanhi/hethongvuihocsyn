import React, { useEffect, useSyncExternalStore } from 'react';
type Request = { message: string; resolve: (accepted: boolean) => void };
const queue: Request[] = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
export function confirmAction(message: string): Promise<boolean> {
  return new Promise(resolve => { queue.push({message,resolve}); notify(); });
}
export function ConfirmAction() {
  const request = useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => queue[0], () => undefined);
  const finish = (accepted: boolean) => { const next = queue.shift(); next?.resolve(accepted); notify(); };
  useEffect(() => {
    if (!request) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') finish(false); };
    window.addEventListener('keydown',key);
    return () => window.removeEventListener('keydown',key);
  }, [request]);
  if (!request) return null;
  return <div className="workspace-ui fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 p-4 text-slate-800">
    <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-action-title" aria-describedby="confirm-action-message" className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 id="confirm-action-title" className="text-sm font-bold text-slate-800">Xác nhận thao tác</h2>
      </div>
      <p id="confirm-action-message" className="px-5 py-4 text-xs leading-relaxed text-slate-600 break-words">{request.message}</p>
      <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
        <button autoFocus type="button" onClick={() => finish(false)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50">Hủy</button>
        <button type="button" onClick={() => finish(true)} className="rounded-lg bg-[#FF5C00] px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#E05200]">Xác nhận</button>
      </div>
    </div>
  </div>;
}
