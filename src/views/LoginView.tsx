import { findLoginAccount } from '../lib/teacherAccounts';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
export const LoginView: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const { users, setCurrentUser, setWorkspaceMode, setTeacherPortalTab } = useApp();
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('');
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4"><form className="w-full max-w-sm bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-5" onSubmit={e => {
    e.preventDefault();
    const user = findLoginAccount(users, username, password);
    if (!user) { setError('Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa.'); return; }
    setCurrentUser(user); setWorkspaceMode(user.role === 'Giáo viên Giảng dạy' ? 'TEACHER' : 'ADMIN'); setTeacherPortalTab('availability'); onLogin();
  }}>
    <h1 className="text-xl font-bold text-slate-800">Đăng nhập Vuihoc</h1>
    <label className="block text-sm font-medium">Tên đăng nhập / Mã giáo viên<input autoComplete="username" required value={username} onChange={e => setUsername(e.target.value)} className="block w-full mt-2 p-3 rounded-xl border border-slate-200" /></label>
    <label className="block text-sm font-medium">Mật khẩu<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="block w-full mt-2 p-3 rounded-xl border border-slate-200" /></label>
    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    <button type="submit" className="w-full p-3 rounded-xl bg-orange-600 text-white font-bold">Đăng nhập</button>
  </form></main>;
};
