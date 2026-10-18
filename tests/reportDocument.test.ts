import assert from 'node:assert/strict';
import { buildReportDocument, prepareDocumentSection, type ReportDocumentOptions } from '../src/lib/reportDocument';
import { defaultReportConfig, type ReportDataset } from '../src/lib/customReports';

const dataset: ReportDataset = { id: 'incidents', label: 'Sự cố', dateKind: 'event',
  records: [...Array.from({ length: 25 }, (_, index) => ({ id: `R${index}`, date: '2026-10-01', subject: `Nhóm ${index}`, total: 1, affected: index % 2,
    name: '<script>unsafe</script>', extra1: 'Thông tin 1', extra2: 'Thông tin 2', extra3: 'Thông tin 3', extra4: 'Thông tin 4', extra5: 'Trường cuối cùng' })),
    { id: 'before', date: '2025-10-01', subject: 'Nhóm 0', total: 1, affected: 1 }],
  metrics: [{ id: 'total', label: 'Buổi học', mode: 'sum', field: 'total' }, { id: 'incidents', label: 'Buổi có sự cố', mode: 'sum', field: 'affected' },
    { id: 'rate', label: 'Tỷ lệ', mode: 'ratio', field: 'affected', denominator: 'total', format: 'percent' }],
  defaultMetricIds: ['total', 'incidents', 'rate'], dimensions: [{ id: 'subject', label: 'Môn học' }], filters: [{ id: 'subject', label: 'Môn học' }],
  detailFields: ['id', 'date', 'name', 'extra1', 'extra2', 'extra3', 'extra4', 'extra5'].map(id => ({ id, label: id })) };
const config = { ...defaultReportConfig(dataset), datePreset: 'custom' as const, from: '2026-10-01', to: '2026-10-31' };
const options: ReportDocumentOptions = { title: '<img src=x onerror=alert(1)>', organization: 'Đơn vị A', author: 'Người lập', date: '2026-10-18', updatedAt: '18/10/2026', remarks: 'Nhận xét dòng 1\nDòng 2', recommendations: 'Kiến nghị', appendix: true };
const section = prepareDocumentSection(dataset, config);
const html = buildReportDocument([section], options);
assert.ok(html.includes('Nhóm 24')); // Full group table, not the chart's eight-row subset or current UI page.
assert.ok(html.includes('R24')); // Full source appendix, not its UI page.
assert.ok(html.includes('Trường cuối cùng')); // Wide appendices are split into panels without dropping fields.
assert.ok(html.includes('&lt;script&gt;unsafe&lt;/script&gt;'));
assert.ok(!html.includes('<script>'));
assert.ok(!html.includes('<img src=x'));
assert.ok(html.includes('size:A4'));
assert.ok(html.includes('counter(page)'));
assert.ok(html.includes('table-header-group'));
assert.ok(html.includes('NGƯỜI LẬP BÁO CÁO'));
const formal = buildReportDocument([section], { ...options, title: 'Báo cáo tháng', address: '12 Nguyễn Trãi, Hà Nội', reportNumber: '01/2026/BC-VH',
  reportType: 'Tổng hợp vận hành', circulation: 'internal', location: 'Hà Nội', recipients: 'Ban giám đốc', authorRole: 'Chuyên viên vận hành',
  approvalEnabled: true, approverRole: 'Giám đốc', approverName: 'Nguyễn Văn A' });
assert.ok(formal.includes('Địa chỉ: 12 Nguyễn Trãi, Hà Nội'));
assert.ok(formal.includes('Số: 01/2026/BC-VH'));
assert.ok(formal.includes('BÁO CÁO NỘI BỘ'));
assert.ok(formal.includes('Hà Nội, Ngày 18 tháng 10 năm 2026'));
assert.ok(formal.includes('Loại báo cáo'));
assert.ok(formal.includes('Tổng hợp vận hành'));
assert.ok(formal.includes('Tất cả bản ghi được phép truy cập trong kỳ'));
assert.ok(formal.includes('Ban giám đốc'));
assert.ok(formal.includes('Chuyên viên vận hành'));
assert.ok(formal.includes('GIÁM ĐỐC'));
assert.ok(formal.includes('Nguyễn Văn A'));
const external = buildReportDocument([section], { ...options, circulation: 'external', approvalEnabled: false, approverName: 'Không hiện người này', address: '<script>bad</script>', reportNumber: '<img src=x>', location: '<svg onload=alert(1)>' });
assert.ok(external.includes('BÁO CÁO GỬI BÊN NGOÀI'));
assert.ok(!external.includes('Không hiện người này'));
assert.ok(external.includes('&lt;script&gt;bad&lt;/script&gt;'));
assert.ok(!external.includes('<img src=x>'));
assert.ok(!external.includes('<svg onload='));
assert.ok(html.includes('Chưa cấp số')); // Never fabricate an issued report number.
assert.ok(html.includes('<p>Nhận xét dòng 1</p><p>Dòng 2</p>'));
assert.ok(!buildReportDocument([section], { ...options, appendix: false }).includes('Phụ lục 1:'));
const filtered = prepareDocumentSection(dataset, { ...config, filters: { subject: 'Nhóm 0' } }, { enabled: true, mode: 'year', start: '', end: '' });
assert.equal(filtered.result.totals.total, 1);
assert.equal(filtered.previous?.totals.total, 1);
const comparison = buildReportDocument([filtered], options);
assert.ok(comparison.includes('01/10/2025'));
assert.ok(comparison.includes('Môn học: Nhóm 0'));
assert.ok(comparison.includes('Theo bộ lọc, ghi rõ tại từng nội dung'));
assert.ok(comparison.includes('−100 điểm phần trăm'));
assert.ok(comparison.includes('Kỳ đối chiếu'));
assert.throws(() => prepareDocumentSection(dataset, { ...config, to: '2026-09-01' }), /chưa hợp lệ/);
assert.throws(() => prepareDocumentSection(dataset, config, { enabled: true, mode: 'custom', start: config.from, end: config.to }), /trùng ngày/);
assert.throws(() => buildReportDocument([], options), /ít nhất một/);
console.log('PASS: printable report scopes, comparisons, full tables/appendices, escaping, A4 print rules and invalid ranges');
