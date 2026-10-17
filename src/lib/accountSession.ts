import { useSyncExternalStore, type SetStateAction } from 'react';
import { supabase } from '../config/supabase';
import { fromSupabaseRow, toSupabaseRow } from './supabaseMapper';
import type { UserAccount, SystemRoleGroup } from '../types';

type Snapshot = { actor: UserAccount | null; users: UserAccount[]; groups: SystemRoleGroup[]; loading: boolean; saving: boolean; error: string; saved: boolean };
let state: Snapshot = { actor: null, users: [], groups: [], loading: true, saving: false, error: '', saved: false };
const listeners = new Set<() => void>();
const KEY = 'vuihoc_session_token';
export function getAccountSessionToken(): string {
  if (!token || !state.actor) throw new Error('Vui lòng đăng nhập lại.');
  return token;
}
let token: string | null = null;
try { token = sessionStorage.getItem(KEY); } catch { /* Phiên vẫn dùng được trong bộ nhớ. */ }
let generation = 0;
let revision = 0;
let flushing = false;
let pending: { dataset: 'users' | 'role_groups'; before: object | null; after: object | null; password?: string }[] = [];
let confirmed: Snapshot = state;
let timer: ReturnType<typeof setTimeout> | undefined;
function publish(next: Snapshot) { state = next; listeners.forEach(listener => listener()); }
function remember(value: string | null) { token = value; try { if (value) sessionStorage.setItem(KEY,value); else sessionStorage.removeItem(KEY); } catch { /* Bộ nhớ là nguồn dự phòng. */ } }
async function rpc(name: string, args: Record<string,unknown>, signal?: AbortSignal) {
  const request = supabase.schema('public').rpc(name,args);
  const { data, error } = await (signal ? request.abortSignal(signal) : request);
  if (error) throw new Error(error.code === 'PGRST202'
    ? (name === 'vuihoc_business_data' || name === 'vuihoc_save_business' || name === 'vuihoc_ai_usage' || name === 'vuihoc_report_lesson_incident' ? 'Hãy chạy migration 20261011_business_persistence.sql trong Supabase.' : name.startsWith('vuihoc_teacher_') || name === 'vuihoc_create_teacher' ? 'Hãy chạy migration 20261011_teacher_persistence.sql trong Supabase.' : name === 'vuihoc_reveal_password' ? 'Hãy chạy migration 20261012_plaintext_passwords.sql trong Supabase để xem mật khẩu.' : 'Chưa có SQL đăng nhập. Hãy chạy migration 20261011_simple_accounts.sql trong Supabase.')
    : error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}
function hydrate(data: {actor: Record<string,unknown>; users: Record<string,unknown>[]; role_groups: Record<string,unknown>[]}) {
  const next: Snapshot = { actor: fromSupabaseRow('users',data.actor) as unknown as UserAccount,
    users: data.users.map(row => fromSupabaseRow('users',row) as unknown as UserAccount),
    groups: data.role_groups.map(row => fromSupabaseRow('role_groups',row) as unknown as SystemRoleGroup),
    loading: false, saving: false, error: '', saved: state.saved };
  confirmed=next; publish(next);
}
export async function refreshAccountSession() {
  if (!token || state.saving || pending.length) { if (!token) publish({...state,loading:false}); return; }
  const version=generation, startRevision=revision;
  try { const data=await rpc('vuihoc_session',{p_token:token}); if(version===generation && startRevision===revision) hydrate(data); }
  catch(error) { if(version!==generation || startRevision!==revision)return; remember(null); publish({...state,actor:null,users:[],groups:[],loading:false,error:(error as Error).message}); }
}
export async function loginAccount(username: string,password: string) {
  const version=++generation;
  const data=await rpc('vuihoc_login',{p_username:username,p_password:password});
  if(version!==generation)return;
  remember(data.token); hydrate(data);
}
export async function logoutAccount() {
  const oldToken=token; ++generation; remember(null); pending=[]; clearTimeout(timer);
  confirmed={actor:null,users:[],groups:[],loading:false,saving:false,error:'',saved:false}; publish(confirmed);
  if(oldToken) { try { await rpc('vuihoc_logout',{p_token:oldToken}); } catch { /* Phiên cục bộ đã đóng; phiên DB tự hết hạn. */ } }
}
async function flush() {
  if(flushing || !pending.length || !token) return;
  flushing=true; const version=generation;
  try {
    while(pending.length && token && version===generation) {
      const changes=pending; pending=[];
      await rpc('vuihoc_save_accounts',{p_token:token,p_changes:changes});
      if(version!==generation)return;
      let users=[...confirmed.users], groups=[...confirmed.groups];
      for(const c of changes) {
        const rows=c.dataset==='users'?users:groups;
        const row=c.after?fromSupabaseRow(c.dataset,c.after as Record<string,unknown>):null;
        const id=(row?.id || (c.before as Record<string,unknown>)?.madinhdanh) as string;
        const updated=rows.filter(item=>item.id!==id);
        if(row)updated.push(row as unknown as UserAccount & SystemRoleGroup);
        if(c.dataset==='users')users=updated as UserAccount[]; else groups=updated as SystemRoleGroup[];
      }
      confirmed={...confirmed,users,groups,saved:true};
    }
    if(version!==generation)return;
    publish({...state,saving:false,saved:true});
    await refreshAccountSession();
  } catch(error) {
    if(version!==generation)return;
    pending=[]; publish({...confirmed,saving:false,error:(error as Error).message,saved:false});
  } finally { flushing=false; if(pending.length)void flush(); }
}

function change(dataset: 'users' | 'role_groups', action: SetStateAction<UserAccount[]> | SetStateAction<SystemRoleGroup[]>) {
  if(!token || !state.actor) return;
  const before=dataset==='users'?state.users:state.groups;
  const after=typeof action==='function' ? (action as (rows: typeof before)=>typeof before)(before) : action;
  const old=new Map(before.map(row=>[row.id,row])); const next=new Map(after.map(row=>[row.id,row]));
  for(const id of new Set([...old.keys(),...next.keys()])) {
    const b=old.get(id),a=next.get(id);
    if(JSON.stringify(b)===JSON.stringify(a))continue;
    pending.push({dataset,before:b?toSupabaseRow(dataset,b):null,after:a?toSupabaseRow(dataset,a):null,
      ...(dataset==='users' && a && 'passwordRaw' in a && a.passwordRaw ? {password:a.passwordRaw} : {})});
  }
  if(!pending.length)return;
  revision++;
  publish({...state,...(dataset==='users'?{users:after as UserAccount[]}:{groups:after as SystemRoleGroup[]}),saving:true,saved:false,error:''});
  clearTimeout(timer); timer=setTimeout(()=>void flush(),0);
}
export const setSessionUsers = (action: SetStateAction<UserAccount[]>) => change('users',action);
export const setSessionGroups = (action: SetStateAction<SystemRoleGroup[]>) => change('role_groups',action);
export function useAccountSession() { return useSyncExternalStore(listener=>{listeners.add(listener);return()=>{listeners.delete(listener);};},()=>state); }
if(typeof window!=='undefined') {
  void refreshAccountSession();
  window.addEventListener('focus',()=>void refreshAccountSession());
  window.addEventListener('beforeunload',event=>{if(state.saving){event.preventDefault();event.returnValue='';}});
  setInterval(()=>void refreshAccountSession(),60_000);
}

/** Chỉ lấy theo yêu cầu, không đưa mật khẩu giải mã vào danh sách tài khoản/cache. */
export async function revealAccountPassword(userId: string, signal: AbortSignal): Promise<string> {
  if (!token || !state.actor) throw new Error('Vui lòng đăng nhập lại.');
  const version = generation;
  const data = await rpc('vuihoc_reveal_password', { p_token: token, p_user_id: userId }, signal);
  if (version !== generation || signal.aborted) throw new Error('Yêu cầu xem mật khẩu đã kết thúc.');
  if (typeof data?.password !== 'string') throw new Error('Không lấy được mật khẩu.');
  return data.password;
}

/** Teacher RPCs share the existing internal login token; no direct table access. */
export async function teacherSessionRequest(name: 'vuihoc_teacher_data' | 'vuihoc_create_teacher' | 'vuihoc_business_data' | 'vuihoc_save_business' | 'vuihoc_ai_usage' | 'vuihoc_report_lesson_incident', args: Record<string,unknown> = {}) {
  if (!token || !state.actor) throw new Error('Vui lòng đăng nhập lại.');
  const version = generation, writing = name === 'vuihoc_create_teacher' || name === 'vuihoc_save_business' || name === 'vuihoc_report_lesson_incident';
  if (writing && (state.saving || flushing || pending.length)) throw new Error('Đang lưu thay đổi khác. Vui lòng thử lại sau.');
  if (writing) { revision++; publish({...state,saving:true,error:'',saved:false}); }
  try {
    const data = await rpc(name,{...args,p_token:token});
    if (version !== generation) throw new Error('Phiên đăng nhập đã thay đổi.');
    if (writing) { publish({...state,saving:false,saved:true}); void refreshAccountSession(); }
    return data;
  } catch (error) {
    if (writing && version === generation) publish({...state,saving:false,saved:false,error:(error as Error).message});
    throw error;
  }
}

/** Delete only after server confirmation; surface failures to the caller. */
export async function deleteAccount(userId: string): Promise<void> {
  if (!token || !state.actor) throw new Error('Vui lòng đăng nhập lại.');
  if (state.saving || flushing || pending.length) throw new Error('Đang lưu thay đổi khác. Vui lòng thử lại.');
  const user = state.users.find(item => item.id === userId);
  if (!user) throw new Error('Tài khoản không còn tồn tại.');
  const version = generation;
  revision++;
  publish({...state,saving:true,error:'',saved:false});
  try {
    await rpc('vuihoc_save_accounts',{p_token:token,p_changes:[{dataset:'users',before:toSupabaseRow('users',user),after:null}]});
    if (version !== generation) throw new Error('Phiên đăng nhập đã thay đổi.');
    const users = state.users.filter(item => item.id !== userId);
    confirmed = {...confirmed,users,saving:false,saved:true,error:''};
    publish({...state,users,saving:false,saved:true,error:''});
  } catch (error) {
    const message = (error as Error).message;
    if (version === generation) publish({...state,saving:false,saved:false,error:message});
    throw error;
  }
}

export function getAccountSnapshot() { return state; }
export function waitForAccountSave(): Promise<void> {
  const version=generation;
  return new Promise((resolve,reject)=>{
    const check=()=>{
      if(version!==generation){listeners.delete(check);reject(new Error('Phiên đăng nhập đã thay đổi.'));return;}
      if(state.saving || pending.length)return;
      listeners.delete(check);
      if(state.error)reject(new Error(state.error));else resolve();
    };
    listeners.add(check);check();
  });
}
