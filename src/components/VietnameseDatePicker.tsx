import React, { useEffect, useId, useRef, useState, type InputHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { reportToday, validReportDate } from '../lib/customReports';
import { calendarDateAllowed, displayVietnameseDate, moveCalendarDate, moveCalendarMonth, parseVietnameseDate, vietnameseCalendarDays } from '../lib/vietnameseCalendar';
import { ReportSelect } from './ReportSelect';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange' | 'min' | 'max'> & {
  value: string; min?: string; max?: string; onChange: (event: { target: { value: string } }) => void;
};
const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
export function VietnameseDatePicker({ value, onChange, disabled, min, max, className = '', ...props }: Props) {
  const today = reportToday(), initial = validReportDate(value) ? value : today;
  const [draft, setDraft] = useState(displayVietnameseDate(value)), [error, setError] = useState('');
  const [open, setOpen] = useState(false), [month, setMonth] = useState(initial.slice(0, 7)), [active, setActive] = useState(initial);
  const [position, setPosition] = useState({ left: 0, top: 0, maxHeight: 420 });
  const anchor = useRef<HTMLSpanElement>(null), popup = useRef<HTMLDivElement>(null), button = useRef<HTMLButtonElement>(null);
  const focusDay = useRef(false), popupId = useId(), errorId = useId();
  const label = props['aria-label'] || 'Ngày';
  useEffect(() => { setDraft(displayVietnameseDate(value)); setError(''); }, [value]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  const close = (restoreFocus = false) => { setOpen(false); if (restoreFocus) button.current?.focus(); };
  const select = (date: string) => {
    if (!calendarDateAllowed(date, min, max)) return;
    onChange({ target: { value: date } }); setDraft(displayVietnameseDate(date)); setError(''); close(true);
  };
  const commit = () => {
    if (draft === displayVietnameseDate(value)) return;
    const parsed = parseVietnameseDate(draft);
    if (!parsed || !calendarDateAllowed(parsed, min, max)) { setError(!parsed ? 'Nhập ngày hợp lệ: ngày/tháng/năm.' : `Chọn ngày${min ? ' từ ' + displayVietnameseDate(min) : ''}${max ? ' đến ' + displayVietnameseDate(max) : ''}.`); return; }
    onChange({ target: { value: parsed } }); setDraft(displayVietnameseDate(parsed)); setError('');
  };
  const show = () => {
    const rect = anchor.current?.getBoundingClientRect(); if (!rect || disabled) return;
    const date = calendarDateAllowed(value, min, max) ? value : min && today < min ? min : max && today > max ? max : today;
    setMonth(date.slice(0, 7)); setActive(date); focusDay.current = true;
    const below = window.innerHeight - rect.bottom - 12, above = rect.top - 12, up = below < 380 && above > below;
    const height = Math.min(410, Math.max(180, up ? above : below));
    setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 312)), top: up ? Math.max(8, rect.top - height - 6) : rect.bottom + 6, maxHeight: height }); setOpen(true);
  };
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Element;
      if (anchor.current?.contains(target) || popup.current?.contains(target)) return;
      const menu = target.closest?.('[role="listbox"]');
      if (menu && Array.from(popup.current?.querySelectorAll('[aria-controls]') || []).some(control => control.getAttribute('aria-controls') === menu.id)) return;
      close();
    };
    const reposition = (event: Event) => {
      const target = event.target as Element;
      if (popup.current?.contains(target) || target.closest?.('[role="listbox"]')) return;
      close();
    };
    document.addEventListener('pointerdown', outside); window.addEventListener('resize', reposition); window.addEventListener('scroll', reposition, true);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', reposition); window.removeEventListener('scroll', reposition, true); };
  }, [open]);
  useEffect(() => {
    if (open && focusDay.current) { popup.current?.querySelector<HTMLButtonElement>(`[data-date="${active}"]`)?.focus(); focusDay.current = false; }
  }, [open, month, active]);
  const changeMonth = (amount: number) => { const next = moveCalendarMonth(month + '-01', amount); setMonth(next.slice(0, 7)); setActive(next); };
  const year = Number(month.slice(0, 4));
  const years = Array.from({ length: Math.max(Number(today.slice(0, 4)) + 30, year) - Math.min(1900, year) + 1 }, (_, index) => Math.min(1900, year) + index);
  return <span ref={anchor} className="relative inline-flex min-w-0 items-center">
    <input {...props} type="text" inputMode="numeric" placeholder="dd/mm/yyyy" autoComplete="off" disabled={disabled} value={draft}
      aria-invalid={Boolean(error) || undefined} aria-describedby={error ? errorId : props['aria-describedby']} className={className + ' w-36 pr-9 tabular-nums'}
      onChange={event => { setDraft(event.target.value); setError(''); }} onBlur={commit}
      onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); commit(); } else if (event.key === 'ArrowDown') { event.preventDefault(); show(); } else if (event.key === 'Escape') { setDraft(displayVietnameseDate(value)); setError(''); } }} />
    <button ref={button} type="button" disabled={disabled} aria-label={'Mở lịch: ' + label} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? popupId : undefined}
      onClick={() => open ? close() : show()} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-500 hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-orange-500 disabled:opacity-40"><CalendarDays className="h-4 w-4" /></button>
    {error && <span id={errorId} role="alert" className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-rose-100 bg-white p-2 text-xs text-rose-700 shadow-sm">{error}</span>}
    {open && !disabled && createPortal(<div ref={popup} id={popupId} role="dialog" aria-label={'Chọn ngày: ' + label} lang="vi" className="font-inter fixed z-[190] w-[304px] max-w-[calc(100vw-16px)] overflow-y-auto rounded-2xl border border-orange-100 bg-white p-3 text-xs text-slate-700 shadow-xl shadow-slate-900/10" style={position}
      onKeyDown={event => { if (event.key === 'Escape' && !(event.target as Element).closest('[role="combobox"][aria-expanded="true"]')) { event.stopPropagation(); close(true); } }}>
      <div className="mb-2 flex items-center justify-between"><span className="font-semibold text-slate-800">{label}</span><button type="button" aria-label="Đóng lịch" onClick={() => close(true)} className="rounded p-1 hover:bg-slate-100"><X className="h-3.5 w-3.5" /></button></div>
      <div className="mb-3 flex items-center gap-1"><button type="button" aria-label="Tháng trước" onClick={() => changeMonth(-1)} className="rounded-lg p-1.5 hover:bg-orange-50"><ChevronLeft className="h-4 w-4" /></button>
        <ReportSelect aria-label="Chọn tháng" value={Number(month.slice(5, 7))} onChange={event => { const next = `${year}-${event.target.value.padStart(2, '0')}`; setMonth(next); setActive(next + '-01'); }} className="min-w-0 flex-1 border border-slate-200 px-2 py-1.5">{Array.from({ length: 12 }, (_, index) => <option key={index} value={index + 1}>Tháng {index + 1}</option>)}</ReportSelect>
        <ReportSelect aria-label="Chọn năm" value={year} onChange={event => { const next = event.target.value + month.slice(4); setMonth(next); setActive(next + '-01'); }} className="border border-slate-200 px-2 py-1.5">{years.map(item => <option key={item} value={item}>{item}</option>)}</ReportSelect>
        <button type="button" aria-label="Tháng sau" onClick={() => changeMonth(1)} className="rounded-lg p-1.5 hover:bg-orange-50"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 text-center">{weekdays.map(day => <span key={day} className="pb-2 font-semibold text-slate-400">{day}</span>)}</div>
      <div role="grid" aria-label={`Tháng ${Number(month.slice(5, 7))} năm ${year}`}>
        {Array.from({ length: 6 }, (_, week) => <div key={week} role="row" className="grid grid-cols-7">{vietnameseCalendarDays(month).slice(week * 7, week * 7 + 7).map(date => <span key={date} role="gridcell" aria-selected={date === value}>
          <button type="button" data-date={date} aria-label={displayVietnameseDate(date) + (date === today ? ', hôm nay' : '')} aria-current={date === today ? 'date' : undefined} tabIndex={date === active ? 0 : -1} disabled={!calendarDateAllowed(date, min, max)}
            onClick={() => select(date)} onFocus={() => setActive(date)} onKeyDown={event => {
              const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key];
              let next = delta !== undefined ? moveCalendarDate(date, delta) : event.key === 'PageUp' ? moveCalendarMonth(date, -1) : event.key === 'PageDown' ? moveCalendarMonth(date, 1) : null;
              if (event.key === 'Home' || event.key === 'End') { const weekday = (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7; next = moveCalendarDate(date, event.key === 'Home' ? -weekday : 6 - weekday); }
              if (next) { event.preventDefault(); if (calendarDateAllowed(next, min, max)) { focusDay.current = true; setActive(next); setMonth(next.slice(0, 7)); } }
            }} className={'my-0.5 h-8 w-full rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-orange-500 disabled:cursor-not-allowed disabled:opacity-25 ' + (date === value ? 'bg-[#FF5C00] text-white' : (date === today ? 'ring-1 ring-inset ring-orange-300 ' : '') + (date.startsWith(month) ? 'text-slate-700 hover:bg-orange-50' : 'text-slate-300 hover:bg-orange-50'))}>{Number(date.slice(8, 10))}</button>
        </span>)}</div>)}
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2"><span className="text-[10px] text-slate-400">Ngày / tháng / năm</span><button type="button" disabled={!calendarDateAllowed(today, min, max)} onClick={() => select(today)} className="rounded-lg bg-orange-50 px-3 py-1.5 font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-40">Hôm nay</button></div>
    </div>, document.body)}
  </span>;
}
