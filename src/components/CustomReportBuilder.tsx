import { ReportSplitPane } from './ReportSplitPane';
import { ReportSelect } from './ReportSelect';
import { ReportMultiFilter } from './ReportMultiFilter';
import { reportFilterValues, reportFilterLabel } from '../lib/customReports';
import { ReportChart } from './ReportChart';
import { suggestReportTitle, type ReportDocumentRequest } from '../lib/reportDocument';
import { reportExcelData, reportExcelBytes } from '../lib/reportExcel';
import { CompactClassReportTable } from './CompactClassReportTable';
import { ComparisonControls, ComparisonResults } from './ReportComparison';
import { alignComparisonRows, comparisonIssue, comparisonRange, defaultComparison, formatComparisonRange, selectionInPreviousPeriod, timeGroupKey, withMissingPeriod } from '../lib/reportComparison';
import { useSaveConfirmation } from '../hooks/useSaveConfirmation';
import {randomUUID} from '../lib/randomUUID';
import {PeriodToolbar} from './PeriodToolbar';
import { useBusinessValue, useBusinessStatus } from '../lib/businessPersistence';
import { usePermissions } from '../hooks/usePermissions';
import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Save, Download, Search, X, Trash2, ArrowUpRight, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { FilterDrawer } from './FilterDrawer';
import {
  buildCustomReport, customReportCsv, defaultReportConfig as baseReportConfig, formatReportValue, normalizeReportConfig, reportCsvCell, reportToday, reportTemplateConfig, applyReportTemplate, validReportDate,
  type CustomReportConfig, type ReportDataset, type SavedReportTemplate
} from '../lib/customReports';

const control = 'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500';
const button = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-[#FF5C00] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-40';
import { PAGE_SIZE } from './Pagination';
const displayDate = (value: string) => value ? value.slice(8, 10) + '/' + value.slice(5, 7) + '/' + value.slice(0, 4) : '';
const defaultReportConfig=(dataset:ReportDataset):CustomReportConfig=>({...baseReportConfig(dataset),datePreset:'all'});
export const CustomReportBuilder: React.FC<{ datasets: ReportDataset[]; mode?: 'detail' | 'custom'; onCompose?: (request: ReportDocumentRequest) => void }> = ({ datasets, mode = 'custom', onCompose }) => {
  const isDetail = mode === 'detail';
  const {confirmSave,isSavingChanges}=useSaveConfirmation('business');
  const { can, requirePermission } = usePermissions();
  const { currentUser, showToast } = useApp();
  const {loadedAt}=useBusinessStatus();
  const [config, setConfig] = useState<CustomReportConfig>(() => defaultReportConfig(datasets[0]));
  const [templates, setTemplates] = useBusinessValue<SavedReportTemplate[]>('report_templates');
  const [templateId, setTemplateId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [detailPeriod, setDetailPeriod] = useState<'current' | 'previous'>('current');
  const [detailPage, setDetailPage] = useState(0);
  const [chartMetricId, setChartMetricId] = useState('');
  const [onlyIncidentSources, setOnlyIncidentSources] = useState(true);
  useEffect(() => {
    setTemplateId('');
    setConfig(defaultReportConfig(datasets[0]));
    setSaveOpen(false); setDeleteOpen(false); setFilterOpen(false); setDetailKey(null);
  }, [currentUser.id]);
  useEffect(() => { setPage(0); setDetailKey(null); }, [config, search]);
  useEffect(() => { if (!datasets.some(item => item.id === config.datasetId)) setConfig(defaultReportConfig(datasets[0])); }, [datasets, config.datasetId]);
  useEffect(() => { setDetailPage(0); }, [detailKey]);
  useEffect(() => {
    if (!saveOpen && !deleteOpen && detailKey === null) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSaveOpen(false); setDeleteOpen(false); setDetailKey(null); }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [saveOpen, deleteOpen, detailKey]);

  const dataset = datasets.find(item => item.id === config.datasetId) || datasets[0];
  const result = useMemo(() => buildCustomReport(dataset, config), [dataset, config]);
  const availableDates=useMemo(()=>dataset.records.map(record=>String(record.date||'')).filter(validReportDate).sort(),[dataset]);
  const overview = useMemo(() => config.selection ? buildCustomReport(dataset, { ...config, selection: undefined }) : result, [dataset, config, result]);
  const comparison = config.comparison || defaultComparison;
  const currentRange = { start: result.range.from, end: result.range.to };
  const previousRange = comparisonRange(currentRange, comparison);
  const compareActive = comparison.enabled && dataset.dateKind !== 'snapshot' && !result.invalidRange && !comparisonIssue(currentRange, previousRange);
  const previousSelection = selectionInPreviousPeriod(config, currentRange, previousRange);
  const previousResult = useMemo(() => compareActive ? withMissingPeriod(buildCustomReport(dataset, {
    ...config, datePreset: 'custom', from: previousRange.start, to: previousRange.end, selection: selectionInPreviousPeriod(config, currentRange, previousRange)
  }), previousSelection) : null, [dataset, config, compareActive, previousRange.start, previousRange.end]);
  const previousOverview = useMemo(() => compareActive ? buildCustomReport(dataset, { ...config, selection: undefined, datePreset: 'custom', from: previousRange.start, to: previousRange.end }) : null,
    [dataset, config, compareActive, previousRange.start, previousRange.end]);
  const overviewComparedRows = previousOverview ? alignComparisonRows(overview.rows, previousOverview.rows, result.metrics, currentRange, previousRange, config.groupBy) : [];
  const comparedRows = useMemo(() => previousResult ? alignComparisonRows(result.rows, previousResult.rows, result.metrics,
    currentRange, previousRange, config.groupBy) : [], [result, previousResult, config.groupBy]);
  const visibleRows = result.rows.filter(row => isDetail && dataset.id === 'classes' || row.label.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi')));
  const visibleClassRecords = result.records.filter(record => [record.id, record.name].some(value => String(value || '').toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))))
    .sort((a, b) => config.sort === 'value_desc' ? String(b.date || '').localeCompare(String(a.date || '')) : (config.sort === 'label_desc' ? -1 : 1) * String(a.name || '').localeCompare(String(b.name || ''), 'vi', { numeric: true }));
  const noVisibleResults = isDetail && dataset.id === 'classes' ? !visibleClassRecords.length : !visibleRows.length;
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = visibleRows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const selectedTemplate = templates.find(item => item.id === templateId);
  const hasChanges = selectedTemplate && JSON.stringify(reportTemplateConfig(normalizeReportConfig(selectedTemplate.config, datasets))) !== JSON.stringify(reportTemplateConfig(normalizeReportConfig(config, datasets)));
  const groupName = config.groupBy === 'all' ? 'Toàn bộ dữ liệu' : dataset.dimensions.find(item => item.id === config.groupBy)?.label || 'Nhóm';
  const chartMetric = result.metrics.find(metric => metric.id === (config.chartMetricId || chartMetricId)) || (dataset.id === 'incidents' ? result.metrics.find(metric => metric.id === 'rate') : undefined) || result.metrics[0];
  const isTimeGroup = ['day', 'week', 'month', 'period'].includes(config.groupBy);
  const chartRows = isTimeGroup ? [...overview.rows].sort((a, b) => a.key.localeCompare(b.key, 'vi', { numeric: true })) : overview.rows;
  const detailGroup = (detailPeriod === 'previous' ? previousResult?.rows : result.rows)?.find(row => row.key === detailKey);
  const detailRecords = detailGroup?.records.filter(record => dataset.id !== 'incidents' || !onlyIncidentSources || record.incidents === 1) || [];
  const activeFilters = Object.entries(config.filters).filter(([, value]) => reportFilterValues(value).length > 0);
  const showSourceCount = !result.metrics.some(metric => metric.mode === 'count' || metric.mode === 'sum' && ['total', 'sessions'].includes(metric.field || ''));
  const rangeLabel = dataset.dateKind === 'snapshot' ? 'Số liệu tổng hợp hiện có'
    : !result.range.from && !result.range.to ? 'Toàn thời gian'
    : displayDate(result.range.from) + ' – ' + displayDate(result.range.to);
  const patch = (updates: Partial<CustomReportConfig>) => setConfig(previous => ({ ...previous, ...updates,
    ...(['filters', 'groupBy', 'from', 'to', 'datePreset'].some(key => Object.hasOwn(updates, key)) && !Object.hasOwn(updates, 'selection') ? { selection: undefined } : {}) }));
  const selectChartGroup = (key: string) => { patch({ selection: config.selection?.key === key ? undefined : { by: config.groupBy, key } }); setSearch(''); };
  const primaryFilters = dataset.filters.filter(field => ['category', 'grade', 'subject', 'model', 'timeSlot', 'incidentGroup', 'cause', 'rank', 'status'].includes(field.id)).slice(0, 7);
  const filterOptions = (field: ReportDataset['filters'][number]) => field.choices || (field.options || [...new Set(dataset.records.map(record => String(record[field.id] ?? '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }))).map(value => ({ value, label: value }));
  const leadingRow = [...result.rows].filter(row => chartMetric && row.values[chartMetric.id] != null).sort((a, b) => (b.values[chartMetric!.id] ?? 0) - (a.values[chartMetric!.id] ?? 0))[0];
  const insight = !result.records.length ? 'Chưa có dữ liệu phù hợp. Hãy thử mở rộng thời gian hoặc bỏ bớt điều kiện lọc.'
    : dataset.id === 'incidents' && result.totals.incidents === 0 && !result.totals.breaks ? `Chưa ghi nhận buổi có sự cố phù hợp trong ${result.totals.total ?? result.records.length} buổi học sau lọc.`
    : leadingRow && chartMetric && config.groupBy !== 'all' ? `${leadingRow.label} có ${chartMetric.label.toLocaleLowerCase('vi')} cao nhất: ${formatReportValue(leadingRow.values[chartMetric.id], chartMetric)}.${dataset.id === 'incidents' ? ` Dựa trên ${leadingRow.values.total ?? leadingRow.records.length} buổi học; cần xem cả số buổi khi đánh giá tỷ lệ.` : ''}`
    : `${result.records.length.toLocaleString('vi-VN')} bản ghi phù hợp với thời gian và bộ lọc hiện tại.`;
  const switchDataset = (id: string) => {
    const target = datasets.find(item => item.id === id);
    if (!target) return;
    const next = defaultReportConfig(target);
    setConfig({
      ...next, datePreset: target.dateKind === 'snapshot' ? 'all' : config.datePreset,
      from: config.from, to: config.to, comparison: config.comparison
    });
    setTemplateId(''); setSearch('');
  };
  const persistTemplates = (next: SavedReportTemplate[]) => {
    if (!requirePermission('Lưu và quản lý mẫu báo cáo tùy chỉnh')) return false;
    try {
      setTemplates(next); return true;
    } catch { showToast('Không thể lưu mẫu trong phiên làm việc. Cấu hình hiện tại vẫn được giữ.', 'error'); return false; }
  };
  const saveTemplate = (overwrite: boolean) => {
    if (isSavingChanges) return;
    const name = templateName.trim();
    if (!name) { showToast('Nhập tên để dễ tìm lại báo cáo.', 'warning'); return; }
    if (templates.some(item => item.name.toLocaleLowerCase('vi') === name.toLocaleLowerCase('vi') && (!overwrite || item.id !== templateId))) {
      showToast('Tên mẫu đã tồn tại. Hãy đặt tên khác hoặc cập nhật mẫu đang chọn.', 'warning'); return;
    }
    if (!overwrite && templates.length >= 20) { showToast('Đã có 20 mẫu. Hãy xóa một mẫu không dùng trước khi lưu thêm.', 'warning'); return; }
    const saved = { id: overwrite && selectedTemplate ? templateId : randomUUID(), name, config: reportTemplateConfig(config) };
    const next = overwrite && selectedTemplate ? templates.map(item => item.id === templateId ? saved : item) : [saved, ...templates];
    if (persistTemplates(next)) {
      void confirmSave(()=>{setTemplateId(saved.id); setSaveOpen(false);});
      showToast('Đang lưu mẫu báo cáo…', 'success');
    }
  };
  const exportExcel = () => {
    if(!requirePermission('Xuất kết quả báo cáo CSV') || result.invalidRange) return;
    try {
      const workbook=reportExcelData([{dataset,config,result,previous:previousResult}],{
        title:suggestReportTitle(dataset,config.groupBy),organization:'',author:currentUser.name,date:reportToday(),
        updatedAt:loadedAt?new Date(loadedAt).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'}):'Chưa xác định',
        reportType:dataset.label,remarks:'',recommendations:'',appendix:false
      });
      const url=URL.createObjectURL(new Blob([reportExcelBytes(workbook)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
      const link=document.createElement('a');link.href=url;link.download=workbook.filename;
      document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
      showToast('Đã xuất Excel gồm Tổng quan, Tổng hợp và Danh sách chi tiết theo kỳ, bộ lọc đang chọn.','success');
    }catch(error){showToast(error instanceof Error?error.message:'Không xuất được Excel. Vui lòng thử lại.','error');}
  };
  const exportCsv = () => {
    if (!requirePermission('Xuất kết quả báo cáo CSV')) return;
    if (noVisibleResults || result.invalidRange) return;
    const content = isDetail && dataset.id === 'classes'
      ? '\uFEFF' + [dataset.detailFields.map(field => field.label), ...visibleClassRecords.map(record => dataset.detailFields.map(field => record[field.id] ?? ''))].map(line => line.map(reportCsvCell).join(',')).join('\r\n')
      : customReportCsv(visibleRows, result.metrics, groupName);
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url;
    link.download = 'Bao_cao_' + dataset.id + '_' + (result.range.from || 'tat_ca') + '_' + (result.range.to || '') + '.csv';
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    showToast('Đã xuất toàn bộ ' + (isDetail && dataset.id === 'classes' ? visibleClassRecords.length + ' lớp đang lọc.' : visibleRows.length + ' nhóm đang lọc.'), 'success');
  };
  const exportComparison = (csv: string) => {
    if (!requirePermission('Xuất kết quả báo cáo CSV')) return;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'So_sanh_' + dataset.id + '.csv';
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };
  const exportSource = () => {
    if (!requirePermission('Xuất kết quả báo cáo CSV') || !detailGroup) return;
    const period = detailPeriod === 'previous' ? previousRange : currentRange;
    const content = '\uFEFF' + [['Nhóm', detailGroup.label], ['Từ ngày', period.start], ['Đến ngày', period.end],
      dataset.detailFields.map(field => field.label), ...detailRecords.map(record => dataset.detailFields.map(field => record[field.id] ?? ''))]
      .map(line => line.map(reportCsvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'Chi_tiet_' + dataset.id + '_' + detailPeriod + '.csv';
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };

  return <div className="report-interface font-inter space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-base font-semibold text-slate-900">{suggestReportTitle(dataset, config.groupBy)}</h2>{onCompose && <button type="button" disabled={result.invalidRange || comparison.enabled && !compareActive} onClick={() => onCompose({ datasetId: dataset.id, config: structuredClone(config) })} className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-[#FF5C00] transition-colors hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-40">Lập báo cáo từ kết quả này</button>}</div>
    <ReportSplitPane controls={<div className="space-y-3">
    {isDetail ? <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"><label className="min-w-0 w-full text-xs font-medium text-slate-500">Báo cáo<ReportSelect aria-label="Chọn báo cáo chi tiết" value={dataset.id} onChange={event => switchDataset(event.target.value)} className={control + ' mt-1'}>{datasets.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</ReportSelect></label><label className="min-w-0 w-full text-xs font-medium text-slate-500">Xem theo<ReportSelect aria-label="Cách nhóm báo cáo chi tiết" value={config.groupBy} onChange={event => patch({ groupBy: event.target.value, selection: undefined })} className={control + ' mt-1'}><option value="all">Toàn bộ</option>{dataset.dimensions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</ReportSelect></label></div> : <>
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {templates.length > 0 && <ReportSelect aria-label="Mở mẫu báo cáo đã lưu" value={templateId} className={control + ' max-w-52'}
            onChange={event => {
              const item = templates.find(template => template.id === event.target.value);
              setTemplateId(event.target.value);
              if (item) { setConfig(previous => applyReportTemplate(item.config, datasets, previous)); setSearch(''); }
            }}>
            <option value="">Mẫu đã lưu ({templates.length})</option>
            {templates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </ReportSelect>}
          {selectedTemplate && <button type="button" className={button} title="Xóa mẫu đang chọn" aria-label="Xóa mẫu đang chọn" onClick={() => setDeleteOpen(true)}><Trash2 className="h-3.5 w-3.5" /></button>}
          <button type="button" disabled={!can('Lưu và quản lý mẫu báo cáo tùy chỉnh')} className={button + ' border-orange-200 text-orange-700 hover:bg-orange-50'} onClick={() => {
            setTemplateName(selectedTemplate?.name || dataset.label + ' theo ' + groupName.toLocaleLowerCase('vi')); setSaveOpen(true);
          }}><Save className="h-3.5 w-3.5" />Lưu mẫu{hasChanges ? ' •' : ''}</button>
        </div>
      </div>
      <details className="mt-2"><summary className="cursor-pointer text-xs font-medium text-slate-600">Mẫu gợi ý</summary>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {[
          { name: 'Lớp theo môn', source: 'classes', group: 'subject' },
          { name: 'Học sinh theo khối', source: 'students', group: 'grade' },
          { name: 'Sự cố theo kỳ', source: 'incidents', group: 'period' },
          { name: 'Giáo viên mới theo môn', source: 'teachers', group: 'subject' },
          { name: 'Dự giờ theo xếp hạng', source: 'inspection', group: 'rank' },
          { name: 'Sự cố theo mô hình', source: 'incidents', group: 'model' },
          { name: 'Sự cố theo khung giờ', source: 'incidents', group: 'timeSlot' },
          { name: 'Ca dạy theo giáo viên', source: 'lessons', group: 'teacher' },
          { name: 'Đăng ký theo môn', source: 'student_registrations', group: 'subject' }
        ].filter(item => datasets.some(dataset => dataset.id === item.source)).map(item => <button key={item.source + item.group} type="button" className="rounded-lg border border-orange-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-orange-400 hover:bg-orange-50"
          onClick={() => {
            const target = datasets.find(dataset => dataset.id === item.source);
            if (target) { setConfig({ ...defaultReportConfig(target), groupBy: item.group }); setTemplateId(''); setSearch(''); }
          }}>{item.name}</button>)}
      </div>
      </details>
    </section>
    </>}
    {!isDetail && <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3"><label className="text-xs font-medium text-slate-500">Dữ liệu cần xem<ReportSelect aria-label="Dữ liệu báo cáo tùy chỉnh" value={dataset.id} onChange={event => switchDataset(event.target.value)} className={control + ' mt-1'}>{datasets.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</ReportSelect></label><label className="text-xs font-medium text-slate-500">Xem theo<ReportSelect aria-label="Cách nhóm báo cáo tùy chỉnh" value={config.groupBy} onChange={event => patch({ groupBy: event.target.value, selection: undefined })} className={control + ' mt-1'}><option value="all">Toàn bộ</option>{dataset.dimensions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</ReportSelect></label></div>}

        <section className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <PeriodToolbar allowUpcoming={dataset.id==='classes_ending'} label="Thời gian" range={{start:result.range.from,end:result.range.to}} disabled={dataset.dateKind === 'snapshot'} onChange={value=>patch({datePreset:value.start||value.end?'custom':'all',from:value.start,to:value.end})}/>
            <button type="button" className={button + ' ml-auto'} disabled={!dataset.filters.length} onClick={() => setFilterOpen(true)}>
              <Filter className="h-3.5 w-3.5" />Lọc chi tiết{activeFilters.length > 0 && <span className="rounded bg-orange-50 px-1.5 text-orange-700">{activeFilters.length}</span>}
            </button>
          </div>
          <div className="grid gap-2 report-filter-grid">{primaryFilters.map(field => <div key={field.id} className="text-xs font-medium text-slate-500">{field.label}<ReportMultiFilter label={field.label} choices={filterOptions(field)} value={config.filters[field.id]} onChange={value => patch({ filters: { ...config.filters, [field.id]: value } })} /></div>)}</div>
          {activeFilters.some(([id]) => !primaryFilters.some(field => field.id === id)) && <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            {activeFilters.filter(([id]) => !primaryFilters.some(field => field.id === id)).map(([id, value]) => <button type="button" key={id} onClick={() => patch({ filters: { ...config.filters, [id]: '' } })}
              className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 text-orange-700" title="Bỏ điều kiện lọc">
              {dataset.filters.find(field => field.id === id)?.label}: {reportFilterLabel(dataset.filters.find(field => field.id === id), value)}<X className="h-3 w-3" />
            </button>)}
          </div>}
          <ComparisonControls current={currentRange} settings={comparison} disabled={dataset.dateKind === 'snapshot'} onChange={value => patch({ comparison: value })} />
        </section>

      {!isDetail && <details className="rounded-xl border border-slate-200 bg-white shadow-2xs">
        <summary className="flex cursor-pointer items-center gap-2 border-b border-slate-100 p-3 text-xs font-semibold text-slate-800"><SlidersHorizontal className="h-4 w-4 text-orange-600" />Tùy chỉnh thêm chỉ số</summary>
        <div className="space-y-4 p-3">
          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-xs font-semibold text-slate-600">Chỉ số hiển thị</legend>
            {dataset.metrics.map(metric => <label key={metric.id} className="flex cursor-pointer items-start gap-2 rounded-lg p-1.5 text-xs text-slate-700 hover:bg-slate-50">
              <input type="checkbox" checked={config.metricIds.includes(metric.id)} className="mt-0.5 accent-orange-600"
                disabled={config.metricIds.length === 1 && config.metricIds[0] === metric.id}
                onChange={event => patch({ metricIds: event.target.checked ? [...config.metricIds, metric.id] : config.metricIds.filter(id => id !== metric.id) })} />
              {metric.label}
            </label>)}
            <p className="text-xs text-slate-400">Giữ ít nhất một chỉ số.</p>
          </fieldset>
          <button type="button" className={button + ' w-full'} onClick={() => {
            setConfig(defaultReportConfig(dataset)); setTemplateId(''); setSearch('');
          }}><RotateCcw className="h-3.5 w-3.5" />Đặt lại thiết lập</button>
        </div>
      </details>}

    </div>}>
      <div className="min-w-0 space-y-3">
        {result.invalidRange ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">Chọn đủ ngày bắt đầu và kết thúc, với ngày bắt đầu không sau ngày kết thúc.</div> : <>
          {compareActive && config.selection && <button type="button" onClick={() => patch({ selection: undefined })} className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">Đang lọc {groupName.toLocaleLowerCase('vi')}: {overview.rows.find(row => row.key === config.selection?.key)?.label || config.selection.key} · Bỏ lọc ×</button>}
          {compareActive && previousResult ? <ComparisonResults key={dataset.id + config.groupBy} datasetId={dataset.id} rows={comparedRows} metrics={result.metrics}
            groupLabel={groupName}
            totals={result.totals} previousTotals={previousResult.totals} currentRange={currentRange} previousRange={previousRange}
            temporal={isTimeGroup} canExport={can('Xuất kết quả báo cáo CSV')} onExport={exportComparison}
            onClearSelection={() => patch({ selection: undefined })} chartRows={overviewComparedRows} chartType={config.chartType} onChartTypeChange={chartType => patch({ chartType })}
            selectedMetricId={chartMetric?.id} onMetricChange={chartMetricId => patch({ chartMetricId })}
            selectedKey={config.selection ? overviewComparedRows.find(row => row.currentKey === config.selection?.key || row.previousKey === previousSelection?.key)?.key : undefined}
            onFilter={key => { const row = overviewComparedRows.find(item => item.key === key); if (!row) return;
              const selected = row.currentKey || (isTimeGroup && row.previousKey ? selectionInPreviousPeriod({ ...config, selection: { by: config.groupBy, key: row.previousKey } }, previousRange, currentRange)?.key : row.previousKey);
              const target = selected || (isTimeGroup && /^\d+$/.test(row.key) ? timeGroupKey(currentRange, config.groupBy, Number(row.key)) : undefined);
              if (target) selectChartGroup(target); }}
            onSelect={(key, period) => { setDetailPeriod(period); setDetailKey(key); }} /> : <>
          <div className="flex flex-wrap items-center justify-between gap-2">{config.selection ? <button type="button" onClick={() => patch({ selection: undefined })} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700">Đang lọc {groupName.toLocaleLowerCase('vi')}: {overview.rows.find(row => row.key === config.selection?.key)?.label || config.selection.key} · Bỏ lọc ×</button> : <span />}{result.metrics.length > 1 && <ReportSelect aria-label="Chỉ số trên biểu đồ" value={chartMetric?.id || ''} onChange={event => { setChartMetricId(event.target.value); patch({ chartMetricId: event.target.value }); }} className={control + ' w-auto'}>{result.metrics.map(metric => <option key={metric.id} value={metric.id}>{metric.label}</option>)}</ReportSelect>}</div>
          <ReportChart title={chartMetric?.label || dataset.label} data={chartRows.map(row => ({ key: row.key, label: row.label, value: chartMetric ? row.values[chartMetric.id] : null }))}
            groupLabel={groupName}
            temporal={isTimeGroup} additive={Boolean(chartMetric && ['count', 'sum'].includes(chartMetric.mode) && !dataset.nonAdditiveGroups?.includes(config.groupBy))}
            kind={config.chartType} onKindChange={chartType => patch({ chartType })} selectedKey={config.selection?.key}
            format={value => chartMetric ? formatReportValue(value, chartMetric) : '—'} onSelect={selectChartGroup} onClearSelection={() => patch({ selection: undefined })} />
          {config.selection && result.rows.length > 0 && <div className="flex justify-end"><button type="button" onClick={() => { setDetailPeriod('current'); setDetailKey(result.rows[0].key); }} className="text-xs font-semibold text-orange-700 hover:underline">Xem {result.records.length} bản ghi của nhóm đã chọn ↗</button></div>}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {result.metrics.map(metric => <div key={metric.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="text-xs text-slate-500">{metric.label}</div>
              <div className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{formatReportValue(result.totals[metric.id], metric)}</div>
            </div>)}
          </div>
          <p className="rounded-xl border border-orange-100 bg-orange-50/60 px-4 py-3 text-sm text-orange-900">{insight}</p>
          {!result.records.length&&dataset.dateKind==='event'&&!dataset.prepareRange&&availableDates.length>0&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600"><span>Dữ liệu nguồn đã tải có ngày từ {displayDate(availableDates[0])} đến {displayDate(availableDates[availableDates.length-1])}. Khoảng ngày và điều kiện đang chọn không có bản ghi phù hợp.</span><button type="button" onClick={()=>patch({datePreset:'all',from:'',to:'',filters:{},selection:undefined})} className="font-semibold text-orange-700 underline">Xem toàn bộ dữ liệu</button></div>}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="space-y-2.5 border-b border-slate-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h4 className="text-xs font-semibold text-slate-800">{dataset.label} theo {groupName.toLocaleLowerCase('vi')}</h4>
                  <p className="mt-0.5 text-xs text-slate-500">{isDetail && dataset.id === 'classes' ? `${visibleClassRecords.length}/${result.records.length} lớp · Bấm tên lớp để xem chi tiết` : `${result.records.length} bản ghi nguồn · ${visibleRows.length}/${result.rows.length} nhóm · Bấm tên nhóm để xem chi tiết`}</p>
                </div>
                <div className="flex items-center gap-2">

                  <button type="button" className={button} disabled={result.invalidRange || !result.records.length || !can('Xuất kết quả báo cáo CSV')} onClick={exportExcel} title="Xuất toàn bộ kỳ và bộ lọc hiện tại, gồm các trang dữ liệu; không giới hạn theo ô tìm kiếm trên bảng"><Download className="h-3.5 w-3.5" />Excel</button>
                  <button type="button" className={button} disabled={noVisibleResults || !can('Xuất kết quả báo cáo CSV')} onClick={exportCsv}><Download className="h-3.5 w-3.5" />CSV</button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-40 flex-1"><Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input aria-label={isDetail && dataset.id === 'classes' ? 'Tìm lớp học' : 'Tìm nhóm kết quả'} placeholder={isDetail && dataset.id === 'classes' ? 'Tìm mã hoặc tên lớp...' : 'Tìm trong kết quả...'} value={search} onChange={event => setSearch(event.target.value)} className={control + ' pl-8'} /></label>
                <ReportSelect aria-label="Sắp xếp kết quả" value={config.sort} onChange={event => patch({ sort: event.target.value as CustomReportConfig['sort'] })} className={control + ' w-auto max-w-60'}>
                  <option value="value_desc">{isDetail && dataset.id === 'classes' ? 'Ngày tạo: mới nhất' : result.metrics[0]?.label + ': giảm dần'}</option><option value="label_asc">Tên / thời gian: tăng dần</option><option value="label_desc">Tên / thời gian: giảm dần</option>
                </ReportSelect>
              </div>
            </div>
            {noVisibleResults ? <div className="p-8 text-center">
              <h5 className="text-sm font-semibold text-slate-700">Chưa có kết quả phù hợp</h5>
              <p className="mt-1 text-xs text-slate-500">Thử mở rộng khoảng thời gian, bỏ điều kiện lọc hoặc đổi từ khóa tìm kiếm.</p>
              <button type="button" className={button + ' mt-3'} onClick={() => { patch({ datePreset: 'all', filters: {} }); setSearch(''); }}>Xem toàn bộ dữ liệu nguồn</button>
            </div> : isDetail && dataset.id === 'classes' ? <CompactClassReportTable records={visibleClassRecords} /> : <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-600"><tr>
                    <th scope="col" className="px-3 py-2.5">{groupName}</th>
                    {result.metrics.map(metric => <th scope="col" key={metric.id} className="whitespace-nowrap px-3 py-2.5 text-right">{metric.label}</th>)}
                    {showSourceCount && <th scope="col" className="px-3 py-2.5 text-right">Bản ghi nguồn</th>}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">{pageRows.map(row => <tr key={row.key} className="hover:bg-slate-50">
                    <th scope="row" className="px-3 py-2.5 font-medium"><button type="button" onClick={() => { setDetailPeriod('current'); setDetailKey(row.key); }} className="inline-flex items-center gap-1.5 text-orange-700 hover:underline">{row.label}<ArrowUpRight className="h-3 w-3" /></button></th>
                    {result.metrics.map(metric => <td key={metric.id} className="px-3 py-2.5 text-right tabular-nums text-slate-800">{formatReportValue(row.values[metric.id], metric)}</td>)}
                    {showSourceCount && <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{row.records.length}</td>}
                  </tr>)}</tbody>
                </table>
              </div>
              {pageCount > 1 && <div className="flex items-center justify-between border-t border-slate-100 p-3 text-xs text-slate-500">
                <span>{currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, visibleRows.length)} / {visibleRows.length} nhóm</span>
                <div className="flex items-center gap-2"><button type="button" className={button} disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Trước</button><span>{currentPage + 1}/{pageCount}</span><button type="button" className={button} disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>Sau</button></div>
              </div>}
            </>}
          </section>
          </>}
        </>}
        <details className="px-1 text-xs text-slate-500"><summary className="cursor-pointer">Cách tính số liệu</summary><div className="mt-2 space-y-1 leading-relaxed">{dataset.note && <p>{dataset.note}</p>}<p>Thẻ chỉ số tính trên dữ liệu sau lọc. Tìm kiếm chỉ lọc kết quả hiển thị; tỷ lệ và điểm được tính lại từ nguồn.</p></div></details>
      </div>
    </ReportSplitPane>

    <FilterDrawer isOpen={filterOpen} onClose={() => setFilterOpen(false)} title={'Lọc ' + dataset.label.toLocaleLowerCase('vi')}
      subtitle="Khoảng thời gian đã chọn ở ngoài. Các tiêu chí dưới đây áp dụng cùng lúc." activeCount={activeFilters.length}
      onReset={() => patch({ filters: {} })} onApply={() => {}}>
      <div className="space-y-4">{dataset.filters.map(field => <div key={field.id} className="block space-y-1.5">
        <span className="text-xs font-semibold text-slate-700">{field.label}</span>
        <ReportMultiFilter label={field.label} choices={filterOptions(field)} value={config.filters[field.id]} onChange={value => patch({ filters: { ...config.filters, [field.id]: value } })} />
      </div>)}</div>
    </FilterDrawer>

    {saveOpen && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="save-report-title">
      <form className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl" onSubmit={event => { event.preventDefault(); saveTemplate(false); }}>
        <div className="flex items-center justify-between"><h3 id="save-report-title" className="text-sm font-bold text-slate-800">Lưu mẫu báo cáo</h3><button type="button" aria-label="Đóng lưu mẫu" onClick={() => setSaveOpen(false)}><X className="h-4 w-4" /></button></div>
        <label className="block space-y-1.5 text-xs font-semibold text-slate-600">Tên mẫu<input autoFocus required maxLength={80} value={templateName} onChange={event => setTemplateName(event.target.value)} placeholder="Ví dụ: Lớp còn chỗ theo môn" className={control} /></label>
        <p className="text-xs text-slate-500">Lưu các trường, điều kiện lọc, cách nhóm và trình bày. Khoảng ngày và kỳ so sánh không lưu vào mẫu; khi mở mẫu sẽ giữ thời gian bạn đang chọn. Dữ liệu được truy vấn lại khi xem báo cáo.</p>
        <div className="flex flex-wrap justify-end gap-2"><button type="button" className={button} onClick={() => setSaveOpen(false)}>Hủy</button>{selectedTemplate && <button type="button" className={button} onClick={() => saveTemplate(true)}>Cập nhật mẫu</button>}<button type="submit" disabled={isSavingChanges} className={button + ' border-[#FF5C00] bg-[#FF5C00] text-white hover:bg-[#e65300]'}>Lưu mẫu mới</button></div>
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
          <div><h3 id="report-detail-title" className="text-sm font-bold text-slate-800">{detailGroup.label}</h3><p className="mt-1 text-xs text-slate-500">{detailGroup.records.length} bản ghi tạo nên kết quả · {detailPeriod === 'previous' ? 'Kỳ đối chiếu: ' + formatComparisonRange(previousRange) : rangeLabel}</p>{dataset.id === 'incidents' && <label className="mt-2 flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={onlyIncidentSources} onChange={event => { setOnlyIncidentSources(event.target.checked); setDetailPage(0); }} />Chỉ buổi có sự cố ({detailRecords.length}/{detailGroup.records.length})</label>}</div>
          <div className="flex gap-2"><button type="button" disabled={!detailRecords.length || !can('Xuất kết quả báo cáo CSV')} onClick={exportSource} className={button}><Download className="h-3.5 w-3.5" />CSV</button><button type="button" autoFocus aria-label="Đóng bản ghi nguồn" onClick={() => setDetailKey(null)} className={button}><X className="h-4 w-4" /></button></div>
        </div>
        <div className="overflow-auto"><table className="w-full whitespace-nowrap text-left text-xs">
          <thead className="sticky top-0 bg-slate-50 text-xs text-slate-600"><tr>{dataset.detailFields.map(field => <th key={field.id} scope="col" className="px-3 py-2.5">{field.label}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{detailRecords.slice(detailPage * PAGE_SIZE, (detailPage + 1) * PAGE_SIZE).map((record, index) => <tr key={String(record.id) + index}>{dataset.detailFields.map(field => <td key={field.id} className="px-3 py-2.5 text-slate-700">{record[field.id] ?? '—'}</td>)}</tr>)}{!detailRecords.length && <tr><td colSpan={dataset.detailFields.length} className="p-6 text-center text-slate-500">Không có bản ghi phù hợp với cách xem này.</td></tr>}</tbody>
        </table></div>
        {detailRecords.length > PAGE_SIZE && <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-3 text-xs"><button type="button" className={button} disabled={detailPage === 0} onClick={() => setDetailPage(value => value - 1)}>Trước</button><span>{detailPage + 1}/{Math.ceil(detailRecords.length / PAGE_SIZE)}</span><button type="button" className={button} disabled={(detailPage + 1) * PAGE_SIZE >= detailRecords.length} onClick={() => setDetailPage(value => value + 1)}>Sau</button></div>}
      </div>
    </div>}
  </div>;
};
