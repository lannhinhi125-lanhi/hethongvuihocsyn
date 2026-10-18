import { reportCsvCell, validReportDate, type ReportGroup, type ReportMetric } from './customReports';

export interface ComparisonRange { start: string; end: string }
export interface ComparisonSettings { enabled: boolean; mode: 'previous' | 'year' | 'custom'; start: string; end: string }
export const defaultComparison: ComparisonSettings = { enabled: false, mode: 'previous', start: '', end: '' };
export interface ComparisonRow {
  key: string; label: string; currentLabel?: string; previousLabel?: string;
  currentKey?: string; previousKey?: string;
  current: Record<string, number | null>; previous: Record<string, number | null>;
}
const DAY = 86400000;
const timestamp = (value: string) => Date.parse(value + 'T00:00:00Z');
const iso = (value: number) => new Date(value).toISOString().slice(0, 10);
export const finiteRange = (range: ComparisonRange) => validReportDate(range.start) && validReportDate(range.end) && range.start <= range.end;
export const rangeDays = (range: ComparisonRange) => finiteRange(range) ? Math.round((timestamp(range.end) - timestamp(range.start)) / DAY) + 1 : 0;
export const formatComparisonRange = (range: ComparisonRange) => finiteRange(range) ? `${range.start.split('-').reverse().join('/')} – ${range.end.split('-').reverse().join('/')}` : 'Chưa chọn kỳ';

export function comparisonRange(current: ComparisonRange, settings: ComparisonSettings): ComparisonRange {
  if (!finiteRange(current)) return { start: '', end: '' };
  if (settings.mode === 'custom') return { start: settings.start, end: settings.end };
  if (settings.mode === 'year') {
    const lastYear = (value: string) => {
      const [year, month, day] = value.split('-').map(Number);
      const lastDay = new Date(Date.UTC(year - 1, month, 0)).getUTCDate();
      return iso(Date.UTC(year - 1, month - 1, Math.min(day, lastDay)));
    };
    return { start: lastYear(current.start), end: lastYear(current.end) };
  }
  // A complete calendar month compares with the preceding calendar month.
  const [year, month] = current.start.split('-').map(Number);
  if (current.start.endsWith('-01') && current.end === iso(Date.UTC(year, month, 0))) {
    return { start: iso(Date.UTC(year, month - 2, 1)), end: iso(Date.UTC(year, month - 1, 0)) };
  }
  const days = rangeDays(current);
  return { start: iso(timestamp(current.start) - days * DAY), end: iso(timestamp(current.start) - DAY) };
}

export function comparisonIssue(current: ComparisonRange, previous: ComparisonRange): string | null {
  if (!finiteRange(current)) return 'Chọn đủ ngày bắt đầu và kết thúc của kỳ đang xem để so sánh.';
  if (!finiteRange(previous)) return 'Chọn đủ ngày đối chiếu, với ngày bắt đầu không sau ngày kết thúc.';
  if (current.start <= previous.end && previous.start <= current.end) return 'Hai kỳ đang trùng ngày. Chọn kỳ đối chiếu không giao với kỳ đang xem.';
  return null;
}

export function reportChange(current: number | null | undefined, previous: number | null | undefined, metric: Pick<ReportMetric, 'format'>) {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous)) return { difference: null, label: 'Chưa đủ dữ liệu', relative: '' };
  const difference = Math.round((current - previous) * 1e8) / 1e8;
  const value = Math.abs(difference).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
  const label = difference === 0 ? 'Không đổi' : `${difference > 0 ? '+' : '−'}${value}${metric.format === 'percent' ? ' điểm phần trăm' : metric.format === 'score' ? ' điểm' : ''}`;
  const relative = metric.format === 'percent' || metric.format === 'score' ? '' : previous === 0
    ? current === 0 ? '' : 'Kỳ đối chiếu bằng 0; không tính %'
    : `${difference > 0 ? '+' : difference < 0 ? '−' : ''}${(Math.abs(difference / previous) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;
  return { difference, label, relative };
}

export const metricDirection = (datasetId: string, metricId: string): 'up' | 'down' | 'neutral' => {
  if (datasetId === 'incidents') return ['rate', 'incidents', 'urgent', 'notice'].includes(metricId) ? 'down' : 'neutral';
  if (['score', 'qualified', 'growth'].includes(metricId)) return 'up';
  if (['classes', 'students', 'teachers'].includes(datasetId) && metricId === 'count') return 'up';
  return 'neutral';
};

const emptyValues = (metrics: ReportMetric[], outside = false) => Object.fromEntries(metrics.map(metric => [metric.id,
  outside || ['average', 'ratio'].includes(metric.mode) ? null : 0]));
const temporalGroups = ['day', 'week', 'month', 'period'];
const monthIndex = (value: string) => Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7)) - 1;
const weekStart = (value: string) => timestamp(value) - ((new Date(timestamp(value)).getUTCDay() + 6) % 7) * DAY;
const slot = (key: string, range: ComparisonRange, groupBy: string) => groupBy === 'month' || groupBy === 'period'
  ? monthIndex(key) - monthIndex(range.start)
  : groupBy === 'week' ? Math.round((weekStart(key) - weekStart(range.start)) / (7 * DAY))
  : Math.round((timestamp(key) - timestamp(range.start)) / DAY);

/** Match categories by identity; match time buckets by their relative position within each period. */
export function alignComparisonRows(current: ReportGroup[], previous: ReportGroup[], metrics: ReportMetric[],
  currentRange: ComparisonRange, previousRange: ComparisonRange, groupBy: string): ComparisonRow[] {
  const temporal = temporalGroups.includes(groupBy) && finiteRange(currentRange) && finiteRange(previousRange);
  const keyFor = (row: ReportGroup, range: ComparisonRange) => temporal && /^\d{4}-\d{2}/.test(row.key) ? String(slot(row.key, range, groupBy)) : row.key;
  const currentMap = new Map(current.map(row => [keyFor(row, currentRange), row]));
  const previousMap = new Map(previous.map(row => [keyFor(row, previousRange), row]));
  const keys = [...new Set([...currentMap.keys(), ...previousMap.keys()])];
  if (temporal) {
    const last = Math.max(slot(currentRange.end, currentRange, groupBy), slot(previousRange.end, previousRange, groupBy));
    // Preserve empty buckets between observations so line charts have a true time axis.
    for (let index = 0; index <= last; index++) if (!currentMap.has(String(index)) && !previousMap.has(String(index))) keys.push(String(index));
  }
  if (temporal) keys.sort((a, b) => Number(a) - Number(b));
  return keys.map(key => {
    const now = currentMap.get(key), before = previousMap.get(key);
    const unit = groupBy === 'day' ? 'Ngày' : groupBy === 'week' ? 'Tuần' : 'Tháng';
    const outside = (range: ComparisonRange) => temporal && Number.isFinite(Number(key)) && Number(key) > slot(range.end, range, groupBy);
    const expectedLabel = (range: ComparisonRange) => {
      if (!temporal || !Number.isFinite(Number(key)) || outside(range)) return undefined;
      const index = Number(key);
      if (groupBy === 'month' || groupBy === 'period') {
        const start = new Date(timestamp(range.start));
        const value = iso(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1)).slice(0, 7);
        return groupBy === 'period' ? value : 'Tháng ' + value.slice(5, 7) + '/' + value.slice(0, 4);
      }
      const value = iso(groupBy === 'week' ? weekStart(range.start) + index * 7 * DAY : timestamp(range.start) + index * DAY);
      return (groupBy === 'week' ? 'Tuần từ ' : '') + value.split('-').reverse().join('/');
    };
    return { key, label: temporal && Number.isFinite(Number(key)) ? `${unit} ${Number(key) + 1}` : now?.label || before!.label,
      currentLabel: now?.label || expectedLabel(currentRange), previousLabel: before?.label || expectedLabel(previousRange), currentKey: now?.key, previousKey: before?.key,
      current: now?.values || emptyValues(metrics, outside(currentRange)), previous: before?.values || emptyValues(metrics, outside(previousRange)) };
  });
}

export function comparisonCsv(rows: ComparisonRow[], metrics: ReportMetric[], current: ComparisonRange, previous: ComparisonRange): string {
  const lines: unknown[][] = [
    ['Kỳ hiện tại', formatComparisonRange(current)], ['Kỳ đối chiếu', formatComparisonRange(previous)],
    ['Nhóm', 'Nhóm kỳ hiện tại', 'Nhóm kỳ đối chiếu', ...metrics.flatMap(metric => [`${metric.label}: hiện tại`, `${metric.label}: đối chiếu`, `${metric.label}: chênh lệch`, `${metric.label}: thay đổi`])],
    ...rows.map(row => [row.label, row.currentLabel || '', row.previousLabel || '', ...metrics.flatMap(metric => {
      const change = reportChange(row.current[metric.id], row.previous[metric.id], metric);
      return [row.current[metric.id] ?? '', row.previous[metric.id] ?? '', change.difference ?? '', change.relative];
    })])
  ];
  return '\uFEFF' + lines.map(line => line.map(reportCsvCell).join(',')).join('\r\n');
}
