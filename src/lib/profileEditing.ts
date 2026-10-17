import type {ClassItem,StudentRecord,TeacherProfile,TimeSlotItem} from '../types';
import {studentRegistrations} from './studentRegistrations';
import {schedulesOverlap} from './workflow';
import {canTeachClassModel} from './teachingModelGroups';

const sameSet=(a:string[]=[],b:string[]=[])=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
export function studentStudyEditIssue(before:StudentRecord,after:StudentRecord,classes?:ClassItem[]):string|undefined {
 const previous=studentRegistrations(before),next=studentRegistrations(after);
 if(before.grade!==after.grade && previous.some(row=>row.status!=='Chờ xếp lớp'||row.currentClassCode))return 'Đưa các đăng ký môn về Chờ xếp lớp và lưu trước khi đổi khối.';
 for(const old of previous){
  const row=next.find(item=>item.subject===old.subject);
  const linkedClass=classes?.find(cls=>cls.subject===old.subject&&cls.studentIds.includes(before.id)&&!['Tạm dừng','Đã kết thúc'].includes(cls.status||''));
  const assigned=classes ? Boolean(linkedClass) : Boolean(old.currentClassCode);
  if(assigned && (!row || row.status!==old.status || row.currentClassCode!==old.currentClassCode))return `Chưa thể đổi trạng thái hoặc rút học sinh vì đang gắn với lớp ${linkedClass?.code||old.currentClassCode}. Dừng hoạt động lớp trước để chuyển về Chờ xếp lớp và giải phóng ca.`;
  const changed=!row || row.model!==old.model || row.level!==old.level || !sameSet(row.scheduleSlots,old.scheduleSlots);
  if(changed && (old.status!=='Chờ xếp lớp'||old.currentClassCode))return 'Đưa đăng ký môn về Chờ xếp lớp và lưu trước khi đổi trình độ, mô hình hoặc lịch học.';
 }
}

export function teacherStudyEditIssue(before:TeacherProfile,after:TeacherProfile,classes:ClassItem[]):string|undefined {
 const active=classes.filter(row=>row.teacherId===before.id&&!['Tạm dừng','Đã kết thúc'].includes(row.status||''));
 const affected=active.find(row=>(before.subject!==after.subject&&row.subject!==after.subject)||
  (before.levelId!==after.levelId&&row.categoryId!==after.levelId)||
  (!sameSet(before.grades,after.grades)&&!after.grades.includes(row.grade))||
  (!sameSet(before.models,after.models)&&!canTeachClassModel(after.models,row.model)));
 if(affected)return `Chưa thể cập nhật chuyên môn vì giáo viên đang phụ trách lớp ${affected.code}. Dừng hoạt động lớp trước khi đổi phân công. Thông tin cá nhân và liên hệ vẫn sửa được.`;
}

export function teacherScheduleEditIssue(before:TeacherProfile,after:TeacherProfile,classes:ClassItem[],slots:TimeSlotItem[]):string|undefined {
 const days=['T2','T3','T4','T5','T6','T7','CN'];
 for(const cls of classes.filter(row=>row.teacherId===before.id&&!['Tạm dừng','Đã kết thúc'].includes(row.status||''))){
  for(const slot of slots)for(let day=0;day<7;day++){
   if(!schedulesOverlap(cls.schedule,`${days[day]} (${slot.timeRange})`))continue;
   const old=before.schedule?.[slot.code]?.[day]??before.schedule?.[slot.id]?.[day]??'none';
   const next=after.schedule?.[slot.code]?.[day]??after.schedule?.[slot.id]?.[day]??'none';
   if(old!==next)return `Ca ${days[day]} ${slot.timeRange} đã gắn với lớp ${cls.code}; dừng hoạt động lớp trước khi sửa lịch rảnh.`;
  }
 }
}
