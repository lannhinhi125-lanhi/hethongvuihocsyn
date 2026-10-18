import React, { useEffect, useState } from 'react';
import { ArrowLeftRight, Download, Search } from 'lucide-react';
import { formatReportValue, type ReportMetric } from '../lib/customReports';
import { comparisonCsv, comparisonIssue, comparisonRange, finiteRange, formatComparisonRange, metricDirection, rangeDays, reportChange,
  type ComparisonRange, type ComparisonRow, type ComparisonSettings } from '../lib/reportComparison';

export function ComparisonControls({ current, settings, onChange, disabled = false }: {
  current: ComparisonRange; settings: ComparisonSettings; onChange: (value: ComparisonSettings) => void; disabled?: boolean;
}) {
  const previous = comparisonRange(current, settings);
  const issue = settings.enabled && !disabled ? comparisonIssue(current, previous) : null;
  const input = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs disabled:opacity-50';
  return <section className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
    <div className="flex flex-wrap items-center gap-3">
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800"><input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={settings.enabled && !disabled} disabled={disabled} onChange={event => onChange({ ...settings, enabled: event.target.checked })} /><ArrowLeftRight className="h-4 w-4 text-indigo-600" />So sánh hai kỳ</label>
      {settings.enabled && !disabled && <><select aria-label="Cách chọn kỳ đối chiếu" className={input} value={settings.mode} onChange={event => onChange({ ...settings, mode: event.target.value as ComparisonSettings['mode'] })}>
        <option value="previous">Kỳ liền trước</option><option value="year">Cùng kỳ năm trước</option><option value="custom">Tự chọn kỳ đối chiếu</option>
      </select>{settings.mode === 'custom' && <><input type="date" aria-label="Kỳ đối chiếu: từ ngày" className={input} value={settings.start} onChange={event => onChange({ ...settings, start: event.target.value })} /><span className="text-xs text-slate-500">đến</span><input type="date" aria-label="Kỳ đối chiếu: đến ngày" className={input} value={settings.end} onChange={event => onChange({ ...settings, end: event.target.value })} /></>}</>}
    </div>
    {disabled ? <p className="text-xs text-slate-500">Nguồn dữ liệu là hiện trạng, chưa có lịch sử để so sánh theo kỳ.</p>
      : settings.enabled ? <>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs"><span className="font-medium text-indigo-700">Hiện tại: {formatComparisonRange(current)}</span><span className="text-slate-600">Đối chiếu: {formatComparisonRange(previous)}</span></div>
        {issue ? <p role="alert" className="text-xs text-amber-800">{issue}</p> : <p className="text-xs text-slate-500">Cùng chỉ số, cách nhóm và điều kiện lọc cho cả hai kỳ.{rangeDays(current) !== rangeDays(previous) && ` Hai kỳ dài ${rangeDays(current)} và ${rangeDays(previous)} ngày; lưu ý khi so sánh số lượng.`}</p>}
      </> : <p className="text-xs text-slate-500">Xem mức tăng/giảm so với kỳ trước hoặc một khoảng ngày tùy chọn.{!finiteRange(current) && ' Chọn một kỳ cụ thể trên thanh thời gian để bắt đầu.'}</p>}
  </section>;
}

function ChangeValue({ current, previous, metric, datasetId }: { current: number | null; previous: number | null; metric: ReportMetric; datasetId: string }) {
  const change = reportChange(current, previous, metric);
  const direction = metricDirection(datasetId, metric.id);
  const favorable = change.difference === null || change.difference === 0 || direction === 'neutral' ? null : direction === 'up' ? change.difference > 0 : change.difference < 0;
  return <span className={'block text-xs ' + (favorable === null ? 'text-slate-600' : favorable ? 'text-emerald-700' : 'text-rose-700')}><span className="font-semibold">{change.label}</span>{change.relative && <span className="mt-0.5 block">{change.relative}</span>}</span>;
}

function ComparisonChart({ rows, metric, temporal, chronological = true }: { rows: ComparisonRow[]; metric: ReportMetric; temporal: boolean; chronological?: boolean }) {
  const [type, setType] = useState<'column' | 'line'>('column');
  const [page, setPage] = useState(0);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(rows.length / 12) - 1));
  useEffect(() => setPage(0), [metric.id, rows[0]?.key, rows.length]);
  const kind = temporal && chronological ? type : 'column';
  const visible = rows.slice(currentPage * 12, (currentPage + 1) * 12);
  const values = visible.flatMap(row => [row.current[metric.id], row.previous[metric.id]]).filter((value): value is number => value != null);
  const min = Math.min(0, ...values), max = Math.max(1, ...values);
  const y = (value: number) => 225 - (value - min) / (max - min) * 190;
  const x = (index: number) => 72 + (index + .5) * 620 / Math.max(1, visible.length);
  const width = Math.min(22, 230 / Math.max(1, visible.length));
  const points = (period: 'current' | 'previous') => visible.reduce<string[][]>((segments, row, index) => {
    const value = row[period][metric.id];
    if (value == null) segments.push([]); else segments[segments.length - 1].push(`${x(index)},${y(value)}`);
    return segments;
  }, [[]]).filter(segment => segment.length);
  return <div className="border-b border-slate-100 p-4">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-4 text-xs"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded bg-indigo-600" />Kỳ hiện tại</span><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded bg-slate-400" />Kỳ đối chiếu</span></div>{temporal && chronological && <div className="flex gap-1">{(['column', 'line'] as const).map(item => <button type="button" key={item} aria-pressed={kind === item} onClick={() => setType(item)} className={'rounded-lg px-3 py-1.5 text-xs font-semibold ' + (kind === item ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600')}>{item === 'column' ? 'Cột cạnh nhau' : 'Hai đường'}</button>)}</div>}</div>
    <div className="overflow-x-auto"><svg role="img" aria-label={`So sánh ${metric.label} giữa hai kỳ`} viewBox="0 0 760 275" className="min-w-[560px] w-full">
      {[0, .25, .5, .75, 1].map(tick => { const value = min + tick * (max - min); return <g key={tick}><line x1="65" x2="730" y1={y(value)} y2={y(value)} stroke="#e2e8f0" strokeDasharray="4 4" /><text x="60" y={y(value) + 4} fontSize="10" fill="#64748b" textAnchor="end">{formatReportValue(value, metric)}</text></g>; })}
      <line x1="65" x2="730" y1={y(0)} y2={y(0)} stroke="#94a3b8" />
      {kind === 'line' && (['previous', 'current'] as const).flatMap(period => points(period).map((segment, index) => <polyline key={period + index} points={segment.join(' ')} fill="none" stroke={period === 'current' ? '#4f46e5' : '#94a3b8'} strokeWidth="3" strokeDasharray={period === 'previous' ? '5 3' : undefined} />))}
      {visible.map((row, index) => <g key={row.key}>{(['previous', 'current'] as const).map(period => {
        const value = row[period][metric.id]; if (value == null) return null;
        const color = period === 'current' ? '#4f46e5' : '#94a3b8';
        const tip = `${period === 'current' ? row.currentLabel || row.label : row.previousLabel || row.label}: ${formatReportValue(value, metric)} (${period === 'current' ? 'hiện tại' : 'đối chiếu'})`;
        return kind === 'column' ? <rect key={period} x={x(index) + (period === 'current' ? 2 : -width - 2)} y={Math.min(y(value), y(0))} width={width} height={Math.abs(y(value) - y(0))} rx="3" fill={color}><title>{tip}</title></rect> : <circle key={period} cx={x(index)} cy={y(value)} r="4" fill={color}><title>{tip}</title></circle>;
      })}<text x={x(index)} y="248" textAnchor="middle" fontSize="10" fill="#475569">{row.label.length > 14 ? row.label.slice(0, 13) + '…' : row.label}</text></g>)}
    </svg></div>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Hiển thị {currentPage * 12 + 1}–{Math.min((currentPage + 1) * 12, rows.length)} / {rows.length} nhóm. {temporal ? 'Ghép ngày/tuần/tháng theo vị trí trong mỗi kỳ; ngày thực tế hiển thị ở bảng bên dưới.' : 'Ghép nhóm theo cùng tên hoặc mã; nhóm chỉ xuất hiện ở một kỳ vẫn được giữ lại.'}</p>{rows.length > 12 && <div className="flex gap-2"><button type="button" aria-label="Biểu đồ: nhóm trước" disabled={!currentPage} onClick={() => setPage(currentPage - 1)} className="rounded border px-3 py-1.5 text-xs disabled:opacity-40">Trước</button><button type="button" aria-label="Biểu đồ: nhóm tiếp theo" disabled={(currentPage + 1) * 12 >= rows.length} onClick={() => setPage(currentPage + 1)} className="rounded border px-3 py-1.5 text-xs disabled:opacity-40">Tiếp</button></div>}</div>
  </div>;
}

export function ComparisonResults({ rows, metrics, totals, previousTotals, currentRange, previousRange, datasetId, temporal = false,
  onSelect, onExport, canExport = false }: {
  rows: ComparisonRow[]; metrics: ReportMetric[]; totals: Record<string, number | null>; previousTotals: Record<string, number | null>;
  currentRange: ComparisonRange; previousRange: ComparisonRange; datasetId: string; temporal?: boolean;
  onSelect?: (key: string, period: 'current' | 'previous') => void; onExport?: (csv: string) => void; canExport?: boolean;
}) {
  const [metricId, setMetricId] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'current' | 'change' | 'name'>(temporal ? 'name' : 'current');
  const [page, setPage] = useState(0);
  const metric = metrics.find(item => item.id === metricId) || metrics[0];
  const visible = rows.filter(row => [row.label, row.currentLabel, row.previousLabel].some(value => value?.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))));
  if (metric) visible.sort((a, b) => {
    if (sort === 'name') return temporal ? Number(a.key) - Number(b.key) : a.label.localeCompare(b.label, 'vi', { numeric: true });
    const value = (row: ComparisonRow) => sort === 'current' ? row.current[metric.id] : reportChange(row.current[metric.id], row.previous[metric.id], metric).difference;
    const first = value(a), second = value(b);
    return first == null ? second == null ? 0 : 1 : second == null ? -1 : second - first;
  });
  const pages = Math.max(1, Math.ceil(visible.length / 10));
  const currentPage = Math.min(page, pages - 1);
  useEffect(() => setPage(0), [search, sort, metricId, currentRange.start, currentRange.end, previousRange.start, previousRange.end]);
  if (!metric) return null;
  const groupButton = (row: ComparisonRow, period: 'current' | 'previous') => {
    const key = period === 'current' ? row.currentKey : row.previousKey;
    const label = period === 'current' ? row.currentLabel : row.previousLabel;
    return onSelect && key ? <button type="button" onClick={() => onSelect(key, period)} className="mt-1 block text-xs text-indigo-700 hover:underline">{label || 'Xem bản ghi nguồn'} ↗</button> : temporal && label ? <span className="mt-1 block text-xs text-slate-500">{label}</span> : null;
  };
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(item => <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-medium text-slate-500">{item.label}</p><p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{formatReportValue(totals[item.id], item)}</p><p className="mb-2 mt-1 text-xs text-slate-500">Kỳ đối chiếu: {formatReportValue(previousTotals[item.id], item)}</p><ChangeValue current={totals[item.id]} previous={previousTotals[item.id]} metric={item} datasetId={datasetId} /></div>)}</div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div><h4 className="text-sm font-bold text-slate-900">So sánh theo nhóm</h4><p className="mt-1 text-xs text-slate-500">Hiện tại: {formatComparisonRange(currentRange)} · Đối chiếu: {formatComparisonRange(previousRange)}</p></div><div className="flex flex-wrap gap-2"><select aria-label="Chỉ số so sánh" value={metric.id} onChange={event => setMetricId(event.target.value)} className="max-w-64 rounded-lg border border-slate-200 px-3 py-2 text-xs">{metrics.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>{onExport && <button type="button" disabled={!canExport || !visible.length} onClick={() => onExport(comparisonCsv(visible, metrics, currentRange, previousRange))} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40"><Download className="h-3.5 w-3.5" />Xuất so sánh CSV</button>}</div></div>
      <div className="flex flex-wrap items-center gap-3 p-4"><label className="relative block min-w-48 max-w-md flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input aria-label="Tìm nhóm so sánh" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm nhóm trong cả hai kỳ..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" /></label><select aria-label="Sắp xếp nhóm so sánh" value={sort} onChange={event => setSort(event.target.value as typeof sort)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs"><option value="name">{temporal ? 'Theo thứ tự thời gian' : 'Tên nhóm: tăng dần'}</option><option value="current">Kỳ hiện tại: giảm dần</option><option value="change">Chênh lệch: giảm dần</option></select></div>
      {!visible.length ? <p className="p-8 text-center text-sm text-slate-500">Không có nhóm phù hợp trong hai kỳ. Thử đổi thời gian hoặc điều kiện lọc.</p> : <>
        <ComparisonChart rows={visible} metric={metric} temporal={temporal} chronological={sort === 'name'} />
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr><th scope="col" className="px-4 py-3">Nhóm</th><th scope="col" className="px-4 py-3">Kỳ hiện tại</th><th scope="col" className="px-4 py-3">Kỳ đối chiếu</th><th scope="col" className="px-4 py-3">Chênh lệch</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.slice(currentPage * 10, (currentPage + 1) * 10).map(row => <tr key={row.key} className="hover:bg-slate-50"><th scope="row" className="px-4 py-3 font-medium text-slate-800">{row.label}</th><td className="px-4 py-3 tabular-nums text-indigo-700">{formatReportValue(row.current[metric.id], metric)}{groupButton(row, 'current')}</td><td className="px-4 py-3 tabular-nums text-slate-600">{formatReportValue(row.previous[metric.id], metric)}{groupButton(row, 'previous')}</td><td className="px-4 py-3"><ChangeValue current={row.current[metric.id]} previous={row.previous[metric.id]} metric={metric} datasetId={datasetId} /></td></tr>)}</tbody></table></div>
        {pages > 1 && <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs text-slate-500"><span>{currentPage * 10 + 1}–{Math.min((currentPage + 1) * 10, visible.length)} / {visible.length} nhóm</span><div className="flex items-center gap-3"><button type="button" disabled={!currentPage} onClick={() => setPage(currentPage - 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Trước</button><span>{currentPage + 1}/{pages}</span><button type="button" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Sau</button></div></div>}
      </>}
    </section>
    <p className="text-xs text-slate-500">Thẻ tổng hợp tính trên toàn bộ dữ liệu sau lọc. Tìm kiếm chỉ thu hẹp nhóm hiển thị. Tỷ lệ và điểm được tính lại từ dữ liệu nguồn; “—” nghĩa là chưa đủ dữ liệu, không phải bằng 0.</p>
  </div>;
}
