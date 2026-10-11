import { runtimeStorage } from '../lib/localData';
import { usePermissions } from '../hooks/usePermissions';
import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Table, Filter, Save, Download, Search, X, Trash2, ArrowUpRight, SlidersHorizontal, RotateCcw, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FilterDrawer } from './FilterDrawer';
import {
  buildCustomReport, customReportCsv, defaultReportConfig, formatReportValue, normalizeReportConfig,
  type CustomReportConfig, type ReportDataset, type ReportDatePreset, type SavedReportTemplate
} from '../lib/customReports';

const control = 'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
const button = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';
import { PAGE_SIZE, PaginatedList } from './Pagination';
const templateKey = (userId: string) => 'vuihoc_custom_report_templates_v1_' + userId;
function readTemplates(userId: string, datasets: ReportDataset[]): SavedReportTemplate[] {
  try {
    const stored: unknown = JSON.parse(runtimeStorage.getItem(templateKey(userId)) || '[]');
    if (!Array.isArray(stored)) return [];
    const ids = new Set<string>();
    return stored.flatMap(item => {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || typeof item.name !== 'string' ||
        !item.name.trim() || !datasets.some(dataset => dataset.id === item.config?.datasetId) || ids.has(item.id)) return [];
      ids.add(item.id);
      return [{ id: item.id, name: item.name.slice(0, 80), config: normalizeReportConfig(item.config, datasets) }];
    }).slice(0, 20);
  } catch { return []; }
}
const displayDate = (value: string) => value ? value.slice(8, 10) + '/' + value.slice(5, 7) + '/' + value.slice(0, 4) : '';
export const CustomReportBuilder: React.FC<{ datasets: ReportDataset[] }> = ({ datasets }) => {
  const { can, requirePermission } = usePermissions();
  const { currentUser, showToast } = useApp();
  const [config, setConfig] = useState<CustomReportConfig>(() => defaultReportConfig(datasets[0]));
  const [templates, setTemplates] = useState(() => readTemplates(currentUser.id, datasets));
  const [templateId, setTemplateId] = useState('');
  const [view, setView] = useState<'table' | 'chart'>('table');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [detailPage, setDetailPage] = useState(0);
  const [chartMetricId, setChartMetricId] = useState('');
  useEffect(() => {
    setTemplates(readTemplates(currentUser.id, datasets));
    setTemplateId('');
    setConfig(defaultReportConfig(datasets[0]));
    setSaveOpen(false); setCreateOpen(false); setDeleteOpen(false); setFilterOpen(false); setDetailKey(null);
  }, [currentUser.id]);
  useEffect(() => { setPage(0); setDetailKey(null); }, [config, search]);
  useEffect(() => { setDetailPage(0); }, [detailKey]);
  useEffect(() => {
    if (!saveOpen && !createOpen && !deleteOpen && detailKey === null) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSaveOpen(false); setCreateOpen(false); setDeleteOpen(false); setDetailKey(null); }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [saveOpen, createOpen, deleteOpen, detailKey]);

  const dataset = datasets.find(item => item.id === config.datasetId) || datasets[0];
  const result = useMemo(() => buildCustomReport(dataset, config), [dataset, config]);
  const visibleRows = result.rows.filter(row => row.label.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = visibleRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const selectedTemplate = templates.find(item => item.id === templateId);
  const hasChanges = selectedTemplate && JSON.stringify(selectedTemplate.config) !== JSON.stringify(config);
  const groupName = config.groupBy === 'all' ? 'Toàn bộ dữ liệu' : dataset.dimensions.find(item => item.id === config.groupBy)?.label || 'Nhóm';
  const chartMetric = result.metrics.find(metric => metric.id === chartMetricId) || result.metrics[0];
  const chartRows = visibleRows.slice(0, 12);
  const chartMax = Math.max(1, ...chartRows.map(row => chartMetric ? row.values[chartMetric.id] || 0 : 0));
  const detailGroup = result.rows.find(row => row.key === detailKey);
  const activeFilters = Object.entries(config.filters).filter(([, value]) => Boolean(value));
  const rangeLabel = dataset.dateKind === 'snapshot' ? 'Số liệu tổng hợp hiện có'
    : !result.range.from && !result.range.to ? 'Toàn thời gian'
    : displayDate(result.range.from) + ' – ' + displayDate(result.range.to);
  const patch = (updates: Partial<CustomReportConfig>) => setConfig(previous => ({ ...previous, ...updates }));
  const switchDataset = (id: string) => {
    const target = datasets.find(item => item.id === id);
    if (!target) return;
    const next = defaultReportConfig(target);
    setConfig({
      ...next, datePreset: target.dateKind === 'snapshot' ? 'all' : config.datePreset,
      from: config.from, to: config.to
    });
    setTemplateId(''); setSearch('');
  };
  const persistTemplates = (next: SavedReportTemplate[]) => {
    if (!requirePermission('Lưu và quản lý mẫu báo cáo tùy chỉnh')) return false;
    try {
      runtimeStorage.setItem(templateKey(currentUser.id), JSON.stringify(next));
      setTemplates(next); return true;
    } catch { showToast('Không thể lưu mẫu trong phiên làm việc. Cấu hình hiện tại vẫn được giữ.', 'error'); return false; }
  };
  const saveTemplate = (overwrite: boolean) => {
    const name = templateName.trim();
    if (!name) { showToast('Nhập tên để dễ tìm lại báo cáo.', 'warning'); return; }
    if (templates.some(item => item.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi') && (!overwrite || item.id !== templateId))) {
      showToast('Tên mẫu đã tồn tại. Hãy đặt tên khác hoặc cập nhật mẫu đang chọn.', 'warning'); return;
    }
    if (!overwrite && templates.length >= 20) { showToast('Đã có 20 mẫu. Hãy xóa một mẫu không dùng trước khi lưu thêm.', 'warning'); return; }
    const saved = { id: overwrite && selectedTemplate ? templateId : crypto.randomUUID(), name, config };
    const next = overwrite && selectedTemplate ? templates.map(item => item.id === templateId ? saved : item) : [saved, ...templates];
    if (persistTemplates(next)) {
      setTemplateId(saved.id); setSaveOpen(false);
      showToast('Đã lưu cấu hình báo cáo. Mẫu được giữ trong phiên làm việc này.', 'success');
    }
  };
  const exportCsv = () => {
    if (!requirePermission('Xuất kết quả báo cáo CSV')) return;
    if (!visibleRows.length || result.invalidRange) return;
    const blob = new Blob([customReportCsv(visibleRows, result.metrics, groupName)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url;
    link.download = 'Bao_cao_' + dataset.id + '_' + (result.range.from || 'tat_ca') + '_' + (result.range.to || '') + '.csv';
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    showToast('Đã xuất toàn bộ ' + visibleRows.length + ' nhóm đang lọc.', 'success');
  };

  return <div className="space-y-3">
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Báo cáo tùy chỉnh</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">Chọn dữ liệu, chỉ số và cách nhóm. Kết quả tự cập nhật.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={button + ' border-indigo-200 text-indigo-700 hover:bg-indigo-50'} onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5" />Tạo báo cáo mới</button>
          <select aria-label="Mở mẫu báo cáo đã lưu" value={templateId} className={control + ' max-w-52'}
            onChange={event => {
              const item = templates.find(template => template.id === event.target.value);
              setTemplateId(event.target.value);
              if (item) { setConfig(normalizeReportConfig(item.config, datasets)); setSearch(''); }
            }}>
            <option value="">Mẫu đã lưu ({templates.length})</option>
            {templates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          {selectedTemplate && <button type="button" className={button} title="Xóa mẫu đang chọn" aria-label="Xóa mẫu đang chọn" onClick={() => setDeleteOpen(true)}><Trash2 className="h-3.5 w-3.5" /></button>}
          <button type="button" disabled={result.invalidRange || !can('Lưu và quản lý mẫu báo cáo tùy chỉnh')} className={button + ' border-indigo-200 text-indigo-700 hover:bg-indigo-50'} onClick={() => {
            setTemplateName(selectedTemplate?.name || dataset.label + ' theo ' + groupName.toLocaleLowerCase('vi')); setSaveOpen(true);
          }}><Save className="h-3.5 w-3.5" />Lưu mẫu{hasChanges ? ' •' : ''}</button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
        <span className="text-[11px] text-slate-500">Bắt đầu nhanh:</span>
        {[
          { name: 'Lớp theo môn', source: 'classes', group: 'subject' },
          { name: 'Học sinh theo khối', source: 'students', group: 'grade' },
          { name: 'Sự cố theo kỳ', source: 'incidents', group: 'period' },
          { name: 'Giáo viên mới theo môn', source: 'teachers', group: 'subject' },
          { name: 'Dự giờ theo xếp hạng', source: 'inspection', group: 'rank' }
        ].map(item => <button key={item.source} type="button" className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"
          onClick={() => {
            const target = datasets.find(dataset => dataset.id === item.source);
            if (target) { setConfig({ ...defaultReportConfig(target), groupBy: item.group }); setTemplateId(''); setSearch(''); }
          }}>{item.name}</button>)}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Các mẫu trên chỉ là gợi ý. Chọn “Tạo báo cáo mới” hoặc đổi dữ liệu, chỉ số và cách nhóm trong Thiết lập báo cáo, rồi lưu thành mẫu riêng.</p>
      {templates.length > 0 && <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
        <span className="text-[11px] text-slate-500">Mẫu của tôi:</span>
        <PaginatedList className="flex flex-wrap gap-2">{templates.map(item => <button key={item.id} type="button" aria-pressed={templateId === item.id}
          className={'max-w-60 truncate rounded-lg border px-2.5 py-1.5 text-[11px] font-medium ' + (templateId === item.id ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}
          title={item.name} onClick={() => { setConfig(normalizeReportConfig(item.config, datasets)); setTemplateId(item.id); setSearch(''); }}>{item.name}</button>)}</PaginatedList>
      </div>}
    </section>

    <div className="grid items-start gap-3 xl:grid-cols-[260px_minmax(0,1fr)]">
      <details open className="rounded-xl border border-slate-200 bg-white shadow-2xs">
        <summary className="flex cursor-pointer items-center gap-2 border-b border-slate-100 p-3 text-xs font-semibold text-slate-800"><SlidersHorizontal className="h-4 w-4 text-indigo-600" />Thiết lập báo cáo</summary>
        <div className="space-y-4 p-3">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-600">1. Dữ liệu cần xem</span>
            <select value={dataset.id} onChange={event => switchDataset(event.target.value)} className={control}>{datasets.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
          </label>
          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-[11px] font-semibold text-slate-600">2. Chỉ số hiển thị</legend>
            {dataset.metrics.map(metric => <label key={metric.id} className="flex cursor-pointer items-start gap-2 rounded-lg p-1.5 text-xs text-slate-700 hover:bg-slate-50">
              <input type="checkbox" checked={config.metricIds.includes(metric.id)} className="mt-0.5 accent-indigo-600"
                disabled={config.metricIds.length === 1 && config.metricIds[0] === metric.id}
                onChange={event => patch({ metricIds: event.target.checked ? [...config.metricIds, metric.id] : config.metricIds.filter(id => id !== metric.id) })} />
              {metric.label}
            </label>)}
            <p className="text-[10px] text-slate-400">Giữ ít nhất một chỉ số.</p>
          </fieldset>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-600">3. Nhóm kết quả theo</span>
            <select value={config.groupBy} onChange={event => patch({ groupBy: event.target.value })} className={control}>
              <option value="all">Không chia nhóm</option>
              {dataset.dimensions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <button type="button" className={button + ' w-full'} onClick={() => {
            setConfig(defaultReportConfig(dataset)); setTemplateId(''); setSearch('');
          }}><RotateCcw className="h-3.5 w-3.5" />Đặt lại thiết lập</button>
        </div>
      </details>

      <div className="min-w-0 space-y-3">
        <section className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
              Thời gian
              <select value={config.datePreset} disabled={dataset.dateKind === 'snapshot'} onChange={event => patch({ datePreset: event.target.value as ReportDatePreset })}
                className={control + ' w-auto disabled:bg-slate-100 disabled:text-slate-400'}>
                <option value="month">Tháng này đến hôm nay</option><option value="previous_month">Tháng trước</option>
                <option value="last_30_days">30 ngày gần nhất</option><option value="all">Toàn thời gian</option><option value="custom">Tùy chỉnh</option>
              </select>
            </label>
            {dataset.dateKind !== 'snapshot' && config.datePreset === 'custom' && <div className="flex flex-wrap items-center gap-1.5">
              <input aria-label="Từ ngày báo cáo tùy chỉnh" type="date" value={config.from} max={config.to || undefined} onChange={event => patch({ from: event.target.value })} className={control + ' w-auto'} />
              <span className="text-slate-400">–</span>
              <input aria-label="Đến ngày báo cáo tùy chỉnh" type="date" value={config.to} min={config.from || undefined} onChange={event => patch({ to: event.target.value })} className={control + ' w-auto'} />
            </div>}
            <button type="button" className={button + ' ml-auto'} disabled={!dataset.filters.length} onClick={() => setFilterOpen(true)}>
              <Filter className="h-3.5 w-3.5" />Lọc chi tiết{activeFilters.length > 0 && <span className="rounded bg-indigo-50 px-1.5 text-indigo-700">{activeFilters.length}</span>}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
            <span>{rangeLabel}</span>
            {activeFilters.map(([id, value]) => <button type="button" key={id} onClick={() => patch({ filters: { ...config.filters, [id]: '' } })}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-indigo-700" title="Bỏ điều kiện lọc">
              {dataset.filters.find(field => field.id === id)?.label}: {value}<X className="h-3 w-3" />
            </button>)}
          </div>
          {dataset.note && <p className="border-t border-slate-100 pt-2 text-[11px] text-slate-500">{dataset.note}</p>}
        </section>

        {result.invalidRange ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">Chọn đủ ngày bắt đầu và kết thúc, với ngày bắt đầu không sau ngày kết thúc.</div> : <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {result.metrics.map(metric => <div key={metric.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-[11px] text-slate-500">{metric.label}</div>
              <div className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{formatReportValue(result.totals[metric.id], metric)}</div>
            </div>)}
          </div>
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="space-y-2.5 border-b border-slate-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h4 className="text-xs font-semibold text-slate-800">{dataset.label} theo {groupName.toLocaleLowerCase('vi')}</h4>
                  <p className="mt-0.5 text-[10px] text-slate-500">{result.records.length} bản ghi nguồn · {visibleRows.length}/{result.rows.length} nhóm · Bấm tên nhóm để xem chi tiết</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg bg-slate-100 p-0.5">
                    {(['table', 'chart'] as const).map(mode => <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)}
                      className={'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold ' + (view === mode ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500')}>
                      {mode === 'table' ? <Table className="h-3.5 w-3.5" /> : <BarChart3 className="h-3.5 w-3.5" />}{mode === 'table' ? 'Bảng' : 'Biểu đồ'}
                    </button>)}
                  </div>
                  <button type="button" className={button} disabled={!visibleRows.length || !can('Xuất kết quả báo cáo CSV')} onClick={exportCsv}><Download className="h-3.5 w-3.5" />CSV</button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-40 flex-1"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input aria-label="Tìm nhóm kết quả" placeholder="Tìm trong kết quả..." value={search} onChange={event => setSearch(event.target.value)} className={control + ' pl-8'} /></label>
                <select aria-label="Sắp xếp kết quả" value={config.sort} onChange={event => patch({ sort: event.target.value as CustomReportConfig['sort'] })} className={control + ' w-auto max-w-60'}>
                  <option value="value_desc">{result.metrics[0]?.label}: giảm dần</option><option value="label_asc">Tên / thời gian: tăng dần</option><option value="label_desc">Tên / thời gian: giảm dần</option>
                </select>
                {view === 'chart' && result.metrics.length > 1 && <select aria-label="Chỉ số trên biểu đồ" value={chartMetric?.id || ''} onChange={event => setChartMetricId(event.target.value)} className={control + ' w-auto'}>
                  {result.metrics.map(metric => <option key={metric.id} value={metric.id}>{metric.label}</option>)}
                </select>}
              </div>
            </div>
            {!visibleRows.length ? <div className="p-8 text-center">
              <h5 className="text-sm font-semibold text-slate-700">Chưa có kết quả phù hợp</h5>
              <p className="mt-1 text-xs text-slate-500">Thử mở rộng khoảng thời gian, bỏ điều kiện lọc hoặc đổi từ khóa tìm kiếm.</p>
              <button type="button" className={button + ' mt-3'} onClick={() => { patch({ datePreset: 'all', filters: {} }); setSearch(''); }}>Xem toàn bộ dữ liệu nguồn</button>
            </div> : view === 'table' ? <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600"><tr>
                    <th scope="col" className="px-3 py-2.5">{groupName}</th>
                    {result.metrics.map(metric => <th scope="col" key={metric.id} className="whitespace-nowrap px-3 py-2.5 text-right">{metric.label}</th>)}
                    <th scope="col" className="px-3 py-2.5 text-right">Bản ghi nguồn</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">{pageRows.map(row => <tr key={row.key} className="hover:bg-slate-50">
                    <th scope="row" className="px-3 py-2.5 font-medium"><button type="button" onClick={() => setDetailKey(row.key)} className="inline-flex items-center gap-1.5 text-indigo-700 hover:underline">{row.label}<ArrowUpRight className="h-3 w-3" /></button></th>
                    {result.metrics.map(metric => <td key={metric.id} className="px-3 py-2.5 text-right tabular-nums text-slate-800">{formatReportValue(row.values[metric.id], metric)}</td>)}
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{row.records.length}</td>
                  </tr>)}</tbody>
                </table>
              </div>
              {pageCount > 1 && <div className="flex items-center justify-between border-t border-slate-100 p-3 text-[11px] text-slate-500">
                <span>{currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, visibleRows.length)} / {visibleRows.length} nhóm</span>
                <div className="flex items-center gap-2"><button type="button" className={button} disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Trước</button><span>{currentPage + 1}/{pageCount}</span><button type="button" className={button} disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>Sau</button></div>
              </div>}
            </> : <div className="space-y-3 p-4">
              <p className="text-[10px] text-slate-500">{chartMetric?.label} · Hiển thị {chartRows.length}/{visibleRows.length} nhóm theo thứ tự đang chọn. Xuất CSV gồm toàn bộ kết quả.</p>
              {chartRows.map(row => <button type="button" key={row.key} onClick={() => setDetailKey(row.key)} className="block w-full rounded-lg p-1 text-left hover:bg-slate-50">
                <div className="mb-1 flex items-center justify-between gap-3 text-[11px]"><span className="truncate font-medium text-slate-700">{row.label}</span><span className="shrink-0 font-semibold tabular-nums text-indigo-700">{chartMetric && formatReportValue(row.values[chartMetric.id], chartMetric)}</span></div>
                <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: String((chartMetric ? row.values[chartMetric.id] || 0 : 0) / chartMax * 100) + '%' }} /></div>
              </button>)}
            </div>}
          </section>
          <p className="px-1 text-[10px] text-slate-500">Thẻ chỉ số tính trên toàn bộ bản ghi sau lọc thời gian và tiêu chí. Tìm kiếm bên dưới chỉ lọc nhóm hiển thị. Tỷ lệ và điểm trung bình được tính lại từ dữ liệu nguồn.</p>
        </>}
      </div>
    </div>

    <FilterDrawer isOpen={filterOpen} onClose={() => setFilterOpen(false)} title={'Lọc ' + dataset.label.toLocaleLowerCase('vi')}
      subtitle="Khoảng thời gian đã chọn ở ngoài. Các tiêu chí dưới đây áp dụng cùng lúc." activeCount={activeFilters.length}
      onReset={() => patch({ filters: {} })} onApply={() => {}}>
      <div className="space-y-4">{dataset.filters.map(field => <label key={field.id} className="block space-y-1.5">
        <span className="text-xs font-semibold text-slate-700">{field.label}</span>
        <select value={config.filters[field.id] || ''} onChange={event => patch({ filters: { ...config.filters, [field.id]: event.target.value } })} className={control}>
          <option value="">Tất cả</option>
          {[...new Set(dataset.records.map(record => String(record[field.id] ?? '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true })).map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>)}</div>
    </FilterDrawer>

    {createOpen && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="create-report-title">
      <div className="max-h-[85vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3"><h3 id="create-report-title" className="text-sm font-bold text-slate-800">Tạo báo cáo mới</h3><button type="button" autoFocus aria-label="Đóng tạo báo cáo" onClick={() => setCreateOpen(false)}><X className="h-4 w-4" /></button></div>
        <p className="mt-2 text-xs text-slate-500">Chọn chủ đề để bắt đầu. Sau đó bạn có thể thêm/bớt chỉ số, đổi cách nhóm và lọc dữ liệu trước khi lưu mẫu riêng.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {datasets.map(item => <button key={item.id} type="button" className="rounded-xl border border-slate-200 p-3 text-left hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={() => { setConfig(defaultReportConfig(item)); setTemplateId(''); setSearch(''); setView('table'); setFilterOpen(false); setCreateOpen(false); }}>
            <span className="block text-xs font-semibold text-slate-800">{item.label}</span>
            <span className="mt-1 block text-[11px] text-slate-500">{item.metrics.length} chỉ số · {item.dimensions.length} cách nhóm</span>
          </button>)}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">Bạn có thể tạo nhiều mẫu từ cùng một chủ đề. Các chủ đề hiện có phụ thuộc vào dữ liệu và chỉ số hệ thống hỗ trợ.</p>
      </div>
    </div>}

    {saveOpen && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="save-report-title">
      <form className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl" onSubmit={event => { event.preventDefault(); saveTemplate(false); }}>
        <div className="flex items-center justify-between"><h3 id="save-report-title" className="text-sm font-bold text-slate-800">Lưu mẫu báo cáo</h3><button type="button" aria-label="Đóng lưu mẫu" onClick={() => setSaveOpen(false)}><X className="h-4 w-4" /></button></div>
        <label className="block space-y-1.5 text-xs font-semibold text-slate-600">Tên mẫu<input autoFocus required maxLength={80} value={templateName} onChange={event => setTemplateName(event.target.value)} placeholder="Ví dụ: Lớp còn chỗ theo môn" className={control} /></label>
        <p className="text-[11px] text-slate-500">Lưu thiết lập, không lưu bản sao dữ liệu. “Tháng này” và “30 ngày gần nhất” sẽ tính lại khi mở. Mẫu thuộc tài khoản này trên trình duyệt hiện tại.</p>
        <div className="flex flex-wrap justify-end gap-2"><button type="button" className={button} onClick={() => setSaveOpen(false)}>Hủy</button>{selectedTemplate && <button type="button" className={button} onClick={() => saveTemplate(true)}>Cập nhật mẫu</button>}<button type="submit" className={button + ' border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'}>Lưu mẫu mới</button></div>
      </form>
    </div>}
    {deleteOpen && selectedTemplate && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-report-title">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-xl">
        <h3 id="delete-report-title" className="text-sm font-bold text-slate-800">Xóa mẫu “{selectedTemplate.name}”?</h3><p className="text-xs text-slate-500">Thiết lập báo cáo đang xem vẫn được giữ.</p>
        <div className="flex justify-end gap-2"><button type="button" autoFocus className={button} onClick={() => setDeleteOpen(false)}>Hủy</button><button type="button" className={button + ' text-rose-600'} onClick={() => {
          if (persistTemplates(templates.filter(item => item.id !== templateId))) { setTemplateId(''); setDeleteOpen(false); showToast('Đã xóa mẫu báo cáo.', 'info'); }
        }}>Xóa mẫu</button></div>
      </div>
    </div>}
    {detailGroup && <div className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="report-detail-title">
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div><h3 id="report-detail-title" className="text-sm font-bold text-slate-800">{detailGroup.label}</h3><p className="mt-1 text-[11px] text-slate-500">{detailGroup.records.length} bản ghi tạo nên kết quả · {rangeLabel}</p></div>
          <button type="button" autoFocus aria-label="Đóng bản ghi nguồn" onClick={() => setDetailKey(null)} className={button}><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-auto"><table className="w-full whitespace-nowrap text-left text-xs">
          <thead className="sticky top-0 bg-slate-50 text-[11px] text-slate-600"><tr>{dataset.detailFields.map(field => <th key={field.id} scope="col" className="px-3 py-2.5">{field.label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{detailGroup.records.slice(detailPage * PAGE_SIZE, (detailPage + 1) * PAGE_SIZE).map((record, index) => <tr key={String(record.id) + index}>{dataset.detailFields.map(field => <td key={field.id} className="px-3 py-2.5 text-slate-700">{record[field.id] ?? '—'}</td>)}</tr>)}</tbody>
        </table></div>
        {detailGroup.records.length > PAGE_SIZE && <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-3 text-xs"><button type="button" className={button} disabled={detailPage === 0} onClick={() => setDetailPage(value => value - 1)}>Trước</button><span>{detailPage + 1}/{Math.ceil(detailGroup.records.length / PAGE_SIZE)}</span><button type="button" className={button} disabled={(detailPage + 1) * PAGE_SIZE >= detailGroup.records.length} onClick={() => setDetailPage(value => value + 1)}>Sau</button></div>}
      </div>
    </div>}
  </div>;
};
