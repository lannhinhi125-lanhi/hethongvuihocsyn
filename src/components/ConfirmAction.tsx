import React, { useEffect, useSyncExternalStore } from 'react';
type Request = { message: string; resolve: (accepted: boolean) => void };
const queue: Request[] = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
export function confirmAction(message: string): Promise<boolean> {
  return new Promise(resolve => { queue.push({message,resolve}); notify(); });
}
export function ConfirmAction() {
  const request = useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => queue[0]);
  const finish = (accepted: boolean) => { const next = queue.shift(); next?.resolve(accepted); notify(); };
  useEffect(() => {
    if (!request) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') finish(false); };
    window.addEventListener('keydown',key);
    return () => window.removeEventListener('keydown',key);
  }, [request]);
  if (!request) return null;
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
    <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-action-title" aria-describedby="confirm-action-message" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <h2 id="confirm-action-title" className="font-bold">Xác nhận thao tác</h2>
      <p id="confirm-action-message" className="mt-3 text-sm text-slate-600">{request.message}</p>
      <div className="mt-5 flex justify-end gap-3">
        <button autoFocus type="button" onClick={() => finish(false)} className="rounded-lg border px-4 py-2">Hủy</button>
        <button type="button" onClick={() => finish(true)} className="rounded-lg bg-rose-600 px-4 py-2 text-white">Xác nhận</button>
      </div>
    </div>
  </div>;
}
