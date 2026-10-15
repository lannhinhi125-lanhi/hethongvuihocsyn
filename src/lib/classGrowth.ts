import {reportCreationDate} from './reportCreationDate';
export type ClassGrowthKind='NEW'|'TRANSFER'|'MIXED'|'EMPTY'|'UNKNOWN';
export const classGrowthLabels:Record<ClassGrowthKind,string>={NEW:'Lớp mới',TRANSFER:'Học sinh chuyển lớp',MIXED:'Có học sinh cũ — không tính lớp mới',EMPTY:'Chưa có học sinh',UNKNOWN:'Chưa đủ dữ liệu để phân loại'};
export function classifyClassGrowth(studentIds:string[],students:Map<string,{created_at?:string}>,range:{start:string;end:string}) {
 const ids=[...new Set(studentIds)];let newStudents=0,oldStudents=0,unknownStudents=0;
 for(const id of ids){const date=reportCreationDate(students.get(id)?.created_at);
  if(!date || !range.start || (range.end && date>range.end))unknownStudents++;
  else if((!range.start || date>=range.start) && (!range.end || date<=range.end))newStudents++;
  else oldStudents++;
 }
 const kind:ClassGrowthKind=ids.length===0?'EMPTY':unknownStudents?'UNKNOWN':oldStudents===0?'NEW':newStudents===0?'TRANSFER':'MIXED';
 return {kind,label:classGrowthLabels[kind],newStudents,oldStudents,unknownStudents};
}
