import React, { useState } from 'react';
import { loginAccount, useAccountSession } from '../lib/accountSession';
export const LoginView: React.FC<{ onLogin: (userId: string) => void }> = ({ onLogin }) => {
  const session=useAccountSession();
  const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4"><form className="w-full max-w-sm bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-5" onSubmit={async e=>{
    e.preventDefault(); if(busy)return; setBusy(true);setError('');
    try { await loginAccount(username,password);setPassword('');onLogin(''); }
    catch(err){setError((err as Error).message);}finally{setBusy(false);}
  }}>
    <h1 className="text-xl font-bold text-slate-800">Đăng nhập Vuihoc</h1>
    <label className="block text-sm font-medium">Tên đăng nhập<input autoComplete="username" required value={username} onChange={e=>setUsername(e.target.value)} className="block w-full mt-2 p-3 rounded-xl border border-slate-200" /></label>
    <label className="block text-sm font-medium">Mật khẩu<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="block w-full mt-2 p-3 rounded-xl border border-slate-200" /></label>
    {(error||session.error)&&<p role="alert" className="text-sm text-red-600">{error||session.error}</p>}
    <button disabled={busy} type="submit" className="w-full p-3 rounded-xl bg-orange-600 text-white font-bold disabled:opacity-50">{busy?'Đang đăng nhập…':'Đăng nhập'}</button>
  </form></main>;
};
