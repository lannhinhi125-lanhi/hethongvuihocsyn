import {REPORT_FONT_FAMILY} from '../lib/reportTypography';
import type { PauseCatalog } from '../lib/classPause';
import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { usePermissions } from '../hooks/usePermissions';
import { useBusinessStatus, useBusinessValue } from '../lib/businessPersistence';
import { allReportDatasets } from '../lib/allReportDatasets';
import type { ReportIncident, ReportLesson } from '../lib/incidentReportPeriods';
import type { InspectionEvaluation } from '../lib/inspectionReport';
import { ReportDataStatus } from '../components/ReportDataStatus';
import { CustomReportBuilder } from '../components/CustomReportBuilder';
import { ReportComposer } from '../components/ReportComposer';
import type { ReportDocumentRequest } from '../lib/reportDocument';

export function ReportWorkspace() {
  const { classes, students, teachers, subjects, models, timeSlots, teachingCategories, levels, incidents: incidentCategories, reportSection, setReportSection, currentUser } = useApp();
  const [draft, setDraft] = useState<{ actorId: string; value: ReportDocumentRequest } | null>(null);
  const request = draft?.actorId === currentUser.id ? draft.value : null;
  const { can } = usePermissions();
  const { loadedAt } = useBusinessStatus();
  const [customCatalogs] = useBusinessValue<PauseCatalog[]>('custom_catalogs');
  const [lessons] = useBusinessValue<ReportLesson[]>('dated_lessons');
  const [incidents] = useBusinessValue<ReportIncident[]>('lesson_incidents');
  const [evaluations] = useBusinessValue<InspectionEvaluation[]>('teacher_evaluations');
  const general = can('Xem báo cáo giáo viên, học sinh và lớp học');
  const operational = can('Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn');
  const custom = can('Công cụ tạo báo cáo tùy biến (Dynamic Report)');
  const canView = general || operational || custom;
  const datasets = useMemo(() => allReportDatasets({ classes, students, teachers, lessons, incidents, evaluations, lookups: { subjects, models, timeSlots, teachingCategories, levels, incidentCategories, customCatalogs } }),
    [classes, students, teachers, lessons, incidents, evaluations, subjects, models, timeSlots, teachingCategories, levels, incidentCategories, customCatalogs]);
  const allowed = datasets.detail.filter(dataset => custom || (['classes','classes_ending', 'students', 'student_registrations','student_registration_periods', 'student_multi_enrollment', 'teachers'].includes(dataset.id) ? general : operational));
  return <div className="space-y-3" style={{fontFamily:REPORT_FONT_FAMILY}}><ReportDataStatus showSuccess={false} />
    {loadedAt && canView && allowed.length > 0 && <>
      <div hidden={reportSection !== 'detail'}><CustomReportBuilder key={'statistics-' + currentUser.id} datasets={allowed} mode={custom ? 'custom' : 'detail'} onCompose={value => { setDraft({ actorId: currentUser.id, value }); setReportSection('custom'); }} /></div>
      <div hidden={reportSection !== 'custom'}><ReportComposer key={'composer-' + currentUser.id} datasets={allowed} request={request} updatedAt={loadedAt} /></div>
    </>}
    {!canView && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Tài khoản chưa được cấp quyền xem báo cáo.</p>}
  </div>;
}
