import assert from 'node:assert/strict';
import { orderRecords, recordSortTime } from '../src/lib/listOrder';
import { buildCustomReport, defaultReportConfig, normalizeReportConfig, type ReportDataset } from '../src/lib/customReports';

const records = [
  {id: 'unknown'},
  {id: 'old', created_at: '2026-01-01T00:00:00Z'},
  {id: 'new', created_at: '2026-11-01T00:00:00Z'},
  {id: 'equal', created_at: '2026-11-01T00:00:00Z'},
  {id: 'invalid', created_at: 'invalid'},
];
assert.deepEqual(orderRecords(records, 'newest', recordSortTime).map(row => row.id), ['new', 'equal', 'old', 'unknown', 'invalid']);
assert.deepEqual(orderRecords(records, 'oldest', recordSortTime).map(row => row.id), ['old', 'new', 'equal', 'unknown', 'invalid']);
assert.deepEqual(orderRecords(records, 'default', recordSortTime), records);
assert.equal(records[0].id, 'unknown');
assert.equal(recordSortTime({created_at: '2026-10-01', startDate: '2026-11-01'}), Date.parse('2026-10-01'));
assert.equal(recordSortTime({dateStr: '02/11/2026'}), Date.parse('2026-11-02'));
assert.equal(recordSortTime({lesson: {date: '2026-11-02'}}), Date.parse('2026-11-02'));
assert.equal(recordSortTime({sessions: [{date: '2026-01-01'}, {date: '2026-11-02'}]}), Date.parse('2026-11-02'));

const dataset: ReportDataset = {
  id: 'demo', label: 'Demo', dateKind: 'event', records: [
    {id: 'a', date: '2026-01-01', subject: 'A'},
    {id: 'b', date: '2026-11-02', subject: 'B'},
  ], metrics: [{id: 'count', label: 'Count', mode: 'count'}], defaultMetricIds: ['count'],
  dimensions: [{id: 'subject', label: 'Subject'}], filters: [], detailFields: [],
};
for (const sort of ['newest', 'oldest'] as const) {
  const config = normalizeReportConfig({...defaultReportConfig(dataset), datePreset: 'all', groupBy: 'subject', sort}, [dataset]);
  assert.equal(config.sort, sort);
  assert.deepEqual(buildCustomReport(dataset, config).rows.map(row => row.key), sort === 'newest' ? ['B', 'A'] : ['A', 'B']);
}
console.log('List ordering checks passed.');
