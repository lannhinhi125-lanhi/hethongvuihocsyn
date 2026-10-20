import assert from 'node:assert/strict';
import test from 'node:test';
import {parseCsv,roomLinkUpdates,readRoomLinkFile} from '../src/lib/roomLinkImport';
import {availabilityWeeks} from '../src/lib/availabilityCalendar';
import {getPayrollMonthOptions} from '../src/lib/payrollPeriods';
import {monitoringSubjectCode} from '../src/lib/monitoringSubjects';

test('room import reads real CSV with BOM, quoted commas, escaped quotes and multiline cells', async () => {
  const csv='\uFEFFSTT,Mã lớp,Tên lớp,Link Phòng Học\r\n1,C1,"Lớp ""A"",\nnhóm",https://room.example/real\r\n2,C2,Lớp hai,\r\n';
  const rows=parseCsv(csv);
  assert.equal(rows[1][2],'Lớp "A",\nnhóm');
  assert.deepEqual(await readRoomLinkFile(new File([csv],'rooms.csv'),[{code:'C1'},{code:'C2'}]),[{classCode:'C1',roomLink:'https://room.example/real'}]);
});

test('room import rejects unknown classes, duplicate rows and invalid links before saving', () => {
  const header=['Mã lớp','Link phòng học'];
  assert.throws(()=>roomLinkUpdates([header,['unknown','https://room.example']],[{code:'C1'}]),/không tồn tại/);
  assert.throws(()=>roomLinkUpdates([header,['C1','javascript:alert(1)']],[{code:'C1'}]),/HTTP/);
  assert.throws(()=>roomLinkUpdates([header,['C1','https://a.example'],['C1','https://b.example']],[{code:'C1'}]),/bị trùng/);
  assert.throws(()=>parseCsv('Mã lớp,Link phòng\nC1,"broken'),/thiếu/);
});

test('availability weeks are calendar-derived across leap years and year boundaries', () => {
  const weeks=availabilityWeeks('2028-02');
  assert.equal(weeks[0].from,'2028-01-31');
  assert.equal(weeks.at(-1)?.to,'2028-03-05');
  assert.equal(availabilityWeeks('2027-01')[0].from,'2026-12-28');
});

test('historical payroll periods remain selectable from server records and lessons', () => {
  const options=getPayrollMonthOptions(new Date('2026-10-21T12:00:00'),['2024-01','2024-01','2027-02','invalid','2026-13']);
  assert.deepEqual(options.map(row=>row.value),['2027-02','2026-10','2026-09','2024-01']);
});

test('monitoring preserves arbitrary catalog subject codes without falling back to Toán', () => {
  assert.equal(monitoringSubjectCode({classCode:'none',subject:'MUSIC'},[]),'MUSIC');
});
