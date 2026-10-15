import type {StudentClassTrace} from '../types';
import {reportCreationDate} from './reportCreationDate';
export type ClassGrowthKind='NEW'|'TRANSFER'|'MIXED'|'EMPTY'|'UNKNOWN';
export const classGrowthLabels:Record<ClassGrowthKind,string>={NEW:'Lớp mới',TRANSFER:'Học sinh chuyển lớp',MIXED:'Có học sinh cũ — không tính lớp mới',EMPTY:'Chưa có học sinh',UNKNOWN:'Chưa đủ dữ liệu để phân loại'};
export function classifyClassGrowth(studentIds:string[],students:Map<string,{created_at?:string;classHistory?:StudentClassTrace[]}>,range:{start:string;end:string},classId?:string) {
 let ids=[...new Set(studentIds)];let newStudents=0,oldStudents=0,unknownStudents=0;
 if(classId) {
  // Query arrivals as of period end. A later move never removes an older arrival.
  const arrivals=[...students.entries()].flatMap(([id,student])=>(student.classHistory || [])
   .filter(event=>event.toClassId===classId && (!range.end || reportCreationDate(event.occurredAt)<=range.end))
   .map(event=>({id,event})));
  ids=[...new Set(arrivals.map(item=>item.id))];
  if(!ids.length && studentIds.length)return {kind:'UNKNOWN' as const,label:classGrowthLabels.UNKNOWN,newStudents:0,oldStudents:0,unknownStudents:studentIds.length};
  for(const id of ids) {
   const events=arrivals.filter(item=>item.id===id).map(item=>item.event);
   const date=reportCreationDate(students.get(id)?.created_at);
   if(events.some(event=>event.isBaseline) || !date || !range.start)unknownStudents++;
   else if(events.some(event=>!event.isInitial) || date<range.start)oldStudents++;
   else if(range.end && date>range.end)unknownStudents++;
   else newStudents++;
  }
 } else for(const id of ids){const date=reportCreationDate(students.get(id)?.created_at);
  if(!date || !range.start || (range.end && date>range.end))unknownStudents++;
  else if(date>=range.start)newStudents++;
  else oldStudents++;
 }
 const kind:ClassGrowthKind=ids.length===0?'EMPTY':unknownStudents?'UNKNOWN':oldStudents===0?'NEW':newStudents===0?'TRANSFER':'MIXED';
 return {kind,label:classGrowthLabels[kind],newStudents,oldStudents,unknownStudents};
}
