import assert from 'node:assert/strict';
import {
  buildCustomReport, customReportCsv, defaultReportConfig, normalizeReportConfig, reportRange, reportToday,
  validReportDate, reportTemplateConfig, applyReportTemplate, type ReportDataset
} from '../src/lib/customReports';

const dataset: ReportDataset = {
  id: 'classes', label: 'Classes', dateKind: 'event',
  records: [
    { id: 'a', date: '2026-10-01', subject: 'Math', students: 1, capacity: 1, score: 9 },
    { id: 'b', date: '2026-10-02', subject: 'Math', students: 1, capacity: 9, score: 5 },
    { id: 'c', date: '2026-09-30', subject: 'English', students: 2, capacity: 3 },
    { id: 'd', date: '2026-10-03', subject: 'English', students: 0, capacity: 0, score: '' }
  ],
  metrics: [
    { id: 'count', label: 'Count', mode: 'count' },
    { id: 'occupancy', label: 'Occupancy', mode: 'ratio', field: 'students', denominator: 'capacity', format: 'percent' },
    { id: 'score', label: 'Score', mode: 'average', field: 'score', format: 'score' }
  ],
  defaultMetricIds: ['count', 'occupancy', 'score'], dimensions: [{ id: 'subject', label: 'Subject' }, { id: 'week', label: 'Week' }],
  filters: [{ id: 'subject', label: 'Subject' }], detailFields: []
};
const now = new Date('2026-10-11T10:00:00Z');
const config = defaultReportConfig(dataset);
const result = buildCustomReport(dataset, config, now);
assert.equal(result.records.length, 3);
assert.equal(result.totals.count, 3);
assert.equal(result.totals.occupancy, 20); // weighted ratio 2/10, not average of 100% and 11%.
assert.equal(result.totals.score, 7); // blank score must not count as zero.
assert.equal(result.rows.find(row => row.key === 'English')?.values.occupancy, null);
assert.equal(result.rows.reduce((sum, row) => sum + row.values.count!, 0), result.totals.count);
assert.equal(buildCustomReport(dataset, { ...config, filters: { subject: 'Math' } }, now).records.length, 2);
assert.equal(buildCustomReport(dataset, { ...config, groupBy: 'week' }, now).rows[0].key, '2026-09-28');
assert.equal(buildCustomReport(dataset, { ...config, datePreset: 'custom', from: '2026-10-11', to: '2026-10-01' }, now).invalidRange, true);
assert.equal(buildCustomReport(dataset, { ...config, datePreset: 'custom', from: '', to: '' }, now).invalidRange, true);
assert.equal(buildCustomReport(dataset, { ...config, datePreset: 'all' }, now).records.length, 4);
assert.deepEqual(reportRange({ ...config, datePreset: 'previous_month' }, new Date('2024-03-10T00:00:00Z')), { from: '2024-02-01', to: '2024-02-29' });
assert.deepEqual(reportRange({ ...config, datePreset: 'last_30_days' }, now), { from: '2026-09-12', to: '2026-10-11' });
assert.equal(reportToday(new Date('2026-10-10T18:00:00Z')), '2026-10-11');
assert.equal(validReportDate('2026-02-30'), false);
const periods: ReportDataset = { ...dataset, dateKind: 'period', records: [{ date: '2026-09-29', dateTo: '2026-10-05', subject: 'Math' }] };
assert.equal(buildCustomReport(periods, config, now).records.length, 1);
const snapshot = { ...dataset, dateKind: 'snapshot' as const };
assert.equal(buildCustomReport(snapshot, { ...config, datePreset: 'custom', from: '', to: '' }, now).records.length, 4);
const sanitized = normalizeReportConfig({ datasetId: 'classes', metricIds: ['fake', 'count', 'count'], groupBy: 'fake', filters: { unknown: 'value', subject: 'Math' }, sort: 'fake' }, [dataset]);
assert.deepEqual(sanitized.metricIds, ['count']);
assert.equal(sanitized.groupBy, 'subject');
assert.deepEqual(sanitized.filters, { subject: 'Math' });
assert.equal(normalizeReportConfig(null, [dataset]).datasetId, 'classes');
const csv = customReportCsv([{ ...result.rows[0], label: '=SUM(1,2)"test' }], result.metrics, 'Group');
assert.ok(csv.startsWith('\uFEFF'));
assert.ok(csv.includes("\"'=SUM(1,2)\"\"test\""));
assert.ok(csv.includes('\r\n'));
console.log('Passed: custom report ranges, weighted ratios, averages, grouping, filters, snapshots, normalization and CSV escaping.');

const run = {...defaultReportConfig(dataset), datePreset: 'custom' as const, from: '2026-10-01', to: '2026-10-31', comparison: {enabled:true, mode:'custom' as const, start:'2025-10-01',end:'2025-10-31'}};
const legacy = {...run, from:'2020-01-01',to:'2020-01-31',selection:{by:'subject',key:'Math'},filters:{subject:'Math'}};
const template = reportTemplateConfig(legacy);
for(const key of ['datePreset','from','to','comparison','selection'])assert.ok(!(key in template));
const opened = applyReportTemplate(legacy,[dataset],run);
assert.equal(opened.from,run.from);assert.equal(opened.to,run.to);assert.equal(opened.datePreset,run.datePreset);
assert.deepEqual(opened.comparison,run.comparison);assert.deepEqual(opened.filters,{subject:'Math'});assert.equal(opened.selection,undefined);
assert.deepEqual(reportTemplateConfig({...opened,from:'2030-01-01'}),reportTemplateConfig(opened));
console.log('Passed: reusable report templates omit run dates and comparisons, ignore legacy dates and preserve current period.');
