import React from 'react';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppProvider } from '../src/context/AppContext';
import { CustomReportBuilder } from '../src/components/CustomReportBuilder';
import { ReportComposer } from '../src/components/ReportComposer';
import { operationalReportDatasets } from '../src/lib/operationalReportDatasets';
import type { ReportDataset } from '../src/lib/customReports';

// The application uses browser stores; static rendering reads their existing snapshots without subscribing or running effects.
const runtime = React as unknown as { useSyncExternalStore: typeof React.useSyncExternalStore };
const original = runtime.useSyncExternalStore;
runtime.useSyncExternalStore = (_subscribe, getSnapshot) => getSnapshot();
try {
  const operational = operationalReportDatasets([{ id: 'B1', displayCode: 'BH-01', date: '2026-10-01', classId: 'C1', timeSlotId: 'K1' }],
    [{ lessonId: 'B1', incidentName: 'Mất mạng' }], [], [], [{ id: 'C1', name: 'Lớp A', subject: 'M', model: '1-1', grade: 'Khối 1' }],
    { subjects: [{ code: 'M', name: 'Toán' }], models: [{ code: '1-1', name: 'Một kèm một' }], timeSlots: [{ id: 'K1', timeRange: '18:00 - 19:00' }] });
  const html = renderToStaticMarkup(<AppProvider><CustomReportBuilder datasets={[operational[0]]} mode="detail" /></AppProvider>);
  assert.ok(html.includes('Chọn báo cáo chi tiết'));
  assert.ok(html.includes('Cách nhóm báo cáo chi tiết'));
  assert.ok(html.includes('Lọc môn học'));
  assert.ok(html.includes('Lọc mô hình'));
  assert.ok(html.includes('Lọc khung giờ'));
  assert.ok(html.includes('Lọc loại sự cố'));
  assert.ok(html.includes('Tỷ lệ buổi có sự cố'));
  assert.ok(!html.includes('Tạo báo cáo mới')); // Detail reports need no report-building wizard.
  assert.ok(html.includes('So sánh hai kỳ'));
  assert.ok(!html.includes('NaN'));
  const custom = renderToStaticMarkup(<AppProvider><CustomReportBuilder datasets={operational} /></AppProvider>);
  assert.ok(custom.includes('Dữ liệu báo cáo tùy chỉnh'));
  assert.ok(custom.includes('Tùy chỉnh thêm chỉ số'));
  assert.ok(custom.includes('Sự cố theo mô hình'));
  assert.ok(custom.includes('Sự cố theo khung giờ'));
  assert.ok(custom.includes('Ca dạy theo giáo viên'));
  const handoff = renderToStaticMarkup(<AppProvider><CustomReportBuilder datasets={operational} onCompose={() => {}} /></AppProvider>);
  assert.ok(handoff.includes('Lập báo cáo từ kết quả này'));
  const composer = renderToStaticMarkup(<AppProvider><ReportComposer datasets={operational} request={null} updatedAt={Date.now()} /></AppProvider>);
  assert.ok(composer.includes('Mẫu tài liệu báo cáo'));
  assert.ok(composer.includes('Tổng hợp vận hành'));
  assert.ok(composer.includes('Nhận xét'));
  assert.ok(composer.includes('Kiến nghị'));
  assert.ok(composer.includes('In / Lưu PDF'));
  assert.ok(composer.includes('Kèm phụ lục'));
  assert.ok(composer.includes('Số báo cáo'));
  assert.ok(composer.includes('Phạm vi phát hành'));
  assert.ok(composer.includes('Báo cáo nội bộ'));
  assert.ok(composer.includes('Phạm vi số liệu'));
  assert.ok(composer.includes('Địa chỉ đơn vị'));
  assert.ok(composer.includes('Họ tên người duyệt'));
  assert.ok(composer.includes('Chức danh người duyệt'));
  assert.ok(composer.includes('disabled=""')); // No printing before preview or without export permission.
  const classes: ReportDataset = { id: 'classes', label: 'Lớp học', dateKind: 'event',
    records: [{ id: 'L01', name: 'Lớp A', subject: 'Toán', grade: 'Khối 1', date: '2026-10-01', model: 'Một kèm một', enrolled: 1, capacity: 1, growthKind: 'Lớp mới tăng trưởng' }],
    metrics: [{ id: 'count', label: 'Số lớp', mode: 'count' }], defaultMetricIds: ['count'], dimensions: [{ id: 'subject', label: 'Môn học' }], filters: [], detailFields: [] };
  const compact = renderToStaticMarkup(<AppProvider><CustomReportBuilder datasets={[classes]} mode="detail" /></AppProvider>);
  assert.ok(compact.includes('Môn / Khối'));
  assert.ok(compact.includes('Chi tiết'));
  assert.ok(!compact.includes('SĨ SỐ / TRẦN'));
  assert.ok(!compact.includes('NGÀY TẠO MÃ'));
  console.log('PASS: report workspace static rendering, visible incident filters, compact class table and custom controls');
} finally {
  runtime.useSyncExternalStore = original;
}
