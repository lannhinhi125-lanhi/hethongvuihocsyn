import assert from 'node:assert/strict';
import { supabase } from '../src/config/supabase';
import { loginAccount } from '../src/lib/accountSession';
import { loadBusinessData, getBusinessSnapshot } from '../src/lib/businessPersistence';

let stall = true;
const actor = { madinhdanh: 'ADMIN', hoten: 'Admin', trangthai: 'active' };
(supabase as any).schema = () => ({ rpc(name: string) {
  if (name === 'vuihoc_login') return Promise.resolve({ data: { token: 'test', actor, users: [actor], role_groups: [] } });
  return { abortSignal(signal: AbortSignal) {
    if (!stall) return Promise.resolve({ data: {} });
    return new Promise(resolve => signal.addEventListener('abort', () => resolve({ error: { message: 'aborted' } }), { once: true }));
  } };
} });
const originalSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = ((callback: any, delay: number, ...args: any[]) => originalSetTimeout(callback, delay === 30_000 ? 0 : delay, ...args)) as typeof setTimeout;
try {
  await loginAccount('admin', 'test');
  await loadBusinessData();
  assert.equal(getBusinessSnapshot().loading, false);
  assert.equal(getBusinessSnapshot().errorOperation, 'load');
  assert.match(getBusinessSnapshot().error, /Supabase quá 30 giây/);
  stall = false;
  await loadBusinessData();
  assert.equal(getBusinessSnapshot().error, '');
  assert.ok(getBusinessSnapshot().loadedAt);
  console.log('Stalled business load exits loading and can be retried successfully.');
} finally {
  globalThis.setTimeout = originalSetTimeout;
}
