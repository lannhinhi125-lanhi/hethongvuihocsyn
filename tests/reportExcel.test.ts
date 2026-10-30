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
const info={ title: 'Báo cáo kiểm chứng', organization: 'VUIHOC', author: 'Người lập', date: '2026-10-18', updatedAt: '2026-10-18', remarks: '', recommendations: '', appendix: false };
const workbook = reportExcelData([section], info);
assert.equal(workbook.sheets.length, 8);
assert.deepEqual(workbook.sheets[1].rows[1], ['TỔNG', 2, 1, 50]);
assert.equal(workbook.sheets[0].name,'Tổng quan');
assert.ok(workbook.sheets[0].rows.some(row=>JSON.stringify(row)===JSON.stringify(['Tỷ lệ (%)',50,0,50])));
assert.ok(workbook.sheets[0].rows.some(row=>row[0]==='Số bản ghi nguồn'&&row[1]===2));
assert.equal(workbook.sheets[2].rows.length-workbook.sheets[2].headerRow!-1, 2);
assert.deepEqual(workbook.sheets[2].rows[workbook.sheets[2].headerRow!],['Mã buổi','Ngày','Tên','Tổng buổi','Buổi sự cố']);
assert.ok(workbook.sheets[2].rows.some(row=>row[0]==='Người kết xuất'&&row[1]==='Người lập'));
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
assert.ok(entries.get('xl/worksheets/sheet3.xml')!.includes('ySplit="11" topLeftCell="A12"'));
assert.ok(entries.get('xl/worksheets/sheet3.xml')!.includes('<autoFilter ref="A11:E13"/>'));
assert.ok(entries.get('xl/worksheets/sheet3.xml')!.includes('<mergeCell ref="A1:E1"/>'));
assert.ok(!entries.get('xl/worksheets/sheet1.xml')!.includes('<autoFilter'));
assert.ok(entries.get('xl/styles.xml')!.includes('Times New Roman'));
const styles=entries.get('xl/styles.xml')!;
assert.ok(styles.includes('<borders count="2">'));
for(const edge of ['left','right','top','bottom'])assert.ok(styles.includes(`<${edge} style="thin"><color rgb="FFCBD5E1"/>`));
const cellStyles=styles.match(/<cellXfs[^>]*>(.*?)<\/cellXfs>/)![1].match(/<xf\b[^>]*>/g)!;
for(const index of [0,1,3,4,5])assert.ok(cellStyles[index].includes('borderId="1" applyBorder="1"'));
assert.ok(cellStyles[2].includes('borderId="0"'),'report titles remain unboxed');
const blankCells=Buffer.from(reportExcelBytes({filename:'borders.xlsx',sheets:[{name:'Borders',rows:[['Label','Value'],['Missing',null],['Short row']]}]})).toString('utf8');
assert.ok(blankCells.includes('<c r="B2" s="0"/>'),'missing data keeps borders without becoming zero');
assert.ok(blankCells.includes('<c r="B3" s="0"/>'),'short rows keep continuous borders');
assert.ok(entries.get('xl/worksheets/sheet3.xml')!.includes('<c r="E3" s="0"/>'),'merged metadata has a styled right edge');
assert.match(entries.get('xl/worksheets/sheet3.xml')!, /<row r="10"[^>]*><\/row>/,'spacer rows stay unboxed');
// Overview totals come from source aggregation, including overlapping groups and unavailable ratios.
const overlapping={...section,result:{...section.result,totals:{total:2,incidents:1,rate:50},rows:[...section.result.rows,...section.result.rows]},dataset:{...dataset,nonAdditiveGroups:['subject']}};
const overview=reportExcelData([overlapping],{...info,exportedBy:'Người xuất thực tế',exportedAt:'09:00 22/10/2026'}).sheets[0];
assert.ok(overview.rows.some(row=>JSON.stringify(row)===JSON.stringify(['Buổi sự cố',1,0,1])));
assert.ok(overview.rows.some(row=>row[0]==='Lưu ý tổng hợp'));
assert.ok(overview.rows.some(row=>row[0]==='Người kết xuất'&&row[1]==='Người xuất thực tế'));
const empty={...section,result:{...section.result,records:[],rows:[],totals:{total:0,incidents:0,rate:null}},previous:null};
const emptyBook=reportExcelData([empty],info);
assert.ok(emptyBook.sheets[0].rows.some(row=>row[0]==='Tỷ lệ (%)'&&row[1]===null));
assert.equal(emptyBook.sheets[2].rows.length,12-1);
const scheduled={...section,result:{...section.result,records:[{id:'holiday',date:'2026-10-01',__selectedEvents:JSON.stringify([{catalogOnly:true,incidentCode:'HOLIDAY',incidentName:'Nghỉ lễ'}])}]},previous:null};
assert.equal(reportExcelData([scheduled],info).sheets[3].rows.length,1,'scheduled breaks must not become incident minutes in Excel');
if (process.env.REPORT_EXCEL_TEST_PATH) writeFileSync(process.env.REPORT_EXCEL_TEST_PATH, bytes);
console.log('PASS: Excel snapshot matches report filters, totals, comparisons, source/event evidence; ZIP checksums and literal cells');
