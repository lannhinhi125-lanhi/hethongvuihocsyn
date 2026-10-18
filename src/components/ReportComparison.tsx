import { VietnameseDatePicker } from './VietnameseDatePicker';
import { ReportSelect } from './ReportSelect';
import React, { useEffect, useState } from 'react';
import { ReportChart } from './ReportChart';
import type { ReportChartKind } from '../lib/reportPlot';
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
  return <section className={settings.enabled || disabled ? 'space-y-2 rounded-lg bg-slate-50 p-2' : ''}>
    <div className="flex flex-wrap items-center gap-3">
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800"><input type="checkbox" className="h-4 w-4 accent-orange-600" checked={settings.enabled && !disabled} disabled={disabled} onChange={event => onChange({ ...settings, enabled: event.target.checked })} /><ArrowLeftRight className="h-4 w-4 text-orange-600" />So sánh hai kỳ</label>
      {settings.enabled && !disabled && <><ReportSelect aria-label="Cách chọn kỳ đối chiếu" className={input} value={settings.mode} onChange={event => onChange({ ...settings, mode: event.target.value as ComparisonSettings['mode'] })}>
        <option value="previous">Kỳ liền trước</option><option value="year">Cùng kỳ năm trước</option><option value="custom">Tự chọn kỳ đối chiếu</option>
      </ReportSelect>{settings.mode === 'custom' && <><VietnameseDatePicker aria-label="Kỳ đối chiếu: từ ngày" className={input} value={settings.start} onChange={event => onChange({ ...settings, start: event.target.value })} /><span className="text-xs text-slate-500">đến</span><VietnameseDatePicker aria-label="Kỳ đối chiếu: đến ngày" className={input} value={settings.end} onChange={event => onChange({ ...settings, end: event.target.value })} /></>}</>}
    </div>
    {disabled ? <p className="text-xs text-slate-500">Nguồn dữ liệu là hiện trạng, chưa có lịch sử để so sánh theo kỳ.</p>
      : settings.enabled ? <>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs"><span className="font-medium text-orange-700">Hiện tại: {formatComparisonRange(current)}</span><span className="text-slate-600">Đối chiếu: {formatComparisonRange(previous)}</span></div>
        {issue ? <p role="alert" className="text-xs text-amber-800">{issue}</p> : rangeDays(current) !== rangeDays(previous) && <p className="text-xs text-amber-800">Hai kỳ dài {rangeDays(current)} và {rangeDays(previous)} ngày; lưu ý khi so sánh số lượng.</p>}
      </> : null}
  </section>;
}

function ChangeValue({ current, previous, metric, datasetId }: { current: number | null; previous: number | null; metric: ReportMetric; datasetId: string }) {
  const change = reportChange(current, previous, metric);
  const direction = metricDirection(datasetId, metric.id);
  const favorable = change.difference === null || change.difference === 0 || direction === 'neutral' ? null : direction === 'up' ? change.difference > 0 : change.difference < 0;
  return <span className={'block text-xs ' + (favorable === null ? 'text-slate-600' : favorable ? 'text-emerald-700' : 'text-rose-700')}><span className="font-semibold">{change.label}</span>{change.relative && <span className="mt-0.5 block">{change.relative}</span>}</span>;
}


export function ComparisonResults({ rows, metrics, totals, previousTotals, currentRange, previousRange, datasetId, temporal = false,
  onSelect, onExport, canExport = false, chartRows = rows, onFilter, onClearSelection, selectedKey, chartType, onChartTypeChange, selectedMetricId, onMetricChange, groupLabel }: {
  rows: ComparisonRow[]; metrics: ReportMetric[]; totals: Record<string, number | null>; previousTotals: Record<string, number | null>;
  currentRange: ComparisonRange; previousRange: ComparisonRange; datasetId: string; temporal?: boolean;
  onSelect?: (key: string, period: 'current' | 'previous') => void; onExport?: (csv: string) => void; canExport?: boolean;
  chartRows?: ComparisonRow[]; onFilter?: (key: string) => void; onClearSelection?: () => void; selectedKey?: string;
  chartType?: ReportChartKind; onChartTypeChange?: (kind: ReportChartKind) => void;
  selectedMetricId?: string; onMetricChange?: (id: string) => void;
  groupLabel?: string;
}) {
  const [metricId, setMetricId] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'current' | 'change' | 'name'>(temporal ? 'name' : 'current');
  const [page, setPage] = useState(0);
  const metric = metrics.find(item => item.id === (selectedMetricId || metricId)) || metrics[0];
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
    return onSelect && key ? <button type="button" onClick={() => onSelect(key, period)} className="mt-1 block text-xs text-orange-700 hover:underline">{label || 'Xem bản ghi nguồn'} ↗</button> : temporal && label ? <span className="mt-1 block text-xs text-slate-500">{label}</span> : null;
  };
  return <div className="space-y-4">
    <ReportChart title={`So sánh ${metric.label} giữa hai kỳ`} data={chartRows.map(row => ({ key: row.key, label: row.label, value: row.current[metric.id], previous: row.previous[metric.id] }))}
      groupLabel={groupLabel} metricLabel={metric.label}
      comparison temporal={temporal} format={value => formatReportValue(value, metric)} onSelect={onFilter} onClearSelection={onClearSelection} selectedKey={selectedKey} kind={chartType} onKindChange={onChartTypeChange} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(item => <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-medium text-slate-500">{item.label}</p><p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{formatReportValue(totals[item.id], item)}</p><p className="mb-2 mt-1 text-xs text-slate-500">Kỳ đối chiếu: {formatReportValue(previousTotals[item.id], item)}</p><ChangeValue current={totals[item.id]} previous={previousTotals[item.id]} metric={item} datasetId={datasetId} /></div>)}</div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div><h4 className="text-sm font-bold text-slate-900">So sánh theo nhóm</h4><p className="mt-1 text-xs text-slate-500">Hiện tại: {formatComparisonRange(currentRange)} · Đối chiếu: {formatComparisonRange(previousRange)}</p></div><div className="flex flex-wrap gap-2"><ReportSelect aria-label="Chỉ số so sánh" value={metric.id} onChange={event => { setMetricId(event.target.value); onMetricChange?.(event.target.value); }} className="max-w-64 rounded-lg border border-slate-200 px-3 py-2 text-xs">{metrics.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</ReportSelect>{onExport && <button type="button" disabled={!canExport || !visible.length} onClick={() => onExport(comparisonCsv(visible, metrics, currentRange, previousRange))} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40"><Download className="h-3.5 w-3.5" />Xuất so sánh CSV</button>}</div></div>
      <div className="flex flex-wrap items-center gap-3 p-4"><label className="relative block min-w-48 max-w-md flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input aria-label="Tìm nhóm so sánh" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm nhóm trong cả hai kỳ..." className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm" /></label><ReportSelect aria-label="Sắp xếp nhóm so sánh" value={sort} onChange={event => setSort(event.target.value as typeof sort)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs"><option value="name">{temporal ? 'Theo thứ tự thời gian' : 'Tên nhóm: tăng dần'}</option><option value="current">Kỳ hiện tại: giảm dần</option><option value="change">Chênh lệch: giảm dần</option></ReportSelect></div>
      {!visible.length ? <p className="p-8 text-center text-sm text-slate-500">Không có nhóm phù hợp trong hai kỳ. Thử đổi thời gian hoặc điều kiện lọc.</p> : <>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr><th scope="col" className="px-4 py-3">Nhóm</th><th scope="col" className="px-4 py-3">Kỳ hiện tại</th><th scope="col" className="px-4 py-3">Kỳ đối chiếu</th><th scope="col" className="px-4 py-3">Chênh lệch</th></tr></thead><tbody className="divide-y divide-slate-100">{visible.slice(currentPage * 10, (currentPage + 1) * 10).map(row => <tr key={row.key} className="hover:bg-slate-50"><th scope="row" className="px-4 py-3 font-medium text-slate-800">{row.label}</th><td className="px-4 py-3 tabular-nums text-orange-700">{formatReportValue(row.current[metric.id], metric)}{groupButton(row, 'current')}</td><td className="px-4 py-3 tabular-nums text-slate-600">{formatReportValue(row.previous[metric.id], metric)}{groupButton(row, 'previous')}</td><td className="px-4 py-3"><ChangeValue current={row.current[metric.id]} previous={row.previous[metric.id]} metric={metric} datasetId={datasetId} /></td></tr>)}</tbody></table></div>
        {pages > 1 && <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs text-slate-500"><span>{currentPage * 10 + 1}–{Math.min((currentPage + 1) * 10, visible.length)} / {visible.length} nhóm</span><div className="flex items-center gap-3"><button type="button" disabled={!currentPage} onClick={() => setPage(currentPage - 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Trước</button><span>{currentPage + 1}/{pages}</span><button type="button" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)} className="rounded border px-3 py-1.5 disabled:opacity-40">Sau</button></div></div>}
      </>}
    </section>
  </div>;
}
