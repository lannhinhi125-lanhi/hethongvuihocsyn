import React from 'react';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ComparisonControls, ComparisonResults } from '../src/components/ReportComparison';
import { ClassReportDetail } from '../src/components/ClassReportDetail';
import type { ReportMetric } from '../src/lib/customReports';

const metric: ReportMetric = { id: 'rate', label: 'Tỷ lệ sự cố', mode: 'ratio', format: 'percent' };
const currentRange = { start: '2026-10-01', end: '2026-10-31' };
const previousRange = { start: '2026-09-01', end: '2026-09-30' };
const props = { metrics: [metric], totals: { rate: 25 }, previousTotals: { rate: 10 }, currentRange, previousRange, datasetId: 'incidents' };
const html = renderToStaticMarkup(<ComparisonResults {...props} rows={[
  { key: 'A', label: 'Lớp <A>', current: { rate: 25 }, previous: { rate: 10 }, currentKey: 'A', previousKey: 'A' }
]} onSelect={() => {}} onExport={() => {}} canExport={false} />);
assert.ok(html.includes('+15 điểm phần trăm'));
assert.ok(html.includes('text-rose-700')); // Increased incident rate is adverse.
assert.ok(html.includes('Lớp &lt;A&gt;')); // Labels are escaped in chart/table.
assert.ok(html.includes('Xuất so sánh CSV'));
assert.ok(html.includes('disabled=""')); // Export remains permission-gated.
assert.ok(html.includes('So sánh Tỷ lệ sự cố giữa hai kỳ'));
assert.ok(!html.includes('NaN'));
assert.ok(!html.includes('Infinity'));
const improvement = renderToStaticMarkup(<ComparisonResults {...props} totals={{ rate: 0 }} previousTotals={{ rate: 10 }} rows={[]} />);
assert.ok(improvement.includes('text-emerald-700'));
assert.ok(improvement.includes('Không có nhóm phù hợp'));
const unavailable = renderToStaticMarkup(<ComparisonResults {...props} totals={{ rate: null }} previousTotals={{ rate: null }} rows={[
  { key: 'empty', label: 'Không đủ dữ liệu', current: { rate: null }, previous: { rate: null } }
]} />);
assert.ok(unavailable.includes('Chưa đủ dữ liệu'));
assert.ok(!unavailable.includes('NaN'));
const controls = renderToStaticMarkup(<ComparisonControls current={currentRange} settings={{ enabled: true, mode: 'previous', start: '', end: '' }} onChange={() => {}} />);
assert.ok(controls.includes('31 và 30 ngày'));
const snapshot = renderToStaticMarkup(<ComparisonControls current={currentRange} settings={{ enabled: true, mode: 'previous', start: '', end: '' }} disabled onChange={() => {}} />);
assert.ok(snapshot.includes('chưa có lịch sử'));
assert.ok(snapshot.includes('disabled=""'));
const detail = renderToStaticMarkup(<ClassReportDetail record={{ name: 'Lớp A', code: 'A01', date: '2026-10-01', subject: 'Toán', grade: 'Khối 1', model: '1 kèm 1', students: '1 / 1 HS', status: 'Đã đủ trần', label: 'Lớp mới tăng trưởng', newStudents: 1, oldStudents: 0, unknownStudents: 0 }} onClose={() => {}} />);
assert.ok(detail.includes('Mô hình'));
assert.ok(detail.includes('Học sinh mới trong kỳ'));
assert.ok(detail.includes('aria-labelledby="class-report-detail-title"'));
console.log('PASS: comparison markup, adverse changes, missing values, permission-gated CSV and class details');
