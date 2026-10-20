import { workbenchRange } from './workbenchTime';
import { moveCalendarDate, displayVietnameseDate } from './vietnameseCalendar';

export function availabilityWeeks(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return [];
  const first = month + '-01';
  const start = workbenchRange(first, 'week').start;
  const result: {id:string;label:string;from:string;to:string}[] = [];
  for (let day = start; day <= workbenchRange(first, 'month').end; day = moveCalendarDate(day, 7)) {
    const to = moveCalendarDate(day, 6);
    result.push({id:day,from:day,to,label:displayVietnameseDate(day) + ' – ' + displayVietnameseDate(to)});
  }
  return result;
}
