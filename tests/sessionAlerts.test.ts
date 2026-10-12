import assert from 'node:assert/strict';
import { hasSessionStartPassed, minutesEndedEarly } from '../src/lib/sessionAlerts';

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
