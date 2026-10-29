import type {ClassItem, StudentRecord, MonthPayrollData} from '../types';
import {studentProfileRows, studentRegistrations} from './studentRegistrations';
import {validReportDate} from './customReports';
import type {WorkbenchRange} from './workbenchTime';

export function waitingDemand(students: StudentRecord[]) {
 const groups = new Map<string, {subject:string; model:string; ids:Set<string>}>();
 for (const student of studentProfileRows(students)) for (const registration of studentRegistrations(student)) {
  if (registration.status !== 'Chờ xếp lớp') continue;
  const key = JSON.stringify([registration.subject, registration.model]);
  const group = groups.get(key) || {subject:registration.subject, model:registration.model, ids:new Set<string>()};
  group.ids.add(student.id); groups.set(key, group);
 }
 return [...groups.values()].map(group => ({subject:group.subject, model:group.model, ids:[...group.ids]}))
  .sort((a,b) => b.ids.length-a.ids.length || a.subject.localeCompare(b.subject,'vi') || a.model.localeCompare(b.model,'vi'));
}

export function endingClasses(classes:ClassItem[], today:string, days:number) {
 return [...new Map(classes.map(item=>[item.id,item])).values()]
  .filter(item=>!['Đã kết thúc','Dừng lớp'].includes(item.status || '') && validReportDate(item.endDate || ''))
  .map(item=>({item, remaining:Math.round((Date.parse(item.endDate!+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000)}))
  .filter(row=>row.remaining>=0 && row.remaining<=days)
  .sort((a,b)=>a.remaining-b.remaining || a.item.name.localeCompare(b.item.name,'vi'));
}

/** A navigation range covering all available records, including older payroll months. */
export function allTaskRange(lessons:{date:string}[], incidents:{reportedAt?:string}[], payroll:Record<string,MonthPayrollData>, today:string):WorkbenchRange {
 const dates=[today,...lessons.map(row=>row.date),...incidents.map(row=>row.reportedAt?.slice(0,10)||''),
  ...Object.keys(payroll).flatMap(month=>{
   if(!/^\d{4}-\d{2}$/.test(month)) return [];
   const first=month+'-01';
   if(!validReportDate(first)) return [];
   const end=new Date(first+'T12:00:00Z');end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(0);
   return [first,end.toISOString().slice(0,10)];
  })].filter(validReportDate).sort();
 return {start:dates[0]||today,end:dates.at(-1)||today};
}
