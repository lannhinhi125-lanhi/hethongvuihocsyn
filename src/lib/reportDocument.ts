import { reportFilterValues, reportFilterLabel } from './customReports';
import { buildCustomReport, formatReportValue, type CustomReportConfig, type ReportDataset, type ReportResult } from './customReports';
import { alignComparisonRows, comparisonIssue, comparisonRange, defaultComparison, formatComparisonRange, reportChange, selectionInPreviousPeriod, withMissingPeriod, type ComparisonSettings } from './reportComparison';
import { availableReportCharts, renderReportPlot } from './reportPlot';
import { vuihocReportLogo } from './reportBrand';

export interface ReportDocumentRequest { datasetId: string; config: CustomReportConfig }
export interface DocumentSection { dataset: ReportDataset; config: CustomReportConfig; result: ReportResult; previous: ReportResult | null }
export interface ReportDocumentOptions {
  showCharts?: boolean;
  title: string; organization: string; author: string; date: string; updatedAt: string;
  remarks: string; recommendations: string; appendix: boolean;
  address?: string; reportNumber?: string; reportType?: string; circulation?: 'internal' | 'external';
  location?: string; recipients?: string; authorRole?: string;
  approvalEnabled?: boolean; approverRole?: string; approverName?: string;
}
export const escapeReportHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const esc = escapeReportHtml;
export function suggestReportTitle(dataset: ReportDataset, groupBy: string): string {
  const dimension = dataset.dimensions.find(field => field.id === groupBy);
  return dataset.label + (dimension && groupBy !== 'all' ? ' theo ' + dimension.label.toLocaleLowerCase('vi') : '');
}

export function prepareDocumentSection(dataset: ReportDataset, config: CustomReportConfig, comparison: ComparisonSettings = defaultComparison): DocumentSection {
  const result = buildCustomReport(dataset, config);
  if (result.invalidRange) throw new Error('Khoảng thời gian của ' + dataset.label + ' chưa hợp lệ.');
  const current = { start: result.range.from, end: result.range.to };
  const previousRange = comparisonRange(current, comparison);
  if (comparison.enabled && comparisonIssue(current, previousRange)) throw new Error(comparisonIssue(current, previousRange)!);
  if (comparison.enabled && dataset.dateKind === 'snapshot') throw new Error(dataset.label + ' chưa có lịch sử để so sánh.');
  const previousSelection = selectionInPreviousPeriod(config, current, previousRange);
  const previous = comparison.enabled ? withMissingPeriod(buildCustomReport(dataset, { ...config, datePreset: 'custom', from: previousRange.start, to: previousRange.end, selection: previousSelection }), previousSelection) : null;
  return { dataset, config: { ...config, comparison }, result, previous };
}

function table(headers: string[], rows: unknown[][]) {
  return `<table><thead><tr>${headers.map(label => `<th scope="col">${esc(label)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(row => `<tr>${row.map(value => `<td>${esc(value)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${headers.length}">Không có dữ liệu phù hợp.</td></tr>`}</tbody></table>`;
}
function chart(section: DocumentSection) {
  const { result, previous, dataset, config } = section;
  const metric = result.metrics.find(item => item.id === config.chartMetricId) || result.metrics.find(item => dataset.id === 'incidents' && item.id === 'rate') || result.metrics[0];
  if (!metric || !result.rows.length && !previous?.rows.length) return '';
  const current = { start: result.range.from, end: result.range.to };
  const previousRange = comparisonRange(current, config.comparison || defaultComparison);
  const points = previous ? alignComparisonRows(result.rows, previous.rows, result.metrics, current, previousRange, config.groupBy)
    .map(row => ({ key: row.key, label: row.label, value: row.current[metric.id], previous: row.previous[metric.id] }))
    : result.rows.map(row => ({ key: row.key, label: row.label, value: row.values[metric.id], previous: null }));
  if (['day', 'week', 'month', 'period'].includes(config.groupBy)) points.sort((a, b) => a.key.localeCompare(b.key, 'vi', { numeric: true }));
  const rows = points.slice(0, 8);
  const temporal = ['day', 'week', 'month', 'period'].includes(config.groupBy);
  const additive = ['count', 'sum'].includes(metric.mode) && !dataset.nonAdditiveGroups?.includes(config.groupBy);
  const allowed = availableReportCharts(temporal, additive, rows, Boolean(previous));
  const kind = config.chartType && allowed.includes(config.chartType) ? config.chartType : 'column';
  return `<figure><figcaption>${esc(metric.label)}${previous ? ' · Hiện tại (tím xanh) / Đối chiếu (cam)' : ''}</figcaption>${renderReportPlot(rows, kind, value => formatReportValue(value, metric), { title: metric.label, groupLabel: dataset.dimensions.find(field => field.id === config.groupBy)?.label || config.groupBy, comparison: Boolean(previous), idPrefix: 'print-' + dataset.id })}<small>${rows.length}/${points.length} nhóm theo thứ tự đang chọn; bảng bên dưới có đầy đủ kết quả.</small></figure>`;
}

export function buildReportDocument(sections: DocumentSection[], options: ReportDocumentOptions): string {
  if (!sections.length) throw new Error('Chọn ít nhất một nội dung báo cáo.');
  const body = sections.map((section, index) => {
    const { dataset, config, result, previous } = section;
    const range = { start: result.range.from, end: result.range.to };
    const rangeLabel = !range.start && !range.end ? 'Toàn bộ thời gian' : formatComparisonRange(range);
    const previousRange = comparisonRange(range, config.comparison || defaultComparison);
    const filters = [...Object.entries(config.filters).filter(([, value]) => reportFilterValues(value).length).map(([id, value]) => `${dataset.filters.find(field => field.id === id)?.label || id}: ${reportFilterLabel(dataset.filters.find(field => field.id === id), value)}`),
      ...(config.selection ? ['Chọn từ biểu đồ: ' + (result.rows[0]?.label || config.selection.key)] : [])].join(' · ');
    const summaries = table(previous ? ['Chỉ số', 'Hiện tại', 'Đối chiếu', 'Chênh lệch'] : ['Chỉ số', 'Kết quả'], result.metrics.map(metric => {
      const cells = [metric.label, formatReportValue(result.totals[metric.id], metric)];
      if (previous) { const change = reportChange(result.totals[metric.id], previous.totals[metric.id], metric); cells.push(formatReportValue(previous.totals[metric.id], metric), change.label + (change.relative ? ` (${change.relative})` : '')); }
      return cells;
    }));
    const group = config.groupBy === 'all' ? 'Toàn bộ' : dataset.dimensions.find(field => field.id === config.groupBy)?.label || config.groupBy;
    // Limit table width rather than omitting metrics: each selected metric gets a complete comparison table.
    const groupTables = previous ? result.metrics.map(metric => `<h4>${esc(metric.label)}</h4>${table([group, 'Kỳ hiện tại', 'Kỳ đối chiếu', 'Chênh lệch'], alignComparisonRows(result.rows, previous.rows, result.metrics, range, previousRange, config.groupBy).map(row => {
      const change = reportChange(row.current[metric.id], row.previous[metric.id], metric);
      return [row.label + (['day', 'week', 'month', 'period'].includes(config.groupBy) ? ` (${row.currentLabel || '—'} / ${row.previousLabel || '—'})` : ''), formatReportValue(row.current[metric.id], metric), formatReportValue(row.previous[metric.id], metric), change.label + (change.relative ? ` (${change.relative})` : '')];
    }))}`).join('') : result.metrics.reduce<string[]>((tables, _metric, metricIndex) => {
      if (metricIndex % 4) return tables;
      const metrics = result.metrics.slice(metricIndex, metricIndex + 4);
      tables.push(table([group, ...metrics.map(metric => metric.label)], result.rows.map(row => [row.label, ...metrics.map(metric => formatReportValue(row.values[metric.id], metric))])));
      return tables;
    }, []).join('');
    return `<section class="report-section"><h2>${index + 1}. ${esc(dataset.label)}</h2><p class="scope">Kỳ báo cáo: ${esc(rangeLabel)}${previous ? `<br/>Kỳ đối chiếu: ${esc(formatComparisonRange(previousRange))}` : ''}${filters ? `<br/>Phạm vi: ${esc(filters)}` : '<br/>Phạm vi: tất cả bản ghi được phép truy cập'}</p>${options.showCharts === false ? '' : chart(section)}${summaries}<h3>Bảng tổng hợp theo ${esc(group.toLocaleLowerCase('vi'))}</h3>${groupTables}${dataset.note ? `<p class="method">Cách tính: ${esc(dataset.note)}</p>` : ''}</section>`;
  }).join('');
  const appendices = options.appendix ? sections.map((section, index) => {
    const { dataset, result, previous } = section;
    return ([['Kỳ hiện tại', result], ['Kỳ đối chiếu', previous]] as const).filter(([, data]) => data).map(([label, data]) => {
      const fields = dataset.detailFields;
      const identity = fields.slice(0, 2), rest = fields.slice(2);
      const panels = rest.length ? Array.from({ length: Math.ceil(rest.length / 4) }, (_, i) => [...identity, ...rest.slice(i * 4, i * 4 + 4)]) : [identity];
      return `<section class="appendix"><h2>Phụ lục ${index + 1}: ${esc(dataset.label)} — ${label}</h2><p>${data!.records.length} bản ghi nguồn; mỗi bảng tiếp theo lặp cột nhận diện để đối chiếu.</p>${panels.map((panel, panelIndex) => `<h4>Bảng ${panelIndex + 1}/${panels.length}</h4>${table(panel.map(field => field.label), data!.records.map(record => panel.map(field => record[field.id] ?? '—')))}`).join('')}</section>`;
    }).join('');
  }).join('') : '';
  const paragraphs = (value: string) => value.trim().split(/\n+/).filter(Boolean).map(line => `<p>${esc(line)}</p>`).join('');
  const dateParts = options.date.split('-');
  const formalDate = `Ngày ${dateParts[2]} tháng ${dateParts[1]} năm ${dateParts[0]}`;
  const circulation = options.circulation === 'external' ? 'BÁO CÁO GỬI BÊN NGOÀI' : 'BÁO CÁO NỘI BỘ';
  const periods = [...new Set(sections.map(({ result }) => !result.range.from && !result.range.to ? 'Toàn bộ thời gian' : formatComparisonRange({ start: result.range.from, end: result.range.to })))];
  const hasFilters = sections.some(section => Object.values(section.config.filters).some(value => reportFilterValues(value).length > 0) || section.config.selection);
  const documentHeader = `<header class="document-header"><div class="letterhead"><div><p class="organization">${esc(options.organization)}</p><img class="report-brand-logo" src="${vuihocReportLogo}" alt="VUIHOC" width="142" height="32"/>${options.address?.trim() ? `<p class="address">Địa chỉ: ${esc(options.address.trim())}</p>` : ''}<p class="document-number">Số: ${esc(options.reportNumber?.trim() || 'Chưa cấp số')}</p></div><div class="document-classification"><strong>${circulation}</strong><p class="issue-date">${options.location?.trim() ? esc(options.location.trim()) + ', ' : ''}${esc(formalDate)}</p></div></div><h1>${esc(options.title)}</h1><dl class="document-info"><div><dt>Loại báo cáo</dt><dd>${esc(options.reportType?.trim() || 'Báo cáo tổng hợp')}</dd></div><div><dt>Kỳ báo cáo</dt><dd>${esc(periods.join('; '))}</dd></div><div><dt>Phạm vi số liệu</dt><dd>${hasFilters ? 'Theo bộ lọc, ghi rõ tại từng nội dung bên dưới' : 'Tất cả bản ghi được phép truy cập trong kỳ và nội dung đã chọn'}</dd></div><div><dt>Nội dung</dt><dd>${esc(sections.map(section => section.dataset.label).join('; '))}</dd></div>${options.recipients?.trim() ? `<div><dt>Nơi nhận</dt><dd>${esc(options.recipients.trim())}</dd></div>` : ''}<div><dt>Người lập</dt><dd>${esc(options.author)}${options.authorRole?.trim() ? ' — ' + esc(options.authorRole.trim()) : ''}</dd></div><div><dt>Dữ liệu cập nhật</dt><dd>${esc(options.updatedAt)}</dd></div></dl></header>`;
  const signatures = `<div class="signature"><div><strong>NGƯỜI LẬP BÁO CÁO</strong>${options.authorRole?.trim() ? `<p class="signer-role">${esc(options.authorRole.trim())}</p>` : ''}<p class="signer-hint">(Ký, ghi rõ họ tên)</p><div class="space"></div><strong>${esc(options.author)}</strong></div>${options.approvalEnabled ? `<div><strong>${esc(options.approverRole?.trim().toLocaleUpperCase('vi') || 'NGƯỜI DUYỆT')}</strong><p class="signer-hint">(Ký, ghi rõ họ tên)</p><div class="space"></div>${options.approverName?.trim() ? `<strong>${esc(options.approverName.trim())}</strong>` : '<span class="blank-name">........................................</span>'}</div>` : ''}</div>`;
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"/><title>${esc(options.title)}</title><style>
@page { size:A4; margin:16mm 14mm 18mm; @bottom-right { content:"Trang " counter(page); font:9pt "Times New Roman",serif; color:#64748b; } }
.report-brand-logo{display:block;width:142px;height:auto;max-width:100%;margin:8px 0 12px;object-fit:contain;print-color-adjust:exact}.letterhead{display:grid;grid-template-columns:1fr 1fr;gap:20px;break-inside:avoid}.address,.document-number{font-size:9pt}.document-classification{text-align:center;font-size:10pt}.issue-date{margin-top:14px;font-style:italic}.document-info{border-top:1px solid #94a3b8;border-bottom:1px solid #cbd5e1;margin:14px 0 20px;padding:10px 0;font-size:9.5pt}.document-info>div{display:grid;grid-template-columns:115px 1fr;gap:10px;margin:4px 0}.document-info dt{font-weight:bold}.document-info dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.signer-role,.signer-hint{font-size:9pt}.blank-name{font-size:9pt}.signature{gap:25px}.signature>div{overflow-wrap:anywhere}
*{box-sizing:border-box}body{margin:0;background:#e2e8f0;color:#0f172a;font:12pt/1.5 "Times New Roman",serif}main{width:210mm;margin:16px auto;padding:16mm 14mm;background:white;box-shadow:0 2px 10px #0001}h1{font-size:18pt;text-transform:uppercase;letter-spacing:.4px;text-align:center;margin:18px 0 8px;overflow-wrap:anywhere}h2{font-size:14pt;margin:24px 0 8px;break-after:avoid}h3{font-size:11pt;margin:14px 0 6px;break-after:avoid}h4{font-size:10pt;margin:10px 0 4px;break-after:avoid}p{margin:6px 0;white-space:pre-wrap;overflow-wrap:anywhere}.organization{font-weight:bold;text-transform:uppercase}.meta,.scope,.method,small{font-size:9pt;color:#475569}.meta{text-align:center}.method{margin-top:10px}table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:9pt;line-height:1.45;font-family:inherit;margin:8px 0 14px}th,td{border:1px solid #cbd5e1;padding:6px 8px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#f1f5f9;font-weight:bold}thead{display:table-header-group}tr{break-inside:avoid}figure{margin:14px 0;break-inside:avoid}figcaption{font-weight:bold;font-size:10pt}svg{display:block;width:100%;height:auto;font-family:"Times New Roman",serif!important}small{display:block}.appendix{break-before:page}.signature{display:flex;justify-content:flex-end;break-inside:avoid;margin-top:28px;text-align:center}.signature>div{width:240px}.signature .space{height:65px}.narrative{break-inside:auto}.footer{border-top:1px solid #cbd5e1;padding-top:8px;margin-top:24px;font-size:8pt;color:#64748b}
@media print{body{background:white}main{width:auto;margin:0;padding:0;box-shadow:none}th{print-color-adjust:exact}svg{print-color-adjust:exact}}
.signature{justify-content:space-between;align-items:stretch}.signature>div{width:46%;display:flex;flex-direction:column;align-items:center}.signature .space{min-height:65px;flex:1}
</style></head><body><main>${documentHeader}${body}${options.remarks.trim() ? `<section class="narrative"><h2>Nhận xét</h2>${paragraphs(options.remarks)}</section>` : ''}${options.recommendations.trim() ? `<section class="narrative"><h2>Kiến nghị</h2>${paragraphs(options.recommendations)}</section>` : ''}${signatures}<p class="footer">Số liệu theo phạm vi và quyền truy cập của người lập tại thời điểm tạo bản xem trước. “—” là chưa đủ dữ liệu, không phải bằng 0.</p>${appendices}</main></body></html>`;
}
