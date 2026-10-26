import React, { useEffect, useRef, useState } from 'react';
import { PasswordRevealButton } from './PasswordRevealButton';
import { revealAccountPassword } from '../lib/accountSession';

export function SavedPasswordCell({ userId, pendingPassword, canReveal, onError }: {
  userId: string; pendingPassword?: string; canReveal: boolean; onError: (message: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  function hide() {
    request.current?.abort(); request.current = null;
    setVisible(false); setLoading(false); setPassword('');
  }
  useEffect(() => {
    hide();
    return () => { request.current?.abort(); request.current = null; };
  }, [userId, pendingPassword, canReveal]);
  async function hold(pressed: boolean) {
    if (!pressed || !canReveal) { hide(); return; }
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setVisible(true); setPassword('');
    if (pendingPassword) { setPassword(pendingPassword); setLoading(false); return; }
    setLoading(true);
    try {
      const value = await revealAccountPassword(userId, controller.signal);
      if (request.current !== controller || controller.signal.aborted) return;
      setPassword(value); setLoading(false);
    } catch (error) {
      if (request.current !== controller || controller.signal.aborted) return;
      hide(); onError((error as Error).message);
    }
  }
  return <div className="flex items-center gap-1.5 font-mono bg-slate-100 px-2 py-1 rounded w-fit">
    <span className={visible ? '' : 'tracking-widest'}>{visible ? (loading ? 'Đang tải…' : password) : '••••••••'}</span>
    <PasswordRevealButton visible={visible} disabled={!canReveal} onVisibleChange={pressed => void hold(pressed)} className="text-slate-400 hover:text-slate-700" />
  </div>;
}
