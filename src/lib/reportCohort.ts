import { reportCreationDate } from './reportCreationDate';

/** Unknown creation dates are visible in the complete list, never attributed to a period. */
export function createdInReportRange(value: string | undefined, range: {start:string;end:string}) {
  if (!range.start && !range.end) return true;
  const date = reportCreationDate(value);
  return Boolean(date) && (!range.start || date >= range.start) && (!range.end || date <= range.end);
}
