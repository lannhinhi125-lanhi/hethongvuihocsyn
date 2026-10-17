import type { ReportDataset, ReportDimension } from './customReports';

interface Sources {
  classes: Array<{ code: string; name: string; date: string; subject: string; grade: string; model: string; students: string; status: string }>;
  students: Array<{ id: string; name: string; date: string; subject: string; grade: string; model: string; status: string }>;
  registrations?: Array<{ id: string; name: string; date: string; subject: string; grade: string; model: string; status: string }>;
  teachers: Array<{ id: string; name: string; date: string; subject: string; grades: string; status: string; assigned: number }>;
  incidents: Array<{ periodCode: string; period: string; dateFrom: string; dateTo: string; total: number; incidents: number; urgent: number; notice: number; main: string }>;
  inspections: Array<{ id: string; name: string; subject: string; avg: number; rank: string; total: number }>;
}
const dimension = (id: string, label: string): ReportDimension => ({ id, label });
const subject = dimension('subject', 'Môn học'), grade = dimension('grade', 'Khối lớp');
const model = dimension('model', 'Mô hình'), status = dimension('status', 'Trạng thái');
const time = [dimension('day', 'Ngày'), dimension('week', 'Tuần'), dimension('month', 'Tháng')];
const numericPart = (value: string, index: number) => {
  const text = value.split('/')[index]?.replace(/[^\d.]/g, '');
  if (!text) return undefined;
  const number = Number(text);
  return Number.isFinite(number) ? number : undefined;
};
export function makeReportDatasets(sources: Sources): ReportDataset[] {
  return [
    {
      id: 'classes', label: 'Lớp học', dateKind: 'event',
      note: 'Khoảng thời gian lọc theo ngày tạo lớp. Sĩ số và chỗ trống phản ánh trạng thái hiện có của các lớp đó.',
      records: sources.classes.map(item => {
        const enrolled = numericPart(item.students, 0), capacity = numericPart(item.students, 1);
        return { id: item.code, name: item.name, date: item.date, subject: item.subject, grade: item.grade, model: item.model,
          status: item.status, enrolled, capacity, available: enrolled !== undefined && capacity !== undefined ? Math.max(0, capacity - enrolled) : undefined };
      }),
      metrics: [
        { id: 'count', label: 'Số lớp', mode: 'count' },
        { id: 'enrolled', label: 'Học sinh trong lớp', mode: 'sum', field: 'enrolled' },
        { id: 'available', label: 'Chỗ còn trống', mode: 'sum', field: 'available' },
        { id: 'occupancy', label: 'Tỷ lệ lấp đầy (%)', mode: 'ratio', field: 'enrolled', denominator: 'capacity', format: 'percent' }
      ],
      defaultMetricIds: ['count', 'available'], dimensions: [subject, grade, model, status, ...time], filters: [subject, grade, model, status],
      detailFields: [dimension('id', 'Mã lớp'), dimension('name', 'Tên lớp'), dimension('date', 'Ngày tạo'), subject, grade, model, status, dimension('enrolled', 'Sĩ số'), dimension('capacity', 'Sĩ số tối đa')]
    },
    {
      id: 'students', label: 'Hồ sơ học sinh mới', dateKind: 'event',
      note: 'Đếm một hồ sơ theo mã học sinh và ngày tiếp nhận. Học sinh đăng ký nhiều môn vẫn chỉ tính một hồ sơ.',
      records: [...new Map(sources.students.map(item=>[item.id,{...item}])).values()],
      metrics: [{ id: 'count', label: 'Số hồ sơ học sinh', mode: 'count' }],
      defaultMetricIds: ['count'], dimensions: [grade, subject, model, status, ...time], filters: [subject, grade, model, status],
      detailFields: [dimension('id', 'Mã học sinh'), dimension('name', 'Họ tên'), dimension('date', 'Ngày tiếp nhận hồ sơ'), subject, grade, model, status]
    },
    ...(sources.registrations ? [{
      id:'student_registrations',label:'Đăng ký môn học',dateKind:'event' as const,
      note:'Đếm từng đăng ký môn theo ngày đăng ký môn đó. Một hồ sơ đăng ký Toán và Anh được tính hai lượt đăng ký.',
      records:sources.registrations.map(item=>({...item})),
      metrics:[{id:'count',label:'Lượt đăng ký môn',mode:'count' as const}],
      defaultMetricIds:['count'],dimensions:[grade,subject,model,status,...time],filters:[subject,grade,model,status],
      detailFields:[dimension('id','Mã học sinh'),dimension('name','Họ tên'),dimension('date','Ngày đăng ký môn'),subject,grade,model,status]
    }] : []),
    {
      id: 'teachers', label: 'Giáo viên mới', dateKind: 'event',
      note: 'Khoảng thời gian lọc theo ngày gia nhập. Số ca được giao phản ánh số liệu hiện có của giáo viên trong danh sách.',
      records: sources.teachers.map(item => ({ id: item.id, name: item.name, date: item.date, subject: item.subject, grade: item.grades, status: item.status, assigned: item.assigned })),
      metrics: [{ id: 'count', label: 'Số giáo viên', mode: 'count' }, { id: 'assigned', label: 'Ca được giao', mode: 'sum', field: 'assigned' }],
      defaultMetricIds: ['count', 'assigned'], dimensions: [subject, grade, status, ...time], filters: [subject, grade, status],
      detailFields: [dimension('id', 'Mã giáo viên'), dimension('name', 'Họ tên'), dimension('date', 'Ngày gia nhập'), subject, grade, status, dimension('assigned', 'Ca được giao')]
    },
    {
      id: 'incidents', label: 'Sự cố vận hành', dateKind: 'period',
      note: 'Nguồn hiện tổng hợp theo kỳ. Khi lọc ngày, báo cáo cộng toàn bộ kỳ có giao với khoảng đã chọn; chưa chia được số liệu theo từng ngày.',
      records: sources.incidents.map(item => ({ id: item.periodCode, period: item.period, date: item.dateFrom, dateTo: item.dateTo, total: item.total,
        incidents: item.incidents, urgent: item.urgent, notice: item.notice, cause: item.main })),
      metrics: [
        { id: 'incidents', label: 'Ca có sự cố', mode: 'sum', field: 'incidents' },
        { id: 'rate', label: 'Tỷ lệ sự cố (%)', mode: 'ratio', field: 'incidents', denominator: 'total', format: 'percent' },
        { id: 'total', label: 'Tổng ca theo dõi', mode: 'sum', field: 'total' },
        { id: 'urgent', label: 'Sự cố khẩn cấp', mode: 'sum', field: 'urgent' },
        { id: 'notice', label: 'Sự cố báo trước', mode: 'sum', field: 'notice' }
      ],
      defaultMetricIds: ['incidents', 'rate'], dimensions: [dimension('period', 'Kỳ báo cáo'), dimension('cause', 'Nguyên nhân chính')], filters: [dimension('cause', 'Nguyên nhân chính')],
      detailFields: [dimension('period', 'Kỳ'), dimension('date', 'Từ ngày'), dimension('dateTo', 'Đến ngày'), dimension('total', 'Tổng ca'), dimension('incidents', 'Sự cố'), dimension('urgent', 'Khẩn cấp'), dimension('notice', 'Báo trước'), dimension('cause', 'Nguyên nhân chính')]
    },
    {
      id: 'inspection', label: 'Dự giờ & Xếp hạng', dateKind: 'snapshot',
      note: 'Nguồn là số liệu tổng hợp hiện có, chưa có ngày dự giờ cho từng bản ghi nên chưa áp dụng lọc thời gian.',
      records: sources.inspections.map(item => ({ id: item.id, name: item.name, subject: item.subject, rank: item.rank, score: item.avg, sessions: item.total })),
      metrics: [{ id: 'count', label: 'Số giáo viên', mode: 'count' }, { id: 'score', label: 'Điểm trung bình', mode: 'average', field: 'score', format: 'score' }, { id: 'sessions', label: 'Số ca được tổng hợp', mode: 'sum', field: 'sessions' }],
      defaultMetricIds: ['count', 'score'], dimensions: [dimension('rank', 'Xếp hạng'), subject], filters: [subject, dimension('rank', 'Xếp hạng')],
      detailFields: [dimension('id', 'Mã giáo viên'), dimension('name', 'Họ tên'), subject, dimension('rank', 'Xếp hạng'), dimension('score', 'Điểm'), dimension('sessions', 'Số ca')]
    }
  ];
}
