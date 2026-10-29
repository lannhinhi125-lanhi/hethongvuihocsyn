import type { MonitoringSession } from '../views/Module5_OperationsMonitoring';
import type { IncidentCategory } from '../types';

export type IncidentRow = Record<string, any>;
export function incidentUpdateTime(row: IncidentRow): number {
  const precise = Date.parse(String(row.lastUpdatedAt || ''));
  if (Number.isFinite(precise)) return precise;
  return Math.max(0, ...[row.updated_at, row.handledAt, row.reportedAt, row.created_at]
    .map(value=>Date.parse(String(value || ''))).filter(Number.isFinite));
}
export function compareIncidentUpdates(a: IncidentRow, b: IncidentRow, order: 'newest' | 'oldest' = 'newest') {
  const difference = incidentUpdateTime(a) - incidentUpdateTime(b);
  const tie = String(a.displayCode || a.id || '').localeCompare(String(b.displayCode || b.id || ''), 'en', {numeric:true});
  return (difference || tie) * (order === 'newest' ? -1 : 1);
}
export function lessonIncidentRows(rows: IncidentRow[], lessonId: string) {
  return rows.filter(row => row.lessonId === lessonId).sort((a, b) =>
    String(b.reportedAt || '').localeCompare(String(a.reportedAt || '')) || String(b.id).localeCompare(String(a.id)));
}

export function withIncident(session: MonitoringSession, row: IncidentRow, categories: IncidentCategory[], users: {id:string;name:string}[]): MonitoringSession {
  const updateTime = incidentUpdateTime(row);
  return { ...session, incidentId: row.id, creatingIncident: false, hasIncident: true,
    incidentDisplayCode: row.displayCode, incidentUpdatedAt: updateTime ? new Date(updateTime).toISOString() : undefined,
    fromClassPause: !!row.fromClassPause,
    incidentParent: categories.find(group => group.id === row.categoryId)?.code || null,
    incidentChild: row.incidentCode || null, incidentName: row.incidentName || '',
    incidentUrgency: row.urgency || null, incidentStatus: row.status || null,
    incidentNote: row.content || '', appliedCreditCoeff: row.appliedCreditCoeff ?? null,
    handledByOpsId: row.handledBy || null,
    handledByName: users.find(user => user.id === row.handledBy)?.name || null,
    handledAt: row.handledAt || null };
}

// Editing must address one exact report; adding must never reuse the latest report.
export function saveIncidentRow(rows: IncidentRow[], draft: IncidentRow, reportId?: string | null) {
  const existing = reportId ? rows.find(row => row.id === reportId && row.lessonId === draft.lessonId) : undefined;
  if (reportId && !existing) throw new Error('Phiếu sự cố không còn tồn tại. Hãy tải lại danh sách.');
  const row = { ...existing, ...draft, id: existing?.id || crypto.randomUUID(),
    reportedBy: existing?.reportedBy || draft.reportedBy,
    reportedAt: existing?.reportedAt || draft.reportedAt };
  return [...rows.filter(item => item.id !== row.id), row];
}
