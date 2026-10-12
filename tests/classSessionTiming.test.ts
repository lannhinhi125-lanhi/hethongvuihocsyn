import assert from 'node:assert/strict';
import { canEndClass, canEnterClass, minutesUntilClassEnd, scheduledClassStart } from '../src/lib/classSessionTiming';

const scheduledStart = scheduledClassStart('2026-10-12', '18:00 - 19:30');
assert.equal(scheduledStart?.getHours(), 18);
assert.equal(scheduledStart?.getMinutes(), 0);
assert.equal(scheduledClassStart('2026-10-12', 'chưa có giờ'), null);
assert.equal(canEnterClass(new Date(2026, 9, 12, 17, 59), scheduledStart!), false);
assert.equal(canEnterClass(new Date(2026, 9, 12, 18, 0), scheduledStart!), true);

const checkin = new Date(2026, 9, 12, 18, 5);
assert.equal(minutesUntilClassEnd(checkin, new Date(2026, 9, 12, 18, 5)), 60);
assert.equal(minutesUntilClassEnd(checkin, new Date(2026, 9, 12, 19, 4, 59)), 1);
assert.equal(minutesUntilClassEnd(checkin, new Date(2026, 9, 12, 19, 5)), 0);
assert.equal(canEndClass(checkin, new Date(2026, 9, 12, 19, 4)), false);
assert.equal(canEndClass(checkin, new Date(2026, 9, 12, 19, 5)), true);
