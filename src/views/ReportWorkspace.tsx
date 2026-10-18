import React, { useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';
import { useBusinessStatus, useBusinessValue } from '../lib/businessPersistence';
import { allReportDatasets } from '../lib/allReportDatasets';
import type { ReportIncident, ReportLesson } from '../lib/incidentReportPeriods';
import type { InspectionEvaluation } from '../lib/inspectionReport';
import { ReportDataStatus } from '../components/ReportDataStatus';
import { CustomReportBuilder } from '../components/CustomReportBuilder';

export function ReportWorkspace() {
  const { classes, students, teachers, subjects, models, timeSlots, reportSection, setReportSection } = useApp();
  const { can } = usePermissions();
  const { loadedAt } = useBusinessStatus();
  const [lessons] = useBusinessValue<ReportLesson[]>('dated_lessons');
  const [incidents] = useBusinessValue<ReportIncident[]>('lesson_incidents');
  const [evaluations] = useBusinessValue<InspectionEvaluation[]>('teacher_evaluations');
  const general = can('Xem báo cáo giáo viên, học sinh và lớp học');
  const operational = can('Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn');
  const custom = can('Công cụ tạo báo cáo tùy biến (Dynamic Report)');
  const canDetail = general || operational;
  useEffect(() => {
    if (reportSection === 'detail' && !canDetail && custom) setReportSection('custom');
    if (reportSection === 'custom' && !custom && canDetail) setReportSection('detail');
  }, [reportSection, canDetail, custom, setReportSection]);
  const datasets = useMemo(() => allReportDatasets({ classes, students, teachers, lessons, incidents, evaluations, lookups: { subjects, models, timeSlots } }),
    [classes, students, teachers, lessons, incidents, evaluations, subjects, models, timeSlots]);
  const detail = datasets.detail.filter(dataset => ['classes', 'students', 'student_registrations', 'teachers'].includes(dataset.id) ? general : operational);
  return <div className="space-y-3"><ReportDataStatus />
    {loadedAt && canDetail && detail.length > 0 && <div hidden={reportSection !== 'detail'}><CustomReportBuilder key="detail" datasets={detail} mode="detail" /></div>}
    {loadedAt && custom && <div hidden={reportSection !== 'custom'}><CustomReportBuilder key="custom" datasets={datasets.custom} /></div>}
    {!canDetail && !custom && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Tài khoản chưa được cấp quyền xem báo cáo.</p>}
  </div>;
}
