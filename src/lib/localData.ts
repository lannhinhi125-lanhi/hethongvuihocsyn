/** Chỉ giữ trạng thái tạm trong bộ nhớ, không ghi dữ liệu nghiệp vụ lên máy. */
const values = new Map<string, string>();
export const runtimeStorage = {
  getItem: (key: string): string | null => values.get(key) ?? null,
  setItem: (key: string, value: string): void => { values.set(key, value); },
  removeItem: (key: string): void => { values.delete(key); },
  clear: (): void => { values.clear(); }
};

/** Dọn tất cả phiên bản cache Vuihoc; không đụng dữ liệu ứng dụng khác cùng origin. */
export function clearLegacyStorage(storage: Storage): number {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && /^vuihoc(?:_|$)/i.test(key)) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
  return keys.length;
}

export function clearLegacyBrowserData(): boolean {
  if (typeof window === 'undefined') return true;
  let cleared = true;
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    try { clearLegacyStorage(window[name]); }
    catch { cleared = false; console.error('Không thể xóa cache Vuihoc trong ' + name); }
  }
  return cleared;
}
