import type {WorkbenchRange} from './workbenchTime';
import type {MonthPayrollData,DisputeItem} from '../types';

export type DashboardSelection =
 | {module:4;tab:'students'|'classes'|'materials';label:string;ids:string[];range?:WorkbenchRange}
 | {module:5;tab:'diary'|'incidents';label:string;ids:string[];range:WorkbenchRange}
 | {module:7;tab:'disputes';label:string;ids:string[];range:WorkbenchRange};

// An empty selection means zero matching records, never an unfiltered list.
export function matchesDashboardSelection(selection:DashboardSelection|null|undefined,id:string) {
 return !selection || selection.ids.includes(id);
}

export function dashboardDisputes(payroll:Record<string,MonthPayrollData>,range:WorkbenchRange,ids?:string[]) {
 return Object.entries(payroll).filter(([month])=>month>=range.start.slice(0,7)&&month<=range.end.slice(0,7))
  .flatMap(([,data])=>data.disputes||[]).filter(dispute=>!ids||ids.includes(dispute.id));
}

export function dashboardDisputeMonth(payroll:Record<string,MonthPayrollData>,dispute:Pick<DisputeItem,'id'>,fallback:string) {
 return Object.entries(payroll).find(([,data])=>data.disputes?.some(row=>row.id===dispute.id))?.[0]||fallback;
}
