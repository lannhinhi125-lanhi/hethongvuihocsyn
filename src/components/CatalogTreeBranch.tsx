import React, { useEffect, useId, useState } from 'react';
import { ChevronRight, PlusCircle } from 'lucide-react';

export const CatalogTreeBranch: React.FC<{
  title: string; count: number; code?: string; actions?: React.ReactNode;
  addLabel?: string; onAdd?: () => void; disabled?: boolean;
  revealKey?: string; children: React.ReactNode;
}> = ({ title, count, code, actions, addLabel = 'Thêm con', onAdd, disabled, revealKey, children }) => {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  useEffect(() => { if (revealKey) setExpanded(true); }, [revealKey]);
  return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/80 px-3 py-2.5">
      <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <ChevronRight className={'h-4 w-4 shrink-0 text-slate-500 transition-transform ' + (expanded ? 'rotate-90' : '')} />
        <span className="text-xs font-semibold text-slate-800">{title}</span>
        <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-500">{count} mục</span>
        {code && <span className="hidden text-[10px] text-slate-400 lg:inline">{code}</span>}
      </button>
      <div className="flex flex-wrap items-center gap-2">{actions}{onAdd && <button type="button" disabled={disabled} onClick={() => { setExpanded(true); onAdd(); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"><PlusCircle className="h-3.5 w-3.5" />{addLabel}</button>}</div>
    </div>
    <div id={id} hidden={!expanded} className="border-t border-slate-100 [&_tbody_td:first-child]:pl-8 [&_tbody_th:first-child]:pl-8">{children}</div>
  </section>;
};
