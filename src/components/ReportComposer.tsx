import { VietnameseDatePicker } from './VietnameseDatePicker';
import { ReportSelect } from './ReportSelect';
import { reportFilterValues } from '../lib/customReports';
import React, { useEffect, useRef, useState } from 'react';
import { Eye, Printer, FileSpreadsheet } from 'lucide-react';
import { reportExcelData, reportExcelBytes, type ReportExcelData } from '../lib/reportExcel';
import { useApp } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';
import { PeriodToolbar } from './PeriodToolbar';
import { ComparisonControls } from './ReportComparison';
import { defaultReportConfig, normalizeReportConfig, reportRange, reportToday, type ReportDataset } from '../lib/customReports';
import { defaultComparison, type ComparisonSettings } from '../lib/reportComparison';
import { buildReportDocument, prepareDocumentSection, suggestReportTitle, type ReportDocumentRequest } from '../lib/reportDocument';
import { availableReportCharts, reportChartNames, type ReportChartKind } from '../lib/reportPlot';

const input = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500';
const templates = [
  { id: 'operations', name: 'Tổng hợp vận hành', ids: ['classes', 'students', 'teachers', 'incidents', 'lessons', 'inspection_teachers'] },
  { id: 'enrollment', name: 'Tuyển sinh & lớp học', ids: ['classes', 'students', 'student_registrations'] },
  { id: 'quality', name: 'Chất lượng & sự cố', ids: ['incidents', 'inspection', 'inspection_teachers'] },
  { id: 'custom', name: 'Tự chọn nội dung', ids: [] }
];

export function ReportComposer({ datasets, request, updatedAt }: { datasets: ReportDataset[]; request: ReportDocumentRequest | null; updatedAt: string | number | null }) {
  const { currentUser, showToast } = useApp();
  const { can, requirePermission } = usePermissions();
  const [template, setTemplate] = useState('operations');
  const [selected, setSelected] = useState<string[]>(() => templates[0].ids.filter(id => datasets.some(dataset => dataset.id === id)));
  const [title, setTitle] = useState('BÁO CÁO TỔNG HỢP VẬN HÀNH');
  const [autoTitle, setAutoTitle] = useState(true);
  const [chartType, setChartType] = useState<ReportChartKind>('column');
  const [organization, setOrganization] = useState('VUIHOC TUTOR');
  const [documentInfo, setDocumentInfo] = useState({ address: '', reportNumber: '', reportType: 'Tổng hợp vận hành', circulation: 'internal' as 'internal' | 'external',
    location: '', recipients: '', authorRole: '', approvalEnabled: true, approverRole: 'Giám đốc', approverName: '' });
  const [scopeMode, setScopeMode] = useState<'all' | 'filtered'>('all');
  const [author, setAuthor] = useState(currentUser.name);
  const [date, setDate] = useState(reportToday());
  const [range, setRange] = useState(() => { const today = reportToday(); return { start: today.slice(0, 7) + '-01', end: today }; });
  const [comparison, setComparison] = useState<ComparisonSettings>(defaultComparison);
  const [remarks, setRemarks] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [appendix, setAppendix] = useState(false);
  const [preview, setPreview] = useState('');
  const [excelSnapshot, setExcelSnapshot] = useState<ReportExcelData | null>(null);
  const [exporting, setExporting] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);
  const canPrint = can('Xuất kết quả báo cáo CSV');
  const availableIds = datasets.map(dataset => dataset.id).sort().join('|');
  const titleDataset = selected.length === 1 ? datasets.find(dataset => dataset.id === selected[0]) : null;
  const suggestion = titleDataset ? suggestReportTitle(titleDataset, request?.datasetId === titleDataset.id && template === 'custom' ? request.config.groupBy : defaultReportConfig(titleDataset).groupBy)
    : template === 'custom' ? 'Báo cáo tổng hợp' : templates.find(item => item.id === template)?.name || 'Báo cáo tổng hợp';
  const chartOptions = (Object.keys(reportChartNames) as ReportChartKind[]).filter(kind => datasets.filter(dataset => selected.includes(dataset.id)).every(dataset => {
    const config = template === 'custom' && request?.datasetId === dataset.id ? normalizeReportConfig(request.config, datasets) : defaultReportConfig(dataset);
    const metric = dataset.metrics.find(item => item.id === config.chartMetricId) || dataset.metrics.find(item => item.id === (dataset.id === 'incidents' ? 'rate' : config.metricIds[0]));
    return availableReportCharts(['day', 'week', 'month', 'period'].includes(config.groupBy), Boolean(metric && ['count', 'sum'].includes(metric.mode) && !dataset.nonAdditiveGroups?.includes(config.groupBy)), [], comparison.enabled).includes(kind);
  }));
  const activeChartType = chartOptions.includes(chartType) ? chartType : 'column';
  useEffect(() => { if (autoTitle) setTitle(suggestion); }, [suggestion, autoTitle]);
  useEffect(() => { setSelected(ids => ids.filter(id => datasets.some(dataset => dataset.id === id))); setPreview(''); setReady(false); }, [availableIds]);
  useEffect(() => {
    if (!request || !datasets.some(dataset => dataset.id === request.datasetId)) return;
    const dataset = datasets.find(item => item.id === request.datasetId)!;
    const config = normalizeReportConfig(request.config, datasets);
    const period = reportRange(config);
    setTemplate('custom'); setSelected([dataset.id]); setTitle(suggestReportTitle(dataset, config.groupBy)); setAutoTitle(true); setChartType(config.chartType || 'column');
    setDocumentInfo(info => ({ ...info, reportType: dataset.label }));
    setScopeMode(Object.values(config.filters).some(value => reportFilterValues(value).length > 0) || config.selection ? 'filtered' : 'all');
    setRange({ start: period.from, end: period.to }); setComparison(config.comparison || defaultComparison);
    setRemarks(''); setRecommendations(''); setPreview(''); setReady(false); setError('');
  }, [request]);
  // Editing invalidates the preview; a printed document always matches the reviewed snapshot.
  useEffect(() => { setPreview(''); setReady(false); }, [template, selected, title, organization, author, date, range, comparison, remarks, recommendations, appendix, documentInfo, scopeMode, chartType]);
  const generate = () => {
    setError('');
    try {
      if (!title.trim() || !organization.trim() || !author.trim() || !date) throw new Error('Nhập tên báo cáo, đơn vị, người lập và ngày lập.');
      const chosen = datasets.filter(dataset => selected.includes(dataset.id));
      if (!chosen.length) throw new Error('Chọn ít nhất một nội dung báo cáo.');
      const sections = chosen.map(dataset => {
        const base = template === 'custom' && request?.datasetId === dataset.id ? normalizeReportConfig(request.config, datasets) : defaultReportConfig(dataset);
        return prepareDocumentSection(dataset, { ...base, filters: scopeMode === 'all' ? {} : base.filters, selection: scopeMode === 'all' ? undefined : base.selection, chartType: activeChartType,
          datePreset: range.start || range.end ? 'custom' : 'all', from: range.start, to: range.end }, comparison);
      });
      const info = { ...documentInfo, title: title.trim(), organization: organization.trim(), author: author.trim(), date,
        updatedAt: updatedAt ? new Date(updatedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' }) : 'Chưa xác định', remarks, recommendations, appendix };
      const html = buildReportDocument(sections, info);
      setExcelSnapshot(reportExcelData(sections, info));
      setReady(false); setPreview(html);
    } catch (problem) { setPreview(''); setError(problem instanceof Error ? problem.message : 'Không tạo được bản xem trước.'); }
  };
  const downloadExcel = async () => {
    if (!requirePermission('Xuất kết quả báo cáo CSV') || !preview || !excelSnapshot || exporting) return;
    setExporting(true);
    try {
      await new Promise<void>(resolve => window.setTimeout(resolve, 0));
      const blob = new Blob([reportExcelBytes(excelSnapshot)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = excelSnapshot.filename;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Không tải được số liệu Excel.'); }
    finally { setExporting(false); }
  };
  const print = () => {
    if (!requirePermission('Xuất kết quả báo cáo CSV') || !preview || !ready) return;
    try { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); }
    catch { showToast('Trình duyệt chưa mở được hộp thoại in. Hãy tạo lại bản xem trước.', 'error'); }
  };
  return <div className="report-interface font-inter space-y-4">
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-medium text-slate-600">Mẫu báo cáo<ReportSelect aria-label="Mẫu tài liệu báo cáo" value={template} className={input} onChange={event => {
        const value = event.target.value; setTemplate(value);
        const chosen = templates.find(item => item.id === value)!;
        if (value !== 'custom') { setSelected(chosen.ids.filter(id => datasets.some(dataset => dataset.id === id))); setAutoTitle(true); setDocumentInfo(info => ({ ...info, reportType: chosen.name })); setScopeMode('all'); }
      }}>{templates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</ReportSelect></label><label className="text-xs font-medium text-slate-600">Tên báo cáo<input value={title} onChange={event => { setTitle(event.target.value); setAutoTitle(false); }} maxLength={180} className={input} />{!autoTitle && <button type="button" onClick={() => setAutoTitle(true)} className="mt-1 text-xs text-orange-700">Dùng tên gợi ý</button>}</label></div>
      <label className="block text-xs font-medium text-slate-600">Biểu đồ trong bản in<ReportSelect aria-label="Biểu đồ trong bản in" value={activeChartType} onChange={event => setChartType(event.target.value as ReportChartKind)} className={input}>{(Object.keys(reportChartNames) as ReportChartKind[]).map(key => <option key={key} value={key} disabled={!chartOptions.includes(key)}>{reportChartNames[key]}{!chartOptions.includes(key) ? key === 'line' || key === 'area' ? ' — cần nhóm theo ngày/tuần/tháng ở mọi nội dung' : ' — không phù hợp số liệu đã chọn' : ''}</option>)}</ReportSelect></label>
      <PeriodToolbar label="Kỳ báo cáo" range={range} onChange={setRange} />
      <div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-medium text-slate-600">Số báo cáo<input aria-label="Số báo cáo" value={documentInfo.reportNumber} onChange={event => setDocumentInfo(info => ({ ...info, reportNumber: event.target.value }))} placeholder="Ví dụ: 01/2026/BC-VH" maxLength={80} className={input} /></label><label className="text-xs font-medium text-slate-600">Phạm vi phát hành<ReportSelect aria-label="Phạm vi phát hành" value={documentInfo.circulation} onChange={event => setDocumentInfo(info => ({ ...info, circulation: event.target.value as 'internal' | 'external' }))} className={input}><option value="internal">Báo cáo nội bộ</option><option value="external">Báo cáo gửi bên ngoài</option></ReportSelect></label><label className="text-xs font-medium text-slate-600">Phạm vi số liệu<ReportSelect aria-label="Phạm vi số liệu" value={scopeMode} onChange={event => setScopeMode(event.target.value as 'all' | 'filtered')} className={input}><option value="all">Tất cả trong kỳ đã chọn</option><option value="filtered" disabled={!request || template !== 'custom'}>Theo bộ lọc từ báo cáo chi tiết</option></ReportSelect></label></div>
      <ComparisonControls current={range} settings={comparison} onChange={setComparison} />
      <details open={template === 'custom' ? true : undefined}><summary className="cursor-pointer text-sm font-medium text-slate-700">Nội dung báo cáo ({selected.length})</summary><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{datasets.map(dataset => <label key={dataset.id} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2 text-sm text-slate-700"><input type="checkbox" checked={selected.includes(dataset.id)} onChange={event => setSelected(ids => event.target.checked ? [...ids, dataset.id] : ids.filter(id => id !== dataset.id))} className="accent-orange-600" />{dataset.label}</label>)}</div>
        {template === 'custom' && request && selected.includes(request.datasetId) && <p className="mt-2 text-xs text-slate-500">Giữ chỉ số và cách nhóm đã chọn. {scopeMode === 'filtered' ? 'Áp dụng bộ lọc của báo cáo chi tiết cho nội dung được chuyển sang.' : 'Lấy tất cả bản ghi được phép xem trong kỳ, không áp dụng bộ lọc cũ.'} Các nội dung thêm dùng thiết lập mẫu.</p>}
      </details>
      <details><summary className="cursor-pointer text-sm font-medium text-slate-700">Thông tin đầu báo cáo & người ký</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-600">Tên đơn vị<input value={organization} onChange={event => setOrganization(event.target.value)} maxLength={160} className={input} /></label>
        <label className="text-xs text-slate-600">Địa chỉ đơn vị<input value={documentInfo.address} onChange={event => setDocumentInfo(info => ({ ...info, address: event.target.value }))} maxLength={350} className={input} /></label>
        <label className="text-xs text-slate-600">Loại báo cáo<input value={documentInfo.reportType} onChange={event => setDocumentInfo(info => ({ ...info, reportType: event.target.value }))} maxLength={160} className={input} /></label>
        <label className="text-xs text-slate-600">Nơi nhận<input value={documentInfo.recipients} onChange={event => setDocumentInfo(info => ({ ...info, recipients: event.target.value }))} maxLength={350} placeholder="Ví dụ: Ban giám đốc" className={input} /></label>
        <label className="text-xs text-slate-600">Địa danh lập báo cáo<input value={documentInfo.location} onChange={event => setDocumentInfo(info => ({ ...info, location: event.target.value }))} maxLength={100} placeholder="Ví dụ: Hà Nội" className={input} /></label>
        <label className="text-xs text-slate-600">Ngày lập<VietnameseDatePicker value={date} onChange={event => setDate(event.target.value)} className={input} /></label>
        <label className="text-xs text-slate-600">Người lập báo cáo<input value={author} onChange={event => setAuthor(event.target.value)} maxLength={120} className={input} /></label>
        <label className="text-xs text-slate-600">Chức vụ người lập<input value={documentInfo.authorRole} onChange={event => setDocumentInfo(info => ({ ...info, authorRole: event.target.value }))} maxLength={100} className={input} /></label>
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2"><input type="checkbox" checked={documentInfo.approvalEnabled} onChange={event => setDocumentInfo(info => ({ ...info, approvalEnabled: event.target.checked }))} className="accent-orange-600" />Có phần ký của giám đốc / người duyệt</label>
        {documentInfo.approvalEnabled && <><label className="text-xs text-slate-600">Chức danh người duyệt<input value={documentInfo.approverRole} onChange={event => setDocumentInfo(info => ({ ...info, approverRole: event.target.value }))} maxLength={100} className={input} /></label><label className="text-xs text-slate-600">Họ tên người duyệt<input value={documentInfo.approverName} onChange={event => setDocumentInfo(info => ({ ...info, approverName: event.target.value }))} maxLength={120} className={input} /></label></>}
      </div></details>
      <details><summary className="cursor-pointer text-sm font-medium text-slate-700">Nhận xét & kiến nghị</summary><div className="mt-3 space-y-3"><label className="block text-xs text-slate-600">Nhận xét<textarea value={remarks} onChange={event => setRemarks(event.target.value)} rows={3} maxLength={12000} className={input} /></label><label className="block text-xs text-slate-600">Kiến nghị<textarea value={recommendations} onChange={event => setRecommendations(event.target.value)} rows={3} maxLength={12000} className={input} /></label></div></details>
      <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={appendix} onChange={event => setAppendix(event.target.checked)} className="accent-orange-600" />Kèm phụ lục bản ghi chi tiết</label><div className="flex flex-wrap gap-2"><button type="button" onClick={generate} className="inline-flex items-center gap-2 rounded-lg bg-[#FF5C00] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e65300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"><Eye className="h-4 w-4" />Xem trước</button><button type="button" disabled={!canPrint || !preview || !excelSnapshot || exporting} onClick={downloadExcel} className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-[#FF5C00] transition-colors hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-40"><FileSpreadsheet className="h-4 w-4" />{exporting ? 'Đang tải…' : 'Tải số liệu Excel'}</button><button type="button" disabled={!canPrint || !preview || !ready} onClick={print} className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-[#FF5C00] transition-colors hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-40"><Printer className="h-4 w-4" />In / Lưu PDF</button></div></div>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </section>
    {preview ? <section className="overflow-hidden rounded-xl border border-slate-200"><div className="border-b bg-white px-4 py-2 text-xs text-slate-500">Bản xem trước · A4 · Chọn “Lưu dưới dạng PDF” trong hộp thoại in để lưu tệp.</div><iframe ref={frame} title="Bản xem trước báo cáo để in" srcDoc={preview} sandbox="allow-same-origin allow-modals" onLoad={() => setReady(true)} className="h-[75vh] min-h-96 w-full border-0 bg-slate-200" /></section>
      : <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Chọn mẫu và kỳ báo cáo, sau đó bấm “Xem trước”.</div>}
  </div>;
}
