import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function ClassReportDetail({ record, onClose }: {
  record: { name: string; code: string; date: string; subject: string; grade: string; model: string; students: string; status: string;
    label: string; newStudents: number; oldStudents: number; unknownStudents: number };
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  const fields = [
    ['Mã lớp', record.code], ['Ngày tạo', record.date ? record.date.split('-').reverse().join('/') : 'Chưa có ngày'],
    ['Môn học', record.subject], ['Khối lớp', record.grade], ['Mô hình', record.model],
    ['Sĩ số / Trần', record.students], ['Tình trạng sĩ số', record.status], ['Phân loại', record.label],
    ['Học sinh mới trong kỳ', record.newStudents], ['Học sinh cũ / chuyển lớp', record.oldStudents], ['Chưa đủ dữ liệu học sinh', record.unknownStudents]
  ];
  return <dialog ref={dialog} aria-labelledby="class-report-detail-title" onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === dialog.current) { const bounds = dialog.current!.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}
    className="fixed inset-0 m-auto max-h-[85vh] w-[calc(100%_-_2rem)] max-w-xl overflow-auto rounded-2xl border-0 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-900/40">
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5"><div><p className="text-xs font-semibold text-orange-600">CHI TIẾT LỚP HỌC MỚI</p><h3 id="class-report-detail-title" className="mt-1 text-lg font-bold">{record.name}</h3></div><button type="button" autoFocus onClick={onClose} aria-label="Đóng chi tiết lớp" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"><X className="h-4 w-4" /></button></div>
    <dl className="grid grid-cols-1 gap-x-5 gap-y-4 p-5 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>)}</dl>
    <p className="border-t border-slate-100 p-5 text-xs leading-relaxed text-slate-500">Phân loại học sinh theo kỳ hiện tại và lịch sử ghép/chuyển lớp. Sĩ số và tình trạng chỗ trống phản ánh hiện trạng. Bản xuất CSV vẫn có đầy đủ các trường để đối chiếu.</p>
  </dialog>;
}
