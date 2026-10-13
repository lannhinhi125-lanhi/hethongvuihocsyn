import { strict as assert } from 'node:assert';
import test from 'node:test';
import { inspectionReportRows } from '../src/lib/inspectionReport';

test('inspection summary uses saved evaluation rows and applies evaluation dates', () => {
  const teachers = [{
    id: 'GV-1', name: 'Cô Mai', subject: 'SUB-MATH',
    evaluationReports: [{ teacherId: 'GV-1', evaluationDate: '01/10/2026', overallScore: 4 }]
  }];
  const evaluations = [
    { teacherId: 'GV-1', evaluationDate: '2026-10-13', overallScore: 9, recommendations: 'Tiếp tục' },
    { teacherId: 'GV-1', evaluationDate: '2026-10-14', overallScore: 7 }
  ];
  const lessons = [{ primaryTeacherId: 'GV-1', status: 'HOAN_THANH', startsAt: '2026-10-14T01:00:00Z', checkinAt: '2026-10-14T00:59:00Z' }];
  const [october14] = inspectionReportRows(teachers, evaluations, lessons, { start: '2026-10-14', end: '2026-10-14' });
  assert.equal(october14.total, 1);
  assert.equal(october14.avg, 7);
  assert.equal(october14.punctuality, '100%');
  const [all] = inspectionReportRows(teachers, evaluations, lessons);
  assert.equal(all.total, 2);
  assert.equal(all.avg, 8);
  assert.equal(all.plan, '');
});
