import type { RecentMaterialChange } from '../lib/recentMaterialChanges';
import { PaginatedTableBody } from './Pagination';

export function RecentMaterialResults({ rows, classStatusLabels = {} }: { rows: RecentMaterialChange[]; classStatusLabels?: Record<string, string> }) {
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Các buổi vừa cập nhật học liệu">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600"><tr>
          {['Lớp nhận học liệu', 'Buổi học', 'Học liệu vừa lưu', 'Trạng thái'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}
        </tr></thead>
        <PaginatedTableBody className="divide-y divide-slate-100">
          {rows.map(row => <tr key={`${row.classId}-${row.material.week}-${row.material.session}`} className={row.kind === 'added' ? 'bg-emerald-50/40' : 'bg-orange-50/40'}>
            <td className="px-4 py-3"><div className="font-mono font-bold text-[#FF5C00]">{row.code}</div><div className="mt-1 text-slate-600">{row.name}</div>{classStatusLabels[row.classId] && <div className="mt-1 text-[11px] font-semibold text-slate-600">{classStatusLabels[row.classId]}</div>}</td>
            <td className="px-4 py-3"><div className="font-semibold text-slate-800">{row.date ? new Intl.DateTimeFormat('vi-VN', {weekday:'short', day:'2-digit', month:'2-digit', year:'numeric', timeZone:'UTC'}).format(new Date(`${row.date}T12:00:00Z`)) : 'Chưa có buổi học phù hợp trong tuần'}</div><div className="mt-1 text-slate-500">Buổi {row.material.session} trong tuần{row.date && row.time ? ` · ${row.time}` : ''}</div></td>
            <td className="px-4 py-3"><div className="font-semibold text-slate-800">{row.material.title || 'Chưa đặt tên bài'}</div><div className="mt-1.5 flex gap-3 text-[11px]">
              {row.material.slide && <a href={row.material.slide} target="_blank" rel="noreferrer" className="text-blue-700 underline">Mở slide</a>}
              {row.material.lms && <a href={row.material.lms} target="_blank" rel="noreferrer" className="text-blue-700 underline">Mở LMS</a>}
            </div></td>
            <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold ${row.kind === 'added' ? 'border-emerald-200 bg-emerald-100 text-emerald-800' : 'border-orange-200 bg-orange-100 text-orange-800'}`}>{row.kind === 'added' ? 'Vừa thêm' : 'Vừa cập nhật'}</span></td>
          </tr>)}
          {!rows.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Nội dung giống học liệu đã có. Không có buổi nào thay đổi trong lần lưu này.</td></tr>}
        </PaginatedTableBody>
      </table>
    </div>
  </div>;
}
