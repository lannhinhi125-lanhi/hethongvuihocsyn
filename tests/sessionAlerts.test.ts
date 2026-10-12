import assert from 'node:assert/strict';
import { hasSessionStartPassed } from '../src/lib/sessionAlerts';

const now = new Date(2026, 9, 12, 12, 50);
assert.equal(hasSessionStartPassed('2026-10-12', '12:50 - 13:50', now), true);
assert.equal(hasSessionStartPassed('2026-10-12', '12:51 - 13:51', now), false);
assert.equal(hasSessionStartPassed('2026-10-13', '09:00 - 10:00', now), false);
assert.equal(hasSessionStartPassed('2026-10-11', '18:00 - 19:00', now), true);
assert.equal(hasSessionStartPassed('2026-10-12', '12:50 - 13:50', now, '12:45'), false);
