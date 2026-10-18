import type {ClassItem,StudentRecord} from '../types';
import {studentRegistrations,studentProfileRows} from './studentRegistrations';
import {inspectionDate} from './inspectionReport';
import {reportCreationDate} from './reportCreationDate';
import type {WorkbenchRange} from './workbenchTime';
import {averageEvaluationScore} from './evaluationScoring';
import {classifyClassGrowth,classGrowthLabels,type ClassGrowthKind} from './classGrowth';
export interface WorkbenchEvaluation {teacherId?:string;evaluationDate?:string;overallScore?:number;status?:string;}
export function workbenchAnalytics(classes:ClassItem[],students:StudentRecord[],lessons:{id:string;date:string}[],
 incidents:{lessonId:string}[],evaluations:WorkbenchEvaluation[],range:WorkbenchRange) {
 const inRange=(day:string)=>Boolean(day)&&day>=range.start&&day<=range.end;
 const profiles=studentProfileRows(students);
 const uniqueClasses=[...new Map(classes.map(c=>[c.id,c])).values()];
 const cohortStudents=profiles.filter(s=>inRange(reportCreationDate(s.created_at)));
 const cohortClasses=uniqueClasses.filter(c=>inRange(reportCreationDate(c.created_at)));
 const profileMap=new Map(profiles.map(s=>[s.id,s]));
 const classifiedClasses=cohortClasses.map(cls=>({id:cls.id,code:cls.code,name:cls.name,date:reportCreationDate(cls.created_at),
  ...classifyClassGrowth(cls.studentIds||[],profileMap,range,cls.id,cls.subject)}));
 const classKinds=(['NEW','TRANSFER','MIXED','EMPTY','UNKNOWN'] as ClassGrowthKind[]).map(kind=>({kind,label:classGrowthLabels[kind],count:classifiedClasses.filter(c=>c.kind===kind).length}));
 const movedProfiles=profiles.filter(s=>(s.classHistory||[]).some(event=>!event.isBaseline&&event.fromClassId&&event.toClassId&&event.fromClassId!==event.toClassId&&inRange(reportCreationDate(event.occurredAt))));
 const oldTransferred=movedProfiles.filter(s=>{const date=reportCreationDate(s.created_at);return date&&date<range.start;}).length;
 const newTransferred=movedProfiles.filter(s=>inRange(reportCreationDate(s.created_at))).length;
 const unknownTransferred=movedProfiles.length-oldTransferred-newTransferred;
 const first=Date.parse(range.start+'T12:00:00Z'),span=Math.max(1,Math.round((Date.parse(range.end+'T12:00:00Z')-first)/86400000)+1),bucket=Math.max(1,Math.ceil(span/12));
 const growth=Array.from({length:Math.ceil(span/bucket)},(_,i)=>{
  const start=new Date(first+i*bucket*86400000).toISOString().slice(0,10);
  const end=new Date(first+Math.min(span-1,(i+1)*bucket-1)*86400000).toISOString().slice(0,10);
  return {date:start,label:start.slice(8)+'/'+start.slice(5,7),students:cohortStudents.filter(s=>{const d=reportCreationDate(s.created_at);return d>=start&&d<=end;}).length,
   classes:classifiedClasses.filter(c=>c.kind==='NEW'&&c.date>=start&&c.date<=end).length};
 });
 const waiting=profiles.filter(s=>studentRegistrations(s).some(r=>r.status==='Chờ xếp lớp')).length;
 const noTeacher=uniqueClasses.filter(c=>!['Dừng lớp','Đã kết thúc'].includes(c.status||'')&&!c.teacherId).length;
 const activeStudents=profiles.filter(s=>studentRegistrations(s).some(r=>r.status==='Đang học')).length;
 const activeClasses=uniqueClasses.filter(c=>c.status==='Đang học').length;
 const currentSubjects=[...new Set(uniqueClasses.map(c=>c.subject))].map(subject=>({subject,count:uniqueClasses.filter(c=>c.subject===subject).length}));
 const subjects=[...new Set(cohortClasses.map(c=>c.subject))].map(subject=>({subject,count:cohortClasses.filter(c=>c.subject===subject).length}));
 const periodLessons=lessons.filter(l=>inRange(l.date));
 const ids=new Set(periodLessons.map(l=>l.id));
 const affected=new Set(incidents.filter(i=>ids.has(i.lessonId)).map(i=>i.lessonId)).size;
 const records=evaluations.filter(e=>e.status==='DA_DUYET'&&inRange(inspectionDate(e.evaluationDate))&&e.overallScore!=null&&Number.isFinite(Number(e.overallScore))&&Number(e.overallScore)>=0&&Number(e.overallScore)<=10);
 const teacherScores=[...new Set(records.map(e=>e.teacherId).filter(Boolean))].map(id=>{
  const scores=records.filter(e=>e.teacherId===id).map(e=>Number(e.overallScore));
  return averageEvaluationScore(scores.map(overallScore=>({overallScore})))!;
 });
 const ratings=[{label:'A · Từ 9 điểm',count:teacherScores.filter(s=>s>=9).length},
  {label:'B · Từ 8 đến dưới 9',count:teacherScores.filter(s=>s>=8&&s<9).length},
  {label:'C · Từ 7 đến dưới 8',count:teacherScores.filter(s=>s>=7&&s<8).length},
  {label:'D · Dưới 7 điểm',count:teacherScores.filter(s=>s<7).length}];
 return {growth,subjects,currentSubjects,waiting,noTeacher,totalStudents:profiles.length,totalClasses:uniqueClasses.length,activeStudents,activeClasses,newStudents:cohortStudents.length,newClasses:cohortClasses.length,
  classifiedClasses,classKinds,growthClasses:classifiedClasses.filter(c=>c.kind==='NEW').length,oldTransferred,newTransferred,unknownTransferred,
  totalLessons:periodLessons.length,affected,incidentRate:periodLessons.length?Math.round(affected/periodLessons.length*1000)/10:0,
  evaluationCount:records.length,evaluatedTeachers:teacherScores.length,ratings,
  averageScore:teacherScores.length?teacherScores.reduce((n,s)=>n+s,0)/teacherScores.length:null};
}
