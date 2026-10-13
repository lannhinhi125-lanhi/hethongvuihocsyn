import assert from 'node:assert/strict';
import { hasSessionStartPassed, minutesEndedEarly, monitoringStudyStatus } from '../src/lib/sessionAlerts';

const now = new Date(2026, 9, 12, 12, 50);
assert.equal(hasSessionStartPassed('2026-10-12', '12:50 - 13:50', now), true);
assert.equal(hasSessionStartPassed('2026-10-12', '12:51 - 13:51', now), false);
assert.equal(hasSessionStartPassed('2026-10-13', '09:00 - 10:00', now), false);
assert.equal(hasSessionStartPassed('2026-10-11', '18:00 - 19:00', now), true);
assert.equal(hasSessionStartPassed('2026-10-12', '12:50 - 13:50', now, '12:45'), false);

assert.equal(minutesEndedEarly('2026-10-12', '18:00 - 19:30', '2026-10-12T18:45:00+07:00'), 45);
assert.equal(minutesEndedEarly('2026-10-12', '18:00 - 19:30', '2026-10-12T19:30:00+07:00'), 0);
assert.equal(minutesEndedEarly('2026-10-12', '18:00 - 19:30', '2026-10-12T19:35:00+07:00'), 0);
assert.equal(minutesEndedEarly('2026-10-12', '18:00 - 19:30'), 0);
assert.equal(minutesEndedEarly('2026-10-12', 'invalid', 'invalid'), 0);
assert.equal(minutesEndedEarly('2026-10-12', '23:00 - 00:30', '2026-10-12T23:45:00+07:00'), 45);

const study = (time: string) => monitoringStudyStatus('2026-10-12', '12:50 - 13:50', new Date('2026-10-12T' + time + ':00+07:00'));
assert.equal(study('12:49'), 'CHUA_HOC');
assert.equal(study('12:50'), 'DANG_HOC');
assert.equal(study('13:49'), 'DANG_HOC');
assert.equal(study('13:50'), 'DA_HOC');
assert.equal(monitoringStudyStatus('2026-10-12', '23:00 - 00:30', new Date('2026-10-13T00:15:00+07:00')), 'DANG_HOC');
assert.equal(monitoringStudyStatus('2026-10-12', '12:50 - 13:50', new Date('2026-10-12T14:00:00+07:00'), '12:45'), 'CHUA_HOC');
