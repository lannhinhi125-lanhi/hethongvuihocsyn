import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { refreshBusinessData, useBusinessValue } from '../lib/businessPersistence';
import { teacherNotifications, notificationDateText, type NotificationLesson } from '../lib/teacherNotifications';

const readKeysFor = (storageKey: string): string[] => {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(value) ? value.filter((key): key is string => typeof key === 'string') : [];
  } catch {
    return [];
  }
};

export const TeacherNotifications: React.FC = () => {
  const { currentUser, users, teachers, classes, payrollStore, setTeacherPortalTab } = useApp();
  const [lessons] = useBusinessValue<NotificationLesson[]>('dated_lessons');
  const storageKey = `vuihoc:teacher-notifications:${currentUser.id}`;
  const [readKeys, setReadKeys] = useState<string[]>(() => readKeysFor(storageKey));
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const notifications = teacherNotifications(currentUser, teachers, users, payrollStore, classes, lessons);
  const unread = notifications.filter(notification => !readKeys.includes(notification.key));

  useEffect(() => setReadKeys(readKeysFor(storageKey)), [storageKey]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void refreshBusinessData(); };
    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  useEffect(() => {
    if (!isOpen) return;
    const closeOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, [isOpen]);

  const markRead = (keys: string[]) => {
    const next = Array.from(new Set([...readKeys, ...keys]));
    setReadKeys(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep the current session state. */ }
  };

  return <div ref={containerRef} className="relative">
    <button
      type="button"
      onClick={() => { setIsOpen(open => !open); void refreshBusinessData(); }}
      aria-label={`Thông báo giáo viên${unread.length ? `, ${unread.length} chưa xem` : ''}`}
      aria-expanded={isOpen}
      className="relative rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
    >
      <Bell className="h-4 w-4" />
      {unread.length > 0 && <span className="absolute -right-1.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{unread.length > 9 ? '9+' : unread.length}</span>}
    </button>
    {isOpen && <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-slate-800">Thông báo</span>
        {unread.length > 0 && <button type="button" onClick={() => markRead(unread.map(item => item.key))} className="text-xs font-semibold text-indigo-700 hover:underline">Đánh dấu đã xem</button>}
      </div>
      {notifications.length ? <div className="max-h-80 space-y-1 overflow-y-auto">
        {notifications.map(notification => {
          const isRead = readKeys.includes(notification.key);
          const dateText = notificationDateText(notification.date);
          return <button
            key={notification.key}
            type="button"
            onClick={() => {
              markRead([notification.key]);
              setTeacherPortalTab(notification.tab);
              setIsOpen(false);
            }}
            className={`w-full rounded-lg p-2.5 text-left hover:bg-indigo-50 ${isRead ? 'bg-white' : 'bg-indigo-50/70'}`}
          >
            <span className="flex items-center gap-2 text-xs font-bold text-slate-800">{!isRead && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}{notification.title}</span>
            <span className="mt-1 block text-xs text-slate-600">{notification.detail}</span>
            <span className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
              <Clock aria-hidden="true" className="h-3 w-3 shrink-0" />
              {dateText ? <time dateTime={notification.date}>{notification.dateLabel}: {dateText}</time> : 'Chưa có thời điểm thông báo'}
            </span>
          </button>;
        })}
      </div> : <p className="py-3 text-xs text-slate-500">Bạn chưa có thông báo nào.</p>}
      {notifications.length > 0 && unread.length === 0 && <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-500"><Check className="h-3 w-3" /> Đã xem hết thông báo</p>}
    </div>}
  </div>;
};
