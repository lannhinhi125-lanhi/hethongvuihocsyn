import {comparisonText} from '../lib/workbenchComparison';
export function MetricComparison({current,previous,label,unit=''}:{current:number|null;previous:number|null;label:string;unit?:string}){
 const value=previous===null?'—':new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(previous);
 const text=comparisonText(current,previous,label,unit);
 const suffix=` (${value})`;
 return <span className="mt-1 block text-[10px] font-normal leading-4 text-slate-500">
  {text.endsWith(suffix)?<>{text.slice(0,-suffix.length)} <strong className="font-semibold text-indigo-600">({value})</strong></>:<>{text}{previous!==null&&<strong className="ml-1 font-semibold text-indigo-600">({value})</strong>}</>}
 </span>;
}
