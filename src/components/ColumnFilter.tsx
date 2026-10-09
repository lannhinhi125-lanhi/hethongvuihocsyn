import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Filter, X } from 'lucide-react';
export const ColumnFilter: React.FC<{ label: string; active: boolean; onReset: () => void; children: React.ReactNode }> = ({ label, active, onReset, children }) => {
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!position) return;
    const outside = (event: PointerEvent) => { if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPosition(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setPosition(null); trigger.current?.focus(); } };
    const scroll = (event: Event) => { if (!panel.current?.contains(event.target as Node)) setPosition(null); };
    const resize = () => setPosition(null);
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    window.addEventListener('resize', resize); window.addEventListener('scroll', scroll, true);
    panel.current?.querySelector<HTMLElement>('input,select,button')?.focus();
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('resize', resize); window.removeEventListener('scroll', scroll, true); };
  }, [position]);
  return <span className="inline-flex items-center gap-1">
    {label}
    <button ref={trigger} type="button" aria-label={'Lọc riêng cột ' + label} aria-haspopup="dialog" aria-expanded={Boolean(position)} title={'Lọc riêng cột ' + label} onClick={() => {
      if (position) { setPosition(null); return; }
      const rect = trigger.current!.getBoundingClientRect();
      const width = Math.min(280, window.innerWidth - 24);
      setPosition({ left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: Math.max(12, Math.min(rect.bottom + 6, window.innerHeight - Math.min(360, window.innerHeight - 24) - 12)), width });
    }} className={active ? 'p-1 rounded text-orange-600 bg-orange-100' : 'p-1 rounded text-slate-400 hover:bg-slate-200 hover:text-orange-600'}><Filter className="w-3 h-3" /></button>
    {position && createPortal(<div ref={panel} role="dialog" aria-label={'Lọc riêng cột ' + label} style={position} className="fixed z-[110] max-h-[min(360px,calc(100vh-24px))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl text-xs font-normal normal-case text-left text-slate-700">
      <div className="flex items-center justify-between mb-3"><strong>{label}</strong><button type="button" aria-label="Đóng bộ lọc cột" onClick={() => { setPosition(null); trigger.current?.focus(); }} className="p-1"><X className="w-4 h-4" /></button></div>
      <div className="space-y-3">{children}</div>
      <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between"><button type="button" onClick={onReset} className="text-orange-600">Xóa lọc cột này</button><button type="button" onClick={() => { setPosition(null); trigger.current?.focus(); }} className="px-2 py-1 rounded-lg bg-slate-100">Xong</button></div>
    </div>, document.body)}
  </span>;
};
