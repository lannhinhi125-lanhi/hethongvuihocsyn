import React, { Children, isValidElement, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export const PAGE_SIZE = 10;

export function getPageWindow(total: number, requestedPage: number) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.max(0, Math.min(requestedPage, pages - 1));
  return { page, pages, start: page * PAGE_SIZE, end: Math.min(total, (page + 1) * PAGE_SIZE) };
}

function columnCount(children: React.ReactNode): number {
  return Math.max(1, ...Children.toArray(children).map(row => {
    if (!isValidElement<{ children?: React.ReactNode }>(row)) return 1;
    if (row.type === React.Fragment || row.type === 'tbody') return columnCount(row.props.children);
    return Children.toArray(row.props.children).reduce<number>((count, cell) =>
      count + (isValidElement<{ colSpan?: number }>(cell) ? cell.props.colSpan || 1 : 0), 0);
  }));
}

function useChildPage(children: React.ReactNode) {
  const rows = Children.toArray(children);
  // Reset when filtering, sorting or switching datasets changes the record identities.
  const signature = rows.map((row, index) => isValidElement(row) ? row.key ?? index : index).join('|');
  const fingerprints = rows.map((row, index) => ({
    key: isValidElement(row) ? String(row.key ?? index) : String(index),
    value: JSON.stringify(isValidElement(row) ? row.props : row, (key, value) =>
      key === '_owner' || key === '_store' || typeof value === 'function' ? undefined : value)
  }));
  const contentSignature = JSON.stringify(fingerprints);
  const previousRows = useRef<Map<string, string | undefined> | null>(null);
  const [highlightedKeys, setHighlightedKeys] = useState<string[]>([]);
  const highlightTimer = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(undefined);
  useEffect(() => () => globalThis.clearTimeout(highlightTimer.current), []);
  useEffect(() => {
    const current = new Map<string, string | undefined>(JSON.parse(contentSignature).map((item: { key: string; value?: string }) => [item.key, item.value]));
    const previous = previousRows.current;
    previousRows.current = current;
    if (!previous) return;
    // Do not flash rows merely revealed by filters or pagination.
    const changed = [...current].filter(([key, value]) => previous.has(key) && previous.get(key) !== value).map(([key]) => key);
    const added = current.size > previous.size ? [...current.keys()].filter(key => !previous.has(key)) : [];
    if (!changed.length && !added.length) return;
    setHighlightedKeys([...changed, ...added]);
    globalThis.clearTimeout(highlightTimer.current);
    highlightTimer.current = globalThis.setTimeout(() => setHighlightedKeys([]), 4000);

  }, [contentSignature]);
  const [selection, setSelection] = useState({ signature, page: 0 });
  const window = getPageWindow(rows.length, selection.signature === signature ? selection.page : 0);
  return { ...window, total: rows.length, rows: rows.slice(window.start, window.end).map((row, index) => {
      if (!isValidElement<{ className?: string }>(row) || row.type === React.Fragment) return row;
      const key = String(row.key ?? (window.start + index));
      return highlightedKeys.includes(key) ? React.cloneElement(row, {
        className: `${row.props.className || ''} !bg-slate-200 ring-1 ring-inset ring-slate-300 transition-colors duration-700`
      }) : row;
    }),
    onChange: (page: number) => setSelection({ signature, page }) };
}

type Page = ReturnType<typeof useChildPage>;
function PageControls({ page }: { page: Page }) {
  if (page.total <= PAGE_SIZE) return null;
  const button = 'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-40 disabled:cursor-not-allowed';
  return <nav aria-label="Phân trang danh sách" className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-slate-500 print:hidden">
    <span>{page.start + 1}–{page.end} / {page.total} bản ghi</span>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={button} disabled={page.page === 0} onClick={() => page.onChange(0)} aria-label="Trang đầu">Đầu</button>
      <button type="button" className={button} disabled={page.page === 0} onClick={() => page.onChange(page.page - 1)}>Trước</button>
      <span aria-live="polite" className="rounded-lg bg-orange-50 px-3 py-1.5 font-semibold text-orange-700">Trang {page.page + 1}/{page.pages}</span>
      <button type="button" className={button} disabled={page.page + 1 >= page.pages} onClick={() => page.onChange(page.page + 1)}>Sau</button>
      <button type="button" className={button} disabled={page.page + 1 >= page.pages} onClick={() => page.onChange(page.pages - 1)} aria-label="Trang cuối">Cuối</button>
    </div>
  </nav>;
}

/** Mount below the scroll container, so neither axis can hide the controls. */
function TablePageFooter({page,anchor,columns,hidden}:{page:Page;anchor:React.RefObject<HTMLTableSectionElement|null>;columns:number;hidden?:boolean}) {
  const [host,setHost] = useState<HTMLDivElement|null>(null);
  const visible = page.total > PAGE_SIZE && !hidden;
  useEffect(() => {
    if (!visible) { setHost(null); return; }
    const table = anchor.current?.closest('table');
    if (!table) return;
    let boundary: HTMLElement = table;
    for (let parent=table.parentElement;parent && parent!==document.body;parent=parent.parentElement) {
      const style=window.getComputedStyle(parent);
      if (/(auto|scroll)/.test(`${style.overflowX} ${style.overflowY}`)) {
        boundary=parent;
        break;
      }
    }
    const footer=document.createElement('div');
    footer.dataset.tablePaginationFooter='true';
    footer.className='min-w-0 w-full border-t border-slate-200 bg-white print:hidden';
    boundary.insertAdjacentElement('afterend',footer);
    setHost(footer);
    return () => { footer.remove(); };
  },[visible,anchor]);
  if (!visible) return null;
  return host ? createPortal(<PageControls page={page} />,host)
    : <tr className="print:hidden"><td colSpan={columns} className="border-t border-slate-200 bg-slate-50"><PageControls page={page} /></td></tr>;
}

export function PaginatedTableBody({ children, ...props }: React.ComponentProps<'tbody'>) {
  const page = useChildPage(children);
  const anchor=useRef<HTMLTableSectionElement>(null);
  return <tbody {...props} ref={anchor}>{page.rows}<TablePageFooter page={page} anchor={anchor} columns={columnCount(children)} hidden={props.hidden} /></tbody>;
}

export function PaginatedList({ children, className }: { children: React.ReactNode; className?: string }) {
  const page = useChildPage(children);
  return <div><div className={className}>{page.rows}</div><PageControls page={page} /></div>;
}

export function PaginatedTableGroups({ children }: { children: React.ReactNode }) {
  const page = useChildPage(children);
  const anchor=useRef<HTMLTableSectionElement>(null);
  return <>{page.rows}<tbody ref={anchor} className="print:hidden"><TablePageFooter page={page} anchor={anchor} columns={columnCount(children)} /></tbody></>;
}
