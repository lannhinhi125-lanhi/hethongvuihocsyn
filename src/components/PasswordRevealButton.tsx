import React, { useEffect, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/** Click to toggle; hide when leaving the window. */
export function PasswordRevealButton({ visible, onVisibleChange, disabled = false, className = '' }: {
  visible: boolean; onVisibleChange: (visible: boolean) => void; disabled?: boolean; className?: string;
}) {
  const change = useRef(onVisibleChange);
  change.current = onVisibleChange;
  useEffect(() => {
    const hide = () => change.current(false);
    const visibility = () => { if (document.hidden) hide(); };
    window.addEventListener('blur', hide);
    document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('blur', hide); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  return <button type="button" disabled={disabled} aria-label={visible ? 'Ẩn mật khẩu' : 'Xem mật khẩu'} aria-pressed={visible}
    title={visible ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
    className={'select-none disabled:opacity-40 ' + className}
    onClick={() => onVisibleChange(!visible)}>
    {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
  </button>;
}
