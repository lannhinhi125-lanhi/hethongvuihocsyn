import assert from 'node:assert/strict';
import { crc32 } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { prepareDocumentSection } from '../src/lib/reportDocument';
import { defaultReportConfig, type ReportDataset } from '../src/lib/customReports';
import { reportExcelData, reportExcelBytes } from '../src/lib/reportExcel';

const dataset: ReportDataset = { id: 'incidents', label: 'Sự cố', dateKind: 'event',
  records: [
    { id: 'L1', date: '2026-10-01', subject: 'M', name: '=1+1 & <text>', total: 1, incidents: 1, privatePassword: 'never-export', __selectedEvents: JSON.stringify([{ incidentCode: 'NET', categoryId: 'tech', incidentName: 'Mất mạng' }]) },
    { id: 'L2', date: '2026-10-02', subject: 'M', name: 'Buổi 2', total: 1, incidents: 0 },
    { id: 'excluded', date: '2026-10-02', subject: 'E', total: 1, incidents: 1 },
    { id: 'previous', date: '2026-09-01', subject: 'M', total: 1, incidents: 0 }
  ], metrics: [{ id: 'total', label: 'Tổng buổi', mode: 'sum', field: 'total' }, { id: 'incidents', label: 'Buổi sự cố', mode: 'sum', field: 'incidents' }, { id: 'rate', label: 'Tỷ lệ', mode: 'ratio', field: 'incidents', denominator: 'total', format: 'percent' }],
  defaultMetricIds: ['total', 'incidents', 'rate'], dimensions: [{ id: 'subject', label: 'Môn', choices: [{ value: 'M', label: 'Toán' }] }], filters: [{ id: 'subject', label: 'Môn', choices: [{ value: 'M', label: 'Toán' }] }], detailFields: [{ id: 'id', label: 'Mã buổi' }, { id: 'date', label: 'Ngày' }, { id: 'name', label: 'Tên' }]
};
const section = prepareDocumentSection(dataset, { ...defaultReportConfig(dataset), datePreset: 'custom', from: '2026-10-01', to: '2026-10-31', filters: { subject: ['M'] } }, { enabled: true, mode: 'custom', start: '2026-09-01', end: '2026-09-30' });
const workbook = reportExcelData([section], { title: 'Báo cáo kiểm chứng', organization: 'VUIHOC', author: 'Người lập', date: '2026-10-18', updatedAt: '2026-10-18', remarks: '', recommendations: '', appendix: false });
assert.equal(workbook.sheets.length, 8);
assert.deepEqual(workbook.sheets[1].rows[1], ['TỔNG', 2, 1, 50]);
assert.equal(workbook.sheets[2].rows.length, 3);
assert.equal(workbook.sheets[3].rows.length, 2);
assert.ok(JSON.stringify(workbook).includes('Môn: Toán'));
assert.ok(!JSON.stringify(workbook).includes('never-export'));
assert.ok(!JSON.stringify(workbook).includes('excluded'));
assert.deepEqual(workbook.sheets[7].rows[1], ['Toán', 2, 1, 1, 1, 0, 1, 50, 0, 50]);
const snapshot = JSON.stringify(workbook);
dataset.records[0].name = 'changed after preview';
assert.equal(JSON.stringify(workbook), snapshot);
const bytes = reportExcelBytes(workbook), buf = Buffer.from(bytes);
let offset = 0, count = 0; const entries = new Map<string, string>();
while (buf.readUInt32LE(offset) === 0x04034b50) {
  const size = buf.readUInt32LE(offset + 18), nameLength = buf.readUInt16LE(offset + 26), start = offset + 30 + nameLength;
  const name = buf.subarray(offset + 30, start).toString('utf8');
  const body = buf.subarray(start, start + size);
  assert.equal(crc32(body), buf.readUInt32LE(offset + 14));
  entries.set(name, body.toString('utf8')); count++; offset = start + size;
}
assert.equal(buf.readUInt32LE(offset), 0x02014b50);
assert.equal(buf.readUInt32LE(buf.length - 22), 0x06054b50);
assert.equal(buf.readUInt16LE(buf.length - 14), count);
assert.equal(entries.size, 13);
assert.ok(entries.get('xl/worksheets/sheet3.xml')!.includes('=1+1 &amp; &lt;text&gt;'));
assert.ok(![...entries.values()].some(xml => xml.includes('<f>')));
assert.ok(entries.get('xl/worksheets/sheet2.xml')!.includes('<v>50</v>'));
assert.ok(entries.get('xl/worksheets/sheet3.xml')!.includes('state="frozen"'));
if (process.env.REPORT_EXCEL_TEST_PATH) writeFileSync(process.env.REPORT_EXCEL_TEST_PATH, bytes);
console.log('PASS: Excel snapshot matches report filters, totals, comparisons, source/event evidence; ZIP checksums and literal cells');
