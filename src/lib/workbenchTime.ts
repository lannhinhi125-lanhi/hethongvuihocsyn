export type WorkbenchPeriod='day'|'week'|'month'|'custom';
export type WorkbenchRange={start:string;end:string};
const date=(value:string)=>new Date(value+'T12:00:00Z');
const iso=(value:Date)=>value.toISOString().slice(0,10);
export function workbenchRange(anchor:string,period:Exclude<WorkbenchPeriod,'custom'>):WorkbenchRange {
 const start=date(anchor),end=date(anchor);
 if(period==='week'){start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));end.setTime(start.getTime());end.setUTCDate(end.getUTCDate()+6);}
 if(period==='month'){start.setUTCDate(1);end.setUTCMonth(end.getUTCMonth()+1,0);}
 return {start:iso(start),end:iso(end)};
}
export function shiftWorkbenchRange(range:WorkbenchRange,period:WorkbenchPeriod,direction:-1|1):WorkbenchRange {
 const start=date(range.start);
 if(period==='month'){start.setUTCDate(1);start.setUTCMonth(start.getUTCMonth()+direction);return workbenchRange(iso(start),'month');}
 const span=Math.round((date(range.end).getTime()-start.getTime())/86400000)+1;
 const offset=(period==='week'?7:period==='day'?1:span)*direction;
 return {start:iso(new Date(start.getTime()+offset*86400000)),end:iso(new Date(date(range.end).getTime()+offset*86400000))};
}
