export type ListOrder = 'default' | 'newest' | 'oldest';

function timestamp(value: unknown): number | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const local = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const normalized = local ? `${local[3]}-${local[2]}-${local[1]}` : value;
  if (!/^\d{4}-\d{2}-\d{2}(?:$|T| )/.test(normalized)) return undefined;
  const time = Date.parse(normalized);
  return Number.isFinite(time) ? time : undefined;
}

/** Creation time for profiles; business date for lessons, history and work records. */
export function recordSortTime(record: unknown): number | undefined {
  if (!record || typeof record !== 'object') return undefined;
  const row = record as Record<string, unknown>;
  for (const field of ['created_at', 'createdAt', 'occurredAt', 'registeredAt', 'dateISO', 'date', 'dateStr', 'sessionDate', 'evaluationDate', 'submittedAt', 'reportedAt', 'incidentUpdatedAt', 'updatedAt', 'fromDate', 'startDate']) {
    const time = timestamp(row[field]);
    if (time !== undefined) return time;
  }
  for (const field of ['lesson', 'student', 'teacher', 'item', 'record', 'cls', 'incident', 'session', 'material']) {
    if (row[field] && row[field] !== record) {
      const time = recordSortTime(row[field]);
      if (time !== undefined) return time;
    }
  }
  for (const field of ['sessions', 'records']) {
    if (!Array.isArray(row[field])) continue;
    const times = row[field].map(recordSortTime).filter((time): time is number => time !== undefined);
    if (times.length) return Math.max(...times);
  }
  return undefined;
}

/** Unknown dates stay at the end; equal dates preserve the existing order. */
export function orderRecords<T>(items: readonly T[], order: ListOrder, time: (item: T) => number | undefined): T[] {
  if (order === 'default') return [...items];
  return items.map((item, index) => ({item, index, time: time(item)})).sort((a, b) => {
    if (a.time === undefined) return b.time === undefined ? a.index - b.index : 1;
    if (b.time === undefined) return -1;
    return (order === 'newest' ? b.time - a.time : a.time - b.time) || a.index - b.index;
  }).map(entry => entry.item);
}
