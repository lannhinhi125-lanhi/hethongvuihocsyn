import React, { Children, isValidElement, useState } from 'react';

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
  const [selection, setSelection] = useState({ signature, page: 0 });
  const window = getPageWindow(rows.length, selection.signature === signature ? selection.page : 0);
  return { ...window, total: rows.length, rows: rows.slice(window.start, window.end),
    onChange: (page: number) => setSelection({ signature, page }) };
}

type Page = ReturnType<typeof useChildPage>;
function PageControls({ page }: { page: Page }) {
  if (page.total <= PAGE_SIZE) return null;
  const button = 'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-40 disabled:cursor-not-allowed';
  return <nav aria-label="Phân trang danh sách" className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-slate-500 print:hidden">
    <span>{page.start + 1}–{page.end} / {page.total} bản ghi</span>
    <div className="flex items-center gap-2">
      <button type="button" className={button} disabled={page.page === 0} onClick={() => page.onChange(0)} aria-label="Trang đầu">Đầu</button>
      <button type="button" className={button} disabled={page.page === 0} onClick={() => page.onChange(page.page - 1)}>Trước</button>
      <span aria-live="polite" className="rounded-lg bg-orange-50 px-3 py-1.5 font-semibold text-orange-700">Trang {page.page + 1}/{page.pages}</span>
      <button type="button" className={button} disabled={page.page + 1 >= page.pages} onClick={() => page.onChange(page.page + 1)}>Sau</button>
      <button type="button" className={button} disabled={page.page + 1 >= page.pages} onClick={() => page.onChange(page.pages - 1)} aria-label="Trang cuối">Cuối</button>
    </div>
  </nav>;
}

export function PaginatedTableBody({ children, ...props }: React.ComponentProps<'tbody'>) {
  const page = useChildPage(children);
  return <tbody {...props}>{page.rows}{page.total > PAGE_SIZE && <tr><td colSpan={columnCount(children)} className="border-t border-slate-100 bg-slate-50/50"><PageControls page={page} /></td></tr>}</tbody>;
}

export function PaginatedList({ children, className }: { children: React.ReactNode; className?: string }) {
  const page = useChildPage(children);
  return <div><div className={className}>{page.rows}</div><PageControls page={page} /></div>;
}

export function PaginatedTableGroups({ children }: { children: React.ReactNode }) {
  const page = useChildPage(children);
  return <>{page.rows}{page.total > PAGE_SIZE && <tbody><tr><td colSpan={columnCount(children)}><PageControls page={page} /></td></tr></tbody>}</>;
}
