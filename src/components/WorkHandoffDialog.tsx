import { ReportSelect } from './ReportSelect';
import { workTeachingGroups, type WorkTeachingContext } from '../lib/workTeachingGroups';
﻿import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import type { TeacherPayrollSummary } from '../types';
import { workHandoffDocument, workHandoffTotals, workCreditText, type WorkHandoffInfo } from '../lib/workReconciliationExport';
import { PaginatedTableBody } from './Pagination';

export function WorkHandoffDialog({ mode, staff, info, teachingContext, scope, onScopeChange, onInfoChange, onClose, onExport, authorizePrint }: {
  teachingContext: WorkTeachingContext; mode: 'export' | 'print'; staff: TeacherPayrollSummary[]; info: WorkHandoffInfo; scope: 'staff' | 'sessions';
  onScopeChange: (scope: 'staff' | 'sessions') => void; onInfoChange: (patch: Partial<WorkHandoffInfo>) => void;
  onClose: () => void; onExport: () => void; authorizePrint: () => boolean;
}) {
  const [ready, setReady] = useState(false), [error, setError] = useState('');
  const frame = useRef<HTMLIFrameElement>(null);
  const rows = workTeachingGroups(staff, teachingContext), totals = workHandoffTotals(staff);
  const html = useMemo(() => mode === 'print' ? workHandoffDocument(staff, info) : '', [mode, staff, info]);
  useEffect(() => { setReady(false); }, [html]);
  const input = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500';
  const fields: Array<[keyof WorkHandoffInfo, string]> = [['organization', 'Tên đơn vị'], ['address', 'Địa chỉ'], ['reportNumber', 'Số biên bản'], ['author', 'Người lập'], ['receiver', 'Bộ phận tiếp nhận'], ['operationsSigner', 'Người ký vận hành'], ['receivingSigner', 'Người ký tiếp nhận']];
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="work-handoff-title" onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
    <div className="flex max-h-[94vh] w-full max-w-6xl flex-col rounded-2xl bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3"><div><h3 id="work-handoff-title" className="text-lg font-bold text-slate-800">{mode === 'export' ? 'Xuất công dạy gửi bộ phận tính lương' : 'Biên bản đối soát và bàn giao công dạy'}</h3><p className="mt-1 text-xs text-slate-500">Kỳ {info.month} · {totals.staff} nhân sự · {totals.sessions} buổi · Tổng công: {workCreditText(totals.totalCredit)}</p></div><button type="button" autoFocus aria-label="Đóng bàn giao công" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-3">
        <label className="block text-xs font-medium text-slate-600">Phạm vi bàn giao<ReportSelect aria-label="Phạm vi bàn giao công" value={scope} onChange={event => onScopeChange(event.target.value as 'staff' | 'sessions')} className={input}><option value="staff">Nhân sự theo bộ lọc của bảng tổng hợp — toàn bộ buổi trong kỳ</option><option value="sessions">Các buổi theo bộ lọc của bảng buổi học</option></ReportSelect></label>
        {!info.isLocked && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">Kỳ công chưa khóa. File và biên bản ghi rõ trạng thái hiện tại để bộ phận tiếp nhận phân biệt với dữ liệu đã chốt.</p>}
        <details><summary className="cursor-pointer text-xs font-semibold text-slate-700">Thông tin biên bản và người ký</summary><div className="mt-2 grid gap-3 sm:grid-cols-2">{fields.map(([key, label]) => <label key={key} className="text-xs text-slate-600">{label}<input value={String(info[key] || '')} maxLength={key === 'address' ? 350 : 160} onChange={event => onInfoChange({ [key]: event.target.value })} className={input} /></label>)}</div></details>
        {mode === 'print' ? <><p className="text-xs text-slate-500">Biên bản chính gồm số liệu tổng hợp và chữ ký. Danh sách nhân sự nằm trong phụ lục, bắt đầu ở trang A4 mới khi in.</p><iframe ref={frame} title="Bản xem trước biên bản công dạy A4" srcDoc={html} sandbox="allow-same-origin allow-modals" onLoad={() => setReady(true)} className="h-[60vh] min-h-80 w-full rounded-lg border border-slate-200 bg-slate-100" /></> : <>
          <p className="text-xs text-slate-500">File .xlsx có 2 trang tính: Tổng hợp công dạy giáo viên và Thông tin bàn giao. Bảng dưới phân bổ công theo mô hình, chương trình/trình độ và cấp học; không liệt kê từng buổi hay lớp dạy.</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr>{['Mã nhân sự', 'Họ và tên', 'Môn học', 'Mô hình', 'Chương trình / Trình độ', 'Cấp học', 'Buổi chuẩn', 'Buổi sự cố', 'Công chuẩn', 'Công sự cố', 'Tổng công'].map(label => <th key={label} className="whitespace-nowrap px-3 py-3">{label}</th>)}</tr></thead><PaginatedTableBody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.groupKey}><td className="px-3 py-2">{row.teacherId}</td><td className="px-3 py-2 font-semibold">{row.teacherName}</td><td className="px-3 py-2">{row.subjectName || row.subject}</td><td className="px-3 py-2">{row.modelName}</td><td className="px-3 py-2">{row.programName}</td><td className="px-3 py-2">{row.categoryName}</td><td className="px-3 py-2 tabular-nums">{row.standardSessions}</td><td className="px-3 py-2 tabular-nums">{row.incidentSessions}</td><td className="px-3 py-2 tabular-nums">{workCreditText(row.standardCredit)}</td><td className="px-3 py-2 tabular-nums">{workCreditText(row.incidentCredit)}</td><td className="px-3 py-2 font-bold tabular-nums">{workCreditText(row.totalCredit)}</td></tr>)}</PaginatedTableBody></table></div>
        </>}
        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold">Đóng</button><button type="button" disabled={!staff.length} onClick={onExport} className="inline-flex items-center gap-2 rounded-xl bg-[#FF5C00] px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-40"><Download className="h-4 w-4" />Tải Excel (.xlsx)</button>{mode === 'print' && <button type="button" disabled={!ready || !staff.length} onClick={() => { if (!authorizePrint()) return; try { frame.current?.contentWindow?.focus(); frame.current?.contentWindow?.print(); } catch { setError('Không mở được hộp thoại in. Vui lòng thử lại.'); } }} className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-700 disabled:opacity-40"><Printer className="h-4 w-4" />In / Lưu PDF A4</button>}</div>
    </div>
  </div>;
}
