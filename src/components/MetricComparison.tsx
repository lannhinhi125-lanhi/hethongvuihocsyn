import {comparisonText} from '../lib/workbenchComparison';
export function MetricComparison({current,previous,label,unit=''}:{current:number|null;previous:number|null;label:string;unit?:string}){
 return <span className="mt-1 block text-[10px] font-normal leading-4 text-slate-500">{comparisonText(current,previous,label,unit)}</span>;
}
