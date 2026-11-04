import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const listOrder = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(readFileSync('src/lib/listOrder.ts', 'utf8'))).toString('base64'));
const key = 'vuihoc_session_token';
const actor = { id: 'admin', status: 'active' };
const payload = { actor, users: [actor], role_groups: [] };
let harnessId = 0;
async function sessionHarness({ stored, legacy } = {}) {
  const local = new Map(stored ? [[key, stored]] : []);
  const session = new Map(legacy ? [[key, legacy]] : []);
  const storage = map => ({ getItem: name => map.get(name) ?? null, setItem: (name, value) => map.set(name, value), removeItem: name => map.delete(name) });
  const responses = [];
  const calls = [];
  const mocks = {
    ...listOrder, localStorage: storage(local), sessionStorage: storage(session),
    useSyncExternalStore: () => {}, saveErrorMessage: error => error.message,
    fromSupabaseRow: (_dataset, row) => row, toSupabaseRow: (_dataset, row) => row,
    supabase: { schema: () => ({ rpc: (name, args) => {
      calls.push({ name, args });
      const result = responses.shift();
      const promise = result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
      promise.abortSignal = () => promise;
      return promise;
    } }) },
  };
  const id = `__sessionTest${++harnessId}`;
  globalThis[id] = mocks;
  const source = readFileSync('src/lib/accountSession.ts', 'utf8').replace(/^import .*;\r?\n/gm, '');
  const prefix = `const {orderRecords,recordSortTime,localStorage,sessionStorage,useSyncExternalStore,saveErrorMessage,fromSupabaseRow,toSupabaseRow,supabase}=globalThis.${id};\n`;
  const module = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(prefix + source)).toString('base64')}`);
  delete globalThis[id];
  return { module, local, session, responses, calls };
}

test('network and query failures preserve the signed-in actor, token and loaded accounts', async () => {
  const h = await sessionHarness();
  h.responses.push({ data: { ...payload, token: 'token' } });
  await h.module.loginAccount('admin', 'password');
  const original = h.module.getAccountSnapshot();
  for (const error of [new Error('Failed to fetch'), { error: { code: '57014', message: 'statement timeout' } }]) {
    h.responses.push(error);
    assert.equal(await h.module.refreshAccountSession(), false);
    assert.equal(h.module.getAccountSnapshot().actor, original.actor);
    assert.equal(h.module.getAccountSnapshot().users, original.users);
    assert.equal(h.session.get(key), 'token');
  }
  h.responses.push({ data: payload });
  assert.equal(await h.module.refreshAccountSession(), true);
  assert.equal(h.module.getAccountSnapshot().error, '');
});

test('tab sessions survive reload and ignore shared legacy logins', async () => {
  const h = await sessionHarness({ stored: 'shared-token', legacy: 'tab-token' });
  h.responses.push({ data: payload });
  await h.module.refreshAccountSession();
  assert.equal(h.calls.at(-1).args.p_token, 'tab-token');
  const restarted = await sessionHarness({ legacy: h.session.get(key) });
  restarted.responses.push({ data: payload });
  assert.equal(await restarted.module.refreshAccountSession(), true);
  const newTab = await sessionHarness({ stored: 'shared-token' });
  assert.equal(newTab.module.hasRememberedAccountSession(), false);
});

test('logging in and out of a teacher tab preserves the admin tab', async () => {
  const admin = await sessionHarness();
  const teacher = await sessionHarness();
  admin.responses.push({ data: { ...payload, token: 'admin-token' } });
  await admin.module.loginAccount('admin', 'password');
  teacher.responses.push({ data: { ...payload, actor: { id: 'teacher' }, token: 'teacher-token' } });
  await teacher.module.loginAccount('teacher', 'password');
  assert.equal(admin.module.getAccountSnapshot().actor.id, 'admin');
  assert.equal(teacher.module.getAccountSnapshot().actor.id, 'teacher');
  assert.equal(admin.module.getAccountSessionToken(), 'admin-token');
  assert.equal(teacher.module.getAccountSessionToken(), 'teacher-token');
  assert.equal(admin.local.has(key), false);
  assert.equal(teacher.local.has(key), false);
  teacher.responses.push({ data: {} });
  await teacher.module.logoutAccount();
  assert.equal(admin.module.getAccountSessionToken(), 'admin-token');
  assert.equal(admin.session.get(key), 'admin-token');
  assert.equal(teacher.session.has(key), false);
});

test('a failed startup retains its token and can reconnect without login', async () => {
  const h = await sessionHarness({ legacy: 'token' });
  h.responses.push(new Error('offline'));
  assert.equal(await h.module.refreshAccountSession(), false);
  assert.equal(h.module.hasRememberedAccountSession(), true);
  assert.equal(h.module.getAccountSnapshot().loading, false);
  h.responses.push({ data: payload });
  assert.equal(await h.module.refreshAccountSession(), true);
});

test('explicit logout clears storage and revokes the server session', async () => {
  const h = await sessionHarness({ legacy: 'token' });
  h.responses.push({ data: payload });
  await h.module.refreshAccountSession();
  h.responses.push({ data: {} });
  await h.module.logoutAccount();
  assert.equal(h.session.has(key), false);
  assert.equal(h.module.getAccountSnapshot().actor, null);
  assert.deepEqual(h.calls.at(-1), { name: 'vuihoc_logout', args: { p_token: 'token' } });
});

test('an explicit server rejection still revokes local access', async () => {
  const h = await sessionHarness({ legacy: 'token' });
  h.responses.push({ data: payload });
  await h.module.refreshAccountSession();
  h.responses.push({ error: { message: 'Phiên đã hết hạn hoặc tài khoản chưa được gán nhóm quyền.' } });
  assert.equal(await h.module.refreshAccountSession(), false);
  assert.equal(h.module.getAccountSnapshot().actor, null);
  assert.equal(h.session.has(key), false);
});

async function businessHarness() {
  const responses = [];
  const calls = [];
  const id = `__businessTest${++harnessId}`;
  globalThis[id] = {
    ...listOrder, useCallback: fn => fn, useSyncExternalStore: () => {}, recordChanges: () => [],
    fromSupabaseRow: (_dataset, row) => ({ ...row }), toSupabaseRow: (_dataset, row) => ({ ...row }),
    teacherSessionRequest: async name => {
      calls.push(name);
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return await next;
    },
  };
  const source = readFileSync('src/lib/businessPersistence.ts', 'utf8').replace(/^import .*;\r?\n/gm, '');
  const prefix = `const {orderRecords,recordSortTime,useCallback,useSyncExternalStore,recordChanges,fromSupabaseRow,toSupabaseRow,teacherSessionRequest}=globalThis.${id};\n`;
  const module = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(prefix + source)).toString('base64')}`);
  delete globalThis[id];
  return { module, responses, calls };
}

test('manual data refresh preserves existing rows on error and reads fresh server rows on retry', async () => {
  const h = await businessHarness();
  h.responses.push({ students: [{ id: 'HS-1', name: 'Original' }] });
  await h.module.loadBusinessData();
  const original = h.module.getBusinessSnapshot().data;
  h.responses.push(new Error('offline'));
  assert.equal(await h.module.refreshBusinessData(), false);
  assert.equal(h.module.getBusinessSnapshot().data, original);
  h.responses.push({ students: [{ id: 'HS-1', name: 'Updated' }, { id: 'HS-2', name: 'New' }] });
  assert.equal(await h.module.refreshBusinessData(), true);
  assert.deepEqual(h.module.getBusinessSnapshot().data.students.map(row => row.name), ['Updated', 'New']);
  assert.equal(h.module.getBusinessSnapshot().refreshError, '');
});

test('refresh requests share one query and discard data arriving after logout/reset', async () => {
  const h = await businessHarness();
  h.responses.push({ students: [{ id: 'HS-1' }] });
  await h.module.loadBusinessData();
  let resolve;
  h.responses.push(new Promise(done => { resolve = done; }));
  const first = h.module.refreshBusinessData();
  const second = h.module.refreshBusinessData();
  assert.equal(first, second);
  assert.equal(h.calls.length, 2);
  h.module.resetBusinessData();
  resolve({ students: [{ id: 'private-data' }] });
  assert.equal(await first, false);
  assert.deepEqual(h.module.getBusinessSnapshot().data, {});
});

test('newest rows remain first after initial load and data refresh', async () => {
  const h = await businessHarness();
  const old = { id: 'old', created_at: '2026-11-01T10:00:00Z' };
  const recent = { id: 'recent', created_at: '2026-11-03T10:00:00Z' };
  h.responses.push({ students: [old, recent], teachers: [old, recent], classes: [old, recent] });
  await h.module.loadBusinessData();
  for (const key of ['students', 'teachers', 'classes']) assert.equal(h.module.getBusinessSnapshot().data[key][0].id, 'recent');
  const newest = { id: 'newest', created_at: '2026-11-03T11:00:00Z' };
  h.responses.push({ students: [old, recent, newest] });
  await h.module.refreshBusinessData();
  assert.deepEqual(h.module.getBusinessSnapshot().data.students.map(row => row.id), ['newest', 'recent', 'old']);
});
