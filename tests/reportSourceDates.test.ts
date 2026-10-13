import { strict as assert } from 'node:assert';
import test from 'node:test';
import { reportCreationDate } from '../src/lib/reportCreationDate';
import { incidentReportPeriods } from '../src/lib/incidentReportPeriods';

test('creation reports use the Bangkok calendar date of a saved timestamp', () => {
  assert.equal(reportCreationDate('2026-10-13T18:30:00Z'), '2026-10-14');
  assert.equal(reportCreationDate('2026-10-13'), '2026-10-13');
  assert.equal(reportCreationDate(undefined), '');
});

test('incident reports count affected lessons from incident records within the selected dates', () => {
  const lessons = [
    { id: 'A', date: '2026-10-13' },
    { id: 'B', date: '2026-10-14' }
  ];
  const incidents = [
    { lessonId: 'A', incidentName: 'Nghỉ học', urgency: 'EMERGENCY', reportedAt: '2026-10-13T18:30:00Z' },
    { lessonId: 'A', incidentName: 'Nghỉ học', urgency: 'ADVANCED', reportedAt: '2026-10-13T19:00:00Z' }
  ];
  const [period] = incidentReportPeriods(lessons, incidents, { start: '2026-10-14', end: '2026-10-14' });
  assert.equal(period.total, 1);
  assert.equal(period.incidents, 1);
  assert.equal(period.urgent, 1);
  assert.equal(period.notice, 0);
  assert.equal(period.main, 'Nghỉ học');
  assert.equal(incidentReportPeriods(lessons, incidents, { start: '2026-10-13', end: '2026-10-13' })[0].incidents, 0);
});
