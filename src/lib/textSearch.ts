export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLocaleLowerCase('vi').trim();
}

/** Match every word, allowing names and codes to be entered without accents. */
export function matchesSearch(query: string, ...values: unknown[]): boolean {
  const text = normalizeSearch(values.filter(value => value != null).join(' '));
  return normalizeSearch(query).split(/\s+/).filter(Boolean).every(word => text.includes(word));
}
