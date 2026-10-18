import assert from 'node:assert/strict';
import { buildCustomReport, defaultReportConfig, normalizeReportConfig, type ReportDataset, type ReportGroup, type ReportMetric } from '../src/lib/customReports';
import { alignComparisonRows, comparisonCsv, comparisonIssue, comparisonRange, defaultComparison, metricDirection, reportChange } from '../src/lib/reportComparison';
import { operationalReportDatasets } from '../src/lib/operationalReportDatasets';

const current = { start: '2026-10-01', end: '2026-10-31' };
const previous = { start: '2026-09-01', end: '2026-09-30' };
assert.deepEqual(comparisonRange(current, defaultComparison), previous);
assert.deepEqual(comparisonRange({ start: '2026-01-01', end: '2026-01-31' }, defaultComparison), { start: '2025-12-01', end: '2025-12-31' });
assert.deepEqual(comparisonRange({ start: '2026-10-05', end: '2026-10-11' }, defaultComparison), { start: '2026-09-28', end: '2026-10-04' });
assert.deepEqual(comparisonRange({ start: '2024-02-29', end: '2024-02-29' }, { ...defaultComparison, mode: 'year' }), { start: '2023-02-28', end: '2023-02-28' });
assert.deepEqual(comparisonRange(current, { ...defaultComparison, mode: 'custom', start: '2025-01-01', end: '2025-02-01' }), { start: '2025-01-01', end: '2025-02-01' });
assert.ok(comparisonIssue({ start: '', end: '' }, previous));
assert.ok(comparisonIssue(current, { start: '2026-02-30', end: '2026-03-01' }));
assert.ok(comparisonIssue(current, { start: '2026-09-30', end: '2026-10-01' }));
assert.equal(comparisonIssue(current, previous), null);

assert.equal(reportChange(85, 80, { format: 'percent' }).label, '+5 điểm phần trăm');
assert.equal(reportChange(8.5, 8, { format: 'score' }).label, '+0,5 điểm');
assert.equal(reportChange(120, 100, {}).relative, '+20%');
assert.equal(reportChange(1, 0, {}).relative, 'Kỳ đối chiếu bằng 0; không tính %');
assert.equal(reportChange(0, 0, {}).label, 'Không đổi');
assert.equal(reportChange(null, 2, {}).difference, null);
assert.equal(reportChange(0, 10, {}).relative, '−100%');
assert.equal(metricDirection('incidents', 'rate'), 'down');
assert.equal(metricDirection('classes', 'available'), 'neutral');

const metrics: ReportMetric[] = [
  { id: 'count', label: 'Số lượng', mode: 'count' },
  { id: 'rate', label: 'Tỷ lệ', mode: 'ratio', field: 'affected', denominator: 'total', format: 'percent' },
  { id: 'score', label: 'Điểm', mode: 'average', field: 'score', format: 'score' }
];
const group = (key: string, count = 1, rate = 20): ReportGroup => ({ key, label: key, records: [], values: { count, rate, score: 8 } });
const categorical = alignComparisonRows([group('A')], [group('B')], metrics, current, previous, 'subject');
assert.equal(categorical.length, 2); // Preserve groups existing only in either period.
assert.equal(categorical[0].previous.count, 0);
assert.equal(categorical[0].previous.rate, null); // Missing denominator is never a zero rate.
assert.equal(categorical[1].current.score, null);
assert.equal(categorical[1].previousKey, 'B');
const daily = alignComparisonRows([group('2026-10-01'), group('2026-10-31')], [group('2026-09-01')], metrics, current, previous, 'day');
assert.equal(daily[0].currentKey, '2026-10-01');
assert.equal(daily[0].previousKey, '2026-09-01');
assert.equal(daily[30].previous.count, null); // No September 31: not an observed zero.
assert.equal(daily.length, 31);
assert.equal(daily[1].current.count, 0); // Keep empty days to maintain a true time axis.
assert.equal(daily[1].currentLabel, '02/10/2026');
const weekly = alignComparisonRows([group('2026-09-28')], [group('2026-08-31')], metrics, current, previous, 'week');
assert.equal(weekly[0].currentKey, '2026-09-28'); // Weeks starting before the selected boundary align to the first week.
assert.equal(weekly[0].previousKey, '2026-08-31');
const months = alignComparisonRows([group('2026-10')], [group('2026-09')], metrics, current, previous, 'period');
assert.equal(months.length, 1);
assert.equal(months[0].label, 'Tháng 1');

const dataset: ReportDataset = { id: 'test', label: 'Test', dateKind: 'event',
  records: [
    { id: 'oct1', date: '2026-10-01', subject: 'A', affected: 1, total: 1, score: 8 },
    { id: 'oct2', date: '2026-10-02', subject: 'A', affected: 1, total: 9, score: 6 },
    { id: 'sep', date: '2026-09-01', subject: 'A', affected: 1, total: 4, score: 9 },
    { id: 'other', date: '2026-09-02', subject: 'B', affected: 1, total: 1, score: 1 },
    { id: 'unknown', subject: 'A', affected: 1, total: 1, score: 0 }
  ], metrics, defaultMetricIds: metrics.map(metric => metric.id), dimensions: [{ id: 'subject', label: 'Môn' }], filters: [{ id: 'subject', label: 'Môn' }], detailFields: [] };
const config = { ...defaultReportConfig(dataset), datePreset: 'custom' as const, from: current.start, to: current.end, filters: { subject: 'A' } };
const currentResult = buildCustomReport(dataset, config);
const previousResult = buildCustomReport(dataset, { ...config, from: previous.start, to: previous.end });
assert.equal(currentResult.totals.rate, 20); // Weighted 2/10, not mean of per-record rates.
assert.equal(previousResult.totals.rate, 25);
assert.equal(previousResult.totals.count, 1); // Same category filter; undated source excluded.
assert.equal(reportChange(currentResult.totals.rate, previousResult.totals.rate, metrics[1]).label, '−5 điểm phần trăm');
assert.equal(currentResult.totals.score, 7);
const saved = normalizeReportConfig({ ...config, comparison: { enabled: true, mode: 'year', start: '', end: '' } }, [dataset]);
assert.equal(saved.comparison?.mode, 'year');
assert.equal(saved.comparison?.enabled, true);
const normalized = normalizeReportConfig({ ...config, comparison: { enabled: 'yes', mode: 'invalid', start: '2026-02-30', end: null } }, [dataset]);
assert.deepEqual(normalized.comparison, { enabled: false, mode: 'previous', start: '', end: '' });

const incidentDataset = operationalReportDatasets([
  { id: 'sept', date: '2026-09-01' }, { id: 'oct', date: '2026-10-01' }, { id: 'oct2', date: '2026-10-02' }
], [{ lessonId: 'sept' }, { lessonId: 'oct' }, { lessonId: 'oct' }], [], [], [])[0];
const incidentConfig = { ...defaultReportConfig(incidentDataset), datePreset: 'custom' as const, from: current.start, to: current.end };
const incidentNow = buildCustomReport(incidentDataset, incidentConfig);
const incidentBefore = buildCustomReport(incidentDataset, { ...incidentConfig, from: previous.start, to: previous.end });
assert.equal(incidentNow.totals.rate, 50);
assert.equal(incidentBefore.totals.rate, 100);
assert.equal(reportChange(incidentNow.totals.rate, incidentBefore.totals.rate, { format: 'percent' }).label, '−50 điểm phần trăm');

const csv = comparisonCsv([{ ...categorical[0], label: '=SUM(1,2)"' }], metrics, current, previous);
assert.ok(csv.startsWith('\uFEFF'));
assert.ok(csv.includes('01/10/2026'));
assert.ok(csv.includes('01/09/2026'));
assert.ok(csv.includes("\"'=SUM(1,2)\"\"\""));
assert.ok(!csv.includes('Infinity'));
console.log('PASS: report comparison ranges, overlap, leap years, temporal alignment, missing groups, weighted ratios, zero baselines, saved settings and CSV');
