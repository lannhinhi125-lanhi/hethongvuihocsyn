import assert from 'node:assert/strict';
import { availableReportCharts, renderReportPlot, reportChartNames } from '../src/lib/reportPlot';
import { buildCustomReport, defaultReportConfig, normalizeReportConfig, type ReportDataset } from '../src/lib/customReports';
import { suggestReportTitle, prepareDocumentSection, buildReportDocument } from '../src/lib/reportDocument';
import { selectionInPreviousPeriod, withMissingPeriod } from '../src/lib/reportComparison';
const data = [{ key: '<bad"key>', label: '<img src=x onerror=alert(1)>', value: 2 }, { key: 'B', label: 'Nhóm B', value: 3 }, { key: 'missing', label: 'Thiếu', value: null }];
const format = (value: number | null) => value === null ? '—' : String(value);
const axes=renderReportPlot(data,'column',format,{title:'Học sinh',metricLabel:'Số học sinh',groupLabel:'Số môn đang học'});
assert.ok(axes.includes('aria-label="Trục tung"'));
assert.ok(axes.includes('>Số học sinh</text>'));
assert.ok(axes.includes('>Số môn đang học</text>'));
const horizontal=renderReportPlot(data,'bar',format,{title:'Học sinh',metricLabel:'Số học sinh',groupLabel:'Khối'});
assert.match(horizontal,/aria-label="Trục tung"[^>]*>Khối<\/text>/);
assert.match(horizontal,/aria-label="Trục hoành"[^>]*>Số học sinh<\/text>/);
assert.ok(!renderReportPlot(data,'pie',format,{title:'Học sinh'}).includes('aria-label="Trục tung"'));
for (const kind of Object.keys(reportChartNames) as Array<keyof typeof reportChartNames>) {
  const html = renderReportPlot(data, kind, format, { title: 'Biểu đồ', interactive: true, selectedKey: 'B' });
  assert.ok(!html.includes('NaN'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('role="button"'));
  assert.ok(html.includes('tabindex="0"'));
  assert.ok(html.includes('data-report-key='));
  assert.ok(html.includes('aria-pressed="true"'));
  assert.ok(!html.includes('aria-label="Chú giải biểu đồ"'));
  const printable = renderReportPlot(data, kind, format, { title: 'Bản in' });
  assert.ok(!printable.includes('data-report-key='));
}
assert.equal(availableReportCharts(true, true, data).length, 8);
assert.ok(!availableReportCharts(false, false, data).includes('donut'));
assert.ok(!availableReportCharts(true, true, data, true).includes('pie'));
assert.ok(!availableReportCharts(true, true, [{ key: 'negative', label: 'Âm', value: -1 }]).includes('treemap'));
assert.ok(!renderReportPlot([{ key: 'zero', label: 'Không', value: 0 }], 'donut', format, { title: 'Không' }).includes('NaN'));
const dataset: ReportDataset = { id: 'test', label: 'Học sinh mới', dateKind: 'event', records: [
  { id: 'A1', date: '2026-10-01', subject: 'Toán' }, { id: 'A2', date: '2026-10-01', subject: 'Toán' }, { id: 'B1', date: '2026-10-02', subject: 'Anh' },
  { id: 'before', date: '2026-09-01', subject: 'Toán' }], metrics: [{ id: 'count', label: 'Số học sinh', mode: 'count' }], defaultMetricIds: ['count'],
  dimensions: [{ id: 'subject', label: 'Môn học' }, { id: 'day', label: 'Ngày' }], filters: [{ id: 'subject', label: 'Môn học' }], detailFields: [{ id: 'id', label: 'Mã' }] };
const config = { ...defaultReportConfig(dataset), datePreset: 'custom' as const, from: '2026-10-01', to: '2026-10-31', chartType: 'pie' as const, selection: { by: 'subject', key: 'Toán' } };
assert.equal(suggestReportTitle(dataset, 'subject'), 'Học sinh mới theo môn học');
assert.equal(suggestReportTitle(dataset, 'all'), 'Học sinh mới');
const selected = buildCustomReport(dataset, config);
assert.equal(selected.rows.length, 1);
assert.equal(selected.records.length, 2);
assert.equal(selected.totals.count, 2);
assert.equal(buildCustomReport(dataset, { ...config, selection: undefined }).totals.count, 3);
assert.equal(buildCustomReport(dataset, { ...config, groupBy: 'day' }).totals.count, 3); // A stale selection cannot constrain another dimension.
const saved = normalizeReportConfig(config, [dataset]);
assert.deepEqual(saved.selection, config.selection);
assert.equal(saved.chartType, 'pie');
const previous = selectionInPreviousPeriod({ ...config, groupBy: 'day', selection: { by: 'day', key: '2026-10-01' } }, { start: config.from, end: config.to }, { start: '2026-09-01', end: '2026-09-30' });
assert.equal(previous?.key, '2026-09-01');
const outside = selectionInPreviousPeriod({ ...config, groupBy: 'day', selection: { by: 'day', key: '2026-10-31' } }, { start: config.from, end: config.to }, { start: '2026-09-01', end: '2026-09-30' });
assert.equal(withMissingPeriod(selected, outside).totals.count, null);
const section = prepareDocumentSection(dataset, config, { enabled: true, mode: 'previous', start: '', end: '' });
assert.equal(section.previous?.totals.count, 1);
const html = buildReportDocument([section], { title: suggestReportTitle(dataset, 'subject'), organization: 'Đơn vị', author: 'A', date: '2026-10-18', updatedAt: '', remarks: '', recommendations: '', appendix: true });
assert.ok(html.indexOf('<figure>') < html.indexOf('<table>'));
assert.ok(html.includes('Chọn từ biểu đồ: Toán'));
assert.ok(html.includes('Theo bộ lọc'));
assert.ok(!html.includes('B1</td>')); // Source appendix follows the chart selection, not the full unfiltered source.
console.log('PASS: eight shared chart types, accessible SVG selection, safe labels, scoped data/printing, generated titles and aligned date drilldowns');
