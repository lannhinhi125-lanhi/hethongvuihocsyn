import React, { useState } from 'react';
import { ArrowRight, BookOpen, CalendarDays, Check, GraduationCap, LoaderCircle, LockKeyhole, Sparkles, UserRound } from 'lucide-react';
import { PasswordRevealButton } from '../components/PasswordRevealButton';
import { loginAccount, useAccountSession } from '../lib/accountSession';

const RECENT_LOGIN_KEY = 'vuihoc_recent_login';
function readRecentLogin(): { username: string; password: string } | null {
  try {
    const raw = sessionStorage.getItem(RECENT_LOGIN_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (typeof value?.username === 'string' && typeof value?.password === 'string') return value;
    sessionStorage.removeItem(RECENT_LOGIN_KEY);
  } catch { /* Storage may be unavailable; login still works. */ }
  return null;
}
function saveRecentLogin(value: { username: string; password: string } | null): boolean {
  try {
    if (value) sessionStorage.setItem(RECENT_LOGIN_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(RECENT_LOGIN_KEY);
    return true;
  } catch { return false; }
}
export const LoginView: React.FC<{ onLogin: (userId: string) => void }> = ({ onLogin }) => {
  const session = useAccountSession();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [recentLogin] = useState(readRecentLogin);
  const [rememberLogin, setRememberLogin] = useState(Boolean(recentLogin));
  const [rememberError, setRememberError] = useState('');
  const [username, setUsername] = useState(recentLogin?.username ?? '');
  const [password, setPassword] = useState(recentLogin?.password ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const loginError = error || session.error;

  return (
    <main className="login-page relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#fff8f1] px-4 py-8 sm:px-8 lg:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-orange-200/35 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-24 h-[480px] w-[480px] rounded-full bg-amber-200/30 blur-3xl" />

      <div className="relative w-full max-w-[1080px]">
        <header className="login-brand mb-6 flex items-center gap-3 px-1 sm:mb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-2xl font-extrabold text-white shadow-lg shadow-orange-500/15" aria-hidden="true">V</div>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-[#222342]">VUIHOC <span className="font-semibold text-orange-600">TUTOR</span></p>
            <p className="text-xs text-slate-500">Hệ thống quản lý & giảng dạy</p>
          </div>
        </header>

        <div className="login-card grid overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_24px_80px_-24px_rgba(125,64,20,0.20)] lg:grid-cols-[1.05fr_1fr]">
          <section className="login-welcome relative overflow-hidden bg-gradient-to-br from-[#ff8b36] via-[#ff7426] to-[#ef5917] px-7 py-8 text-white sm:px-10 lg:flex lg:flex-col lg:px-12 lg:py-12" aria-labelledby="welcome-heading">
            <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full border-[45px] border-white/10" />
            <div className="relative">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Cùng nhau tạo nên những giờ học vui</p>
              <h1 id="welcome-heading" className="mt-6 text-3xl font-extrabold leading-[1.2] tracking-tight sm:text-4xl lg:text-[42px]">Dạy bằng tâm.<br />Học bằng niềm vui.</h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-orange-50">Kết nối đội ngũ, đồng hành cùng học sinh và lan tỏa cảm hứng trong mỗi buổi học.</p>
            </div>

            <div aria-hidden="true" className="login-illustration relative my-10 hidden h-56 sm:block lg:my-12">
              <div className="absolute inset-x-6 bottom-0 h-40 rounded-[50%] bg-orange-300/30" />
              <div className="absolute left-8 right-5 top-5 -rotate-3 rounded-2xl border border-white/70 bg-[#fffaf4] p-5 text-slate-800 shadow-xl shadow-orange-950/10">
                <div className="flex items-center gap-3 border-b border-orange-100 pb-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600"><CalendarDays className="h-5 w-5" /></span>
                  <div><p className="text-sm font-bold">Một ngày dạy học đầy cảm hứng</p><p className="mt-1 text-[11px] text-slate-500">Sẵn sàng cho những điều tuyệt vời</p></div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e5f4ed] text-emerald-600"><Check className="h-4 w-4" /></span>
                  <div className="flex-1"><p className="text-xs font-semibold">Chuẩn bị bài giảng</p><div className="mt-2 h-1.5 w-4/5 rounded-full bg-orange-100"><div className="h-full w-3/4 rounded-full bg-orange-400" /></div></div>
                  <BookOpen className="h-5 w-5 text-orange-400" />
                </div>
                <div className="mt-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eeeafb] text-violet-500"><GraduationCap className="h-5 w-5" /></span><p className="text-xs font-semibold">Đồng hành cùng học sinh</p></div>
              </div>
              <div className="absolute -right-1 -top-2 flex h-14 w-14 rotate-12 items-center justify-center rounded-2xl border border-white/60 bg-[#fff0c2] text-amber-600 shadow-lg"><Sparkles className="h-7 w-7" /></div>
              <div className="absolute -bottom-2 left-0 flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#34344f] shadow-lg"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Mỗi buổi học, một bước tiến</div>
            </div>
            <p className="relative mt-auto hidden items-center gap-2 text-xs font-medium text-orange-50 lg:flex"><BookOpen className="h-4 w-4" aria-hidden="true" /> Một nơi kết nối. Ngàn niềm vui học tập.</p>
          </section>

          <section className="login-form-panel flex flex-col justify-center px-6 py-9 sm:px-12 sm:py-12 lg:px-14" aria-labelledby="login-heading">
            <div className="login-intro mb-7">
              <div aria-hidden="true" className="login-icon mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><GraduationCap className="h-6 w-6" /></div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-orange-600">Chào mừng trở lại</p>
              <h2 id="login-heading" className="text-[28px] font-bold tracking-tight text-[#222342]">Đăng nhập Vuihoc</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Một ngày mới, cùng bắt đầu thật hứng khởi!</p>
            </div>
            <form className="space-y-5" aria-busy={busy} onSubmit={async e => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              setError('');
              try {
                await loginAccount(username, password);
                saveRecentLogin(rememberLogin ? { username, password } : null);
                setPassword('');
                onLogin('');
              } catch (err) {
                setError((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}>
              <div>
                <label htmlFor="login-username" className="mb-2 block text-sm font-semibold text-slate-700">Tên đăng nhập</label>
                <div className="relative">
                  <UserRound aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <input id="login-username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required value={username} onChange={e => setUsername(e.target.value)} placeholder="Nhập tên đăng nhập" aria-invalid={loginError ? true : undefined} aria-describedby={loginError ? 'login-error' : undefined} className="block w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3.5 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-orange-200 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100" />
                </div>
              </div>
              <div>
                <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-slate-700">Mật khẩu</label>
                <div className="relative">
                  <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                  <input id="login-password" name="password" type={passwordVisible ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Nhập mật khẩu của bạn" aria-invalid={loginError ? true : undefined} aria-describedby={loginError ? 'login-error' : undefined} className="block w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3.5 pl-11 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-orange-200 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100" />
                  <PasswordRevealButton visible={passwordVisible} onVisibleChange={setPasswordVisible} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2.5 text-slate-400 transition hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-2 focus-visible:outline-orange-500" />
                </div>
              </div>
              <div>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
                  <input type="checkbox" checked={rememberLogin} disabled={busy} aria-describedby="remember-login-hint" className="h-4 w-4 rounded border-slate-300 accent-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500" onChange={e => {
                    setRememberLogin(e.target.checked);
                    setRememberError('');
                    if (!e.target.checked && !saveRecentLogin(null)) {
                      setRememberError('Không thể xóa thông tin đã nhớ. Vui lòng đóng tab này.');
                    }
                  }} />
                  Ghi nhớ đăng nhập gần nhất
                </label>
                <p id="remember-login-hint" className="mt-1.5 pl-[26px] text-xs leading-5 text-slate-500">Lưu tạm tài khoản và mật khẩu trong tab này. Chỉ bật trên máy cá nhân.</p>
                {rememberError && <p role="alert" className="mt-2 text-xs text-red-600">{rememberError}</p>}
              </div>
              {loginError && <p id="login-error" role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{loginError}</p>}
              <button disabled={busy} type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-[#f4671e] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:brightness-105 hover:shadow-orange-500/30 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-500 disabled:cursor-wait disabled:opacity-60">
                {busy ? <><LoaderCircle aria-hidden="true" className="h-[18px] w-[18px] animate-spin motion-reduce:animate-none" /> Đang đăng nhập…</> : <>Đăng nhập <ArrowRight aria-hidden="true" className="h-[18px] w-[18px]" /></>}
              </button>
            </form>
            <p className="login-support mt-7 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-500">Cần hỗ trợ tài khoản?<br /><span className="text-slate-600">Vui lòng liên hệ quản trị viên của bạn.</span></p>
          </section>
        </div>
        <footer className="login-footer mt-6 text-center text-xs text-slate-500">VUIHOC TUTOR · Đồng hành trên hành trình tri thức</footer>
      </div>
    </main>
  );
};
