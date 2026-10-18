import type { ClassItem, StudentRecord, StudentSubjectRegistration } from '../types';
import { schedulesOverlap } from './workflow';

export function studentRegistrations(student: StudentRecord): StudentSubjectRegistration[] {
  return student.registrations?.length ? student.registrations : [{
    registeredAt: student.created_at,
    subject: student.subject, model: student.model, level: student.level,
    scheduleSlots: student.scheduleSlots, status: student.status, currentClassCode: student.currentClassCode
  }];
}

export function studentRegistrationRows(students: StudentRecord[]) {
  return students.flatMap(student => studentRegistrations(student).map(({registeredAt,...registration}) => ({
    ...student, ...registration, registrationKey: JSON.stringify([student.id, registration.subject]),
    created_at: registeredAt || student.created_at
  })));
}

export function studentProfileRows(students: StudentRecord[]) {
  return [...new Map(students.map(student => [student.id, student])).values()];
}

export function studentHistoryForSubject(student: StudentRecord, subject: string, classes: ClassItem[]) {
  return (student.classHistory || []).filter(event => {
    const eventSubject = event.subject || classes.find(cls => cls.id === (event.toClassId || event.fromClassId))?.subject;
    return eventSubject === subject;
  });
}

export function studentForSubject(student: StudentRecord, subject: string): StudentRecord | undefined {
  const registration = studentRegistrations(student).find(item => item.subject === subject);
  if (!registration) return undefined;
  const {registeredAt,registrationKind,periodNumber,...fields}=registration;
  return { ...student, ...fields };
}

export function updateStudentRegistration(student: StudentRecord, updates: Partial<StudentRecord>): StudentRecord {
  const subject = updates.subject || student.subject;
  const registrations = updates.registrations?.length ? updates.registrations : studentRegistrations(student);
  const old = registrations.find(item => item.subject === subject);
  const next = { ...old, subject, registeredAt: old?.registeredAt || studentRegistrations(student).find(item => item.subject === subject)?.registeredAt,
    model: updates.model ?? old?.model ?? student.model,
    level: updates.level ?? old?.level ?? student.level,
    scheduleSlots: updates.scheduleSlots ?? old?.scheduleSlots ?? [],
    status: updates.status ?? old?.status ?? 'Chờ xếp lớp',
    currentClassCode: Object.hasOwn(updates, 'currentClassCode') ? updates.currentClassCode : old?.currentClassCode };
  if (next.status !== 'Đang học') next.currentClassCode = undefined;
  const merged = registrations.some(item => item.subject === subject)
    ? registrations.map(item => item.subject === subject ? next : item) : [...registrations, next];
  // Scalar fields remain a compatibility projection of the first subject.
  const {registeredAt,registrationKind,periodNumber,...projection}=merged[0];
  return { ...student, ...updates, registrations: merged, ...projection };
}

export function assignStudentToClass(student: StudentRecord, cls: ClassItem, assigned: boolean): StudentRecord {
  return updateStudentRegistration(student, { subject: cls.subject, model: cls.model, level: cls.level,
    currentClassCode: assigned ? cls.code : undefined, status: assigned ? 'Đang học' : 'Chờ xếp lớp' });
}

export function studentScheduleConflict(studentId: string, target: ClassItem, classes: ClassItem[]): boolean {
  return classes.some(item => item.id !== target.id && item.subject !== target.subject &&
    !['Dừng lớp', 'Đã kết thúc'].includes(item.status || '') && item.studentIds.includes(studentId) &&
    schedulesOverlap(target.schedule, item.schedule));
}
