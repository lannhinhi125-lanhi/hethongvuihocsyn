import React, { useEffect, useState } from 'react';

export interface ChartDatum { key: string; label: string; value: number | null }
type ChartKind = 'bar' | 'column' | 'line' | 'area' | 'donut';
const colors = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#64748b'];
const names: Record<ChartKind, string> = { bar: 'Thanh ngang', column: 'Cột', line: 'Đường', area: 'Vùng', donut: 'Tròn' };

export function ReportChart({ data, title, temporal = false, additive = false, format = value => value === null ? '—' : value.toLocaleString('vi-VN'), onSelect }: {
  data: ChartDatum[]; title: string; temporal?: boolean; additive?: boolean;
  format?: (value: number | null) => string; onSelect?: (key: string) => void;
}) {
  const [kind, setKind] = useState<ChartKind>('column');
  const [page, setPage] = useState(0);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(data.length / 12) - 1));
  useEffect(() => setPage(0), [title, data.length, data[0]?.key]);
  const allowed: ChartKind[] = ['bar', 'column', ...(temporal ? ['line', 'area'] as ChartKind[] : []), ...(additive && data.every(row => row.value === null || row.value >= 0) ? ['donut'] as ChartKind[] : [])];
  const active = allowed.includes(kind) ? kind : 'column';
  const rows = data.slice(currentPage * 12, (currentPage + 1) * 12);
  const max = Math.max(1, ...rows.map(row => Math.abs(row.value ?? 0)));
  const total = rows.reduce((sum, row) => sum + (row.value ?? 0), 0);
  const hasNegative = rows.some(row => (row.value ?? 0) < 0);
  const baseline = hasNegative ? 130 : 230;
  const height = hasNegative ? 100 : 200;
  const dates = rows.map(row => /^\d{4}-\d{2}(?:-\d{2})?$/.test(row.key) ? Date.parse(row.key.length === 7 ? row.key + '-01T00:00:00Z' : row.key + 'T00:00:00Z') : NaN);
  const spacedTime = temporal && dates.length > 1 && dates.every(Number.isFinite) && dates[dates.length - 1] > dates[0];
  const x = (index: number) => 55 + (spacedTime ? (dates[index] - dates[0]) / (dates[dates.length - 1] - dates[0]) : index / Math.max(1, rows.length - 1)) * 650;
  const y = (value: number) => baseline - value / max * height;
  const points = rows.map((row, index) => row.value === null ? null : `${x(index)},${y(row.value)}`);
  const segments = points.reduce<string[][]>((all, point) => { if (point === null) all.push([]); else all[all.length - 1].push(point); return all; }, [[]]).filter(segment => segment.length);
  let offset = 0;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div><h4 className="text-sm font-bold text-slate-900">{title}</h4><p className="mt-1 text-xs text-slate-500">{temporal ? 'Theo thứ tự thời gian' : 'So sánh giữa các nhóm'} · {data.length ? `${currentPage * 12 + 1}–${Math.min((currentPage + 1) * 12, data.length)} / ${data.length}` : '0'} nhóm</p></div>
      <div className="flex flex-wrap gap-1" aria-label="Loại biểu đồ">{allowed.map(type => <button key={type} type="button" aria-pressed={active === type} onClick={() => setKind(type)} className={'rounded-lg px-3 py-2 text-xs font-semibold transition ' + (active === type ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50')}>{names[type]}</button>)}</div>
    </div>
    {!rows.length || rows.every(row => row.value === null) ? <p className="py-12 text-center text-sm text-slate-500">Chưa có dữ liệu để vẽ biểu đồ.</p> : active === 'bar' ? <div className="space-y-3">{rows.map((row, index) => <button disabled={!onSelect} type="button" key={row.key} onClick={() => onSelect?.(row.key)} className="block w-full rounded-lg text-left enabled:hover:bg-slate-50"><div className="mb-1 flex justify-between gap-3 text-xs"><span>{row.label}</span><strong>{format(row.value)}</strong></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.abs(row.value ?? 0) / max * 100}%`, background: colors[index % colors.length] }} /></div></button>)}</div>
      : active === 'donut' ? total === 0 ? <p className="py-12 text-center text-sm text-slate-500">Tổng bằng 0, chưa thể thể hiện cơ cấu.</p> : <div className="flex flex-wrap items-center justify-center gap-8"><svg viewBox="0 0 240 240" className="h-60 w-60" role="img" aria-label={title}><circle cx="120" cy="120" r="80" fill="none" stroke="#f1f5f9" strokeWidth="32" />{rows.map((row, index) => { const share = (row.value ?? 0) / total * 100; const start = offset; offset += share; return <circle key={row.key} cx="120" cy="120" r="80" pathLength="100" fill="none" stroke={colors[index % colors.length]} strokeWidth="32" strokeDasharray={`${share} ${100 - share}`} strokeDashoffset={-start} transform="rotate(-90 120 120)"><title>{`${row.label}: ${format(row.value)} (${share.toFixed(1)}%)`}</title></circle>; })}<text x="120" y="115" textAnchor="middle" fontSize="12" fill="#64748b">Tổng nhóm hiển thị</text><text x="120" y="142" textAnchor="middle" fontSize="22" fontWeight="700" fill="#0f172a">{format(total)}</text></svg><div className="min-w-48 space-y-2">{rows.map((row, index) => <button type="button" disabled={!onSelect} onClick={() => onSelect?.(row.key)} key={row.key} className="flex w-full items-center gap-2 text-left text-xs"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[index % colors.length] }} /><span className="flex-1">{row.label}</span><strong>{format(row.value)}</strong><span className="text-slate-500">{((row.value ?? 0) / total * 100).toFixed(1)}%</span></button>)}</div></div>
      : <div className="overflow-x-auto"><svg viewBox="0 0 760 290" className="min-w-[560px] w-full" role="img" aria-label={title}>
        {[0, .25, .5, .75, 1].map(tick => <g key={tick}><line x1="45" x2="730" y1={y(max * tick)} y2={y(max * tick)} stroke="#e2e8f0" strokeDasharray="4 4" /><text x="38" y={y(max * tick) + 4} textAnchor="end" fontSize="10" fill="#64748b">{format(max * tick)}</text></g>)}
        <line x1="45" x2="730" y1={baseline} y2={baseline} stroke="#94a3b8" />
        {(active === 'line' || active === 'area') && segments.map((segment, index) => <g key={index}>{active === 'area' && <polygon points={`${segment[0].split(',')[0]},${baseline} ${segment.join(' ')} ${segment[segment.length - 1].split(',')[0]},${baseline}`} fill="#e0e7ff" />}<polyline points={segment.join(' ')} fill="none" stroke="#4f46e5" strokeWidth="3" /></g>)}
        {rows.map((row, index) => { const position = active === 'column' ? 55 + (index + .5) * 650 / rows.length : x(index); return <g key={row.key}>{row.value !== null && (active === 'column' ? <rect x={position - Math.min(22, 220 / rows.length)} y={Math.min(baseline, y(row.value))} width={Math.min(44, 440 / rows.length)} height={Math.abs(baseline - y(row.value))} rx="4" fill={colors[index % colors.length]}><title>{`${row.label}: ${format(row.value)}`}</title></rect> : <circle cx={position} cy={y(row.value)} r="5" fill="#4f46e5"><title>{`${row.label}: ${format(row.value)}`}</title></circle>)}<text x={position} y="254" textAnchor="middle" fontSize="10" fill="#475569">{row.label.length > 13 ? row.label.slice(0, 12) + '…' : row.label}</text></g>; })}
      </svg></div>}
    {active !== 'bar' && active !== 'donut' && rows.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{rows.map(row => <button type="button" disabled={!onSelect} key={row.key} onClick={() => onSelect?.(row.key)} className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 enabled:hover:bg-indigo-50">{row.label}: <strong>{format(row.value)}</strong></button>)}</div>}
    {onSelect && <p className="mt-4 text-xs text-slate-500">Chọn tên nhóm bên dưới biểu đồ để đối chiếu bản ghi nguồn.</p>}
    {data.length > 12 && <div className="mt-3 flex justify-end gap-2"><button type="button" aria-label="Biểu đồ: nhóm trước" disabled={!currentPage} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40">Trước</button><button type="button" aria-label="Biểu đồ: nhóm tiếp theo" disabled={(currentPage + 1) * 12 >= data.length} onClick={() => setPage(currentPage + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs disabled:opacity-40">Tiếp</button></div>}
  </section>;
}
