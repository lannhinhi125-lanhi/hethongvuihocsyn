import { ReportSelect } from './ReportSelect';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { availableReportCharts, renderReportPlot, reportChartNames, type PlotDatum, type ReportChartKind } from '../lib/reportPlot';
export type ChartDatum = PlotDatum;
const defaultFormat=(value:number|null)=>value===null?'—':value.toLocaleString('vi-VN');

export function ReportChart({ data, title, temporal = false, additive = false, format = defaultFormat,
  onSelect, onClearSelection, selectedKey, kind, onKindChange, comparison = false, groupLabel='Nhóm', metricLabel=title }: {
  data: ChartDatum[]; title: string; temporal?: boolean; additive?: boolean; comparison?: boolean;
  format?: (value: number | null) => string; onSelect?: (key: string) => void; onClearSelection?: () => void; selectedKey?: string;
  kind?: ReportChartKind; onKindChange?: (kind: ReportChartKind) => void;
  groupLabel?: string; metricLabel?: string;
}) {
  const [localKind, setLocalKind] = useState<ReportChartKind>('column');
  const [page, setPage] = useState(0);
  const [hovered, setHovered] = useState<string>();
  const idPrefix = useId();
  const chartRoot = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!selectedKey || !onClearSelection) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || chartRoot.current?.contains(target)) return;
      // A chart's dropdown is rendered in a portal but remains part of its controls.
      const popup = target instanceof Element ? target.closest('[role="listbox"]') : null;
      if (popup && Array.from(chartRoot.current?.querySelectorAll('[aria-controls]') || []).some(control => control.getAttribute('aria-controls') === popup.id)) return;
      setHovered(undefined);
      onClearSelection();
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [selectedKey, onClearSelection]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(data.length / 12) - 1));
  useEffect(() => setPage(0), [title, data.length, data[0]?.key]);
  const allowed = availableReportCharts(temporal, additive, data, comparison);
  const chosen = kind || localKind;
  const active = allowed.includes(chosen) ? chosen : 'column';
  const rows = useMemo(()=>data.slice(currentPage * 12, (currentPage + 1) * 12),[data,currentPage]);
  const plotMarkup=useMemo(()=>({__html:renderReportPlot(rows,active,format,{title,groupLabel,metricLabel,interactive:Boolean(onSelect),selectedKey,comparison,idPrefix})}),[rows,active,format,title,groupLabel,metricLabel,onSelect,selectedKey,comparison,idPrefix]);
  const focused = data.find(row => row.key === (hovered || selectedKey));
  const keyFrom = (target: EventTarget | null) => target instanceof Element ? target.closest('[data-report-key]')?.getAttribute('data-report-key') : null;
  return <section ref={chartRoot} onKeyDown={event => { if (event.key === 'Escape' && selectedKey) { setHovered(undefined); onClearSelection?.(); } }} className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-sm font-bold text-slate-900">{title}</h4><p className="mt-1 text-xs text-slate-500">{data.length ? `${currentPage * 12 + 1}–${Math.min((currentPage + 1) * 12, data.length)} / ${data.length}` : '0'} nhóm{comparison ? ' · Hiện tại: tím xanh / Đối chiếu: cam' : ''}</p></div>
      <label className="text-xs text-slate-500">Biểu đồ <ReportSelect aria-label="Loại biểu đồ" value={active} onChange={event => { const value = event.target.value as ReportChartKind; setLocalKind(value); onKindChange?.(value); }} className="ml-1 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700">{(Object.keys(reportChartNames) as ReportChartKind[]).map(type => <option key={type} value={type} disabled={!allowed.includes(type)}>{reportChartNames[type]}{!temporal && (type === 'line' || type === 'area') ? ' — chọn xem theo ngày/tuần/tháng' : !allowed.includes(type) ? ' — không phù hợp số liệu này' : ''}</option>)}</ReportSelect></label>
    </div>
    {!rows.length || rows.every(row => row.value === null && (!comparison || row.previous == null)) ? <p className="py-10 text-center text-sm text-slate-500">Chưa có dữ liệu để vẽ biểu đồ.</p> : <div className="overflow-x-auto" onClick={event => { const key = keyFrom(event.target); if (key) onSelect?.(key); else { setHovered(undefined); onClearSelection?.(); } }}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { const key = keyFrom(event.target); if (key) { event.preventDefault(); onSelect?.(key); } } }}
      onMouseOver={event => setHovered(keyFrom(event.target) || undefined)} onMouseLeave={() => setHovered(undefined)}
      onFocus={event => setHovered(keyFrom(event.target) || undefined)} onBlur={() => setHovered(undefined)}>
      <div className="min-w-[480px] [&_[role=button]:focus]:outline-2 [&_[role=button]:focus]:outline-orange-500" dangerouslySetInnerHTML={plotMarkup} />
    </div>}
    {onSelect && <p className="mt-2 text-xs text-slate-600" aria-live="polite">{focused ? `${focused.label}: ${format(focused.value)}${comparison ? ' · Đối chiếu: ' + format(focused.previous ?? null) : ''}` : 'Bấm vào cột, điểm hoặc phần biểu đồ để lọc số liệu bên dưới.'}</p>}
    {data.length > 12 && <div className="mt-2 flex justify-end gap-2"><button type="button" aria-label="Biểu đồ: nhóm trước" disabled={!currentPage} onClick={() => setPage(currentPage - 1)} className="rounded border px-3 py-1.5 text-xs disabled:opacity-40">Trước</button><button type="button" aria-label="Biểu đồ: nhóm tiếp theo" disabled={(currentPage + 1) * 12 >= data.length} onClick={() => setPage(currentPage + 1)} className="rounded border px-3 py-1.5 text-xs disabled:opacity-40">Tiếp</button></div>}
  </section>;
}
