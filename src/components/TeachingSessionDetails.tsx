import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { ClassItem } from '../types';
import { useApp } from '../context/AppContext';
import { useBusinessValue } from '../lib/businessPersistence';
import { teachingSessionDetails, teachingSessionsInWeek, type TeachingLesson } from '../lib/teachingSessionDetails';
import {sessionCompletionWarning} from '../lib/sessionAlerts';

interface Props {
  cls: ClassItem;
  session: number;
  date: string;
  time: string;
  readOnly?: boolean;
  lessonId?: string;
  hideFeedback?: boolean;
  hideWeekNavigation?: boolean;
  onSelect: (session: number, date: string, time: string) => void;
  onEnter?: () => void;
  enterDisabled?: boolean;
  endControl?: React.ReactNode;
  children?: React.ReactNode;
}

export function TeachingSessionDetails({ cls, session, date, time, readOnly, lessonId, hideFeedback, hideWeekNavigation, onSelect, onEnter, enterDisabled, endControl, children }: Props) {
  const { students, teachers, timeSlots, subjects, levels } = useApp();
  const [lessons] = useBusinessValue<TeachingLesson[]>('dated_lessons');
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 10_000); return () => window.clearInterval(timer); }, []);
  const detail = teachingSessionDetails(cls, session, date, time, lessons, timeSlots, now, lessonId);
  const weekSessions = teachingSessionsInWeek(cls, date);
  const cover = cls.coverAssignments?.find(item => item.sessionNum === session && item.dateStr === date);
  const teacherId = detail.lesson ? detail.lesson.coverTeacherId || detail.lesson.primaryTeacherId : cover?.teacherId || detail.active?.coverTeacherId || cls.teacherId;
  const teacherName = teachers.find(item => item.id === teacherId)?.name || cover?.teacherName || detail.active?.coverTeacherName || cls.teacherName;
  const statusLabel = {CHUA_DIEN_RA:'Chưa diễn ra', CHUA_HOC:'Chưa học', DANG_HOC:'Đang học', CHUA_HOAN_TAT:'Đã học', DA_HOC:'Đã học', NGHI_HOC:'Nghỉ học'}[detail.lifecycleStatus];
  const completionWarning=sessionCompletionWarning({sessionDate:date,timeSlot:time,status:detail.lesson?.status,
    checkinAt:detail.lesson?.checkinAt,checkoutAt:detail.lesson?.checkoutAt,checkinTime:detail.active?.checkinTime},now);
  const studentIds=detail.lesson?.inspectionData?.studentIds ?? detail.lesson?.feedbackProgress?.studentIds ?? (lessonId ? [] : cls.studentIds);
  const feedbackTotal=detail.lesson?.feedbackProgress?.total ?? studentIds.length;
  const feedbackCompleted=detail.lesson?.feedbackProgress?.completed ?? studentIds.filter(id=>detail.active?.feedback?.[id]?.trim()).length;
  const feedbackDone=feedbackTotal>0 && feedbackCompleted===feedbackTotal;
  const materialLink = (label: string, url: string) => <div className="flex items-center justify-between gap-2"><span>{label}:</span>{url ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-[#FF5C00] hover:underline">Mở tài liệu <ExternalLink className="h-3 w-3" /></a> : <span className="text-slate-400">Chưa có link</span>}</div>;
  return <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
    <aside className="w-full md:w-80 bg-slate-50/70 p-5 border-r border-slate-200 shrink-0 space-y-6">
      <div className="space-y-2 text-xs">
        <div className="font-bold text-slate-500 uppercase tracking-wider">Thông tin lớp</div>
        <div className="font-bold text-slate-900">{cls.code} · <span className="text-[#FF5C00]">{subjects.find(item => item.code === cls.subject)?.name || cls.subject}</span> · {cls.model}</div>
        <div className="text-slate-700">{cls.grade} ({levels.find(item => item.code === cls.level)?.name || cls.level}) - {cls.name}</div>
        <div className="font-mono text-slate-600">{cls.schedule}</div>
        {readOnly && <span className="inline-block rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">Chỉ xem</span>}
      </div>
      {!hideWeekNavigation && <div className="space-y-2">
        <div className="text-xs font-bold text-slate-700 uppercase">Lịch dạy trong tuần</div>
        {weekSessions.map(item => <button key={`${item.session}-${item.date}`} type="button" onClick={() => onSelect(item.session, item.date, item.time)} className={`w-full rounded-xl border p-3 text-left text-xs ${item.session === session && item.date === date ? 'border-sky-300 bg-sky-50/80 shadow-2xs' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
          <div className="font-bold text-slate-800">{new Date(`${item.date}T00:00:00`).toLocaleDateString('vi-VN')} {item.time}</div>
          <div className="mt-1 italic text-slate-700">{item.material?.title || 'Chưa có học liệu được gắn cho buổi này'}</div>
          <div className="mt-2 text-slate-500">Buổi {item.session}{item.session === session && item.date === date ? ' · Đang xem' : ''}</div>
        </button>)}
      </div>}
    </aside>
    <div className="flex-1 min-w-0 p-6 space-y-6 bg-sky-50/30">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
          <div className="font-bold text-slate-800">Thông tin giáo viên</div>
          <div className="text-slate-600">Giáo viên: <strong>{teacherName}</strong></div>
          <div className="text-slate-500">Mã: {teacherId || 'Chưa phân công'}</div>
          <div className="text-slate-600">Hình thức dạy: {(detail.lesson ? detail.lesson.coverTeacherId : cover || detail.active?.coverTeacherId) ? 'Dạy thay' : 'Chính'}</div>
          <div className="text-slate-500">Check-in: {detail.lesson?.checkinAt ? new Date(detail.lesson.checkinAt).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Bangkok' }) : detail.active?.checkinTime || 'Chưa vào lớp'}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
          <div className="font-bold text-slate-800">Phòng học &amp; Bản ghi</div>
          <div className="text-slate-500">{date} · {time}</div>
          <div className="font-semibold text-sky-700">{statusLabel}</div>
          {completionWarning&&<div className="text-[10px] font-normal text-orange-700">{completionWarning.replace('Chưa hoàn tất · ', '')}</div>}
          {!hideFeedback && <div className={feedbackDone ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>Nhận xét: {feedbackDone ? 'Đã nhận xét' : feedbackCompleted>0 ? 'Chưa nhận xét đủ' : 'Chưa nhận xét'} ({feedbackCompleted}/{feedbackTotal} học sinh)</div>}
          {detail.lesson?.checkoutAt && <div className="text-slate-500">Check-out: {new Date(detail.lesson.checkoutAt).toLocaleTimeString('vi-VN', {timeZone:'Asia/Bangkok'})}</div>}
          {!detail.actionUrl ? <button type="button" disabled className="mt-3 w-full rounded-xl bg-slate-200 px-4 py-2.5 font-bold text-slate-400 disabled:cursor-not-allowed">{detail.actionLabel} · Chưa có link</button> : onEnter && detail.status !== 'DA_HOC' ?
            <button type="button" onClick={onEnter} disabled={enterDisabled} className="mt-3 w-full rounded-xl bg-[#FF5C00] px-4 py-2.5 font-bold text-white hover:bg-[#E05200] disabled:cursor-not-allowed disabled:bg-slate-300">{detail.actionLabel}</button> :
            <a href={detail.actionUrl} target="_blank" rel="noreferrer" className={`mt-3 flex w-full items-center justify-center gap-1 rounded-xl px-4 py-2.5 font-bold text-white ${detail.status === 'DA_HOC' ? 'bg-purple-700 hover:bg-purple-800' : 'bg-[#FF5C00] hover:bg-[#E05200]'}`}>{detail.actionLabel}<ExternalLink className="h-3 w-3" /></a>}
          {endControl}
          {readOnly && !endControl && <button type="button" disabled title="Màn hình dự giờ chỉ xem thông tin ca học" className="w-full rounded-xl bg-slate-200 px-4 py-2.5 font-bold text-slate-400 cursor-not-allowed">{detail.lesson?.checkoutAt ? 'Đã kết thúc lớp' : 'Kết thúc lớp'}</button>}
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
          <div className="font-bold text-slate-800">Học liệu buổi {session || 'đang xem'}</div>
          <div className="text-slate-600">{detail.title}</div>
          {materialLink('Slide', detail.slide)}{materialLink('Bài tập LMS', detail.exercise)}{materialLink('Học liệu học sinh', detail.studentMaterial)}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs">
        <div className="mb-2 font-bold text-slate-800">Nhật ký giảng dạy &amp; Dặn dò bài tập</div>
        <div className="whitespace-pre-wrap text-slate-600">{detail.lesson?.diary || 'Chưa có nhật ký cho ca học này.'}</div>
      </div>
      {children || <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs">
        <div className="mb-3 flex justify-between font-bold text-slate-800"><span>Danh sách học viên</span><span>{statusLabel}</span></div>
        <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b text-slate-400"><th className="pb-2">Học viên</th><th className="pb-2">Mã học sinh</th><th className="pb-2">Điểm danh</th>{!hideFeedback && <th className="pb-2">Nhận xét buổi học</th>}</tr></thead>
          <tbody>{studentIds.map(id => { const student = students.find(item => item.id === id); const attendance = detail.lesson?.inspectionData?.attendance?.[id] || detail.active?.attendance?.[id];
            return <tr key={id} className="border-b border-slate-100 align-top"><td className="py-3 font-semibold">{student?.name || id}</td><td className="py-3">{id}</td><td className="py-3">{attendance ? ({ present: 'Có mặt', late: 'Đi muộn', absent: 'Vắng mặt' } as Record<string,string>)[attendance] : 'Chưa điểm danh'}</td>{!hideFeedback && <td className="py-3 whitespace-pre-wrap">{detail.lesson?.inspectionData?.feedback?.[id] || detail.active?.feedback?.[id] || 'Chưa có nhận xét'}</td>}</tr>;
          })}{!studentIds.length && <tr><td colSpan={hideFeedback ? 3 : 4} className="py-4 text-center text-slate-400">Chưa có dữ liệu học sinh của buổi học.</td></tr>}</tbody>
        </table></div>
      </div>}
    </div>
  </div>;
}
