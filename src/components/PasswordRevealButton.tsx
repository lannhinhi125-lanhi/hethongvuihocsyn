import React, { useEffect, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/** Mật khẩu chỉ hiển thị trong thời gian giữ chuột, chạm hoặc phím Space/Enter. */
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
  return <button type="button" disabled={disabled} aria-label="Giữ để xem mật khẩu" aria-pressed={visible}
    title={disabled ? 'Bạn không có quyền xem mật khẩu' : 'Giữ để xem mật khẩu, thả để ẩn'}
    className={'select-none touch-none disabled:opacity-40 ' + className}
    onPointerDown={event => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      onVisibleChange(true);
    }}
    onPointerUp={() => onVisibleChange(false)}
    onPointerCancel={() => onVisibleChange(false)}
    onPointerLeave={() => onVisibleChange(false)}
    onLostPointerCapture={() => onVisibleChange(false)}
    onBlur={() => onVisibleChange(false)}
    onContextMenu={event => event.preventDefault()}
    onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); if (!event.repeat) onVisibleChange(true); } }}
    onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); onVisibleChange(false); } }}>
    {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
  </button>;
}
