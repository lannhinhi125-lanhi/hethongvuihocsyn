import { canReviewSession,isEarlyCheckout } from '../src/lib/sessionAlerts';
import assert from 'node:assert/strict';
import { hasSessionStartPassed, minutesEndedEarly, monitoringStudyStatus, monitoringSessionStatus } from '../src/lib/sessionAlerts';

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

const missing = { sessionDate: '2026-10-12', timeSlot: '12:50 - 13:50', status: 'CHUA_HOC', attendance: 'ABSENT', checkinTime: null };
const at = (time: string) => new Date(`2026-10-12T${time}:00+07:00`);
assert.equal(monitoringSessionStatus(missing, at('12:49')), 'CHUA_DIEN_RA');
assert.equal(monitoringSessionStatus(missing, at('12:50')), 'CHUA_HOC');
assert.equal(monitoringSessionStatus(missing, at('13:49')), 'CHUA_HOC');
assert.equal(monitoringSessionStatus(missing, at('13:50')), 'CHUA_HOC');
assert.equal(monitoringSessionStatus(missing, new Date('2026-10-13T09:00:00+07:00')), 'CHUA_HOC');
const entered = { ...missing, checkinAt: '2026-10-12T12:50:00+07:00' };
assert.equal(monitoringSessionStatus(entered, at('12:50')), 'DANG_HOC');
assert.equal(monitoringSessionStatus(entered, at('13:49')), 'DANG_HOC');
assert.equal(monitoringSessionStatus(entered, at('13:50')), 'CHUA_HOAN_TAT');
assert.equal(monitoringSessionStatus({ ...missing, attendance: 'LATE' }, at('14:00')), 'CHUA_HOAN_TAT');
assert.equal(monitoringSessionStatus({ ...missing, checkinTime: '12:55:00' }, at('14:00')), 'CHUA_HOAN_TAT');
assert.equal(monitoringSessionStatus({ ...missing, checkinTime: undefined }, at('14:00')), 'CHUA_HOC');
assert.equal(monitoringSessionStatus({ ...missing, checkinTime: ' ' }, at('14:00')), 'CHUA_HOC');
assert.equal(monitoringSessionStatus({ ...entered, checkoutAt: '2026-10-12T13:45:00+07:00' }, at('13:49')), 'DA_HOC');
assert.equal(monitoringSessionStatus({ ...entered, checkoutAt: '2026-10-12T13:44:59+07:00' }, at('13:49')), 'CHUA_HOAN_TAT');
assert.equal(monitoringSessionStatus({ ...entered, status: 'DA_HOC' }, at('14:00')), 'DA_HOC');
assert.equal(monitoringSessionStatus({ ...missing, status: 'NGHI_HOC' }, at('14:00')), 'NGHI_HOC');
assert.equal(monitoringSessionStatus({ ...missing, status: 'HUY' }, at('14:00')), 'NGHI_HOC');
assert.equal(monitoringSessionStatus(missing, at('14:00'), '12:45'), 'CHUA_DIEN_RA');
const night = { ...entered, timeSlot: '23:00 - 00:30', checkinAt: '2026-10-12T23:00:00+07:00' };
assert.equal(monitoringSessionStatus(night, new Date('2026-10-13T00:15:00+07:00')), 'DANG_HOC');
assert.equal(monitoringSessionStatus(night, new Date('2026-10-13T00:30:00+07:00')), 'CHUA_HOAN_TAT');

assert.equal(canReviewSession(),false);
assert.equal(canReviewSession({checkinAt:'2026-10-12T12:50:00+07:00'}),false);
assert.equal(canReviewSession({checkinAt:'2026-10-12T12:50:00+07:00',checkoutAt:'2026-10-12T13:45:00+07:00'}),true);
assert.equal(canReviewSession({checkinAt:'invalid',checkoutAt:'invalid'}),false);
assert.equal(isEarlyCheckout('2026-10-12','12:50 - 13:50','2026-10-12T13:45:00+07:00'),false);
assert.equal(isEarlyCheckout('2026-10-12','12:50 - 13:50','2026-10-12T13:44:59+07:00'),true);
assert.equal(monitoringSessionStatus({...entered,status:'DA_HOC',checkoutAt:'2026-10-12T13:44:59+07:00'},at('14:00')),'CHUA_HOAN_TAT');
console.log('PASS: feedback locked until checkout; early end boundary at five minutes');
