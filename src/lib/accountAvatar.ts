export function accountAvatarInitials(account: { username?: unknown; name?: unknown }): string {
  const username = typeof account.username === 'string' ? account.username.trim() : '';
  const parts = username.match(/[\p{L}\p{N}]+/gu) || [];
  const letters = parts.length > 1 ? parts.slice(0, 2).map(part => Array.from(part)[0]).join('') : Array.from(parts[0] || '').slice(0, 2).join('');
  if (letters) return letters.toLocaleUpperCase('vi');
  const name = typeof account.name === 'string' ? account.name.trim() : '';
  return name.split(/\s+/).filter(Boolean).slice(-2).map(part => Array.from(part)[0]).join('').toLocaleUpperCase('vi') || 'VH';
}
