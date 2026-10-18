import type { SessionPayrollRecord, TeacherPayrollSummary } from '../types';

export const isIncidentWorkSession = (session: SessionPayrollRecord) => session.type !== 'STANDARD' && session.type !== 'COVER';
const round = (value: number) => Number(value.toFixed(6));
export function workCreditBreakdown(sessions: SessionPayrollRecord[]) {
  const recorded=sessions.filter(session=>!session.isPendingCredit&&session.creditCoeff!==null);
  const standardCredit = round(recorded.filter(session => !isIncidentWorkSession(session)).reduce((total, session) => total + (session.creditCoeff??0), 0));
  const incidentCredit = round(recorded.filter(isIncidentWorkSession).reduce((total, session) => total + (session.creditCoeff??0), 0));
  return { standardCredit, incidentCredit };
}
export const workCreditText = (value: number) => value.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 6 });
export const staffReconcileLabel = (status: string) => ({ CHO_GUI: 'Chờ gửi đối soát', DA_GUI: 'Đã gửi nhân sự', CO_GIAI_TRINH: 'Có giải trình', DA_XU_LY_GT: 'Đã xử lý giải trình', DA_CHOT: 'Đã chốt công' }[status] || status || 'Chưa xác định');
export interface WorkHandoffInfo {
  month: string; isLocked: boolean; lockedAt?: string | null; scope: string; author: string;
  organization: string; address: string; reportNumber: string; receiver: string;
  operationsSigner: string; receivingSigner: string; createdAt: string;
}
export function workHandoffRows(staff: TeacherPayrollSummary[]) {
  return staff.map(person => {
    const sessions = (person.sessions || []).filter(session=>!session.isPendingCredit&&session.creditCoeff!==null), standardSessions = sessions.filter(session => !isIncidentWorkSession(session)).length;
    const { standardCredit, incidentCredit } = workCreditBreakdown(sessions);
    return { ...person,sessions, standardSessions, incidentSessions: sessions.length - standardSessions, standardCredit, incidentCredit, totalCredit: round(standardCredit + incidentCredit) };
  });
}
export function workHandoffTotals(staff: TeacherPayrollSummary[]) {
  return workHandoffRows(staff).reduce((sum, row) => ({ staff: sum.staff + 1, sessions: sum.sessions + row.sessions.length,
    standardSessions: sum.standardSessions + row.standardSessions, incidentSessions: sum.incidentSessions + row.incidentSessions,
    standardCredit: round(sum.standardCredit + row.standardCredit), incidentCredit: round(sum.incidentCredit + row.incidentCredit), totalCredit: round(sum.totalCredit + row.totalCredit) }),
  { staff: 0, sessions: 0, standardSessions: 0, incidentSessions: 0, standardCredit: 0, incidentCredit: 0, totalCredit: 0 });
}
