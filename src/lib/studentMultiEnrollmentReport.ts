import type {ClassItem,StudentRecord} from '../types';
import {studentProfileRows,studentRegistrations} from './studentRegistrations';
import {matchesReportFilter,reportFilterValues,reportToday,type ReportDataset} from './customReports';

export function studentMultiEnrollmentReport(students:StudentRecord[],classes:ClassItem[],subjects:{code:string;name:string}[],grades:{id:string;label:string}[]=[],today=reportToday()):ReportDataset {
 const eligible=classes.filter(cls=>cls.status==='Đang học' && (!cls.endDate || cls.endDate>=today) && (!cls.startDate || cls.startDate<=today));
 const subjectName=(code:string)=>subjects.find(item=>item.code===code)?.name || code;
 const records=studentProfileRows(students).flatMap(student=>{
  const registrations=studentRegistrations(student).filter(reg=>reg.status==='Đang học');
  const enrolled=eligible.filter(cls=>cls.studentIds.includes(student.id) && registrations.some(reg=>reg.subject===cls.subject && (!reg.currentClassCode || reg.currentClassCode===cls.code)));
  const subjectCodes=[...new Set(enrolled.map(cls=>cls.subject))];
  const classIds=[...new Set(enrolled.map(cls=>cls.id))];
  if (!classIds.length) return [];
  return [{id:student.id,name:student.name,grade:grades.find(item=>item.id===student.grade)?.label || student.grade,
   subjectCount:subjectCodes.length,classCount:classIds.length,subjects:subjectCodes.map(subjectName).join(', '),classes:enrolled.map(cls=>cls.code+' · '+cls.name).join('; '),
   multiSubject:Number(subjectCodes.length>=2),multiClass:Number(classIds.length>=2),total:1,
   __subjects:JSON.stringify(subjectCodes),__classes:JSON.stringify(classIds)}];
 });
 const dataset:ReportDataset={
  id:'student_multi_enrollment',label:'Học sinh học nhiều môn / nhiều lớp',dateKind:'snapshot',
  note:'Hiện trạng đăng ký đang học, mỗi mã học sinh chỉ một dòng. Chỉ tính lớp đang học và còn hạn; lớp tạm nghỉ vẫn giữ đăng ký nên được tính. Không tính lớp đã dừng/kết thúc hoặc môn chờ xếp lớp. Các bộ lọc chọn học sinh; số môn/lớp vẫn là tổng của học sinh đó. Tỷ lệ tính trên học sinh đang học trong bộ lọc, không suy ngược lịch sử theo khoảng ngày.',
  records,metrics:[{id:'count',label:'Học sinh đang học',mode:'count'},{id:'multiSubject',label:'Học sinh học từ 2 môn',mode:'sum',field:'multiSubject'},
   {id:'multiClass',label:'Học sinh học từ 2 lớp',mode:'sum',field:'multiClass'},{id:'rate',label:'Tỷ lệ học nhiều môn (%)',mode:'ratio',field:'multiSubject',denominator:'total',format:'percent'}],
  defaultMetricIds:['count','multiSubject','multiClass','rate'],
  dimensions:[{id:'subjectCount',label:'Số môn đang học'},{id:'classCount',label:'Số lớp đang học'},{id:'grade',label:'Khối'}],
  filters:[{id:'subjects',label:'Môn đang học',choices:subjects.map(item=>({value:item.code,label:item.name}))},
   {id:'classes',label:'Lớp đang học',choices:eligible.map(cls=>({value:cls.id,label:cls.code+' · '+cls.name}))},
   {id:'grade',label:'Khối'},{id:'subjectCount',label:'Số môn đang học'},{id:'classCount',label:'Số lớp đang học'}],
  detailFields:[{id:'id',label:'Mã học sinh'},{id:'name',label:'Học sinh'},{id:'grade',label:'Khối'},{id:'subjectCount',label:'Số môn đang học'},
   {id:'subjects',label:'Các môn đang học'},{id:'classCount',label:'Số lớp đang học'},{id:'classes',label:'Các lớp đang học'}]
 };
 dataset.filterRecords=(rows,filters)=>rows.filter(row=>dataset.filters.every(field=>{
  if(field.id==='subjects'||field.id==='classes') {
   const keys=JSON.parse(String(row[field.id==='subjects'?'__subjects':'__classes'] || '[]')) as string[];
   return !reportFilterValues(filters[field.id]).length || keys.some(key=>matchesReportFilter(key,filters[field.id]));
  }
  return matchesReportFilter(row[field.id],filters[field.id]);
 }));
 return dataset;
}
