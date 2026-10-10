import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { FilterDrawer } from '../components/FilterDrawer';
import { StandardTimeFilter } from '../components/StandardTimeFilter';
import {
  PieChart,
  TrendingUp,
  AlertTriangle,
  FolderOpen,
  Printer,
  Download,
  Filter,
  CheckCircle2,
  X,
  RotateCcw,
  Presentation,
  Award,
  Users,
  Clock,
  Table,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  BookOpen,
  GraduationCap,
  ShieldAlert,
  Grid,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  ArrowUpRight,
  Check,
  Percent,
  Search,
  ChevronDown
} from 'lucide-react';

type ReportPeriod = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'Q3';
type DashboardRangePreset = 'CURRENT_MONTH' | 'PREVIOUS_MONTH' | 'LAST_3_MONTHS' | 'ALL' | 'CUSTOM';

const toLocalIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthRange = (month: string) => {
  if (month === 'ALL') return { start: '', end: '' };
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return { start: '', end: '' };
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, '0')}`
  };
};

const formatMonthLabel = (month: string) => {
  if (month === 'ALL') return 'Tất cả';
  const [year, monthNumber] = month.split('-');
  return `Tháng ${monthNumber}/${year}`;
};

const formatDateRangeLabel = (start: string, end: string) =>
  `${start ? `${start.slice(8, 10)}/${start.slice(5, 7)}` : '...'} đến ${end ? `${end.slice(8, 10)}/${end.slice(5, 7)}` : '...'}`;

const getDateFilterRange = (
  month: string,
  startDate: string,
  endDate: string,
  period: ReportPeriod = 'ALL'
) => {
  const today = new Date();
  let range = period === 'Q3'
    ? { start: `${month.slice(0, 4) || today.getFullYear()}-07-01`, end: `${month.slice(0, 4) || today.getFullYear()}-09-30` }
    : period === 'TODAY'
    ? { start: toLocalIsoDate(today), end: toLocalIsoDate(today) }
    : period === 'WEEK' && !startDate && !endDate
    ? (() => {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        firstDay.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));
        const lastDay = new Date(firstDay);
        lastDay.setDate(lastDay.getDate() + 6);
        return { start: toLocalIsoDate(firstDay), end: toLocalIsoDate(lastDay) };
      })()
    : period === 'MONTH' || (period === 'ALL' && month !== 'ALL')
    ? getMonthRange(month)
    : { start: '', end: '' };

  if (period !== 'Q3' && period !== 'TODAY' && period !== 'WEEK' && month !== 'ALL') {
    const monthRange = getMonthRange(month);
    range = {
      start: range.start && range.start > monthRange.start ? range.start : monthRange.start,
      end: range.end && range.end < monthRange.end ? range.end : monthRange.end
    };
  }

  if (startDate && (!range.start || startDate > range.start)) range.start = startDate;
  if (endDate && (!range.end || endDate < range.end)) range.end = endDate;
  return range;
};

const isDateInRange = (date: string, range: { start: string; end: string }) =>
  (!range.start || date >= range.start) && (!range.end || date <= range.end);

const dateRangesOverlap = (
  from: string,
  to: string,
  range: { start: string; end: string }
) => (!range.start || to >= range.start) && (!range.end || from <= range.end);

export const Module8_Reports: React.FC = () => {
  const { showToast } = useApp();

  // 2 Tab chính của hệ thống Báo cáo - Dashboard là mặc định khi vào báo cáo theo yêu cầu
  const [currentMainTab, setCurrentMainTab] = useState<'dashboard' | 'fixed'>('dashboard');

  // Trạng thái mở/đóng dải lọc sổ ngang của từng tab/báo cáo độc lập ("trên nóc")
  const [isDashFilterOpen, setIsDashFilterOpen] = useState(false);
  const [isClsFilterOpen, setIsClsFilterOpen] = useState(false);
  const [isStuFilterOpen, setIsStuFilterOpen] = useState(false);
  const [isTutFilterOpen, setIsTutFilterOpen] = useState(false);
  const [isIncFilterOpen, setIsIncFilterOpen] = useState(false);
  const [isMatFilterOpen, setIsMatFilterOpen] = useState(false);
  const [isInspFilterOpen, setIsInspFilterOpen] = useState(false);

  // =========================================================================
  // TAB 1 (DASHBOARD): BỘ LỌC THỜI GIAN & CHẾ ĐỘ XEM ĐỘC LẬP
  // =========================================================================
  const [dashRangePreset, setDashRangePreset] = useState<DashboardRangePreset>('CURRENT_MONTH');
  const [dashTimeframe, setDashTimeframe] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'Q3'>('MONTH');
  const [dashViewMode, setDashViewMode] = useState<'visual' | 'table' | 'both'>('visual');
  const [dashSearchMetric, setDashSearchMetric] = useState('');
  const [hoveredTrendPoint, setHoveredTrendPoint] = useState<number | null>(null);
  // Mốc thời gian linh hoạt (Từ ngày - Đến ngày) & Tháng
  const [dashMonth, setDashMonth] = useState(() => toLocalIsoDate(new Date()).slice(0, 7));
  const [dashDateFrom, setDashDateFrom] = useState('');
  const [dashDateTo, setDashDateTo] = useState('');
  const [clsMonth, setClsMonth] = useState('2026-10');
  const [clsDateFrom, setClsDateFrom] = useState('');
  const [clsDateTo, setClsDateTo] = useState('');
  const [stuMonth, setStuMonth] = useState('2026-10');
  const [stuDateFrom, setStuDateFrom] = useState('');
  const [stuDateTo, setStuDateTo] = useState('');
  const [tutMonth, setTutMonth] = useState('2026-10');
  const [tutDateFrom, setTutDateFrom] = useState('');
  const [tutDateTo, setTutDateTo] = useState('');
  const [incMonth, setIncMonth] = useState('2026-10');
  const [incDateFrom, setIncDateFrom] = useState('');
  const [incDateTo, setIncDateTo] = useState('');

  // =========================================================================
  // TAB 2 (BÁO CÁO CỐ ĐỊNH): NÚT CHỌN LOẠI BÁO CÁO & CHẾ ĐỘ XEM
  // =========================================================================
  const [selectedFixedReport, setSelectedFixedReport] = useState<
    'fixed_new_classes' | 'fixed_new_students' | 'fixed_new_tutors' | 'fixed_incident_trend' | 'fixed_matrix' | 'fixed_inspection'
  >('fixed_new_classes');

  // Chế độ xem: Biểu đồ tỉ lệ trực quan | Bảng chi tiết | Kết hợp cả hai
  const [fixedViewMode, setFixedViewMode] = useState<'visual' | 'table' | 'both'>('both');

  // =========================================================================
  // BỘ LỌC RIÊNG CHO TỪNG BÁO CÁO (LỌC TRÊN NÓC SỔ NGANG + LỌC TRÊN TỪNG CỘT BẢNG)
  // =========================================================================

  // 1. Bộ lọc riêng cho Báo cáo Lớp học mới
  const [clsPeriod, setClsPeriod] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'Q3'>('ALL');
  const [clsSelectedWeek, setClsSelectedWeek] = useState('ALL');
  const [clsFilterCode, setClsFilterCode] = useState('');
  const [clsFilterName, setClsFilterName] = useState('');
  const [clsFilterGrade, setClsFilterGrade] = useState('ALL');
  const [clsFilterSubject, setClsFilterSubject] = useState('ALL');
  const [clsFilterModel, setClsFilterModel] = useState('ALL');
  const [clsFilterStatus, setClsFilterStatus] = useState('ALL');

  // 2. Bộ lọc riêng cho Báo cáo Học sinh mới
  const [stuPeriod, setStuPeriod] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'Q3'>('ALL');
  const [stuSelectedWeek, setStuSelectedWeek] = useState('ALL');
  const [stuFilterCode, setStuFilterCode] = useState('');
  const [stuFilterName, setStuFilterName] = useState('');
  const [stuFilterGrade, setStuFilterGrade] = useState('ALL');
  const [stuFilterSubject, setStuFilterSubject] = useState('ALL');
  const [stuFilterModel, setStuFilterModel] = useState('ALL');
  const [stuFilterStatus, setStuFilterStatus] = useState('ALL');

  // 3. Bộ lọc riêng cho Báo cáo Gia sư mới
  const [tutPeriod, setTutPeriod] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'Q3'>('ALL');
  const [tutSelectedWeek, setTutSelectedWeek] = useState('ALL');
  const [tutFilterCode, setTutFilterCode] = useState('');
  const [tutFilterName, setTutFilterName] = useState('');
  const [tutFilterSubject, setTutFilterSubject] = useState('ALL');
  const [tutFilterGrade, setTutFilterGrade] = useState('ALL');
  const [tutFilterStatus, setTutFilterStatus] = useState('ALL');

  // 4. Bộ lọc riêng cho Báo cáo Sự cố
  const [incPeriod, setIncPeriod] = useState<'ALL' | 'W1' | 'W2' | 'W3' | 'W4' | 'W5' | 'THIS_WEEK' | 'NEXT_WEEK'>('ALL');
  const [incFilterPeriod, setIncFilterPeriod] = useState('');
  const [incFilterUrgent, setIncFilterUrgent] = useState('ALL');
  const [incFilterMain, setIncFilterMain] = useState('');

  // 5. Bộ lọc riêng cho Ma trận Ca dạy
  const [matFilterSubject, setMatFilterSubject] = useState('ALL');

  // 6. Bộ lọc riêng cho Đánh giá Dự giờ & Xếp hạng GV
  const [inspFilterCode, setInspFilterCode] = useState('');
  const [inspFilterName, setInspFilterName] = useState('');
  const [inspFilterSubject, setInspFilterSubject] = useState('ALL');
  const [inspFilterRank, setInspFilterRank] = useState('ALL');
  const [inspFilterScore, setInspFilterScore] = useState('ALL');



  // =========================================================================
  // DỮ LIỆU CỐ ĐỊNH CHUẨN ĐỒNG BỘ
  // =========================================================================
  const rawClasses = useMemo(() => [
    { code: 'TOAN_K03_NT2_13_01', name: 'Toán Nền Tảng K3 - Lớp A', date: '2026-09-02', grade: 'Khối 3', gradeNum: 3, subject: 'Toán', subjectCode: 'TOAN', model: 'Nhóm 1-3', modelCode: '1-3', students: '3 / 3 HS', capacityPct: 100, status: 'Đã đủ trần' },
    { code: 'ENG_K04_TC_11_01', name: 'Tiếng Anh Tiêu Chuẩn K4', date: '2026-09-05', grade: 'Khối 4', gradeNum: 4, subject: 'Tiếng Anh', subjectCode: 'ENG', model: '1 Kèm 1', modelCode: '1-1', students: '1 / 1 HS', capacityPct: 100, status: 'Đã đủ trần' },
    { code: 'TOAN_K01_TC_11_01', name: 'Toán Tiêu Chuẩn K1', date: '2026-09-09', grade: 'Khối 1', gradeNum: 1, subject: 'Toán', subjectCode: 'TOAN', model: '1 Kèm 1', modelCode: '1-1', students: '1 / 1 HS', capacityPct: 100, status: 'Đã đủ trần' },
    { code: 'ENG_IELTS_FND_13_01', name: 'IELTS Foundation Junior', date: '2026-09-12', grade: 'IELTS / Nâng cao', gradeNum: 10, subject: 'Tiếng Anh', subjectCode: 'ENG', model: 'Nhóm 1-3', modelCode: '1-3', students: '3 / 3 HS', capacityPct: 100, status: 'Đã đủ trần' },
    { code: 'TOAN_K05_NT2_15_01', name: 'Toán Nâng Cao K5', date: '2026-09-16', grade: 'Khối 5', gradeNum: 5, subject: 'Toán', subjectCode: 'TOAN', model: 'Nhóm 1-5', modelCode: '1-5', students: '4 / 5 HS', capacityPct: 80, status: 'Còn trống 1 chỗ' },
    { code: 'ENG_IELTS_JNR_15_01', name: 'IELTS Junior Speaking', date: '2026-09-19', grade: 'IELTS / Nâng cao', gradeNum: 11, subject: 'Tiếng Anh', subjectCode: 'ENG', model: 'Nhóm 1-5', modelCode: '1-5', students: '5 / 5 HS', capacityPct: 100, status: 'Đã đủ trần' },
    { code: 'TOAN_K02_TC_11_02', name: 'Toán Tiêu Chuẩn K2 - Nhóm 2', date: '2026-09-23', grade: 'Khối 2', gradeNum: 2, subject: 'Toán', subjectCode: 'TOAN', model: '1 Kèm 1', modelCode: '1-1', students: '1 / 1 HS', capacityPct: 100, status: 'Đã đủ trần' },
    { code: 'TOAN_K07_NC_13_01', name: 'Toán Hình Học THCS K7', date: '2026-10-02', grade: 'Khối 7', gradeNum: 7, subject: 'Toán', subjectCode: 'TOAN', model: 'Nhóm 1-3', modelCode: '1-3', students: '2 / 3 HS', capacityPct: 67, status: 'Còn trống 1 chỗ' },
    { code: 'ENG_K08_FND_11_01', name: 'Tiếng Anh Nền Tảng K8', date: '2026-10-04', grade: 'Khối 8', gradeNum: 8, subject: 'Tiếng Anh', subjectCode: 'ENG', model: '1 Kèm 1', modelCode: '1-1', students: '1 / 1 HS', capacityPct: 100, status: 'Đã đủ trần' },
    { code: 'TOAN_K09_VIP_11_01', name: 'Toán Ôn Thi Vào 10 - VIP', date: '2026-10-06', grade: 'Khối 9', gradeNum: 9, subject: 'Toán', subjectCode: 'TOAN', model: '1 Kèm 1', modelCode: '1-1', students: '1 / 1 HS', capacityPct: 100, status: 'Đã đủ trần' }
  ], []);

  const rawStudents = useMemo(() => [
    { id: 'HS-2026-001', name: 'Nguyễn Minh Quân', date: '2026-09-01', grade: 'Khối 3', gradeNum: 3, subject: 'Toán', subjectCode: 'TOAN', model: 'Nhóm 1-3', modelCode: '1-3', status: 'Đã vào lớp' },
    { id: 'HS-2026-004', name: 'Trần Gia Bảo', date: '2026-09-03', grade: 'Khối 1', gradeNum: 1, subject: 'Toán', subjectCode: 'TOAN', model: '1 Kèm 1', modelCode: '1-1', status: 'Đã vào lớp' },
    { id: 'HS-2026-009', name: 'Lê Bảo Anh', date: '2026-09-08', grade: 'Khối 4', gradeNum: 4, subject: 'Tiếng Anh', subjectCode: 'ENG', model: '1 Kèm 1', modelCode: '1-1', status: 'Đã vào lớp' },
    { id: 'HS-2026-015', name: 'Phạm Quỳnh Chi', date: '2026-09-11', grade: 'IELTS / Nâng cao', gradeNum: 10, subject: 'Tiếng Anh', subjectCode: 'ENG', model: 'Nhóm 1-3', modelCode: '1-3', status: 'Đã vào lớp' },
    { id: 'HS-2026-022', name: 'Vũ Tuấn Kiệt', date: '2026-09-15', grade: 'Khối 5', gradeNum: 5, subject: 'Toán', subjectCode: 'TOAN', model: 'Nhóm 1-5', modelCode: '1-5', status: 'Đã vào lớp' },
    { id: 'HS-2026-031', name: 'Đỗ Thảo Vy', date: '2026-09-18', grade: 'IELTS / Nâng cao', gradeNum: 11, subject: 'Tiếng Anh', subjectCode: 'ENG', model: 'Nhóm 1-5', modelCode: '1-5', status: 'Đã vào lớp' },
    { id: 'HS-2026-038', name: 'Hoàng Minh Khang', date: '2026-09-22', grade: 'Khối 2', gradeNum: 2, subject: 'Toán', subjectCode: 'TOAN', model: '1 Kèm 1', modelCode: '1-1', status: 'Chờ ghép lớp' },
    { id: 'HS-2026-045', name: 'Đặng Tuệ Lâm', date: '2026-10-02', grade: 'Khối 6', gradeNum: 6, subject: 'Toán', subjectCode: 'TOAN', model: 'Nhóm 1-3', modelCode: '1-3', status: 'Đã vào lớp' },
    { id: 'HS-2026-052', name: 'Phạm Mai Khanh', date: '2026-10-05', grade: 'Khối 8', gradeNum: 8, subject: 'Tiếng Anh', subjectCode: 'ENG', model: '1 Kèm 1', modelCode: '1-1', status: 'Đã vào lớp' }
  ], []);

  const rawTutors = useMemo(() => [
    { id: 'GV-2026-031', name: 'Nguyễn Thị Bích Ngọc', date: '2026-09-01', subject: 'Toán', subjectCode: 'TOAN', grades: 'Khối 1 - 5', gradeGroup: 'PRIMARY', status: 'Sẵn sàng nhận lớp', assigned: 16 },
    { id: 'GV-2026-032', name: 'Đỗ Quang Huy', date: '2026-09-05', subject: 'Tiếng Anh', subjectCode: 'ENG', grades: 'IELTS & THCS', gradeGroup: 'IELTS', status: 'Sẵn sàng nhận lớp', assigned: 18 },
    { id: 'GV-2026-033', name: 'Phan Mai Lan', date: '2026-09-10', subject: 'Toán', subjectCode: 'TOAN', grades: 'Khối 3 - 5', gradeGroup: 'PRIMARY', status: 'Đang đứng lớp', assigned: 24 },
    { id: 'GV-2026-034', name: 'Vũ Thanh Tùng', date: '2026-09-14', subject: 'Tiếng Anh', subjectCode: 'ENG', grades: 'Khối 1 - 5', gradeGroup: 'PRIMARY', status: 'Đang đứng lớp', assigned: 20 },
    { id: 'GV-2026-035', name: 'Hoàng Anh Tuấn', date: '2026-09-20', subject: 'Toán', subjectCode: 'TOAN', grades: 'Khối 6 - 9', gradeGroup: 'THCS', status: 'Sẵn sàng nhận lớp', assigned: 14 },
    { id: 'GV-2026-036', name: 'Lê Thùy Dương', date: '2026-10-01', subject: 'Tiếng Anh', subjectCode: 'ENG', grades: 'Khối 10 - 12', gradeGroup: 'THPT', status: 'Đang đứng lớp', assigned: 12 },
    { id: 'GV-2026-037', name: 'Trần Đăng Khoa', date: '2026-10-04', subject: 'Toán', subjectCode: 'TOAN', grades: 'Khối 6 - 9', gradeGroup: 'THCS', status: 'Sẵn sàng nhận lớp', assigned: 8 }
  ], []);

  const rawIncidents = useMemo(() => [
    { period: 'Tuần 1 (01-07/09)', periodCode: 'W1', dateFrom: '2026-09-01', dateTo: '2026-09-07', total: 680, incidents: 14, urgent: 8, notice: 6, rate: 2.06, rateStr: '2.06%', main: 'Kỹ thuật / Mạng gián đoạn' },
    { period: 'Tuần 2 (08-14/09)', periodCode: 'W2', dateFrom: '2026-09-08', dateTo: '2026-09-14', total: 720, incidents: 22, urgent: 15, notice: 7, rate: 3.05, rateStr: '3.05%', main: 'Giáo viên vào muộn' },
    { period: 'Tuần 3 (15-21/09)', periodCode: 'W3', dateFrom: '2026-09-15', dateTo: '2026-09-21', total: 710, incidents: 20, urgent: 13, notice: 7, rate: 2.81, rateStr: '2.81%', main: 'Học sinh xin nghỉ gấp' },
    { period: 'Tuần 4 (22-28/09)', periodCode: 'W4', dateFrom: '2026-09-22', dateTo: '2026-09-28', total: 730, incidents: 18, urgent: 12, notice: 6, rate: 2.46, rateStr: '2.46%', main: 'Giáo viên nghỉ đột xuất' },
    { period: 'Tuần 1 T10 (29/09-05/10)', periodCode: 'W5', dateFrom: '2026-09-29', dateTo: '2026-10-05', total: 750, incidents: 16, urgent: 10, notice: 6, rate: 2.13, rateStr: '2.13%', main: 'Thiết bị mic / webcam' }
  ], []);

  const rawMatrix = useMemo(() => [
    { subject: 'Toán', code: 'TOAN', primary12: 525, primary35: 600, thcs: 280, thpt: 150, ielts: 65, total: 1620, pct: 57, color: '#FF5C00' },
    { subject: 'Tiếng Anh (IELTS)', code: 'ENG', primary12: 390, primary35: 490, thcs: 180, thpt: 90, ielts: 70, total: 1220, pct: 43, color: '#4F46E5' }
  ], []);

  const rawTeachersInspection = useMemo(() => [
    { id: 'GV-001', name: 'ThS. Nguyễn Văn Anh', subject: 'Toán', subjectCode: 'TOAN', avg: 9.25, rank: 'Hạng A (Xuất sắc)', rankCode: 'A', total: 64, punctualityPct: 100, punctuality: '100%', plan: 'Khen thưởng • GV Nòng cốt' },
    { id: 'GV-002', name: 'ThS. Hoàng Thị Lan', subject: 'Toán', subjectCode: 'TOAN', avg: 9.25, rank: 'Hạng A (Xuất sắc)', rankCode: 'A', total: 58, punctualityPct: 98.3, punctuality: '98.3%', plan: 'Phụ trách chuyên môn K1-2' },
    { id: 'GV-003', name: 'Trần Minh Thư, B.A', subject: 'Tiếng Anh', subjectCode: 'ENG', avg: 8.63, rank: 'Hạng B (Tốt)', rankCode: 'B', total: 52, punctualityPct: 96.2, punctuality: '96.2%', plan: 'Đạt chuẩn sư phạm' },
    { id: 'GV-004', name: 'Vũ Thanh Hằng, M.Ed', subject: 'Tiếng Anh', subjectCode: 'ENG', avg: 8.80, rank: 'Hạng B (Tốt)', rankCode: 'B', total: 48, punctualityPct: 100, punctuality: '100%', plan: 'Chuyên trách IELTS' },
    { id: 'GV-005', name: 'Đặng Tuấn Kiệt', subject: 'Toán', subjectCode: 'TOAN', avg: 7.38, rank: 'Hạng C (Khá)', rankCode: 'C', total: 42, punctualityPct: 92.8, punctuality: '92.8%', plan: 'Bồi dưỡng phương pháp' },
    { id: 'GV-006', name: 'Lê Thu Hà', subject: 'Tiếng Anh', subjectCode: 'ENG', avg: 7.13, rank: 'Hạng C (Khá)', rankCode: 'C', total: 40, punctualityPct: 95.0, punctuality: '95.0%', plan: 'Tập huấn nâng cao chuẩn đề' },
    { id: 'GV-007', name: 'Phạm Hải Nam', subject: 'Toán', subjectCode: 'TOAN', avg: 6.38, rank: 'Hạng D (Chưa đạt)', rankCode: 'D', total: 24, punctualityPct: 83.3, punctuality: '83.3%', plan: 'Tạm dừng nhận lớp • Đào tạo lại' }
  ], []);

  const clsDateRange = getDateFilterRange(clsMonth, clsDateFrom, clsDateTo, clsPeriod);
  const stuDateRange = getDateFilterRange(stuMonth, stuDateFrom, stuDateTo, stuPeriod);
  const tutDateRange = getDateFilterRange(tutMonth, tutDateFrom, tutDateTo, tutPeriod);
  const incDateRange = getDateFilterRange(
    incMonth,
    incDateFrom,
    incDateTo,
    incPeriod === 'THIS_WEEK' || incPeriod === 'NEXT_WEEK' ? 'WEEK' : 'ALL'
  );
  const dashDateRange = getDateFilterRange(
    dashMonth,
    dashDateFrom,
    dashDateTo,
    dashTimeframe === 'Q3' ? 'Q3' : dashTimeframe
  );

  // =========================================================================
  // DỮ LIỆU ĐÃ QUA BỘ LỌC TỪNG PHẦN (INDEPENDENT DATA FILTERING)
  // =========================================================================

  // 1. Dữ liệu lọc riêng cho Lớp học mới
  const filteredClasses = useMemo(() => {
    return rawClasses.filter(c => {
      if (!isDateInRange(c.date, clsDateRange)) return false;

      if (clsFilterCode && !c.code.toLowerCase().includes(clsFilterCode.toLowerCase())) return false;
      if (clsFilterName && !c.name.toLowerCase().includes(clsFilterName.toLowerCase())) return false;
      if (clsFilterGrade !== 'ALL' && c.grade !== clsFilterGrade) return false;
      if (clsFilterSubject !== 'ALL' && c.subjectCode !== clsFilterSubject) return false;
      if (clsFilterModel !== 'ALL' && c.modelCode !== clsFilterModel) return false;
      if (clsFilterStatus !== 'ALL') {
        if (clsFilterStatus === 'FULL' && !c.status.includes('đủ trần')) return false;
        if (clsFilterStatus === 'AVAILABLE' && !c.status.includes('trống')) return false;
      }
      return true;
    });
  }, [rawClasses, clsDateRange, clsFilterCode, clsFilterName, clsFilterGrade, clsFilterSubject, clsFilterModel, clsFilterStatus]);

  // 2. Dữ liệu lọc riêng cho Học sinh mới
  const filteredStudents = useMemo(() => {
    return rawStudents.filter(s => {
      if (!isDateInRange(s.date, stuDateRange)) return false;

      if (stuFilterCode && !s.id.toLowerCase().includes(stuFilterCode.toLowerCase())) return false;
      if (stuFilterName && !s.name.toLowerCase().includes(stuFilterName.toLowerCase())) return false;
      if (stuFilterGrade !== 'ALL' && s.grade !== stuFilterGrade) return false;
      if (stuFilterSubject !== 'ALL' && s.subjectCode !== stuFilterSubject) return false;
      if (stuFilterModel !== 'ALL' && s.modelCode !== stuFilterModel) return false;
      if (stuFilterStatus !== 'ALL') {
        if (stuFilterStatus === 'FULL' && !s.status.includes('vào lớp')) return false;
        if (stuFilterStatus === 'AVAILABLE' && !s.status.includes('ghép')) return false;
      }
      return true;
    });
  }, [rawStudents, stuDateRange, stuFilterCode, stuFilterName, stuFilterGrade, stuFilterSubject, stuFilterModel, stuFilterStatus]);

  // 3. Dữ liệu lọc riêng cho Gia sư mới
  const filteredTutors = useMemo(() => {
    return rawTutors.filter(t => {
      if (!isDateInRange(t.date, tutDateRange)) return false;

      if (tutFilterCode && !t.id.toLowerCase().includes(tutFilterCode.toLowerCase())) return false;
      if (tutFilterName && !t.name.toLowerCase().includes(tutFilterName.toLowerCase())) return false;
      if (tutFilterSubject !== 'ALL' && t.subjectCode !== tutFilterSubject) return false;
      if (tutFilterGrade !== 'ALL' && !t.grades.includes(tutFilterGrade)) return false;
      if (tutFilterStatus !== 'ALL') {
        if (tutFilterStatus === 'READY' && !t.status.includes('Sẵn sàng')) return false;
        if (tutFilterStatus === 'ACTIVE' && !t.status.includes('đứng lớp')) return false;
      }
      return true;
    });
  }, [rawTutors, tutDateRange, tutFilterCode, tutFilterName, tutFilterSubject, tutFilterGrade, tutFilterStatus]);

  // 4. Dữ liệu lọc riêng cho Sự cố
  const filteredIncidents = useMemo(() => {
    return rawIncidents.filter(i => {
      if (!dateRangesOverlap(i.dateFrom, i.dateTo, incDateRange)) return false;
      if (incFilterPeriod && !i.period.toLowerCase().includes(incFilterPeriod.toLowerCase())) return false;
      if (incFilterUrgent === 'URGENT' && i.urgent <= i.notice) return false;
      if (incFilterUrgent === 'NOTICE' && i.notice < i.urgent) return false;
      if (incFilterMain && !i.main.toLowerCase().includes(incFilterMain.toLowerCase())) return false;
      return true;
    });
  }, [rawIncidents, incPeriod, incDateRange, incFilterPeriod, incFilterUrgent, incFilterMain]);

  // 5. Dữ liệu lọc riêng cho Ma trận
  const filteredMatrix = useMemo(() => {
    return rawMatrix.filter(m => matFilterSubject === 'ALL' || m.code === matFilterSubject);
  }, [rawMatrix, matFilterSubject]);

  // 6. Dữ liệu lọc riêng cho Dự giờ GV
  const filteredInspection = useMemo(() => {
    return rawTeachersInspection.filter(t => {
      if (inspFilterCode && !t.id.toLowerCase().includes(inspFilterCode.toLowerCase())) return false;
      if (inspFilterName && !t.name.toLowerCase().includes(inspFilterName.toLowerCase())) return false;
      if (inspFilterSubject !== 'ALL' && t.subjectCode !== inspFilterSubject) return false;
      if (inspFilterRank !== 'ALL' && t.rankCode !== inspFilterRank) return false;
      if (inspFilterScore !== 'ALL') {
        if (inspFilterScore === '9' && t.avg < 9) return false;
        if (inspFilterScore === '8' && (t.avg < 8 || t.avg >= 9)) return false;
        if (inspFilterScore === '7' && t.avg >= 8) return false;
      }
      return true;
    });
  }, [rawTeachersInspection, inspFilterCode, inspFilterName, inspFilterSubject, inspFilterRank, inspFilterScore]);

  const dashboardIncidents = useMemo(() => rawIncidents.filter(incident =>
    dateRangesOverlap(incident.dateFrom, incident.dateTo, dashDateRange) &&
    (!dashSearchMetric || incident.period.toLocaleLowerCase('vi').includes(dashSearchMetric.trim().toLocaleLowerCase('vi')))
  ), [rawIncidents, dashDateRange, dashSearchMetric]);

  const dashboardRows = useMemo(() => dashboardIncidents.map(incident => {
    const periodClasses = rawClasses.filter(item => item.date >= incident.dateFrom && item.date <= incident.dateTo);
    const periodStudents = rawStudents.filter(item => item.date >= incident.dateFrom && item.date <= incident.dateTo);
    const fullClasses = periodClasses.filter(item => item.status.toLowerCase().includes('đủ trần')).length;
    const avgInspectionScore = rawTeachersInspection.length
      ? rawTeachersInspection.reduce((total, teacher) => total + teacher.avg, 0) / rawTeachersInspection.length
      : 0;

    return {
      incident,
      classCount: periodClasses.length,
      studentCount: periodStudents.length,
      occupancyRate: periodClasses.length ? Math.round((fullClasses / periodClasses.length) * 100) : 0,
      avgInspectionScore
    };
  }), [dashboardIncidents, rawClasses, rawStudents, rawTeachersInspection]);

  const dashboardIncidentStats = useMemo(() => {
    const totalSessions = dashboardIncidents.reduce((total, incident) => total + incident.total, 0);
    const incidentCount = dashboardIncidents.reduce((total, incident) => total + incident.incidents, 0);
    const urgent = dashboardIncidents.reduce((total, incident) => total + incident.urgent, 0);
    const notice = dashboardIncidents.reduce((total, incident) => total + incident.notice, 0);
    const urgentTotal = urgent + notice;

    return {
      incidentCount,
      urgent,
      notice,
      incidentRate: totalSessions ? Number(((incidentCount / totalSessions) * 100).toFixed(2)) : 0,
      safeRate: totalSessions ? Number((100 - (incidentCount / totalSessions) * 100).toFixed(2)) : 100,
      urgentRate: urgentTotal ? Math.round((urgent / urgentTotal) * 100) : 0
    };
  }, [dashboardIncidents]);

  const dashboardTrendPoints = useMemo(() => {
    const eventDates = [...rawClasses.map(item => item.date), ...rawStudents.map(item => item.date)].sort();
    if (eventDates.length === 0) return [];
    const startDate = dashDateRange.start || eventDates[0];
    const endDate = dashDateRange.end || eventDates[eventDates.length - 1];
    if (startDate > endDate) return [];

    const points: Array<{ label: string; start: string; end: string; students: number; classes: number; x: number; studentY: number; classY: number }> = [];
    const cursor = new Date(`${startDate}T00:00:00`);
    const rangeEnd = new Date(`${endDate}T00:00:00`);
    while (cursor <= rangeEnd && points.length < 54) {
      const bucketStart = toLocalIsoDate(cursor);
      const bucketEndDate = new Date(cursor);
      bucketEndDate.setDate(bucketEndDate.getDate() + 6);
      if (bucketEndDate > rangeEnd) bucketEndDate.setTime(rangeEnd.getTime());
      const bucketEnd = toLocalIsoDate(bucketEndDate);
      points.push({
        label: `${bucketStart.slice(8, 10)}/${bucketStart.slice(5, 7)} - ${bucketEnd.slice(8, 10)}/${bucketEnd.slice(5, 7)}`,
        start: bucketStart,
        end: bucketEnd,
        students: rawStudents.filter(item => item.date >= bucketStart && item.date <= bucketEnd).length,
        classes: rawClasses.filter(item => item.date >= bucketStart && item.date <= bucketEnd).length,
        x: 30,
        studentY: 160,
        classY: 160
      });
      cursor.setDate(cursor.getDate() + 7);
    }

    const maximum = Math.max(1, ...points.flatMap(point => [point.students, point.classes]));
    return points.map((point, index) => ({
      ...point,
      x: points.length === 1 ? 250 : 30 + index * (440 / (points.length - 1)),
      studentY: 160 - (point.students / maximum) * 125,
      classY: 160 - (point.classes / maximum) * 125
    }));
  }, [rawClasses, rawStudents, dashDateRange]);

  const dashboardStudentTotal = dashboardTrendPoints.reduce((total, point) => total + point.students, 0);
  const dashboardClassTotal = dashboardTrendPoints.reduce((total, point) => total + point.classes, 0);

  const setDashboardRange = (preset: DashboardRangePreset) => {
    const today = new Date();
    const currentMonth = toLocalIsoDate(today).slice(0, 7);
    setDashRangePreset(preset);
    setDashSearchMetric('');

    if (preset === 'CURRENT_MONTH') {
      setDashMonth(currentMonth);
      setDashDateFrom('');
      setDashDateTo('');
      setDashTimeframe('MONTH');
      return;
    }

    if (preset === 'PREVIOUS_MONTH') {
      const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const monthValue = toLocalIsoDate(previousMonth).slice(0, 7);
      setDashMonth(monthValue);
      setDashDateFrom('');
      setDashDateTo('');
      setDashTimeframe('MONTH');
      return;
    }

    if (preset === 'LAST_3_MONTHS') {
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      setDashMonth('ALL');
      setDashDateFrom(toLocalIsoDate(firstDay));
      setDashDateTo(toLocalIsoDate(today));
      setDashTimeframe('ALL');
      return;
    }

    if (preset === 'ALL') {
      setDashMonth('ALL');
      setDashDateFrom('');
      setDashDateTo('');
      setDashTimeframe('ALL');
      return;
    }

    setDashMonth('ALL');
    setDashDateFrom('');
    setDashDateTo('');
    setDashTimeframe('ALL');
  };

  const dashboardRangeLabel = dashRangePreset === 'CURRENT_MONTH'
    ? formatMonthLabel(dashMonth)
    : dashRangePreset === 'PREVIOUS_MONTH'
      ? formatMonthLabel(dashMonth)
      : dashRangePreset === 'LAST_3_MONTHS'
        ? '3 tháng gần nhất'
        : dashRangePreset === 'ALL'
          ? 'Toàn thời gian'
          : dashDateFrom || dashDateTo
            ? formatDateRangeLabel(dashDateFrom, dashDateTo)
            : 'Chọn khoảng ngày';

  // Reset functions riêng cho từng phần
  const resetClsFilters = () => {
    setClsDateFrom('');
    setClsDateTo('');
    setClsPeriod('ALL');
    setClsSelectedWeek('ALL');
    setClsFilterCode('');
    setClsFilterName('');
    setClsFilterGrade('ALL');
    setClsFilterSubject('ALL');
    setClsFilterModel('ALL');
    setClsFilterStatus('ALL');
    showToast('Đã đặt lại bộ lọc Lớp học!', 'info');
  };

  const resetStuFilters = () => {
    setStuDateFrom('');
    setStuDateTo('');
    setStuPeriod('ALL');
    setStuSelectedWeek('ALL');
    setStuFilterCode('');
    setStuFilterName('');
    setStuFilterGrade('ALL');
    setStuFilterSubject('ALL');
    setStuFilterModel('ALL');
    setStuFilterStatus('ALL');
    showToast('Đã đặt lại bộ lọc Học sinh!', 'info');
  };

  const resetTutFilters = () => {
    setTutDateFrom('');
    setTutDateTo('');
    setTutPeriod('ALL');
    setTutSelectedWeek('ALL');
    setTutFilterCode('');
    setTutFilterName('');
    setTutFilterSubject('ALL');
    setTutFilterGrade('ALL');
    setTutFilterStatus('ALL');
    showToast('Đã đặt lại bộ lọc Gia sư!', 'info');
  };

  const resetIncFilters = () => {
    setIncPeriod('ALL');
    setIncFilterPeriod('');
    setIncFilterUrgent('ALL');
    setIncFilterMain('');
    showToast('Đã đặt lại bộ lọc Sự cố!', 'info');
  };

  const resetMatFilters = () => {
    setMatFilterSubject('ALL');
    showToast('Đã đặt lại bộ lọc Ma trận!', 'info');
  };

  const resetInspFilters = () => {
    setInspFilterCode('');
    setInspFilterName('');
    setInspFilterSubject('ALL');
    setInspFilterRank('ALL');
    setInspFilterScore('ALL');
    showToast('Đã đặt lại bộ lọc Dự giờ!', 'info');
  };

  // Tỉ lệ tính toán động theo dữ liệu đã lọc của từng phần
  const clsStats = useMemo(() => {
    const total = filteredClasses.length;
    const fullCount = filteredClasses.filter(c => c.status.includes('đủ trần')).length;
    const availCount = total - fullCount;
    const fullRate = total > 0 ? Math.round((fullCount / total) * 100) : 0;
    const toanCount = filteredClasses.filter(c => c.subjectCode === 'TOAN').length;
    const engCount = total - toanCount;
    const toanRate = total > 0 ? Math.round((toanCount / total) * 100) : 0;
    const engRate = total > 0 ? 100 - toanRate : 0;
    return { total, fullCount, availCount, fullRate, toanCount, engCount, toanRate, engRate };
  }, [filteredClasses]);

  const stuStats = useMemo(() => {
    const total = filteredStudents.length;
    const assignedCount = filteredStudents.filter(s => s.status.includes('vào lớp')).length;
    const waitingCount = total - assignedCount;
    const assignedRate = total > 0 ? Math.round((assignedCount / total) * 100) : 0;
    const toanCount = filteredStudents.filter(s => s.subjectCode === 'TOAN').length;
    const engCount = total - toanCount;
    return { total, assignedCount, waitingCount, assignedRate, toanCount, engCount };
  }, [filteredStudents]);

  const tutStats = useMemo(() => {
    const total = filteredTutors.length;
    const readyCount = filteredTutors.filter(t => t.status.includes('Sẵn sàng')).length;
    const activeCount = total - readyCount;
    const readyRate = total > 0 ? Math.round((readyCount / total) * 100) : 0;
    const toanCount = filteredTutors.filter(t => t.subjectCode === 'TOAN').length;
    const engCount = total - toanCount;
    const totalSessions = filteredTutors.reduce((acc, t) => acc + t.assigned, 0);
    const avgSessions = total > 0 ? (totalSessions / total).toFixed(1) : '0';
    return { total, readyCount, activeCount, readyRate, toanCount, engCount, totalSessions, avgSessions };
  }, [filteredTutors]);

  const incStats = useMemo(() => {
    const total = filteredIncidents.reduce((acc, item) => acc + item.total, 0);
    const incidents = filteredIncidents.reduce((acc, item) => acc + item.incidents, 0);
    const urgent = filteredIncidents.reduce((acc, item) => acc + item.urgent, 0);
    const notice = filteredIncidents.reduce((acc, item) => acc + item.notice, 0);
    const rate = total > 0 ? ((incidents / total) * 100).toFixed(2) : '0';
    const urgentRate = incidents > 0 ? Math.round((urgent / incidents) * 100) : 0;
    return { total, incidents, urgent, notice, rate, urgentRate };
  }, [filteredIncidents]);

  const matStats = useMemo(() => {
    const totalSessions = filteredMatrix.reduce((acc, m) => acc + m.total, 0);
    const toanSessions = filteredMatrix.find(m => m.code === 'TOAN')?.total || 0;
    const engSessions = filteredMatrix.find(m => m.code === 'ENG')?.total || 0;
    const toanRate = totalSessions > 0 ? Math.round((toanSessions / totalSessions) * 100) : 0;
    const engRate = totalSessions > 0 ? 100 - toanRate : 0;
    const primaryTotal = filteredMatrix.reduce((acc, m) => acc + m.primary12 + m.primary35, 0);
    const primaryRate = totalSessions > 0 ? Math.round((primaryTotal / totalSessions) * 100) : 0;
    return { totalSessions, toanSessions, engSessions, toanRate, engRate, primaryTotal, primaryRate };
  }, [filteredMatrix]);

  const inspStats = useMemo(() => {
    const total = filteredInspection.length;
    const rankA = filteredInspection.filter(t => t.rankCode === 'A').length;
    const rankB = filteredInspection.filter(t => t.rankCode === 'B').length;
    const rankC = filteredInspection.filter(t => t.rankCode === 'C').length;
    const rankD = filteredInspection.filter(t => t.rankCode === 'D').length;
    const avgScore = total > 0 ? (filteredInspection.reduce((acc, t) => acc + t.avg, 0) / total).toFixed(2) : '0';
    const qualifiedRate = total > 0 ? Math.round(((rankA + rankB) / total) * 100) : 0;
    return { total, rankA, rankB, rankC, rankD, avgScore, qualifiedRate };
  }, [filteredInspection]);

  // Export CSV
  const downloadCsv = (csvContent: string, filename: string) => {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Đã xuất file ${filename} thành công!`, 'success');
  };

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 4 THẺ METRICS TỔNG QUAN HỆ THỐNG */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">LỚP MỞ TRONG THÁNG</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-slate-900 tracking-tight">{clsStats.total} Lớp</div>
            <div className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{clsStats.fullRate}% đạt trần sĩ số</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">HỌC SINH TIẾP NHẬN</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-slate-900 tracking-tight">{stuStats.total} Học sinh</div>
            <div className="text-[10px] text-indigo-600 font-medium mt-0.5">
              Ghép lớp thành công: {stuStats.assignedRate}%
            </div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">TỶ LỆ LỖI VẬN HÀNH</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-rose-600 tracking-tight">{incStats.rate}%</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Mục tiêu kiểm soát &lt; 2.5%</div>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">ĐẠT CHUẨN SƯ PHẠM</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold text-slate-900 tracking-tight">{inspStats.qualifiedRate}%</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Điểm TB dự giờ: {inspStats.avgScore} / 10</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HEADER BANNER & THANH 3 TABS CHÍNH */}
      {/* ========================================================================= */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
              <PieChart className="w-4 h-4" />
              <span>Trung tâm Báo cáo &amp; Thống kê Vận hành</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">Báo cáo &amp; Thống kê Vận hành Lớp học</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>In PDF</span>
            </button>
          </div>
        </div>

        {/* Thanh 2 Tabs chính: Dashboard (đầu tiên theo yêu cầu) | Cố định */}
        <div className="flex border-b border-slate-200 text-xs font-medium">
          <button
            onClick={() => setCurrentMainTab('dashboard')}
            className={`px-4 py-2 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              currentMainTab === 'dashboard'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <div className="text-left">
              <div className="font-semibold text-xs">1. Dashboard Tỷ lệ &amp; Xu hướng</div>
            </div>
          </button>

          <button
            onClick={() => setCurrentMainTab('fixed')}
            className={`px-4 py-2 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              currentMainTab === 'fixed'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <div className="text-left">
              <div className="font-semibold text-xs">2. Báo cáo Nghiệp vụ Cố định</div>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DASHBOARD TỶ LỆ & XU HƯỚNG TỔNG QUAN (CÓ BỘ LỌC THỜI GIAN TRÊN NÓC SỔ NGANG) */}
      {/* ========================================================================= */}
      {currentMainTab === 'dashboard' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Thanh trên nóc của Dashboard: Nút mở Bộ lọc cột bên phải + Chuyển đổi Biểu đồ / Bảng */}
          <div className="bg-white p-3 px-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsDashFilterOpen(true)}
                className="px-3.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Mở bộ lọc nhiều tiêu chí từ cột bên phải"
              >
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>Bộ lọc: <strong>{dashboardRangeLabel}</strong></span>
                <span className="px-1.5 py-0.2 rounded-md bg-white text-indigo-700 text-[10px] font-bold border border-indigo-200">
                  {dashboardIncidents.length} kỳ
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Nút chuyển đổi chế độ xem Dashboard: Biểu đồ trực quan | Bảng | Cả hai */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setDashViewMode('visual')}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    dashViewMode === 'visual' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>Biểu đồ & Tỉ lệ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDashViewMode('table')}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    dashViewMode === 'table' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Table className="w-3 h-3" />
                  <span>Bảng số liệu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDashViewMode('both')}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    dashViewMode === 'both' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>Cả hai</span>
                </button>
              </div>

              <button
                onClick={() => {
                  let csv = 'Tuan_Ky,Lop_Moi_Mo,Hoc_Sinh_Moi,Ty_Le_Lap_Day_Tran,Ty_Le_Loi_Su_Co,Diem_TB_Du_Gio\n';
                  dashboardRows.forEach(({ incident, classCount, studentCount, occupancyRate, avgInspectionScore }) => {
                    csv += `"${incident.period}",${classCount},${studentCount},"${occupancyRate}%","${incident.rateStr}",${avgInspectionScore.toFixed(2)}\n`;
                  });
                  downloadCsv(csv, 'Dashboard_Tong_Quan_Van_Hanh.csv');
                }}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>

          {/* Biểu đồ đường cong tăng trưởng (khi ở chế độ visual hoặc both) */}
          {(dashViewMode === 'visual' || dashViewMode === 'both') && (
            <>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">
                    Đường cong Tăng trưởng Lớp mới &amp; Học sinh mới (Theo Chuỗi thời gian)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Phân tích đối soát chuỗi thời gian tiếp nhận và mở lớp
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-1.5 bg-emerald-500 rounded" />
                    <span className="font-semibold text-slate-700">Học sinh mới ({dashboardStudentTotal})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-1.5 bg-indigo-600 rounded" />
                    <span className="font-semibold text-slate-700">Lớp học mới ({dashboardClassTotal})</span>
                  </div>
                </div>
              </div>

              <div className="relative pt-3">
              {hoveredTrendPoint !== null && dashboardTrendPoints[hoveredTrendPoint] && (
                <div className="absolute right-2 top-1 z-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-lg">
                  <div className="font-bold text-slate-800">{dashboardTrendPoints[hoveredTrendPoint].label}</div>
                  <div className="mt-1 text-emerald-700">Học sinh mới: {dashboardTrendPoints[hoveredTrendPoint].students}</div>
                  <div className="text-indigo-700">Lớp học mới: {dashboardTrendPoints[hoveredTrendPoint].classes}</div>
                </div>
              )}
              <svg className="h-48 w-full overflow-visible" viewBox="0 0 500 180" role="img" aria-label="Xu hướng học sinh mới và lớp học mới theo tuần">
                {[30, 80, 130].map(y => <line key={y} x1="0" y1={y} x2="500" y2={y} stroke="#F1F5F9" strokeWidth="1" />)}
                {dashboardTrendPoints.length > 1 && (
                  <>
                    <polyline points={dashboardTrendPoints.map(point => `${point.x},${point.studentY}`).join(' ')} fill="none" stroke="#10B981" strokeWidth="3.5" />
                    <polyline points={dashboardTrendPoints.map(point => `${point.x},${point.classY}`).join(' ')} fill="none" stroke="#4F46E5" strokeWidth="3.5" />
                  </>
                )}
                {dashboardTrendPoints.map((point, index) => (
                  <g key={point.start} onMouseEnter={() => setHoveredTrendPoint(index)} onMouseLeave={() => setHoveredTrendPoint(null)}>
                    <circle cx={point.x} cy={point.studentY} r="8" fill="transparent" />
                    <circle cx={point.x} cy={point.studentY} r={hoveredTrendPoint === index ? 6 : 4.5} fill="#10B981" />
                    <circle cx={point.x} cy={point.classY} r="8" fill="transparent" />
                    <circle cx={point.x} cy={point.classY} r={hoveredTrendPoint === index ? 6 : 4.5} fill="#4F46E5" />
                    <title>{`${point.label} | Học sinh mới: ${point.students} | Lớp học mới: ${point.classes}`}</title>
                  </g>
                ))}
              </svg>
              <div className="flex justify-between gap-1 border-t border-slate-100 pt-2 text-[10px] font-medium text-slate-400">
                {dashboardTrendPoints.map((point, index) => (
                  <span key={point.start} className={index > 0 && index < dashboardTrendPoints.length - 1 ? 'hidden sm:inline' : 'truncate'}>
                    {point.label}
                  </span>
                ))}
              </div>
              </div>
            </div>

            {/* HỆ THỐNG BIỂU ĐỒ BỔ SUNG TRỰC QUAN DASHBOARD */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 1. Biểu đồ Cột Chồng: Tỷ trọng Ca dạy theo Bộ Môn qua các Chu Kỳ */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h5 className="font-bold text-slate-800 text-xs">Cơ cấu Ca Dạy Theo Bộ Môn</h5>
                    <p className="text-[10px] text-slate-400">Tỷ lệ Toán vs Tiếng Anh</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-orange-50 text-[#FF5C00] font-bold text-[10px]">
                    2,840 ca
                  </span>
                </div>

                <div className="space-y-2 pt-1 text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#FF5C00]" /> Môn Toán: 1,620 ca</span>
                      <span className="font-bold text-[#FF5C00]">57.0%</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-[#FF5C00] rounded-full transition-all" style={{ width: '57%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-600" /> Tiếng Anh & IELTS: 1,220 ca</span>
                      <span className="font-bold text-indigo-600">43.0%</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-indigo-600 rounded-full transition-all" style={{ width: '43%' }} />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-[10px]">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block font-medium">Toán K1 - 5</span>
                    <strong className="text-slate-800 text-xs font-bold">1,125 ca (69%)</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-slate-400 block font-medium">Anh K1 - 5</span>
                    <strong className="text-slate-800 text-xs font-bold">880 ca (72%)</strong>
                  </div>
                </div>
              </div>

              {/* 2. Biểu đồ Donut Tỷ lệ Lỗi theo Chu kỳ và Mục tiêu SLA */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h5 className="font-bold text-slate-800 text-xs">Kiểm Soát Tỷ Lệ Lỗi Vận Hành</h5>
                    <p className="text-[10px] text-slate-400">Mục tiêu kiểm soát &lt; 2.5%</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-bold text-[10px]">
                    Lỗi: {dashboardIncidentStats.incidentRate}%
                  </span>
                </div>

                <div className="flex items-center justify-around py-1">
                  {/* SVG Donut */}
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-emerald-500"
                        strokeDasharray={`${dashboardIncidentStats.safeRate}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-rose-500"
                        strokeDasharray={`${dashboardIncidentStats.incidentRate}, 100`}
                        strokeDashoffset={`-${dashboardIncidentStats.safeRate}`}
                        strokeWidth="3.8"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-xs font-black text-slate-800 block">{dashboardIncidentStats.safeRate}%</span>
                      <span className="text-[9px] text-emerald-600 font-bold uppercase">Chuẩn</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="font-medium text-slate-700">Ca an toàn: <strong>{dashboardIncidentStats.safeRate}%</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                      <span className="font-medium text-slate-700">Tỷ lệ sự cố: <strong>{dashboardIncidentStats.incidentRate}%</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="font-medium text-slate-700">Dạy thay cứu ca: <strong>1.2%</strong></span>
                    </div>
                  </div>
                </div>

                <div className="p-2 bg-rose-50/70 rounded-xl text-[10px] text-rose-800 flex items-center justify-between font-medium">
                  <span>Sự cố &lt; 2h: <strong>{dashboardIncidentStats.urgent} ca ({dashboardIncidentStats.urgentRate}%)</strong></span>
                  <span>Báo trước: <strong>{dashboardIncidentStats.notice} ca</strong></span>
                </div>
              </div>

              {/* 3. Biểu đồ Phân bổ Đánh giá Dự giờ & Chuẩn Sư phạm */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div>
                    <h5 className="font-bold text-slate-800 text-xs">Phân Bổ Xếp Hạng Dự Giờ</h5>
                    <p className="text-[10px] text-slate-400">Đạt chuẩn sư phạm A & B</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px]">
                    Đạt: {inspStats.qualifiedRate}%
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-bold text-emerald-700">Hạng A ({inspStats.rankA})</span>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(inspStats.rankA / (inspStats.total || 1)) * 100}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 w-8 text-right">
                      {Math.round((inspStats.rankA / (inspStats.total || 1)) * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-bold text-indigo-700">Hạng B ({inspStats.rankB})</span>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(inspStats.rankB / (inspStats.total || 1)) * 100}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 w-8 text-right">
                      {Math.round((inspStats.rankB / (inspStats.total || 1)) * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-bold text-amber-700">Hạng C ({inspStats.rankC})</span>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(inspStats.rankC / (inspStats.total || 1)) * 100}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 w-8 text-right">
                      {Math.round((inspStats.rankC / (inspStats.total || 1)) * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-bold text-rose-700">Hạng D ({inspStats.rankD})</span>
                    <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(inspStats.rankD / (inspStats.total || 1)) * 100}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 w-8 text-right">
                      {Math.round((inspStats.rankD / (inspStats.total || 1)) * 100)}%
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Điểm TB toàn viện:</span>
                  <span className="font-bold text-indigo-700 text-xs">{inspStats.avgScore} / 10.0</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Cơ cấu ca dạy và đánh giá dự giờ là snapshot tổng hợp chưa có ngày chi tiết; đường xu hướng và chỉ số sự cố thay đổi theo bộ lọc thời gian.
            </p>
            </>
          )}

          {/* Bảng số liệu chi tiết Dashboard (khi ở chế độ table hoặc both) */}
          {(dashViewMode === 'table' || dashViewMode === 'both') && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-3 px-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Bảng Tổng hợp Chỉ số Vận hành theo Chu kỳ
                </span>
                <span className="text-[11px] text-slate-500 font-mono">{dashboardRows.length} kỳ đối soát</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 min-w-[170px]">CHU KỲ THỜI GIAN</th>
                      <th className="py-2.5 px-3 text-center min-w-[120px]">LỚP MỚI MỞ</th>
                      <th className="py-2.5 px-3 text-center min-w-[120px]">HỌC SINH MỚI</th>
                      <th className="py-2.5 px-3 text-center min-w-[130px]">LẤP ĐẦY TRẦN (%)</th>
                      <th className="py-2.5 px-3 text-center min-w-[130px]">TỶ LỆ LỖI (%)</th>
                      <th className="py-2.5 px-3 text-center min-w-[130px]">ĐÁNH GIÁ CHUẨN</th>
                    </tr>
                    {/* Hàng tìm kiếm theo từng trường */}
                    <tr className="bg-white border-t border-slate-200 normal-case font-normal text-slate-600">
                      <th className="py-1.5 px-3">
                        <input
                          type="text"
                          value={dashSearchMetric}
                          onChange={e => setDashSearchMetric(e.target.value)}
                          placeholder="Lọc chu kỳ..."
                          className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                        />
                      </th>
                      <th className="py-1.5 px-3 text-center text-slate-400 font-normal">--</th>
                      <th className="py-1.5 px-3 text-center text-slate-400 font-normal">--</th>
                      <th className="py-1.5 px-3 text-center text-slate-400 font-normal">--</th>
                      <th className="py-1.5 px-3 text-center text-slate-400 font-normal">--</th>
                      <th className="py-1.5 px-3 text-center text-slate-400 font-normal">--</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {dashboardRows.map(({ incident, classCount, studentCount, occupancyRate, avgInspectionScore }) => (
                        <tr key={incident.period} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-800">{incident.period}</td>
                          <td className="py-3 px-3 text-center font-bold text-indigo-600">{classCount} lớp</td>
                          <td className="py-3 px-3 text-center font-bold text-emerald-600">{studentCount} HS</td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {occupancyRate}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              {incident.rateStr}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center text-purple-700 font-bold">
                            {avgInspectionScore.toFixed(2)} / 10
                          </td>
                        </tr>
                      ))}
                    {dashboardRows.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          Không có dữ liệu trong khoảng thời gian đã chọn.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BÁO CÁO NGHIỆP VỤ CỐ ĐỊNH (LỌC TRÊN NÓC SỔ NGANG + LỌC CỘT TỪNG PHẦN) */}
      {/* ========================================================================= */}
      {currentMainTab === 'fixed' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Thanh chọn 1 báo cáo duy nhất & Chế độ xem */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  DANH MỤC BÁO CÁO NGHIỆP VỤ (LỌC RIÊNG BIỆT TỪNG PHẦN)
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  Chọn Báo cáo cần xem &amp; đối soát số liệu
                </h3>
              </div>

              {/* Nút chuyển đổi chế độ xem: Biểu đồ & Tỉ lệ | Bảng chi tiết | Kết hợp cả hai */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start lg:self-auto text-xs">
                <button
                  type="button"
                  onClick={() => setFixedViewMode('visual')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    fixedViewMode === 'visual'
                      ? 'bg-white text-indigo-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PieChart className="w-3.5 h-3.5" />
                  <span>Biểu đồ &amp; Tỉ lệ trực quan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFixedViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    fixedViewMode === 'table'
                      ? 'bg-white text-indigo-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Bảng số liệu chi tiết</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFixedViewMode('both')}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    fixedViewMode === 'both'
                      ? 'bg-white text-indigo-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Kết hợp cả hai</span>
                </button>
              </div>
            </div>

            {/* LƯỚI 6 NÚT CHỌN LOẠI BÁO CÁO */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              <button
                type="button"
                onClick={() => setSelectedFixedReport('fixed_new_classes')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedFixedReport === 'fixed_new_classes'
                    ? 'bg-indigo-50/70 border-indigo-500 shadow-2xs ring-1 ring-indigo-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                    selectedFixedReport === 'fixed_new_classes' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <BookOpen className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    {filteredClasses.length} lớp
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold text-slate-800 leading-tight">1. Lớp học mới</div>
                  <div className="text-[10px] text-slate-400">Sĩ số &amp; trần</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFixedReport('fixed_new_students')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedFixedReport === 'fixed_new_students'
                    ? 'bg-indigo-50/70 border-indigo-500 shadow-2xs ring-1 ring-indigo-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                    selectedFixedReport === 'fixed_new_students' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <GraduationCap className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    {filteredStudents.length} HS
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold text-slate-800 leading-tight">2. Học sinh mới</div>
                  <div className="text-[10px] text-slate-400">Tiếp nhận &amp; ghép</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFixedReport('fixed_new_tutors')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedFixedReport === 'fixed_new_tutors'
                    ? 'bg-indigo-50/70 border-indigo-500 shadow-2xs ring-1 ring-indigo-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                    selectedFixedReport === 'fixed_new_tutors' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Users className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    {filteredTutors.length} GV
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold text-slate-800 leading-tight">3. Gia sư mới</div>
                  <div className="text-[10px] text-slate-400">Phân bổ ca dạy</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFixedReport('fixed_incident_trend')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedFixedReport === 'fixed_incident_trend'
                    ? 'bg-rose-50/70 border-rose-500 shadow-2xs ring-1 ring-rose-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                    selectedFixedReport === 'fixed_incident_trend' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <ShieldAlert className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                    {incStats.rate}%
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold text-slate-800 leading-tight">4. Sự cố &amp; Lỗi (%)</div>
                  <div className="text-[10px] text-slate-400">Chuỗi thời gian</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFixedReport('fixed_matrix')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedFixedReport === 'fixed_matrix'
                    ? 'bg-indigo-50/70 border-indigo-500 shadow-2xs ring-1 ring-indigo-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                    selectedFixedReport === 'fixed_matrix' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Grid className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    2,840 ca
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold text-slate-800 leading-tight">5. Ma trận Ca dạy</div>
                  <div className="text-[10px] text-slate-400">Môn × Khối lớp</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFixedReport('fixed_inspection')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedFixedReport === 'fixed_inspection'
                    ? 'bg-indigo-50/70 border-indigo-500 shadow-2xs ring-1 ring-indigo-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs ${
                    selectedFixedReport === 'fixed_inspection' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Award className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    {inspStats.avgScore}đ
                  </span>
                </div>
                <div className="mt-2">
                  <div className="text-xs font-bold text-slate-800 leading-tight">6. Dự giờ &amp; GV</div>
                  <div className="text-[10px] text-slate-400">Xếp hạng A/B/C/D</div>
                </div>
              </button>
            </div>
          </div>

          {/* ================= BÁO CÁO 1: LỚP HỌC MỚI TẠO ================= */}
          {selectedFixedReport === 'fixed_new_classes' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Thanh điều hành trên nóc (Nút mở Bộ lọc từ cột bên phải) */}
              <div className="bg-white p-3 px-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsClsFilterOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Mở bộ lọc nhiều tiêu chí từ cột bên phải"
                  >
                    <Filter className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Bộ lọc: <strong>{clsDateFrom || clsDateTo ? formatDateRangeLabel(clsDateFrom, clsDateTo) : formatMonthLabel(clsMonth)}</strong></span>
                    <span className="px-1.5 py-0.2 rounded-md bg-white text-indigo-700 text-[10px] font-bold border border-indigo-200">
                      {filteredClasses.length} lớp
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      let csv = 'Ma_Lop,Ten_Lop,Thoi_Gian_Tao_Ma,Khoi_Lop,Mon_Hoc,Mo_Hinh,Si_So,Trang_Thai\n';
                      filteredClasses.forEach(c => {
                        csv += `"${c.code}","${c.name}","${c.date}","${c.grade}","${c.subject}","${c.model}","${c.students}","${c.status}"\n`;
                      });
                      downloadCsv(csv, 'Bao_Cao_Lop_Hoc_Moi_Tao.csv');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer ml-auto"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Xuất Excel</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>In PDF</span>
                  </button>
                </div>
              </div>

              {/* Tỉ lệ trực quan */}
              {(fixedViewMode === 'visual' || fixedViewMode === 'both') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Tỷ lệ Lấp đầy Sĩ số trần</span>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {clsStats.fullRate}% Đủ trần
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                      <div style={{ width: `${clsStats.fullRate}%` }} className="bg-emerald-500 h-full" />
                      <div style={{ width: `${100 - clsStats.fullRate}%` }} className="bg-amber-400 h-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                        <div className="text-[10px] font-semibold text-emerald-700">Đã đủ trần sĩ số</div>
                        <div className="text-base font-bold text-emerald-900 mt-0.5">{clsStats.fullCount} lớp</div>
                      </div>
                      <div className="bg-amber-50 p-2 rounded-xl border border-amber-100">
                        <div className="text-[10px] font-semibold text-amber-700">Còn chỗ trống</div>
                        <div className="text-base font-bold text-amber-900 mt-0.5">{clsStats.availCount} lớp</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Cơ cấu Bộ môn Mở lớp</span>
                      <span className="text-xs font-semibold text-slate-500">Tổng {clsStats.total} lớp</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                      <div style={{ width: `${clsStats.toanRate}%` }} className="bg-[#FF5C00] h-full" />
                      <div style={{ width: `${clsStats.engRate}%` }} className="bg-indigo-600 h-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-orange-50 p-2 rounded-xl border border-orange-100">
                        <div className="text-[10px] font-semibold text-[#FF5C00]">Môn Toán ({clsStats.toanRate}%)</div>
                        <div className="text-base font-bold text-slate-900 mt-0.5">{clsStats.toanCount} lớp</div>
                      </div>
                      <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                        <div className="text-[10px] font-semibold text-indigo-700">Tiếng Anh ({clsStats.engRate}%)</div>
                        <div className="text-base font-bold text-indigo-900 mt-0.5">{clsStats.engCount} lớp</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* BẢNG SỐ LIỆU VỚI BỘ LỌC TRÊN CỘT */}
              {(fixedViewMode === 'table' || fixedViewMode === 'both') && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-3 w-32">MÃ LỚP</th>
                          <th className="py-3 px-3 min-w-[200px]">TÊN LỚP HỌC</th>
                          <th className="py-3 px-3 text-center min-w-[130px]">NGÀY TẠO MÃ</th>
                          <th className="py-3 px-3 min-w-[120px]">KHỐI LỚP</th>
                          <th className="py-3 px-3 min-w-[110px]">MÔN HỌC</th>
                          <th className="py-3 px-3 min-w-[110px]">MÔ HÌNH</th>
                          <th className="py-3 px-3 text-center min-w-[110px]">SĨ SỐ / TRẦN</th>
                          <th className="py-3 px-3 text-center min-w-[140px]">TÌNH TRẠNG</th>
                          <th className="py-3 px-3 text-center w-20">HÀNH ĐỘNG</th>
                        </tr>
                        {/* Hàng lọc trực tiếp tại từng cột */}
                        <tr className="bg-slate-100/70 border-t border-slate-200 normal-case font-normal text-slate-600">
                          <th className="py-2 px-3">
                            <input
                              type="text"
                              value={clsFilterCode}
                              onChange={e => setClsFilterCode(e.target.value)}
                              placeholder="Tìm mã..."
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                            />
                          </th>
                          <th className="py-2 px-3">
                            <input
                              type="text"
                              value={clsFilterName}
                              onChange={e => setClsFilterName(e.target.value)}
                              placeholder="Tìm tên lớp..."
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                            />
                          </th>
                          <th className="py-2 px-3 text-center text-slate-400 font-normal">--</th>
                          <th className="py-2 px-3">
                            <select
                              value={clsFilterGrade}
                              onChange={e => setClsFilterGrade(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              <option value="ALL">Tất cả khối</option>
                              <option value="Khối 1">Khối 1</option>
                              <option value="Khối 2">Khối 2</option>
                              <option value="Khối 3">Khối 3</option>
                              <option value="Khối 4">Khối 4</option>
                              <option value="Khối 5">Khối 5</option>
                              <option value="Khối 7">Khối 7</option>
                              <option value="Khối 8">Khối 8</option>
                              <option value="Khối 9">Khối 9</option>
                              <option value="IELTS / Nâng cao">IELTS</option>
                            </select>
                          </th>
                          <th className="py-2 px-3">
                            <select
                              value={clsFilterSubject}
                              onChange={e => setClsFilterSubject(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              <option value="ALL">Tất cả môn</option>
                              <option value="TOAN">Toán</option>
                              <option value="ENG">Tiếng Anh</option>
                            </select>
                          </th>
                          <th className="py-2 px-3">
                            <select
                              value={clsFilterModel}
                              onChange={e => setClsFilterModel(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              <option value="ALL">Tất cả</option>
                              <option value="1-1">1 Kèm 1</option>
                              <option value="1-3">Nhóm 1-3</option>
                              <option value="1-5">Nhóm 1-5</option>
                            </select>
                          </th>
                          <th className="py-2 px-3 text-center text-slate-400 font-normal">--</th>
                          <th className="py-2 px-3">
                            <select
                              value={clsFilterStatus}
                              onChange={e => setClsFilterStatus(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              <option value="ALL">Tất cả</option>
                              <option value="FULL">Đã đủ trần</option>
                              <option value="AVAILABLE">Còn trống</option>
                            </select>
                          </th>
                          <th className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={resetClsFilters}
                              className="px-2.5 py-1 text-[10px] text-slate-500 hover:text-rose-600 font-bold rounded-lg bg-white border border-slate-200 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
                            >
                              Reset
                            </button>
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredClasses.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-10 text-center text-slate-400">
                              Không có lớp học nào thỏa mãn bộ lọc đã chọn!
                            </td>
                          </tr>
                        ) : (
                          filteredClasses.map(c => (
                            <tr key={c.code} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-3 font-bold font-mono text-indigo-600">{c.code}</td>
                              <td className="py-3 px-3 font-semibold text-slate-800">{c.name}</td>
                              <td className="py-3 px-3 text-center text-slate-500 font-mono">{c.date}</td>
                              <td className="py-3 px-3 text-slate-700">{c.grade}</td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded-md font-semibold ${
                                  c.subjectCode === 'TOAN' ? 'bg-orange-50 text-[#FF5C00]' : 'bg-indigo-50 text-indigo-700'
                                }`}>
                                  {c.subject}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-600">{c.model}</td>
                              <td className="py-3 px-3 text-center font-bold text-slate-800">{c.students}</td>
                              <td className="py-3 px-3 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  c.status.includes('trần') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {c.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="text-[11px] text-indigo-600 font-semibold cursor-pointer hover:underline">
                                  Chi tiết
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= BÁO CÁO 2: HỌC SINH MỚI TIẾP NHẬN ================= */}
          {selectedFixedReport === 'fixed_new_students' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Thanh điều hành trên nóc (Nút mở Bộ lọc từ cột bên phải) */}
              <div className="bg-white p-3 px-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsStuFilterOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Mở bộ lọc nhiều tiêu chí từ cột bên phải"
                  >
                    <Filter className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Bộ lọc: <strong>{stuDateFrom || stuDateTo ? formatDateRangeLabel(stuDateFrom, stuDateTo) : formatMonthLabel(stuMonth)}</strong></span>
                    <span className="px-1.5 py-0.2 rounded-md bg-white text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      {filteredStudents.length} HS
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      let csv = 'Ma_HS,Ho_Ten,Thoi_Gian_Tao_Ma_HS,Khoi_Lop,Mon_Hoc,Mo_Hinh,Trang_Thai\n';
                      filteredStudents.forEach(s => {
                        csv += `"${s.id}","${s.name}","${s.date}","${s.grade}","${s.subject}","${s.model}","${s.status}"\n`;
                      });
                      downloadCsv(csv, 'Bao_Cao_Hoc_Sinh_Moi.csv');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer ml-auto"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Xuất Excel</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>In PDF</span>
                  </button>
                </div>
              </div>

              {/* Tỉ lệ trực quan */}
              {(fixedViewMode === 'visual' || fixedViewMode === 'both') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Tỷ lệ Ghép lớp Thành công</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {stuStats.assignedRate}% Đã vào lớp
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                      <div style={{ width: `${stuStats.assignedRate}%` }} className="bg-emerald-500 h-full" />
                      <div style={{ width: `${100 - stuStats.assignedRate}%` }} className="bg-slate-300 h-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                        <div className="text-[10px] font-semibold text-emerald-700">Đã xếp vào lớp học</div>
                        <div className="text-base font-bold text-emerald-900 mt-0.5">{stuStats.assignedCount} HS</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <div className="text-[10px] font-semibold text-slate-500">Chờ ghép lớp</div>
                        <div className="text-base font-bold text-slate-800 mt-0.5">{stuStats.waitingCount} HS</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Nhu cầu Môn học của Học sinh</span>
                      <span className="text-xs font-semibold text-slate-500">Tổng {stuStats.total} HS</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                        <div className="text-[10px] font-semibold text-[#FF5C00]">Môn Toán</div>
                        <div className="text-lg font-bold text-slate-900 mt-0.5">{stuStats.toanCount} học sinh</div>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                        <div className="text-[10px] font-semibold text-indigo-700">Tiếng Anh &amp; IELTS</div>
                        <div className="text-lg font-bold text-indigo-900 mt-0.5">{stuStats.engCount} học sinh</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* BẢNG SỐ LIỆU VỚI BỘ LỌC TRÊN CỘT */}
              {(fixedViewMode === 'table' || fixedViewMode === 'both') && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-3 w-28">MÃ HỌC SINH</th>
                          <th className="py-3 px-3 min-w-[190px]">HỌ VÀ TÊN</th>
                          <th className="py-3 px-3 text-center min-w-[130px]">NGÀY TẠO MÃ</th>
                          <th className="py-3 px-3 min-w-[120px]">KHỐI LỚP</th>
                          <th className="py-3 px-3 min-w-[110px]">MÔN HỌC</th>
                          <th className="py-3 px-3 min-w-[120px]">MÔ HÌNH MONG MUỐN</th>
                          <th className="py-3 px-3 text-center min-w-[140px]">TÌNH TRẠNG GHÉP</th>
                          <th className="py-3 px-3 text-center w-20">HÀNH ĐỘNG</th>
                        </tr>
                        {/* Hàng lọc trực tiếp tại từng cột */}
                        <tr className="bg-slate-100/70 border-t border-slate-200 normal-case font-normal text-slate-600">
                          <th className="py-2 px-3">
                            <input
                              type="text"
                              value={stuFilterCode}
                              onChange={e => setStuFilterCode(e.target.value)}
                              placeholder="Tìm mã..."
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                            />
                          </th>
                          <th className="py-2 px-3">
                            <input
                              type="text"
                              value={stuFilterName}
                              onChange={e => setStuFilterName(e.target.value)}
                              placeholder="Tìm tên..."
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                            />
                          </th>
                          <th className="py-2 px-3 text-center text-slate-400 font-normal">--</th>
                          <th className="py-2 px-3">
                            <select
                              value={stuFilterGrade}
                              onChange={e => setStuFilterGrade(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              <option value="ALL">Tất cả khối</option>
                              <option value="Khối 1">Khối 1</option>
                              <option value="Khối 2">Khối 2</option>
                              <option value="Khối 3">Khối 3</option>
                              <option value="Khối 4">Khối 4</option>
                              <option value="Khối 5">Khối 5</option>
                              <option value="Khối 6">Khối 6</option>
                              <option value="Khối 8">Khối 8</option>
                              <option value="IELTS / Nâng cao">IELTS</option>
                            </select>
                          </th>
                          <th className="py-2 px-3">
                            <select
                              value={stuFilterSubject}
                              onChange={e => setStuFilterSubject(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              <option value="ALL">Tất cả môn</option>
                              <option value="TOAN">Toán</option>
                              <option value="ENG">Tiếng Anh</option>
                            </select>
                          </th>
                          <th className="py-2 px-3">
                            <select
                              value={stuFilterModel}
                              onChange={e => setStuFilterModel(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              <option value="ALL">Tất cả</option>
                              <option value="1-1">1 Kèm 1</option>
                              <option value="1-3">Nhóm 1-3</option>
                              <option value="1-5">Nhóm 1-5</option>
                            </select>
                          </th>
                          <th className="py-2 px-3">
                            <select
                              value={stuFilterStatus}
                              onChange={e => setStuFilterStatus(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              <option value="ALL">Tất cả</option>
                              <option value="FULL">Đã vào lớp</option>
                              <option value="AVAILABLE">Chờ ghép</option>
                            </select>
                          </th>
                          <th className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={resetStuFilters}
                              className="px-2.5 py-1 text-[10px] text-slate-500 hover:text-rose-600 font-bold rounded-lg bg-white border border-slate-200 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
                            >
                              Reset
                            </button>
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-10 text-center text-slate-400">
                              Không có học sinh nào thỏa mãn bộ lọc đã chọn!
                            </td>
                          </tr>
                        ) : (
                          filteredStudents.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-3 font-bold font-mono text-emerald-600">{s.id}</td>
                              <td className="py-3 px-3 font-semibold text-slate-800">{s.name}</td>
                              <td className="py-3 px-3 text-center text-slate-500 font-mono">{s.date}</td>
                              <td className="py-3 px-3 text-slate-700">{s.grade}</td>
                              <td className="py-3 px-3">{s.subject}</td>
                              <td className="py-3 px-3 text-slate-600">{s.model}</td>
                              <td className="py-3 px-3 text-center">
                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  s.status.includes('vào lớp') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {s.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="text-[11px] text-indigo-600 font-semibold cursor-pointer hover:underline">
                                  Hồ sơ
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= BÁO CÁO 3: GIA SƯ MỚI GIA NHẬP ================= */}
          {selectedFixedReport === 'fixed_new_tutors' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Thanh điều hành trên nóc (Nút mở Bộ lọc từ cột bên phải) */}
              <div className="bg-white p-3 px-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTutFilterOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Mở bộ lọc nhiều tiêu chí từ cột bên phải"
                  >
                    <Filter className="w-3.5 h-3.5 text-purple-600" />
                    <span>Bộ lọc: <strong>{tutDateFrom || tutDateTo ? formatDateRangeLabel(tutDateFrom, tutDateTo) : formatMonthLabel(tutMonth)}</strong></span>
                    <span className="px-1.5 py-0.2 rounded-md bg-white text-purple-700 text-[10px] font-bold border border-purple-200">
                      {filteredTutors.length} gia sư
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      let csv = 'Ma_GV,Ho_Ten,Thoi_Gian_Tao_Ma_GV,Mon_Chuyen_Mon,Khoi_Phu_Trach,Trang_Thai,So_Ca_Da_Nhan\n';
                      filteredTutors.forEach(t => {
                        csv += `"${t.id}","${t.name}","${t.date}","${t.subject}","${t.grades}","${t.status}",${t.assigned}\n`;
                      });
                      downloadCsv(csv, 'Bao_Cao_Gia_Su_Moi.csv');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer ml-auto"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Xuất Excel</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>In PDF</span>
                  </button>
                </div>
              </div>

              {/* Tỉ lệ trực quan Báo cáo Gia sư */}
              {(fixedViewMode === 'visual' || fixedViewMode === 'both') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Tỷ lệ Gia sư Sẵn sàng Tiếp nhận Lớp</span>
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                        {tutStats.readyRate}% Sẵn sàng
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                      <div style={{ width: `${tutStats.readyRate}%` }} className="bg-purple-600 h-full" />
                      <div style={{ width: `${100 - tutStats.readyRate}%` }} className="bg-indigo-500 h-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-purple-50 p-2 rounded-xl border border-purple-100">
                        <div className="text-[10px] font-semibold text-purple-700">Sẵn sàng nhận thêm lớp</div>
                        <div className="text-base font-bold text-purple-900 mt-0.5">{tutStats.readyCount} GV</div>
                      </div>
                      <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                        <div className="text-[10px] font-semibold text-indigo-700">Đang đứng đủ ca</div>
                        <div className="text-base font-bold text-indigo-900 mt-0.5">{tutStats.activeCount} GV</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Hiệu suất Phân bổ Ca Dạy</span>
                      <span className="text-xs font-semibold text-slate-500">Trung bình {tutStats.avgSessions} ca/GV</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                        <div className="text-[10px] font-semibold text-[#FF5C00]">GV Môn Toán</div>
                        <div className="text-lg font-bold text-slate-900 mt-0.5">{tutStats.toanCount} giáo viên</div>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                        <div className="text-[10px] font-semibold text-indigo-700">GV Tiếng Anh &amp; IELTS</div>
                        <div className="text-lg font-bold text-indigo-900 mt-0.5">{tutStats.engCount} giáo viên</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* BẢNG SỐ LIỆU VỚI BỘ LỌC TRÊN CỘT */}
              {(fixedViewMode === 'table' || fixedViewMode === 'both') && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-3 w-28">MÃ GIA SƯ</th>
                          <th className="py-3 px-3 min-w-[190px]">HỌ VÀ TÊN</th>
                          <th className="py-3 px-3 text-center min-w-[130px]">NGÀY TẠO MÃ</th>
                          <th className="py-3 px-3 min-w-[120px]">MÔN CHUYÊN MÔN</th>
                          <th className="py-3 px-3 min-w-[130px]">KHỐI PHỤ TRÁCH</th>
                          <th className="py-3 px-3 text-center min-w-[140px]">TRẠNG THÁI HỒ SƠ</th>
                          <th className="py-3 px-3 text-center min-w-[120px]">SỐ CA ĐÃ NHẬN</th>
                          <th className="py-3 px-3 text-center w-20">HÀNH ĐỘNG</th>
                        </tr>
                        {/* Hàng lọc trực tiếp tại từng cột */}
                        <tr className="bg-slate-100/70 border-t border-slate-200 normal-case font-normal text-slate-600">
                          <th className="py-2 px-3">
                            <input
                              type="text"
                              value={tutFilterCode}
                              onChange={e => setTutFilterCode(e.target.value)}
                              placeholder="Tìm mã..."
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                            />
                          </th>
                          <th className="py-2 px-3">
                            <input
                              type="text"
                              value={tutFilterName}
                              onChange={e => setTutFilterName(e.target.value)}
                              placeholder="Tìm tên..."
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                            />
                          </th>
                          <th className="py-2 px-3 text-center text-slate-400 font-normal">--</th>
                          <th className="py-2 px-3">
                            <select
                              value={tutFilterSubject}
                              onChange={e => setTutFilterSubject(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              <option value="ALL">Tất cả môn</option>
                              <option value="TOAN">Toán</option>
                              <option value="ENG">Tiếng Anh</option>
                            </select>
                          </th>
                          <th className="py-2 px-3">
                            <select
                              value={tutFilterGrade}
                              onChange={e => setTutFilterGrade(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              <option value="ALL">Tất cả khối</option>
                              <option value="1 - 5">Khối 1 - 5</option>
                              <option value="6 - 9">Khối 6 - 9</option>
                              <option value="10 - 12">Khối 10 - 12</option>
                              <option value="IELTS">IELTS</option>
                            </select>
                          </th>
                          <th className="py-2 px-3">
                            <select
                              value={tutFilterStatus}
                              onChange={e => setTutFilterStatus(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              <option value="ALL">Tất cả trạng thái</option>
                              <option value="READY">Sẵn sàng nhận lớp</option>
                              <option value="ACTIVE">Đang đứng lớp</option>
                            </select>
                          </th>
                          <th className="py-2 px-3 text-center text-slate-400 font-normal">--</th>
                          <th className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={resetTutFilters}
                              className="px-2.5 py-1 text-[10px] text-slate-500 hover:text-rose-600 font-bold rounded-lg bg-white border border-slate-200 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
                            >
                              Reset
                            </button>
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredTutors.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-10 text-center text-slate-400">
                              Không có gia sư nào thỏa mãn bộ lọc đã chọn!
                            </td>
                          </tr>
                        ) : (
                          filteredTutors.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-3 font-bold font-mono text-purple-600">{t.id}</td>
                              <td className="py-3 px-3 font-semibold text-slate-800">{t.name}</td>
                              <td className="py-3 px-3 text-center text-slate-500 font-mono">{t.date}</td>
                              <td className="py-3 px-3">{t.subject}</td>
                              <td className="py-3 px-3 text-slate-600">{t.grades}</td>
                              <td className="py-3 px-3 text-center">
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {t.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-slate-900">{t.assigned} ca</td>
                              <td className="py-3 px-3 text-center">
                                <span className="text-[11px] text-indigo-600 font-semibold cursor-pointer hover:underline">
                                  Lịch dạy
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= BÁO CÁO 4: SỰ CỐ & TỶ LỆ LỖI ================= */}
          {selectedFixedReport === 'fixed_incident_trend' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Thanh điều hành trên nóc (Nút mở Bộ lọc từ cột bên phải) */}
              <div className="bg-white p-3 px-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsIncFilterOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Mở bộ lọc nhiều tiêu chí từ cột bên phải"
                  >
                    <Filter className="w-3.5 h-3.5 text-rose-600" />
                    <span>Bộ lọc: <strong>{incPeriod === 'ALL' ? 'Tất cả' : incPeriod === 'THIS_WEEK' ? 'Tuần này' : incPeriod === 'NEXT_WEEK' ? 'Tuần sau' : `Tuần ${incPeriod.slice(1)}`}</strong></span>
                    <span className="px-1.5 py-0.2 rounded-md bg-white text-rose-700 text-[10px] font-bold border border-rose-200">
                      {filteredIncidents.length} kỳ
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      let csv = 'Chu_Ky,Tong_Ca,Su_Co,Dot_Xuat,Bao_Truoc,Ty_Le_Loi,Nguyen_Nhan_Chinh\n';
                      filteredIncidents.forEach(i => {
                        csv += `"${i.period}",${i.total},${i.incidents},${i.urgent},${i.notice},"${i.rateStr}","${i.main}"\n`;
                      });
                      downloadCsv(csv, 'Bao_Cao_Su_Co_Va_Ty_Le_Loi.csv');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer ml-auto"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Xuất Excel</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>In PDF</span>
                  </button>
                </div>
              </div>

              {/* Tỉ lệ trực quan Báo cáo Sự cố */}
              {(fixedViewMode === 'visual' || fixedViewMode === 'both') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Biểu đồ Tỷ lệ Lỗi (%) Qua 5 Tuần</span>
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                        TB: {incStats.rate}%
                      </span>
                    </div>
                    {/* Thanh minh họa so sánh các tuần */}
                    <div className="space-y-2 pt-1 text-xs">
                      {filteredIncidents.map(inc => (
                        <div key={inc.period} className="flex items-center gap-2">
                          <span className="w-24 text-[10px] text-slate-500 truncate">{inc.period}</span>
                          <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden flex">
                            <div
                              style={{ width: `${Math.min(100, inc.rate * 25)}%` }}
                              className={`h-full ${inc.rate > 2.5 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            />
                          </div>
                          <span className={`w-12 text-right font-bold text-[11px] ${inc.rate > 2.5 ? 'text-rose-600' : 'text-slate-700'}`}>
                            {inc.rateStr}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Cơ cấu Tính chất Sự cố</span>
                      <span className="text-xs font-semibold text-slate-500">Tổng {incStats.incidents} ca sự cố</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                      <div style={{ width: `${incStats.urgentRate}%` }} className="bg-rose-500 h-full" />
                      <div style={{ width: `${100 - incStats.urgentRate}%` }} className="bg-amber-400 h-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                        <div className="text-[10px] font-semibold text-rose-700">Đột xuất (&lt; 2h) - {incStats.urgentRate}%</div>
                        <div className="text-base font-bold text-rose-900 mt-0.5">{incStats.urgent} sự cố</div>
                      </div>
                      <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                        <div className="text-[10px] font-semibold text-amber-700">Báo trước (&gt; 2h) - {100 - incStats.urgentRate}%</div>
                        <div className="text-base font-bold text-amber-900 mt-0.5">{incStats.notice} sự cố</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* BẢNG SỐ LIỆU VỚI BỘ LỌC TRÊN CỘT */}
              {(fixedViewMode === 'table' || fixedViewMode === 'both') && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-3 min-w-[170px]">CHUỖI THỜI GIAN</th>
                          <th className="py-3 px-3 text-center min-w-[110px]">TỔNG CA DẠY</th>
                          <th className="py-3 px-3 text-center min-w-[110px]">SỐ CA SỰ CỐ</th>
                          <th className="py-3 px-3 text-center min-w-[120px]">ĐỘT XUẤT (&lt; 2H)</th>
                          <th className="py-3 px-3 text-center min-w-[120px]">BÁO TRƯỚC (&gt; 2H)</th>
                          <th className="py-3 px-3 text-center min-w-[120px]">TỶ LỆ LỖI (%)</th>
                          <th className="py-3 px-3 min-w-[190px]">NGUYÊN NHÂN CHÍNH</th>
                          <th className="py-3 px-3 text-center w-20">HÀNH ĐỘNG</th>
                        </tr>
                        {/* Hàng lọc trực tiếp tại từng cột */}
                        <tr className="bg-slate-100/70 border-t border-slate-200 normal-case font-normal text-slate-600">
                          <th className="py-2 px-3">
                            <input
                              type="text"
                              value={incFilterPeriod}
                              onChange={e => setIncFilterPeriod(e.target.value)}
                              placeholder="Tìm tuần..."
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                            />
                          </th>
                          <th className="py-2 px-3 text-center text-slate-400 font-normal">--</th>
                          <th className="py-2 px-3 text-center text-slate-400 font-normal">--</th>
                          <th className="py-2 px-3">
                            <select
                              value={incFilterUrgent}
                              onChange={e => setIncFilterUrgent(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              <option value="ALL">Tất cả</option>
                              <option value="URGENT">Đột xuất &gt; Báo trước</option>
                              <option value="NOTICE">Báo trước &gt; Đột xuất</option>
                            </select>
                          </th>
                          <th className="py-2 px-3 text-center text-slate-400 font-normal">--</th>
                          <th className="py-2 px-3 text-center text-slate-400 font-normal">--</th>
                          <th className="py-2 px-3">
                            <input
                              type="text"
                              value={incFilterMain}
                              onChange={e => setIncFilterMain(e.target.value)}
                              placeholder="Tìm nguyên nhân..."
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                            />
                          </th>
                          <th className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={resetIncFilters}
                              className="px-2.5 py-1 text-[10px] text-slate-500 hover:text-rose-600 font-bold rounded-lg bg-white border border-slate-200 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
                            >
                              Reset
                            </button>
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredIncidents.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-10 text-center text-slate-400">
                              Không có dữ liệu sự cố nào phù hợp!
                            </td>
                          </tr>
                        ) : (
                          filteredIncidents.map(i => (
                            <tr key={i.period} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-3 px-3 font-semibold text-slate-800">{i.period}</td>
                              <td className="py-3 px-3 text-center text-slate-700 font-semibold">{i.total}</td>
                              <td className="py-3 px-3 text-center text-rose-600 font-bold">{i.incidents}</td>
                              <td className="py-3 px-3 text-center text-slate-800 font-medium">{i.urgent}</td>
                              <td className="py-3 px-3 text-center text-slate-600">{i.notice}</td>
                              <td className="py-3 px-3 text-center font-bold text-rose-600">
                                <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200">
                                  {i.rateStr}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-xs text-slate-600">{i.main}</td>
                              <td className="py-3 px-3 text-center">
                                <span className="text-[11px] text-indigo-600 font-semibold cursor-pointer hover:underline">
                                  Chi tiết
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= BÁO CÁO 5: MA TRẬN CA DẠY (MÔN × KHỐI) ================= */}
          {selectedFixedReport === 'fixed_matrix' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Thanh điều hành trên nóc (Nút mở Bộ lọc từ cột bên phải) */}
              <div className="bg-white p-3 px-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMatFilterOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Mở bộ lọc nhiều tiêu chí từ cột bên phải"
                  >
                    <Filter className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Dữ liệu: <strong>Snapshot tổng hợp</strong></span>
                    <span className="px-1.5 py-0.2 rounded-md bg-white text-indigo-700 text-[10px] font-bold border border-indigo-200">
                      {filteredMatrix.length} môn
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      let csv = 'Bo_Mon,Khoi_1_2,Khoi_3_5,THCS_6_9,THPT_10_12,IELTS,Tong_Ca\n';
                      filteredMatrix.forEach(m => {
                        csv += `"${m.subject}",${m.primary12},${m.primary35},${m.thcs},${m.thpt},${m.ielts},${m.total}\n`;
                      });
                      downloadCsv(csv, 'Ma_Tran_Ca_Day_Mon_Khoi.csv');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer ml-auto"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Xuất Excel</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>In PDF</span>
                  </button>
                </div>
              </div>

              {/* Tỉ lệ trực quan Báo cáo Ma trận ca dạy */}
              {(fixedViewMode === 'visual' || fixedViewMode === 'both') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Tỷ trọng Ca Dạy theo Bộ Môn</span>
                      <span className="text-xs font-semibold text-slate-500">Tổng 2,840 ca</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                      <div style={{ width: `${matStats.toanRate}%` }} className="bg-[#FF5C00] h-full" />
                      <div style={{ width: `${matStats.engRate}%` }} className="bg-indigo-600 h-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-orange-50 p-2.5 rounded-xl border border-orange-100">
                        <div className="text-[10px] font-semibold text-[#FF5C00]">Môn Toán ({matStats.toanRate}%)</div>
                        <div className="text-base font-bold text-slate-900 mt-0.5">{matStats.toanSessions.toLocaleString()} ca</div>
                      </div>
                      <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                        <div className="text-[10px] font-semibold text-indigo-700">Tiếng Anh &amp; IELTS ({matStats.engRate}%)</div>
                        <div className="text-base font-bold text-indigo-900 mt-0.5">{matStats.engSessions.toLocaleString()} ca</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Phân bổ Khối Lớp Trọng Điểm</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        Tiểu học: {matStats.primaryRate}%
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <div className="text-[10px] text-slate-500">Tiểu học (K1-5)</div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">{matStats.primaryTotal.toLocaleString()} ca</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <div className="text-[10px] text-slate-500">THCS (K6-9)</div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">460 ca</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <div className="text-[10px] text-slate-500">THPT &amp; IELTS</div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">375 ca</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* BẢNG SỐ LIỆU VỚI BỘ LỌC TRÊN CỘT */}
              {(fixedViewMode === 'table' || fixedViewMode === 'both') && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-3 min-w-[190px]">BỘ MÔN CHUYÊN MÔN</th>
                          <th className="py-3 px-3 text-center min-w-[110px]">KHỐI 1 - 2</th>
                          <th className="py-3 px-3 text-center min-w-[110px]">KHỐI 3 - 5</th>
                          <th className="py-3 px-3 text-center min-w-[130px]">KHỐI 6 - 9 (THCS)</th>
                          <th className="py-3 px-3 text-center min-w-[130px]">KHỐI 10 - 12 (THPT)</th>
                          <th className="py-3 px-3 text-center min-w-[120px]">IELTS / NÂNG CAO</th>
                          <th className="py-3 px-3 text-right min-w-[140px]">TỔNG CA HOÀN THÀNH</th>
                        </tr>
                        {/* Hàng lọc trực tiếp tại từng cột */}
                        <tr className="bg-slate-100/70 border-t border-slate-200 normal-case font-normal text-slate-600">
                          <th className="py-2 px-3">
                            <select
                              value={matFilterSubject}
                              onChange={e => setMatFilterSubject(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              <option value="ALL">Tất cả bộ môn</option>
                              <option value="TOAN">Môn Toán</option>
                              <option value="ENG">Môn Tiếng Anh (IELTS)</option>
                            </select>
                          </th>
                          <th colSpan={6} className="py-2 px-3 text-right text-slate-400 font-normal">
                            <span>Ma trận đối soát 2 chiều phân bổ ca dạy</span>
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredMatrix.map(m => (
                          <tr key={m.code} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                              <span>{m.subject}</span>
                            </td>
                            <td className="py-3.5 px-3 text-center">{m.primary12}</td>
                            <td className="py-3.5 px-3 text-center">{m.primary35}</td>
                            <td className="py-3.5 px-3 text-center">{m.thcs}</td>
                            <td className="py-3.5 px-3 text-center">{m.thpt}</td>
                            <td className="py-3.5 px-3 text-center">{m.ielts}</td>
                            <td className="py-3.5 px-3 text-right font-bold text-slate-900">{m.total.toLocaleString()} ca</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
                        <tr>
                          <td className="py-3 px-3">Toàn trường</td>
                          <td className="py-3 px-3 text-center">915</td>
                          <td className="py-3 px-3 text-center">1,090</td>
                          <td className="py-3 px-3 text-center">460</td>
                          <td className="py-3 px-3 text-center">240</td>
                          <td className="py-3 px-3 text-center">135</td>
                          <td className="py-3 px-3 text-right text-indigo-600 font-bold">2,840 ca</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= BÁO CÁO 6: ĐÁNH GIÁ DỰ GIỜ & XẾP HẠNG GIÁO VIÊN ================= */}
          {selectedFixedReport === 'fixed_inspection' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Thanh điều hành trên nóc (Nút mở Bộ lọc từ cột bên phải) */}
              <div className="bg-white p-3 px-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInspFilterOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    title="Mở bộ lọc nhiều tiêu chí từ cột bên phải"
                  >
                    <Filter className="w-3.5 h-3.5 text-purple-600" />
                    <span>Dữ liệu: <strong>Snapshot tổng hợp</strong></span>
                    <span className="px-1.5 py-0.2 rounded-md bg-white text-purple-700 text-[10px] font-bold border border-purple-200">
                      {filteredInspection.length} GV
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      let csv = 'Ma_GV,Ho_Ten,Mon,Diem_TB,Xep_Hang,Tong_Ca,Ty_Le_Dung_Gio,Ke_Hoach_Boi_Duong\n';
                      filteredInspection.forEach(t => {
                        csv += `"${t.id}","${t.name}","${t.subject}",${t.avg},"${t.rank}",${t.total},"${t.punctuality}","${t.plan}"\n`;
                      });
                      downloadCsv(csv, 'Bao_Cao_Du_Gio_Va_Xep_Hang_GV.csv');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer ml-auto"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Xuất Excel</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>In PDF</span>
                  </button>
                </div>
              </div>

              {/* Tỉ lệ trực quan Báo cáo Dự giờ */}
              {(fixedViewMode === 'visual' || fixedViewMode === 'both') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Cơ cấu Phân bố Xếp hạng Chuyên môn</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {inspStats.qualifiedRate}% Đạt chuẩn (A &amp; B)
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100 text-center">
                        <div className="text-[10px] font-semibold text-emerald-700">Hạng A</div>
                        <div className="text-base font-bold text-emerald-900 mt-0.5">{inspStats.rankA} GV</div>
                      </div>
                      <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100 text-center">
                        <div className="text-[10px] font-semibold text-indigo-700">Hạng B</div>
                        <div className="text-base font-bold text-indigo-900 mt-0.5">{inspStats.rankB} GV</div>
                      </div>
                      <div className="bg-amber-50 p-2 rounded-xl border border-amber-100 text-center">
                        <div className="text-[10px] font-semibold text-amber-700">Hạng C</div>
                        <div className="text-base font-bold text-amber-900 mt-0.5">{inspStats.rankC} GV</div>
                      </div>
                      <div className="bg-rose-50 p-2 rounded-xl border border-rose-100 text-center">
                        <div className="text-[10px] font-semibold text-rose-700">Hạng D</div>
                        <div className="text-base font-bold text-rose-900 mt-0.5">{inspStats.rankD} GV</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Điểm Trung Bình Dự giờ Toàn viện</span>
                      <span className="text-xs font-semibold text-slate-500">Thang điểm 10</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-black text-indigo-600 font-mono">{inspStats.avgScore}</div>
                      <div className="text-xs text-slate-500">
                        <div>Đúng giờ trung bình: <strong className="text-emerald-600 font-bold">96.5%</strong></div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Dựa trên kết quả dự giờ thực tế</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* BẢNG SỐ LIỆU VỚI BỘ LỌC TRÊN CỘT */}
              {(fixedViewMode === 'table' || fixedViewMode === 'both') && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-3 w-28">MÃ GV</th>
                          <th className="py-3 px-3 min-w-[190px]">HỌ VÀ TÊN</th>
                          <th className="py-3 px-3 min-w-[120px]">MÔN PHỤ TRÁCH</th>
                          <th className="py-3 px-3 text-center min-w-[110px]">ĐIỂM TB</th>
                          <th className="py-3 px-3 text-center min-w-[130px]">XẾP HẠNG</th>
                          <th className="py-3 px-3 text-center min-w-[110px]">TỔNG CA</th>
                          <th className="py-3 px-3 text-center min-w-[110px]">ĐÚNG GIỜ</th>
                          <th className="py-3 px-3 min-w-[190px]">KẾ HOẠCH BỒI DƯỠNG</th>
                          <th className="py-3 px-3 text-center w-20">HÀNH ĐỘNG</th>
                        </tr>
                        {/* Hàng lọc trực tiếp tại từng cột */}
                        <tr className="bg-slate-100/70 border-t border-slate-200 normal-case font-normal text-slate-600">
                          <th className="py-2 px-3">
                            <input
                              type="text"
                              value={inspFilterCode}
                              onChange={e => setInspFilterCode(e.target.value)}
                              placeholder="Tìm mã..."
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                            />
                          </th>
                          <th className="py-2 px-3">
                            <input
                              type="text"
                              value={inspFilterName}
                              onChange={e => setInspFilterName(e.target.value)}
                              placeholder="Tìm tên..."
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                            />
                          </th>
                          <th className="py-2 px-3">
                            <select
                              value={inspFilterSubject}
                              onChange={e => setInspFilterSubject(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              <option value="ALL">Tất cả môn</option>
                              <option value="TOAN">Toán</option>
                              <option value="ENG">Tiếng Anh</option>
                            </select>
                          </th>
                          <th className="py-2 px-3">
                            <select
                              value={inspFilterScore}
                              onChange={e => setInspFilterScore(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              <option value="ALL">Tất cả điểm</option>
                              <option value="9">&gt;= 9.0</option>
                              <option value="8">8.0 - 8.9</option>
                              <option value="7">&lt; 8.0</option>
                            </select>
                          </th>
                          <th className="py-2 px-3">
                            <select
                              value={inspFilterRank}
                              onChange={e => setInspFilterRank(e.target.value)}
                              className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-indigo-600 cursor-pointer"
                            >
                              <option value="ALL">Tất cả hạng</option>
                              <option value="A">Hạng A</option>
                              <option value="B">Hạng B</option>
                              <option value="C">Hạng C</option>
                              <option value="D">Hạng D</option>
                            </select>
                          </th>
                          <th className="py-2 px-3 text-center text-slate-400 font-normal">--</th>
                          <th className="py-2 px-3 text-center text-slate-400 font-normal">--</th>
                          <th className="py-2 px-3 text-center text-slate-400 font-normal">--</th>
                          <th className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={resetInspFilters}
                              className="px-2.5 py-1 text-[10px] text-slate-500 hover:text-rose-600 font-bold rounded-lg bg-white border border-slate-200 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
                            >
                              Reset
                            </button>
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredInspection.map(t => (
                          <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3 font-bold font-mono text-slate-900">{t.id}</td>
                            <td className="py-3 px-3 font-semibold text-slate-800">{t.name}</td>
                            <td className="py-3 px-3 text-slate-600">{t.subject}</td>
                            <td className="py-3 px-3 text-center font-bold text-slate-900">{t.avg}</td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                t.rankCode === 'A' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                t.rankCode === 'B' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                t.rankCode === 'C' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {t.rank}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center text-slate-700">{t.total}</td>
                            <td className="py-3 px-3 text-center font-bold text-emerald-600">{t.punctuality}</td>
                            <td className="py-3 px-3 text-xs text-slate-600 font-medium">{t.plan}</td>
                            <td className="py-3 px-3 text-center">
                              <span className="text-[11px] text-indigo-600 font-semibold cursor-pointer hover:underline">
                                Biên bản
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}



      {/* ========================================================================= */}
      {/* CÁC BỘ LỌC CỘT BÊN PHẢI (SLIDE-OVER DRAWERS) THEO TỪNG PHÂN HỆ / TỪNG PHẦN */}
      {/* ========================================================================= */}

      {/* 1. DRAWER BỘ LỌC DASHBOARD TỔNG QUAN */}
      <FilterDrawer
        isOpen={isDashFilterOpen}
        onClose={() => setIsDashFilterOpen(false)}
        title="Bộ lọc Dashboard Vận hành"
        subtitle="Chọn nhanh khoảng thời gian cần xem"
        activeCount={dashRangePreset === 'CURRENT_MONTH' ? 0 : 1}
        onReset={() => {
          setDashboardRange('CURRENT_MONTH');
          showToast('Đã đặt lại bộ lọc Dashboard!', 'info');
        }}
        onApply={() => {
          showToast('Đã áp dụng bộ lọc Dashboard!', 'success');
        }}
      >
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            {([
              ['CURRENT_MONTH', 'Tháng này'],
              ['PREVIOUS_MONTH', 'Tháng trước'],
              ['LAST_3_MONTHS', '3 tháng gần nhất'],
              ['ALL', 'Toàn thời gian'],
              ['CUSTOM', 'Tùy chỉnh ngày']
            ] as const).map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDashboardRange(preset)}
                aria-pressed={dashRangePreset === preset}
                className={`${preset === 'CUSTOM' ? 'col-span-2' : ''} rounded-xl border px-3 py-2.5 text-left font-semibold transition-colors ${
                  dashRangePreset === preset
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {dashRangePreset === 'CUSTOM' && (
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3">
              <label className="space-y-1 font-semibold text-slate-600">
                <span>Từ ngày</span>
                <input
                  type="date"
                  value={dashDateFrom}
                  max={dashDateTo || undefined}
                  onChange={event => setDashDateFrom(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-800"
                />
              </label>
              <label className="space-y-1 font-semibold text-slate-600">
                <span>Đến ngày</span>
                <input
                  type="date"
                  value={dashDateTo}
                  min={dashDateFrom || undefined}
                  onChange={event => setDashDateTo(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-800"
                />
              </label>
            </div>
          )}
        </div>
      </FilterDrawer>

      {/* 2. DRAWER BỘ LỌC BÁO CÁO 1 (LỚP HỌC MỚI) */}
      <FilterDrawer
        isOpen={isClsFilterOpen}
        onClose={() => setIsClsFilterOpen(false)}
        title="Bộ lọc Báo cáo Lớp học mới"
        subtitle="Lọc chi tiết theo thời gian tạo mã, môn học, khối lớp, mô hình và tình trạng trần"
        activeCount={
          (clsPeriod !== 'ALL' ? 1 : 0) +
          (clsDateFrom || clsDateTo ? 1 : 0) +
          (clsFilterGrade !== 'ALL' ? 1 : 0) +
          (clsFilterSubject !== 'ALL' ? 1 : 0) +
          (clsFilterModel !== 'ALL' ? 1 : 0) +
          (clsFilterStatus !== 'ALL' ? 1 : 0) +
          (clsFilterCode || clsFilterName ? 1 : 0)
        }
        onReset={() => {
          resetClsFilters();
          setClsMonth('2026-10');
        }}
        onApply={() => showToast('Đã áp dụng bộ lọc Lớp học!', 'success')}
      >
        <div className="space-y-4 text-xs">
          <StandardTimeFilter
            label="Mốc thời gian tạo mã lớp học:"
            month={clsMonth}
            onMonthChange={setClsMonth}
            startDate={clsDateFrom}
            onStartDateChange={setClsDateFrom}
            endDate={clsDateTo}
            onEndDateChange={setClsDateTo}
            selectedWeek={clsSelectedWeek}
            onWeekChange={w => {
              setClsSelectedWeek(w);
              setClsPeriod(w === 'ALL' ? 'ALL' : 'WEEK');
            }}
            accentColor="indigo"
          />

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Bộ môn học:</label>
            <select
              value={clsFilterSubject}
              onChange={e => setClsFilterSubject(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">Tất cả môn học</option>
              <option value="TOAN">Môn Toán</option>
              <option value="ENG">Môn Tiếng Anh</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Khối lớp:</label>
            <select
              value={clsFilterGrade}
              onChange={e => setClsFilterGrade(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">Tất cả khối lớp</option>
              <option value="Khối 1">Khối 1</option>
              <option value="Khối 2">Khối 2</option>
              <option value="Khối 3">Khối 3</option>
              <option value="Khối 4">Khối 4</option>
              <option value="Khối 5">Khối 5</option>
              <option value="Khối 7">Khối 7</option>
              <option value="Khối 8">Khối 8</option>
              <option value="Khối 9">Khối 9</option>
              <option value="IELTS / Nâng cao">IELTS / Nâng cao</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Mô hình lớp:</label>
            <select
              value={clsFilterModel}
              onChange={e => setClsFilterModel(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">Tất cả mô hình</option>
              <option value="1-1">1 Kèm 1</option>
              <option value="1-3">Nhóm 1-3</option>
              <option value="1-5">Nhóm 1-5</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Tình trạng trần sĩ số:</label>
            <select
              value={clsFilterStatus}
              onChange={e => setClsFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">Tất cả tình trạng</option>
              <option value="FULL">Đã đạt trần sĩ số (100%)</option>
              <option value="AVAILABLE">Còn trống chỗ ghép thêm</option>
            </select>
          </div>
        </div>
      </FilterDrawer>

      {/* 3. DRAWER BỘ LỌC BÁO CÁO 2 (HỌC SINH MỚI) */}
      <FilterDrawer
        isOpen={isStuFilterOpen}
        onClose={() => setIsStuFilterOpen(false)}
        title="Bộ lọc Học sinh mới tiếp nhận"
        subtitle="Lọc theo ngày tiếp nhận, khối lớp, môn học, mô hình ghép lớp"
        activeCount={
          (stuPeriod !== 'ALL' ? 1 : 0) +
          (stuDateFrom || stuDateTo ? 1 : 0) +
          (stuFilterGrade !== 'ALL' ? 1 : 0) +
          (stuFilterSubject !== 'ALL' ? 1 : 0) +
          (stuFilterModel !== 'ALL' ? 1 : 0) +
          (stuFilterStatus !== 'ALL' ? 1 : 0)
        }
        onReset={() => {
          resetStuFilters();
          setStuMonth('2026-10');
        }}
        onApply={() => showToast('Đã áp dụng bộ lọc Học sinh!', 'success')}
      >
        <div className="space-y-4 text-xs">
          <StandardTimeFilter
            label="Thời gian tiếp nhận hồ sơ học sinh:"
            month={stuMonth}
            onMonthChange={setStuMonth}
            startDate={stuDateFrom}
            onStartDateChange={setStuDateFrom}
            endDate={stuDateTo}
            onEndDateChange={setStuDateTo}
            selectedWeek={stuSelectedWeek}
            onWeekChange={w => {
              setStuSelectedWeek(w);
              setStuPeriod(w === 'ALL' ? 'ALL' : 'WEEK');
            }}
            accentColor="emerald"
          />

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Môn học:</label>
            <select
              value={stuFilterSubject}
              onChange={e => setStuFilterSubject(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              <option value="ALL">Tất cả môn</option>
              <option value="TOAN">Toán</option>
              <option value="ENG">Tiếng Anh</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Khối lớp:</label>
            <select
              value={stuFilterGrade}
              onChange={e => setStuFilterGrade(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              <option value="ALL">Tất cả khối</option>
              <option value="Khối 1">Khối 1</option>
              <option value="Khối 2">Khối 2</option>
              <option value="Khối 3">Khối 3</option>
              <option value="Khối 4">Khối 4</option>
              <option value="Khối 5">Khối 5</option>
              <option value="Khối 6">Khối 6</option>
              <option value="Khối 8">Khối 8</option>
              <option value="IELTS / Nâng cao">IELTS / Nâng cao</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Trạng thái ghép lớp:</label>
            <select
              value={stuFilterStatus}
              onChange={e => setStuFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="FULL">Đã vào lớp</option>
              <option value="AVAILABLE">Chờ ghép lớp</option>
            </select>
          </div>
        </div>
      </FilterDrawer>

      {/* 4. DRAWER BỘ LỌC BÁO CÁO 3 (GIA SƯ MỚI) */}
      <FilterDrawer
        isOpen={isTutFilterOpen}
        onClose={() => setIsTutFilterOpen(false)}
        title="Bộ lọc Gia sư mới gia nhập"
        subtitle="Lọc theo ngày tiếp nhận, môn giảng dạy, khối lớp và trạng thái nhận lớp"
        activeCount={
          (tutPeriod !== 'ALL' ? 1 : 0) +
          (tutDateFrom || tutDateTo ? 1 : 0) +
          (tutFilterSubject !== 'ALL' ? 1 : 0) +
          (tutFilterGrade !== 'ALL' ? 1 : 0) +
          (tutFilterStatus !== 'ALL' ? 1 : 0)
        }
        onReset={resetTutFilters}
        onApply={() => showToast('Đã áp dụng bộ lọc Gia sư!', 'success')}
      >
        <div className="space-y-4 text-xs">
          <StandardTimeFilter
            label="Mốc thời gian tiếp nhận Gia sư mới:"
            month={tutMonth}
            onMonthChange={setTutMonth}
            startDate={tutDateFrom}
            onStartDateChange={setTutDateFrom}
            endDate={tutDateTo}
            onEndDateChange={setTutDateTo}
            selectedWeek={tutSelectedWeek}
            onWeekChange={w => {
              setTutSelectedWeek(w);
              setTutPeriod(w === 'ALL' ? 'ALL' : 'WEEK');
            }}
            accentColor="purple"
          />

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Bộ môn giảng dạy:</label>
            <select
              value={tutFilterSubject}
              onChange={e => setTutFilterSubject(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600"
            >
              <option value="ALL">Tất cả môn</option>
              <option value="TOAN">Môn Toán</option>
              <option value="ENG">Tiếng Anh & IELTS</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Khối lớp phụ trách:</label>
            <select
              value={tutFilterGrade}
              onChange={e => setTutFilterGrade(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600"
            >
              <option value="ALL">Tất cả khối lớp</option>
              <option value="1 - 5">Khối Tiểu học (1 - 5)</option>
              <option value="6 - 9">Khối THCS (6 - 9)</option>
              <option value="10 - 12">Khối THPT (10 - 12)</option>
              <option value="IELTS">IELTS</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Trạng thái nhận lớp:</label>
            <select
              value={tutFilterStatus}
              onChange={e => setTutFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="READY">Sẵn sàng nhận lớp</option>
              <option value="ACTIVE">Đang đứng lớp</option>
            </select>
          </div>
        </div>
      </FilterDrawer>

      {/* 5. DRAWER BỘ LỌC BÁO CÁO 4 (SỰ CỐ) */}
      <FilterDrawer
        isOpen={isIncFilterOpen}
        onClose={() => setIsIncFilterOpen(false)}
        title="Bộ lọc Báo cáo Sự cố Vận hành"
        subtitle="Lọc theo tháng, ngày bắt đầu - kết thúc, tuần đối soát và mức độ khẩn cấp"
        activeCount={(incPeriod !== 'ALL' ? 1 : 0) + (incDateFrom || incDateTo ? 1 : 0) + (incFilterUrgent !== 'ALL' ? 1 : 0)}
        onReset={() => {
          resetIncFilters();
          setIncMonth('2026-10');
          setIncDateFrom('');
          setIncDateTo('');
        }}
        onApply={() => showToast('Đã áp dụng bộ lọc Sự cố!', 'success')}
      >
        <div className="space-y-4 text-xs">
          <StandardTimeFilter
            label="Chu kỳ đối soát & Mốc thời gian sự cố:"
            month={incMonth}
            onMonthChange={setIncMonth}
            startDate={incDateFrom}
            onStartDateChange={setIncDateFrom}
            endDate={incDateTo}
            onEndDateChange={setIncDateTo}
            selectedWeek={incPeriod}
            onWeekChange={w => setIncPeriod(w as typeof incPeriod)}
            accentColor="rose"
          />

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Mức độ khẩn cấp:</label>
            <select
              value={incFilterUrgent}
              onChange={e => setIncFilterUrgent(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-rose-600"
            >
              <option value="ALL">Tất cả mức độ</option>
              <option value="URGENT">Đột xuất gấp (&lt; 2h)</option>
              <option value="NOTICE">Báo trước tiêu chuẩn (&gt; 2h)</option>
            </select>
          </div>
        </div>
      </FilterDrawer>

      {/* 6. DRAWER BỘ LỌC BÁO CÁO 5 (MA TRẬN CA DẠY) */}
      <FilterDrawer
        isOpen={isMatFilterOpen}
        onClose={() => setIsMatFilterOpen(false)}
        title="Bộ lọc Ma trận Ca dạy"
        subtitle="Dữ liệu ma trận là snapshot tổng hợp, hiện chỉ lọc được theo bộ môn"
        activeCount={matFilterSubject !== 'ALL' ? 1 : 0}
        onReset={resetMatFilters}
        onApply={() => showToast('Đã áp dụng bộ lọc Ma trận!', 'success')}
      >
        <div className="space-y-4 text-xs">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
            Dữ liệu mẫu hiện không có ngày chi tiết nên không thể lọc theo thời gian.
          </p>
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Phân loại bộ môn:</label>
            <select
              value={matFilterSubject}
              onChange={e => setMatFilterSubject(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">Tất cả môn</option>
              <option value="TOAN">Môn Toán (57%)</option>
              <option value="ENG">Tiếng Anh & IELTS (43%)</option>
            </select>
          </div>
        </div>
      </FilterDrawer>

      {/* 7. DRAWER BỘ LỌC BÁO CÁO 6 (DỰ GIỜ & XẾP HẠNG GV) */}
      <FilterDrawer
        isOpen={isInspFilterOpen}
        onClose={() => setIsInspFilterOpen(false)}
        title="Bộ lọc Đánh giá Dự giờ & Xếp hạng GV"
        subtitle="Lọc theo phân hạng sư phạm và bộ môn; số liệu hiện là snapshot tổng hợp"
        activeCount={
          (inspFilterSubject !== 'ALL' ? 1 : 0) +
          (inspFilterRank !== 'ALL' ? 1 : 0) +
          (inspFilterScore !== 'ALL' ? 1 : 0) +
          (inspFilterCode || inspFilterName ? 1 : 0)
        }
        onReset={resetInspFilters}
        onApply={() => showToast('Đã áp dụng bộ lọc Dự giờ!', 'success')}
      >
        <div className="space-y-4 text-xs">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
            Dữ liệu mẫu hiện không có ngày chi tiết nên không thể lọc theo thời gian.
          </p>
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Phân hạng chất lượng:</label>
            <select
              value={inspFilterRank}
              onChange={e => setInspFilterRank(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600"
            >
              <option value="ALL">Tất cả xếp hạng</option>
              <option value="A">Hạng A: Xuất sắc (&ge; 9.0)</option>
              <option value="B">Hạng B: Tốt (8.0 - 8.9)</option>
              <option value="C">Hạng C: Khá (7.0 - 7.9)</option>
              <option value="D">Hạng D: Chưa đạt (&lt; 7.0)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Bộ môn giảng dạy:</label>
            <select
              value={inspFilterSubject}
              onChange={e => setInspFilterSubject(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-purple-600"
            >
              <option value="ALL">Tất cả môn</option>
              <option value="TOAN">Môn Toán</option>
              <option value="ENG">Môn Tiếng Anh</option>
            </select>
          </div>
        </div>
      </FilterDrawer>




    </div>
  );
};
