import type { ClassItem, SubjectItem } from '../types';

export function monitoringSubjectCode(session: {classCode:string;subject:string}, classes: ClassItem[]) {
  return classes.find(cls=>cls.code===session.classCode)?.subject ||
    session.subject;
}

export function selectedMonitoringSubject(subjects: SubjectItem[], selectedCode: string) {
  const active=subjects.filter(subject=>subject.status !== false);
  return active.some(subject=>subject.code===selectedCode) ? selectedCode : active[0]?.code || '';
}
