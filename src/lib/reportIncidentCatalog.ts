import type { PauseCategory } from './classPause';
import { pauseReasonKey } from './classPause';
import type { ReportDimension } from './customReports';

export function incidentCatalogFields(categories: PauseCategory[]): {group: ReportDimension; type: ReportDimension} {
  return {
    group: {id:'incidentGroup',label:'Nhóm sự cố',choices:[...categories.map(category=>({value:category.id,label:category.name})),{value:'__NONE__',label:'Không ghi nhận sự cố / nghỉ học'},{value:'__MISSING__',label:'Chưa phân loại'}]},
    type: {id:'cause',label:'Loại sự cố',previousIds:['pauseReason'],
      valueAliases:Object.fromEntries(categories.flatMap(category=>category.subIncidents.map(item=>[pauseReasonKey(category.id,item.id||item.code),pauseReasonKey(category.id,item.code)]))),
      choices:[...categories.flatMap(category=>category.subIncidents.map(item=>({value:pauseReasonKey(category.id,item.code),label:item.name,group:category.name}))),{value:'__NONE__',label:'Không ghi nhận sự cố / nghỉ học'},{value:'__MISSING__',label:'Chưa phân loại'}] }
  };
}
