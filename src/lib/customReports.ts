import type { ComparisonSettings } from './reportComparison';
import { reportChartNames, type ReportChartKind } from './reportPlot';
export type ReportDatePreset = 'month' | 'previous_month' | 'last_30_days' | 'all' | 'custom';
export type ReportFormat = 'number' | 'percent' | 'score';
export interface ReportMetric {
  id: string; label: string; mode: 'count' | 'distinct' | 'sum' | 'average' | 'ratio';
  field?: string; denominator?: string; format?: ReportFormat;
}
export type ReportRecord = Record<string, string | number | undefined>;
export type ReportFilterValue = string | string[];
export type ReportFilters = Record<string, ReportFilterValue>;
export interface ReportChoice { value: string; label: string; group?: string; depth?: number }
export interface ReportDimension { id: string; label: string; options?: string[]; choices?: ReportChoice[]; recordField?: string }
export const reportFilterValues = (value: ReportFilterValue | undefined): string[] => Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
export const matchesReportFilter = (actual: unknown, selected: ReportFilterValue | undefined): boolean => !reportFilterValues(selected).length || reportFilterValues(selected).includes(String(actual ?? ''));
export const reportFilterLabel = (field: ReportDimension | undefined, value: ReportFilterValue): string => reportFilterValues(value).map(key => field?.choices?.find(item => item.value === key)?.label || key).join(', ');
export const matchesReportField = (record: ReportRecord, field: ReportDimension, selected: ReportFilterValue | undefined): boolean => matchesReportFilter(record[field.recordField || field.id], selected);
export interface ReportDataset {
  id: string; label: string; dateKind: 'event' | 'period' | 'snapshot'; note?: string;
  records: ReportRecord[]; metrics: ReportMetric[]; defaultMetricIds: string[];
  dimensions: ReportDimension[]; filters: ReportDimension[]; detailFields: ReportDimension[];
  filterRecords?: (records: ReportRecord[], filters: ReportFilters) => ReportRecord[];
  groupRecords?: (records: ReportRecord[], groupBy: string, filters: ReportFilters) => Map<string, ReportRecord[]> | null;
  prepareRange?: (range: { start: string; end: string }) => ReportDataset;
  nonAdditiveGroups?: string[];
}
export interface CustomReportConfig {
  datasetId: string; metricIds: string[]; groupBy: string;
  datePreset: ReportDatePreset; from: string; to: string;
  filters: ReportFilters; sort: 'value_desc' | 'label_asc' | 'label_desc';
  comparison?: ComparisonSettings;
  selection?: { by: string; key: string };
  chartType?: ReportChartKind;
  chartMetricId?: string;
}
export interface ReportGroup { key: string; label: string; records: ReportRecord[]; values: Record<string, number | null> }
export interface SavedReportTemplate { id: string; name: string; config: CustomReportConfig }

export function reportToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  return [part('year'), part('month'), part('day')].join('-');
}
const iso = (date: Date) => date.toISOString().slice(0, 10);
export function validReportDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && iso(date) === value;
}
export function reportRange(config: CustomReportConfig, now = new Date()): { from: string; to: string } {
  const today = reportToday(now);
  if (config.datePreset === 'all') return { from: '', to: '' };
  if (config.datePreset === 'custom') return { from: config.from, to: config.to };
  if (config.datePreset === 'month') return { from: today.slice(0, 7) + '-01', to: today };
  const date = new Date(today + 'T00:00:00Z');
  if (config.datePreset === 'last_30_days') {
    date.setUTCDate(date.getUTCDate() - 29);
    return { from: iso(date), to: today };
  }
  date.setUTCDate(0);
  return { from: iso(date).slice(0, 7) + '-01', to: iso(date) };
}
export function defaultReportConfig(dataset: ReportDataset): CustomReportConfig {
  return {
    datasetId: dataset.id, metricIds: dataset.defaultMetricIds, groupBy: dataset.dimensions[0]?.id || 'all',
    datePreset: dataset.dateKind === 'snapshot' ? 'all' : 'month', from: '', to: '', filters: {}, sort: 'value_desc'
  };
}
export function normalizeReportConfig(value: unknown, datasets: ReportDataset[]): CustomReportConfig {
  const raw = value && typeof value === 'object' ? value as Partial<CustomReportConfig> : {};
  const dataset = datasets.find(item => item.id === raw.datasetId) || datasets[0];
  const fallback = defaultReportConfig(dataset);
  const metricIds = Array.isArray(raw.metricIds)
    ? [...new Set(raw.metricIds.filter(id => typeof id === 'string' && dataset.metrics.some(metric => metric.id === id)))]
    : [];
  const filters = Object.fromEntries(dataset.filters.flatMap<[string, ReportFilterValue]>(field => {
    const selected = raw.filters && typeof raw.filters === 'object' ? raw.filters[field.id] : undefined;
    const resolve = (key: string) => {
      if (field.choices?.some(item => item.value === key)) return key;
      const matches = field.choices?.filter(item => item.label === key) || [];
      return matches.length === 1 ? matches[0].value : key;
    };
    return typeof selected === 'string' && selected !== '' ? [[field.id, resolve(selected)]] : Array.isArray(selected) && selected.some(item => typeof item === 'string' && item) ? [[field.id, [...new Set(selected.filter(item => typeof item === 'string' && item).map(resolve))]]] : [];
  }));
  return {
    ...fallback, metricIds: metricIds.length ? metricIds : fallback.metricIds,
    groupBy: dataset.dimensions.some(field => field.id === raw.groupBy) || raw.groupBy === 'all' ? raw.groupBy! : fallback.groupBy,
    datePreset: dataset.dateKind === 'snapshot' ? 'all'
      : ['month', 'previous_month', 'last_30_days', 'all', 'custom'].includes(raw.datePreset || '') ? raw.datePreset! : fallback.datePreset,
    from: typeof raw.from === 'string' && validReportDate(raw.from) ? raw.from : '',
    to: typeof raw.to === 'string' && validReportDate(raw.to) ? raw.to : '',
    filters,
    ...(raw.chartType && Object.hasOwn(reportChartNames, raw.chartType) ? { chartType: raw.chartType } : {}),
    ...(typeof raw.chartMetricId === 'string' && dataset.metrics.some(metric => metric.id === raw.chartMetricId) ? { chartMetricId: raw.chartMetricId } : {}),
    ...(raw.selection && typeof raw.selection.key === 'string' && raw.selection.by === raw.groupBy && (raw.groupBy === 'all' || dataset.dimensions.some(field => field.id === raw.groupBy))
      ? { selection: { by: raw.selection.by, key: raw.selection.key } } : {}),
    ...(raw.comparison && typeof raw.comparison === 'object' ? { comparison: {
      enabled: raw.comparison.enabled === true,
      mode: (['previous', 'year', 'custom'].includes(raw.comparison.mode) ? raw.comparison.mode : 'previous') as ComparisonSettings['mode'],
      start: typeof raw.comparison.start === 'string' && validReportDate(raw.comparison.start) ? raw.comparison.start : '',
      end: typeof raw.comparison.end === 'string' && validReportDate(raw.comparison.end) ? raw.comparison.end : ''
    } } : {}),
    sort: ['value_desc', 'label_asc', 'label_desc'].includes(raw.sort || '') ? raw.sort! : fallback.sort
  };
}
const numeric = (record: ReportRecord, field?: string): number | null => {
  const value = field ? record[field] : undefined;
  if (value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
function aggregate(records: ReportRecord[], metrics: ReportMetric[]): Record<string, number | null> {
  return Object.fromEntries(metrics.map(metric => {
    if (metric.mode === 'count') return [metric.id, records.length];
    if (metric.mode === 'distinct') return [metric.id, new Set(records.map(record => metric.field ? record[metric.field] : undefined).filter(value => value !== undefined && value !== '')).size];
    const values = records.map(record => numeric(record, metric.field)).filter((value): value is number => value !== null);
    const sum = values.reduce((total, value) => total + value, 0);
    if (metric.mode === 'average') return [metric.id, values.length ? sum / values.length : null];
    if (metric.mode === 'ratio') {
      const pairs = records.flatMap(record => {
        const numerator = numeric(record, metric.field), denominator = numeric(record, metric.denominator);
        return numerator === null || denominator === null ? [] : [{ numerator, denominator }];
      });
      const denominator = pairs.reduce((total, pair) => total + pair.denominator, 0);
      return [metric.id, denominator > 0 ? pairs.reduce((total, pair) => total + pair.numerator, 0) / denominator * 100 : null];
    }
    return [metric.id, sum];
  }));
}
function groupKey(record: ReportRecord, groupBy: string): string {
  if (groupBy === 'all') return 'Tất cả';
  const date = String(record.date || '');
  if (['day', 'week', 'month'].includes(groupBy)) {
    if (!validReportDate(date)) return 'Chưa có ngày';
    if (groupBy === 'day') return date;
    if (groupBy === 'month') return date.slice(0, 7);
    const monday = new Date(date + 'T00:00:00Z');
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    return iso(monday);
  }
  return String(record[groupBy] ?? '').trim() || 'Chưa phân loại';
}
function groupLabel(key: string, groupBy: string): string {
  if (key === 'Chưa có ngày') return key;
  if (groupBy === 'month') return 'Tháng ' + key.slice(5, 7) + '/' + key.slice(0, 4);
  if (groupBy === 'day' || groupBy === 'week') {
    const formatted = key.slice(8, 10) + '/' + key.slice(5, 7) + '/' + key.slice(0, 4);
    return groupBy === 'week' ? 'Tuần từ ' + formatted : formatted;
  }
  return key;
}
export interface ReportResult { rows: ReportGroup[]; records: ReportRecord[]; metrics: ReportMetric[]; totals: Record<string, number | null>; range: { from: string; to: string }; invalidRange: boolean }
export function buildCustomReport(dataset: ReportDataset, config: CustomReportConfig, now = new Date()): ReportResult {
  config = { ...config, filters: Object.fromEntries(Object.entries(config.filters).map(([id, value]) => {
    const choices = dataset.filters.find(field => field.id === id)?.choices;
    const resolve = (key: string) => {
      if (choices?.some(item => item.value === key)) return key;
      const matches = choices?.filter(item => item.label === key) || [];
      return matches.length === 1 ? matches[0].value : key;
    };
    return [id, Array.isArray(value) ? value.map(resolve) : resolve(value)];
  })) };
  const range = reportRange(config, now);
  const invalidRange = dataset.dateKind !== 'snapshot' && (
    (config.datePreset === 'custom' && (!validReportDate(range.from) || !validReportDate(range.to))) ||
    Boolean(range.from && range.to && range.from > range.to)
  );
  if (dataset.prepareRange && !invalidRange) return buildCustomReport(dataset.prepareRange({ start: range.from, end: range.to }), config, now);
  const metrics = config.metricIds.map(id => dataset.metrics.find(metric => metric.id === id)).filter((metric): metric is ReportMetric => Boolean(metric));
  const datedRecords = invalidRange ? [] : dataset.records.filter(record => {
    if (dataset.dateKind !== 'snapshot' && (range.from || range.to)) {
      const start = String(record.date || '');
      const end = dataset.dateKind === 'period' ? String(record.dateTo || start) : start;
      if (!validReportDate(start) || !validReportDate(end)) return false;
      if (range.from && end < range.from || range.to && start > range.to) return false;
    }
    return true;
  });
  const records = dataset.filterRecords ? dataset.filterRecords(datedRecords, config.filters) : datedRecords.filter(record =>
    dataset.filters.every(field => matchesReportField(record, field, config.filters[field.id])));
  const customGroups = dataset.groupRecords?.(records, config.groupBy, config.filters);
  const groups = customGroups || new Map<string, ReportRecord[]>();
  if (!customGroups) records.forEach(record => {
    const dimension = dataset.dimensions.find(field => field.id === config.groupBy);
    const key = dimension?.recordField ? String(record[dimension.recordField] ?? 'Chưa xác định') : groupKey(record, config.groupBy);
    groups.set(key, [...(groups.get(key) || []), record]);
  });
  const selected = config.selection?.by === config.groupBy ? config.selection : null;
  const reportRecords = selected ? groups.get(selected.key) || [] : records;
  const rows: ReportGroup[] = Array.from(groups, ([key, items]) => ({
    key, label: dataset.dimensions.find(field => field.id === config.groupBy)?.choices?.find(item => item.value === key)?.label || groupLabel(key, config.groupBy), records: items, values: aggregate(items, metrics)
  })).filter(row => !selected || row.key === selected.key);
  rows.sort((a, b) => {
    if (config.sort === 'value_desc') {
      const difference = (b.values[metrics[0]?.id] ?? -Infinity) - (a.values[metrics[0]?.id] ?? -Infinity);
      if (Number.isFinite(difference) && difference !== 0) return difference;
      if (a.values[metrics[0]?.id] == null && b.values[metrics[0]?.id] != null) return 1;
      if (b.values[metrics[0]?.id] == null && a.values[metrics[0]?.id] != null) return -1;
    }
    const comparison = a.label.localeCompare(b.label, 'vi', { numeric: true });
    return config.sort === 'label_desc' ? -comparison : comparison;
  });
  return { rows, records: reportRecords, metrics, totals: aggregate(reportRecords, metrics), range, invalidRange };
}
export function formatReportValue(value: number | null | undefined, metric: ReportMetric): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: metric.format === 'percent' || metric.format === 'score' ? 2 : 0 }).format(value) + (metric.format === 'percent' ? '%' : '');
}
export function reportCsvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function customReportCsv(rows: ReportGroup[], metrics: ReportMetric[], groupLabel: string): string {
  const lines = [[groupLabel, ...metrics.map(metric => metric.label)], ...rows.map(row => [
    row.label, ...metrics.map(metric => row.values[metric.id] == null ? '' : Number(row.values[metric.id]!.toFixed(4)))
  ])];
  return '\uFEFF' + lines.map(line => line.map(reportCsvCell).join(',')).join('\r\n');
}
