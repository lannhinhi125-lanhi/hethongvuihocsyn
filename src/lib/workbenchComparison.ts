import {shiftWorkbenchRange,type WorkbenchRange,type WorkbenchPeriod} from './workbenchTime';
export function workbenchComparison(range:WorkbenchRange,period:WorkbenchPeriod){
 return {range:shiftWorkbenchRange(range,period,-1),label:period==='week'?'tuần trước':period==='month'?'tháng trước':period==='day'?'ngày trước':'kỳ trước'};
}
export function comparisonText(current:number|null,previous:number|null,label:string,unit=''){
 if(current===null||previous===null||!Number.isFinite(current)||!Number.isFinite(previous))return `Chưa đủ dữ liệu so với ${label}`;
 const diff=Number((current-previous).toFixed(2));
 const format=(value:number)=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(value);
 if(diff===0)return `Không đổi so với ${label}`;
 return `${diff>0?'↑':'↓'} ${format(Math.abs(diff))}${unit?` ${unit}`:''} so với ${label} (${format(previous)})`;
}
