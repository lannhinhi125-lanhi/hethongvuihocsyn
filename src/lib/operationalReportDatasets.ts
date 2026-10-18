import type {ReportDataset} from './customReports';
import type {ReportLesson,ReportIncident} from './incidentReportPeriods';
import {inspectionDate,type InspectionEvaluation} from './inspectionReport';
import {evaluationRating} from './evaluationScoring';

/** Read-only projections of the rows returned by the business RPC. No generated business records. */
export function operationalReportDatasets(lessons:ReportLesson[],incidents:ReportIncident[],evaluations:InspectionEvaluation[],
  teachers:{id:string;name:string;subject:string}[],classes:{id:string;name:string}[]):ReportDataset[]{
  const incidentsByLesson=new Map<string,ReportIncident[]>();
  for(const incident of incidents)incidentsByLesson.set(incident.lessonId,[...(incidentsByLesson.get(incident.lessonId)||[]),incident]);
  return [{
    id:'incidents',label:'Sự cố theo buổi học',dateKind:'event',
    note:'Lọc theo ngày học. Mỗi buổi là một bản ghi; nhiều sự cố trong cùng buổi chỉ tính một buổi có sự cố. Có thể mở từng nhóm để đối chiếu mã buổi.',
    records:lessons.map(lesson=>{
      const events=incidentsByLesson.get(lesson.id)||[],urgent=events.some(event=>event.urgency==='EMERGENCY');
      return {id:lesson.id,code:lesson.displayCode||'Chưa cấp mã',date:lesson.date,period:lesson.date.slice(0,7),name:classes.find(c=>c.id===lesson.classId)?.name||lesson.classId,
        total:1,incidents:events.length?1:0,urgent:urgent?1:0,notice:events.length&&!urgent?1:0,
        cause:[...new Set(events.map(e=>e.incidentName).filter(Boolean))].sort().join('; ')||'Chưa ghi nhận sự cố'};
    }),
    metrics:[{id:'incidents',label:'Buổi có sự cố',mode:'sum',field:'incidents'},
      {id:'rate',label:'Tỷ lệ buổi có sự cố (%)',mode:'ratio',field:'incidents',denominator:'total',format:'percent'},
      {id:'total',label:'Tổng buổi học',mode:'sum',field:'total'},
      {id:'urgent',label:'Buổi có sự cố khẩn cấp',mode:'sum',field:'urgent'},
      {id:'notice',label:'Buổi có sự cố không khẩn cấp',mode:'sum',field:'notice'}],
    defaultMetricIds:['incidents','rate'],dimensions:[{id:'period',label:'Tháng'},{id:'cause',label:'Sự cố ghi nhận'},{id:'day',label:'Ngày'},{id:'week',label:'Tuần'}],
    filters:[{id:'cause',label:'Sự cố ghi nhận'}],detailFields:[{id:'code',label:'Mã buổi'},{id:'name',label:'Lớp học'},{id:'date',label:'Ngày học'},{id:'incidents',label:'Có sự cố (1/0)'},{id:'cause',label:'Sự cố ghi nhận'}]
  },{
    id:'inspection',label:'Biên bản dự giờ đã duyệt',dateKind:'event',
    note:'Lọc theo ngày dự giờ trên từng biên bản đã duyệt. Điểm trung bình tính theo biên bản; số giáo viên đếm theo mã và không cộng trùng.',
    records:evaluations.flatMap((evaluation)=>{
      const score=evaluation.overallScore==null?NaN:Number(evaluation.overallScore);
      if(evaluation.status!=='DA_DUYET'||!evaluation.teacherId||!evaluationRating(score))return [];
      const teacher=teachers.find(t=>t.id===evaluation.teacherId);
      return [{id:(evaluation as InspectionEvaluation & {id?:string}).id,teacherId:evaluation.teacherId,name:teacher?.name||evaluation.teacherId,
        date:inspectionDate(evaluation.evaluationDate),subject:teacher?.subject||'',rank:evaluationRating(score)!.label,score,sessions:1}];
    }),
    metrics:[{id:'count',label:'Số giáo viên được dự giờ',mode:'distinct',field:'teacherId'},
      {id:'score',label:'Điểm trung bình biên bản',mode:'average',field:'score',format:'score'},
      {id:'sessions',label:'Số biên bản đã duyệt',mode:'sum',field:'sessions'}],
    defaultMetricIds:['count','score','sessions'],dimensions:[{id:'rank',label:'Xếp loại biên bản'},{id:'subject',label:'Môn học'},{id:'month',label:'Tháng'},{id:'teacherId',label:'Mã giáo viên'}],
    filters:[{id:'subject',label:'Môn học'},{id:'rank',label:'Xếp loại biên bản'}],
    detailFields:[{id:'id',label:'Mã biên bản'},{id:'teacherId',label:'Mã giáo viên'},{id:'name',label:'Giáo viên'},{id:'date',label:'Ngày dự giờ'},{id:'subject',label:'Môn học'},{id:'rank',label:'Xếp loại biên bản'},{id:'score',label:'Điểm'}]
  }];
}
