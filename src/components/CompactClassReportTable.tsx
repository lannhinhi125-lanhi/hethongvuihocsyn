import React, { useState } from 'react';
import type { ReportRecord } from '../lib/customReports';
import { ClassReportDetail } from './ClassReportDetail';

export function CompactClassReportTable({ records }: { records: ReportRecord[] }) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ReportRecord | null>(null);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(records.length / 10) - 1));
  return <><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr>
    <th scope="col" className="px-4 py-3">Lớp học</th><th scope="col" className="px-3 py-3">Môn / Khối</th><th scope="col" className="px-3 py-3">Sĩ số</th><th scope="col" className="px-3 py-3">Phân loại</th><th scope="col" className="px-3 py-3">Ngày tạo</th><th scope="col" className="px-3 py-3"><span className="sr-only">Thao tác</span></th>
  </tr></thead><tbody className="divide-y divide-slate-100">{records.slice(currentPage * 10, (currentPage + 1) * 10).map(record => <tr key={String(record.id)} className="hover:bg-slate-50">
    <th scope="row" className="max-w-64 px-4 py-3"><button type="button" onClick={() => setSelected(record)} className="text-left font-semibold text-slate-800 hover:text-indigo-700">{record.name}</button><span className="mt-1 block text-xs font-normal text-slate-500">{record.id}</span></th>
    <td className="px-3 py-3">{record.subject}<span className="mt-1 block text-xs text-slate-500">{record.grade}</span></td>
    <td className="whitespace-nowrap px-3 py-3 tabular-nums">{record.enrolled ?? '—'} / {record.capacity ?? '—'}</td><td className="max-w-48 px-3 py-3 text-xs text-slate-600">{record.growthKind}</td>
    <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">{record.date ? String(record.date).split('-').reverse().join('/') : 'Chưa có ngày'}</td>
    <td className="px-3 py-3"><button type="button" onClick={() => setSelected(record)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-indigo-700">Chi tiết</button></td>
  </tr>)}</tbody></table></div>{records.length > 10 && <div className="flex items-center justify-between border-t p-3 text-xs text-slate-500"><span>{currentPage * 10 + 1}–{Math.min((currentPage + 1) * 10, records.length)} / {records.length} lớp</span><div className="flex gap-3"><button type="button" disabled={!currentPage} onClick={() => setPage(currentPage - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Trước</button><button type="button" disabled={(currentPage + 1) * 10 >= records.length} onClick={() => setPage(currentPage + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Sau</button></div></div>}
    {selected && <ClassReportDetail record={{ code: String(selected.id), name: String(selected.name), date: String(selected.date || ''), subject: String(selected.subject), grade: String(selected.grade), model: String(selected.model),
      students: `${selected.enrolled ?? '—'} / ${selected.capacity ?? '—'}`, status: String(selected.status), label: String(selected.growthKind),
      newStudents: Number(selected.newStudents || 0), oldStudents: Number(selected.oldStudents || 0), unknownStudents: Number(selected.unknownStudents || 0) }} onClose={() => setSelected(null)} />}
  </>;
}
