import type { UserAccount, SystemRoleGroup, ClassItem, TeacherProfile, IncidentCategory } from '../types';
import { changedFields, hasPermission } from './accessControl';
export type PermissionCheck = (feature: string) => boolean;
export function classChangeAllowed(before: ClassItem[], after: ClassItem[], can: PermissionCheck, ownTeacherId?: string, ownTeacherName?: string): boolean {
  const previous = new Map(before.map(item => [item.id, item]));
  if (before.some(item => !after.some(row => row.id === item.id)) && !can('Tạo, sửa, xóa lớp và cập nhật link phòng học')) return false;
  return after.every(item => {
    const old = previous.get(item.id);
    if (!old) return can('Tạo, sửa, xóa lớp và cập nhật link phòng học') && (!item.studentIds.length || can('Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)')) && (!item.teacherId && !item.teacherName || can('Phân công giáo viên (Khớp nối môn và lịch rảnh)'));
    return changedFields(old, item).every(field => {
      if (field === 'studentIds') return can('Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)');
      if (['teacherId', 'teacherName'].includes(field)) return can('Phân công giáo viên (Khớp nối môn và lịch rảnh)');
      if (field === 'materials') return can('Thêm, sửa, xóa và nạp học liệu theo tuần');
      if (field === 'coverAssignments') return can('Tìm và phân công giáo viên dạy thay');
      if (field !== 'activeSessions') return can('Tạo, sửa, xóa lớp và cập nhật link phòng học');
      if (can('Ghi nhận và xử lý sự cố ca dạy')) return true;
      if (!ownTeacherId) return false;
      const previousSessions = old.activeSessions || {}, sessions = item.activeSessions || {};
      if (Object.keys(previousSessions).some(key => !(key in sessions))) return false;
      return Object.entries(sessions).every(([key, session]) => {
        const previousSession = previousSessions[Number(key)];
        if (!changedFields(previousSession || {}, session).length) return true;
        const cover = old.coverAssignments?.find(row => row.sessionNum === session.sessionNum && row.dateStr.slice(0, 10) === session.dateStr.slice(0, 10));
        if (cover ? cover.teacherId !== ownTeacherId : old.teacherId !== ownTeacherId) return false;
        return changedFields(previousSession || {}, session).every(sessionField => {
          if (sessionField === 'feedback') return can('Giáo viên Check-in / Check-out vào ca dạy');
          return can('Giáo viên Check-in / Check-out vào ca dạy') && ['sessionNum', 'dateStr', 'title', 'status', 'materialGv', 'materialHs', 'exerciseLms', 'checkinTime', 'checkinAt', 'checkinUserId', 'checkoutAt', 'checkoutUserId', 'teacherAttendance', 'checkinBy', 'attendance'].includes(sessionField);
        });
      });
    });
  });
}
export function teacherChangeAllowed(before: TeacherProfile[], after: TeacherProfile[], can: PermissionCheck, ownTeacherId?: string): boolean {
  const profile = () => can('Thêm/sửa hồ sơ và cấp tài khoản giáo viên');
  if (before.some(item => !after.some(row => row.id === item.id)) && !profile()) return false;
  return after.every(item => {
    const old = before.find(row => row.id === item.id);
    if (!old) return profile() || can('Tạo hồ sơ và cấp tài khoản giáo viên');
    return changedFields(old, item).every(field => {
      if (['schedule', 'freeSlots', 'busySlots', 'isFull'].includes(field)) return ownTeacherId === item.id && can('Giáo viên đăng ký lịch rảnh theo tuần');
      if (['evalStatus', 'evalScore', 'evalComment', 'evalCriteriaScores', 'evaluationReports'].includes(field)) return can('Chấm điểm và cập nhật báo cáo dự giờ');
      return profile();
    });
  });
}
export function incidentChangeAllowed(before: IncidentCategory[], after: IncidentCategory[], can: PermissionCheck): boolean {
  const configure = can('Cấu hình Danh mục Sự cố & Vi phạm ca học'), coefficient = can('Cấu hình hệ số công theo sự cố');
  if (before.some(item => !after.some(row => row.id === item.id)) && !configure) return false;
  return after.every(item => {
    const old = before.find(row => row.id === item.id);
    if (!old && !configure) return false;
    if (old && changedFields(old, item).some(field => field !== 'subIncidents') && !configure) return false;
    if (old?.subIncidents.some(sub => !item.subIncidents.some(row => row.id === sub.id)) && !configure) return false;
    return item.subIncidents.every(sub => {
      const oldSub = old?.subIncidents.find(row => row.id === sub.id);
      if (!oldSub && !configure) return false;
      return changedFields(oldSub || {}, sub).every(field => field === 'creditCoeff' ? coefficient : configure);
    });
  });
}
