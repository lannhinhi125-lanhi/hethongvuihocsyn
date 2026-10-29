export type MonitoringApproval = {by:string;at:string;warning:string;checkinAt:string|null;checkoutAt:string|null};
export const isMonitoringApproved = (session:{monitoringApproval?:MonitoringApproval|null;checkinAt?:string|null;checkoutAt?:string|null}, warning:string) => {
  const approval=session.monitoringApproval;
  return Boolean(approval && approval.warning===warning && approval.checkinAt===(session.checkinAt||null) && approval.checkoutAt===(session.checkoutAt||null));
};

export const hasSessionStartPassed = (sessionDate: string, timeSlot: string, now: Date, effectiveTime?: string) => {
  const start = timeSlot.match(/^\s*(\d{1,2}):(\d{2})/);
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) return false;
  const startHour = Number(start[1]);
  const startMinute = Number(start[2]);
  if (startHour > 23 || startMinute > 59) return false;
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (sessionDate !== today) return sessionDate < today;
  const time = effectiveTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const [hour, minute] = time.split(':').map(Number);
  return Number.isFinite(hour) && Number.isFinite(minute) && hour * 60 + minute >= startHour * 60 + startMinute;
};

export type MonitoringSessionState = 'CHUA_DIEN_RA' | 'CHUA_HOC' | 'DANG_HOC' | 'CHUA_HOAN_TAT' | 'DA_HOC' | 'NGHI_HOC';
export const monitoringSessionPriority = (state: MonitoringSessionState): number =>
  ({CHUA_HOC:0,CHUA_HOAN_TAT:1,DANG_HOC:2,CHUA_DIEN_RA:3,DA_HOC:4,NGHI_HOC:5})[state];

/** Scheduled time alone never proves that a teacher taught or completed a lesson. */
export const monitoringSessionStatus = (session: {
  sessionDate: string;
  timeSlot: string;
  status?: string;
  attendance?: string;
  checkinTime?: string | null;
  checkinAt?: string | null;
  checkoutAt?: string | null;
}, now: Date, effectiveTime?: string): MonitoringSessionState => {
  if (session.status === 'NGHI_HOC' || session.status === 'HUY') return 'NGHI_HOC';
  if (session.status === 'DA_HOC') return 'DA_HOC';
  const phase = monitoringStudyStatus(session.sessionDate, session.timeSlot, now, effectiveTime);
  if (phase === 'CHUA_HOC') return 'CHUA_DIEN_RA';
  const checkedIn = Boolean(session.checkinAt || session.checkinTime?.trim() ||
    session.attendance === 'ATTENDED' || session.attendance === 'LATE');
  if (!checkedIn) return 'CHUA_HOC';
  if (session.checkoutAt) return 'DA_HOC';
  return phase === 'DANG_HOC' ? 'DANG_HOC' : 'DA_HOC';
};

/** Teaching status and completion warnings are independent of credited work. */
export const sessionCompletionWarning = (session: Parameters<typeof monitoringSessionStatus>[0],now:Date,effectiveTime?:string):string => {
  if(['NGHI_HOC','HUY','DA_HOC_CU','DAY_THAY_CU'].includes(session.status||''))return '';
  const entered=Boolean(session.checkinAt||session.checkinTime?.trim()||['ATTENDED','LATE'].includes(session.attendance||''));
  if(!entered||monitoringStudyStatus(session.sessionDate,session.timeSlot,now,effectiveTime)==='CHUA_HOC')return '';
  if(isEarlyCheckout(session.sessionDate,session.timeSlot,session.checkoutAt))return `Chưa hoàn tất · Kết thúc sớm ${Math.ceil(minutesEndedEarly(session.sessionDate,session.timeSlot,session.checkoutAt))} phút`;
  return '';
};

export const minutesEndedEarly = (date: string, time: string, checkoutAt?: string | null): number => {
  const match = time.match(/^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/);
  if (!checkoutAt || !match || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 0;
  const [sh, sm, eh, em] = match.slice(1).map(Number);
  if (sh > 23 || eh > 23 || sm > 59 || em > 59) return 0;
  const end = new Date(date + 'T' + String(eh).padStart(2, '0') + ':' + String(em).padStart(2, '0') + ':00+07:00');
  if (eh * 60 + em < sh * 60 + sm) end.setUTCDate(end.getUTCDate() + 1);
  const checkout = new Date(checkoutAt);
  if (Number.isNaN(checkout.getTime())) return 0;
  return Math.max(0, (end.getTime() - checkout.getTime()) / 60_000);
};

export const monitoringStudyStatus = (date: string, slot: string, now: Date, effectiveTime?: string): 'CHUA_HOC' | 'DANG_HOC' | 'DA_HOC' => {
  const match = slot.match(/^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/);
  if (!match) return 'CHUA_HOC';
  const [sh, sm, eh, em] = match.slice(1).map(Number);
  if (sh > 23 || eh > 23 || sm > 59 || em > 59) return 'CHUA_HOC';
  const start = new Date(date + 'T' + String(sh).padStart(2, '0') + ':' + String(sm).padStart(2, '0') + ':00+07:00');
  const end = new Date(date + 'T' + String(eh).padStart(2, '0') + ':' + String(em).padStart(2, '0') + ':00+07:00');
  if (eh * 60 + em < sh * 60 + sm) end.setUTCDate(end.getUTCDate() + 1);
  const today = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  const current = effectiveTime ? new Date(today + 'T' + effectiveTime + ':00+07:00') : now;
  if (Number.isNaN(start.getTime()) || current < start) return 'CHUA_HOC';
  return current < end ? 'DANG_HOC' : 'DA_HOC';
};

/** Only persisted checkout unlocks feedback; wall-clock time alone is insufficient. */
export const canReviewSession = (session?: {checkinAt?:string|null;checkoutAt?:string|null;status?:string}) =>
  Boolean(session?.checkinAt && session.checkoutAt && !['HUY','NGHI_HOC'].includes(session.status || '') &&
    Number.isFinite(Date.parse(session.checkinAt)) && Number.isFinite(Date.parse(session.checkoutAt)) &&
    Date.parse(session.checkoutAt)>=Date.parse(session.checkinAt));
export const isEarlyCheckout = (date:string,time:string,checkoutAt?:string|null) => minutesEndedEarly(date,time,checkoutAt)>5;
