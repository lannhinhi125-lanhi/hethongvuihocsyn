export type ClassDurationEntry={id:string;code:string;name:string;status:boolean;desc?:string};
export type ClassDurationCatalog={id:string;code:string;name:string;desc:string;entries:ClassDurationEntry[]};
export const CLASS_DURATION_CODE='CLASS_DURATION';
// Inclusive last day: 05/10 + one month covers 05/10 through 04/11.
// Clamp the anniversary to the last day of shorter months before subtracting a day.
export function classEndDate(start:string,months:number):string {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isInteger(months)||months<1||months>120)return '';
  const date=new Date(start+'T12:00:00Z');
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==start)return '';
  const day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+months);
  const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
  date.setUTCDate(Math.min(day,last));date.setUTCDate(date.getUTCDate()-1);
  return date.toISOString().slice(0,10);
}
