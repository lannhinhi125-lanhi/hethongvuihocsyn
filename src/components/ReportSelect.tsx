import React, { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode, type SelectHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value' | 'defaultValue' | 'multiple'> & {
  value?: string | number; onChange?: (event: { target: { value: string } }) => void;
};
type Choice = { value: string; label: string; disabled: boolean };
const plainText = (node: ReactNode): string => Children.toArray(node).map(child => isValidElement<{ children?: ReactNode }>(child) ? plainText(child.props.children) : String(child)).join('');
const optionsFrom = (nodes: ReactNode): Choice[] => Children.toArray(nodes).flatMap(node => {
  if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(node)) return [];
  return node.type === 'option' ? [{ value: String(node.props.value ?? plainText(node.props.children)), label: plainText(node.props.children), disabled: Boolean(node.props.disabled) }] : optionsFrom(node.props.children);
});

/** Styled single selection with native-equivalent keyboard navigation. */
export function ReportSelect({ children, value, onChange, className = '', disabled, id, title, name, ...props }: Props) {
  const choices = optionsFrom(children), selected = choices.findIndex(item => item.value === String(value ?? ''));
  const [open, setOpen] = useState(false), [active, setActive] = useState(0);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 200, maxHeight: 280 });
  const trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null);
  const search = useRef({ text: '', time: 0 });
  const listId = useId();
  const placeMenu = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 16);
    const below = window.innerHeight - rect.bottom - 12, above = rect.top - 12;
    const upward = below < 180 && above > below;
    const maxHeight = Math.min(300, Math.max(80, upward ? above : below));
    const height = Math.min(maxHeight, choices.length * 38 + 12);
    setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), top: upward ? Math.max(8, rect.top - height - 6) : rect.bottom + 6, width, maxHeight });
  };
  const show = () => { placeMenu(); setActive(selected >= 0 && !choices[selected].disabled ? selected : Math.max(0, choices.findIndex(item => !item.disabled))); setOpen(true); };
  const choose = (index: number) => {
    if (disabled || !choices[index] || choices[index].disabled) return;
    onChange?.({ target: { value: choices[index].value } }); setOpen(false); trigger.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!trigger.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)) setOpen(false); };
    const scroll = (event: Event) => { if (!menu.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside); window.addEventListener('resize', placeMenu); window.addEventListener('scroll', scroll, true);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', placeMenu); window.removeEventListener('scroll', scroll, true); };
  }, [open]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => { if (open) menu.current?.querySelector(`[data-option-index="${active}"]`)?.scrollIntoView({ block: 'nearest' }); }, [active, open]);
  return <>
    {name && <input type="hidden" name={name} value={value ?? ''} />}
    <button type="button" ref={trigger} id={id} title={title || choices[selected]?.label} disabled={disabled} role="combobox"
      aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-describedby={props['aria-describedby']}
      aria-expanded={open} aria-haspopup="listbox" aria-controls={open ? listId : undefined} aria-activedescendant={open ? `${listId}-${active}` : undefined}
      className={'report-select inline-flex items-center justify-between gap-2 text-left ' + className}
      onClick={() => open ? setOpen(false) : show()} onBlur={event => { if (!menu.current?.contains(event.relatedTarget as Node)) setOpen(false); }}
      onKeyDown={event => {
        const enabled = choices.map((item, index) => item.disabled ? -1 : index).filter(index => index >= 0);
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
        if (event.key === 'Tab') { setOpen(false); return; }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          if (!open) { show(); if (event.key === 'Home') setActive(enabled[0] ?? 0); else if (event.key === 'End') setActive(enabled.at(-1) ?? 0); return; }
          const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) : enabled[Math.max(0, Math.min(enabled.length - 1, enabled.indexOf(active) + (event.key === 'ArrowDown' ? 1 : -1)))];
          if (next !== undefined) setActive(next); return;
        }
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open ? choose(active) : show(); return; }
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const now = Date.now(); search.current = { text: (now - search.current.time < 700 ? search.current.text : '') + event.key.toLocaleLowerCase('vi'), time: now };
          const match = choices.findIndex(item => !item.disabled && item.label.toLocaleLowerCase('vi').startsWith(search.current.text));
          if (match >= 0) { if (!open) show(); setActive(match); }
        }
      }}>
      <span className="min-w-0 flex-1 truncate">{choices[selected]?.label || choices[0]?.label || '—'}</span>
      <ChevronDown className={'h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ' + (open ? 'rotate-180' : '')} />
    </button>
    {open && !disabled && createPortal(<div ref={menu} id={listId} role="listbox" aria-label={props['aria-label']} className="font-inter fixed z-[200] overflow-y-auto rounded-xl border border-orange-100 bg-white p-1.5 text-xs shadow-xl shadow-slate-900/10" style={position} onMouseDown={event => event.preventDefault()}>
      {choices.map((item, index) => <div key={item.value} id={`${listId}-${index}`} data-option-index={index} role="option" aria-selected={index === selected} aria-disabled={item.disabled || undefined}
        onPointerMove={() => { if (!item.disabled) setActive(index); }} onClick={() => choose(index)}
        className={'flex min-h-9 items-center justify-between gap-3 rounded-lg px-3 py-2 leading-5 ' + (item.disabled ? 'cursor-not-allowed text-slate-400' : 'cursor-pointer ' + (index === selected ? 'bg-orange-50 font-semibold text-orange-700' : index === active ? 'bg-orange-50/70 text-slate-900' : 'text-slate-700'))}>
        <span>{item.label}</span>{index === selected && <Check className="h-3.5 w-3.5 shrink-0 text-orange-600" />}
      </div>)}
    </div>, document.body)}
  </>;
}
