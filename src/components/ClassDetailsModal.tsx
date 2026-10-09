import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Users } from 'lucide-react';
import type { ClassItem, StudentRecord } from '../types';

type Props = {
  item: ClassItem;
  students: StudentRecord[];
  categoryName: string;
  gradeName: string;
  subjectName: string;
  levelName: string;
  onClose: () => void;
};

export const ClassDetailsModal: React.FC<Props> = ({ item, students, categoryName, gradeName, subjectName, levelName, onClose }) => {
  const closeButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const controls = panel.current?.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex="0"]');
        if (!controls?.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previousFocus?.focus(); };
  }, [onClose]);
  const members = item.studentIds.map(id => ({ id, student: students.find(student => student.id === id) }));
  return createPortal(<div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="class-details-title" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className="flex justify-between items-start gap-3 border-b border-slate-100 pb-3">
        <div><h3 id="class-details-title" className="font-bold text-base text-slate-800">Chi tiết lớp học</h3><p className="mt-1 text-xs font-mono text-[#FF5C00]">{item.code}</p></div>
        <button ref={closeButton} type="button" onClick={onClose} aria-label="Đóng chi tiết lớp học" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="w-5 h-5" /></button>
      </div>
      <section className="mt-4 rounded-xl border border-orange-200 bg-orange-50/40 p-4">
        <h4 className="font-semibold text-[#FF5C00]">{item.name}</h4>
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 text-xs">
          {[
            ['Loại lớp', categoryName], ['Khối lớp', gradeName], ['Môn học', subjectName], ['Trình độ', levelName],
            ['Mô hình', item.model], ['Trạng thái', item.status || 'Đang học'], ['Giáo viên', item.teacherName || 'Chưa phân công'], ['Sĩ số', members.length + '/' + item.maxStudents]
          ].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-0.5 font-semibold text-slate-800">{value}</dd></div>)}
          <div className="sm:col-span-2"><dt className="text-slate-500">Lịch học</dt><dd className="mt-0.5 font-medium text-slate-800">{item.schedule || 'Chưa có lịch'}</dd></div>
        </dl>
      </section>
      <section className="mt-5">
        <h4 className="flex items-center gap-2 font-semibold text-sm text-slate-800"><Users className="w-4 h-4 text-[#FF5C00]" />Danh sách học sinh ({members.length})</h4>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2 font-semibold">Mã học sinh</th><th className="px-3 py-2 font-semibold">Tên học sinh</th><th className="px-3 py-2 font-semibold">Trạng thái</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{members.map(({id,student}) => <tr key={id}><td className="px-3 py-3 font-mono text-slate-500">{id}</td><td className="px-3 py-3 font-semibold text-slate-800">{student?.name || 'Không tìm thấy hồ sơ'}</td><td className="px-3 py-3 text-slate-600">{student?.status || '—'}</td></tr>)}{!members.length && <tr><td colSpan={3} className="p-5 text-center text-slate-400">Lớp chưa có học sinh.</td></tr>}</tbody>
        </table></div>
      </section>
      <div className="mt-5 flex justify-end border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="rounded-lg bg-[#FF5C00] px-4 py-2 text-xs font-semibold text-white hover:bg-[#E05200]">Đóng</button></div>
    </div>
  </div>, document.body);
};
