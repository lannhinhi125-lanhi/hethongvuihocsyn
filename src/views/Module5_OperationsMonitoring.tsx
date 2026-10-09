import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { FilterDrawer } from '../components/FilterDrawer';
import { StandardTimeFilter } from '../components/StandardTimeFilter';
import {
  Calendar,
  Filter,
  ChevronDown,
  Check,
  X,
  Clock,
  User,
  ShieldAlert,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

// Types cho Phân hệ 5
export interface MonitoringSessionStudent {
  name: string;
  code: string;
  gradeText: string;
  attendance: string;
  aiComment: string;
  criteria: string[];
}

export interface MonitoringSession {
  sessionCode: string;
  sessionDate: string; // 'YYYY-MM-DD'
  classCode: string;
  className: string;
  levelText: string;
  modelText: string;
  subject: 'TOAN' | 'ANH';
  grade: number;
  timeSlot: string;
  room: string;
  roomUrl: string;
  recordingUrl: string | null;
  primaryTeacher: string;
  coverTeacher: string | null;
  attendance: 'ATTENDED' | 'LATE' | 'ABSENT';
  checkinTime: string | null;
  status: 'DA_HOC' | 'CHUA_HOC' | 'NGHI_HOC' | 'KHAI_GIANG' | 'DAY_THAY' | 'CO_SU_CO';
  hasIncident: boolean;
  incidentParent: 'GRP-TCH' | 'GRP-STU' | 'GRP-SYS' | null;
  incidentChild: string | null;
  incidentUrgency: 'EMERGENCY' | 'ADVANCED' | null;
  incidentStatus: 'DA_GIAI_QUYET' | 'DANG_XU_LY' | 'HUY_CA' | null;
  incidentNote: string;
  handledByOpsId: string | null;
  handledByName: string | null;
  handledAt: string | null;
  lessonDiary: string;
  students: MonitoringSessionStudent[];
  isJustUpdated?: boolean;
}

// Danh mục tài khoản Vận hành trực ca (Tự động gán người xử lý)
const OPS_ACCOUNTS: Record<string, { id: string; name: string; role: string; avatar: string }> = {
  'OPS-002': { id: 'OPS-002', name: 'Trần Thị Mai Lan', role: 'Trực ca 1', avatar: 'TL' },
  'OPS-001': { id: 'OPS-001', name: 'Nguyễn Văn Đức', role: 'Trưởng ca Vận hành', avatar: 'VD' },
  'OPS-005': { id: 'OPS-005', name: 'Lê Hoàng Quân', role: 'Trực ca 2', avatar: 'HQ' }
};

// Danh mục Cây sự cố 2 cấp đồng bộ từ Master Data
const INCIDENT_MASTER_DATA: Record<string, { code: string; name: string }[]> = {
  'GRP-TCH': [
    { code: 'INC-TCH-01', name: 'GV xin nghỉ có báo trước' },
    { code: 'INC-TCH-02', name: 'GV xin nghỉ đột xuất sát giờ' },
    { code: 'INC-TCH-03', name: 'GV vào lớp muộn 5-15 phút' },
    { code: 'INC-TCH-04', name: 'GV gặp sự cố thiết bị mic camera mạng' }
  ],
  'GRP-STU': [
    { code: 'INC-STU-01', name: 'Học sinh xin nghỉ phép dời lịch học' },
    { code: 'INC-STU-02', name: 'Học sinh vắng mặt không phép' },
    { code: 'INC-STU-03', name: 'Học sinh gặp lỗi thiết bị mạng gián đoạn' }
  ],
  'GRP-SYS': [
    { code: 'INC-SYS-01', name: 'Phòng học trực tuyến bị lỗi không mở được' },
    { code: 'INC-SYS-02', name: 'Hệ thống LMS Vuihoc gián đoạn' }
  ]
};

// Dữ liệu giáo viên tiềm năng dạy thay
const TEACHERS_COVER_DATABASE = [
  { id: 'GV001', name: 'Nguyễn Văn An', subject: 'TOAN', status: 'Trống lịch 19:45' },
  { id: 'GV002', name: 'Phạm Thái Hà', subject: 'TOAN', status: 'Trống lịch 18:00' },
  { id: 'GV003', name: 'Đặng Quốc Huy', subject: 'TOAN', status: 'Trống lịch ca tối' },
  { id: 'GV004', name: 'Ngô Minh Tuyết', subject: 'TOAN', status: 'Trống lịch ca tối' },
  { id: 'GV005', name: 'Bùi Thu Ngân', subject: 'ANH', status: 'Trống lịch ca tối' },
  { id: 'GV006', name: 'Trần Kim Oanh', subject: 'ANH', status: 'Trống lịch ca tối' },
  { id: 'GV007', name: 'Lê Thu Trang', subject: 'ANH', status: 'Trống lịch ca tối' }
];

// Khởi tạo danh sách buổi học toàn hệ thống
const initialSessionsList: MonitoringSession[] = [
  // Ca học Thử Nghiệm 12:50 - 13:50 theo yêu cầu:
  {
    sessionCode: 'BD-1250',
    sessionDate: '2026-10-06',
    classCode: 'TOAN_K04_VIP_1250',
    className: 'Toán Nâng Cao Lớp 4 (Ca Trưa 12:50)',
    levelText: 'Nâng cao',
    modelText: 'Kèm 1-1',
    subject: 'TOAN',
    grade: 4,
    timeSlot: '12:50 - 13:50',
    room: 'Zoom-VIP-1250',
    roomUrl: 'https://vuihoc.zoom.us/j/8899125000',
    recordingUrl: null,
    primaryTeacher: 'Thầy Trần Anh Tuấn',
    coverTeacher: null,
    attendance: 'ABSENT',
    checkinTime: null,
    status: 'CHUA_HOC',
    hasIncident: false,
    incidentParent: null,
    incidentChild: null,
    incidentUrgency: null,
    incidentStatus: null,
    incidentNote: '',
    handledByOpsId: null,
    handledByName: null,
    handledAt: null,
    lessonDiary: '',
    students: [
      {
        name: 'Trần Gia Bảo',
        code: 'HS-2026-089',
        gradeText: 'Khối 4 - Trình độ Nâng cao',
        attendance: 'Chờ GV vào lớp',
        aiComment: 'Ca thử nghiệm: 12:50 đến giờ ca dạy nếu giáo viên chưa vào lớp sẽ lập tức hiển thị màu đỏ báo động.',
        criteria: []
      }
    ]
  },
  // Ca học Hôm nay: 2026-10-06
  {
    sessionCode: 'BD001',
    sessionDate: '2026-10-06',
    classCode: 'TOAN_K03_NT2_13_01',
    className: 'Toán Nền Tảng 2 - Lớp 3',
    levelText: 'Nền tảng 2',
    modelText: 'Nhóm 1-3',
    subject: 'TOAN',
    grade: 3,
    timeSlot: '18:00 - 19:30',
    room: 'Zoom-Room-01',
    roomUrl: 'https://zoom.us/j/vuihoc_tutor_01',
    recordingUrl: 'https://vuihoc.vn/recordings/rec_BD001_20261006.mp4',
    primaryTeacher: 'Nguyễn Văn An',
    coverTeacher: 'Ngô Minh Tuyết',
    attendance: 'ATTENDED',
    checkinTime: '17:54:10',
    status: 'DAY_THAY',
    hasIncident: true,
    incidentParent: 'GRP-TCH',
    incidentChild: 'INC-TCH-02',
    incidentUrgency: 'EMERGENCY',
    incidentStatus: 'DA_GIAI_QUYET',
    incidentNote: 'GV chính sốt cao sát giờ; Vận hành đã gán GV Ngô Minh Tuyết dạy thay kịp thời.',
    handledByOpsId: 'OPS-002',
    handledByName: 'Trần Thị Mai Lan',
    handledAt: '17:40:15',
    lessonDiary: 'Học sinh hiểu bài tốt, làm đúng 9/10 bài tập về phân số. Tinh thần học tập sôi nổi tích cực.',
    students: [
      {
        name: 'Trần Gia Bảo',
        code: 'HS-2026-089',
        gradeText: 'Khối 3 - Trình độ Nền tảng 2',
        attendance: 'Có mặt',
        aiComment: 'Gia Bảo hiểu bài tốt, làm đúng 9/10 bài tập về phân số. Con rất hăng hái phát biểu và tương tác sôi nổi với giáo viên trong suốt ca học.',
        criteria: ['Tập trung tốt', 'Hiểu bài nhanh', 'Chăm chỉ phát biểu']
      },
      {
        name: 'Lê Minh Khôi',
        code: 'HS-2026-092',
        gradeText: 'Khối 3 - Trình độ Nền tảng 2',
        attendance: 'Có mặt',
        aiComment: 'Minh Khôi làm tính cẩn thận, nắm chắc các bước quy đồng mẫu số. Cần chú ý thêm khâu rút gọn phân số tối giản ở bài tập cuối.',
        criteria: ['Tính cẩn thận', 'Nắm chắc lý thuyết']
      }
    ]
  },
  {
    sessionCode: 'BD002',
    sessionDate: '2026-10-06',
    classCode: 'TOAN_K03_NT2_13_02',
    className: 'Toán Nền Tảng 2 - Lớp 3',
    levelText: 'Nền tảng 2',
    modelText: 'Nhóm 1-3',
    subject: 'TOAN',
    grade: 3,
    timeSlot: '18:00 - 19:30',
    room: 'ClassIn-Room-02',
    roomUrl: 'https://classin.com/vuihoc_room_02',
    recordingUrl: 'https://vuihoc.vn/recordings/rec_BD002_20261006.mp4',
    primaryTeacher: 'Phạm Thái Hà',
    coverTeacher: null,
    attendance: 'LATE',
    checkinTime: '18:07:45',
    status: 'DA_HOC',
    hasIncident: true,
    incidentParent: 'GRP-TCH',
    incidentChild: 'INC-TCH-03',
    incidentUrgency: 'ADVANCED',
    incidentStatus: 'DA_GIAI_QUYET',
    incidentNote: 'GV báo kẹt xe từ 16h30, cam kết dạy bù 15 phút cuối ca.',
    handledByOpsId: 'OPS-001',
    handledByName: 'Nguyễn Văn Đức',
    handledAt: '16:45:00',
    lessonDiary: 'Đã hoàn thành luyện tập phép chia có dư. Lớp học nghiêm túc.',
    students: [
      {
        name: 'Nguyễn Tuấn Kiệt',
        code: 'HS-2026-104',
        gradeText: 'Khối 3 - Trình độ Nền tảng 2',
        attendance: 'Có mặt',
        aiComment: 'Tuấn Kiệt hoàn thành tốt các bài phép chia có dư. Con chú ý lắng nghe cô giảng bài bù cuối giờ và sửa bài rất nghiêm túc.',
        criteria: ['Nghiêm túc', 'Tiếp thu tốt']
      }
    ]
  },
  {
    sessionCode: 'BD003',
    sessionDate: '2026-10-06',
    classCode: 'ENG_K04_NC_11_01',
    className: 'Tiếng Anh Nâng Cao - Lớp 4',
    levelText: 'Nâng cao',
    modelText: 'Kèm 1-1',
    subject: 'ANH',
    grade: 4,
    timeSlot: '18:00 - 19:30',
    room: 'Zoom-Room-05',
    roomUrl: 'https://zoom.us/j/vuihoc_tutor_05',
    recordingUrl: 'https://vuihoc.vn/recordings/rec_BD003_20261006.mp4',
    primaryTeacher: 'Bùi Thu Ngân',
    coverTeacher: null,
    attendance: 'ATTENDED',
    checkinTime: '17:50:20',
    status: 'DA_HOC',
    hasIncident: false,
    incidentParent: null,
    incidentChild: null,
    incidentUrgency: null,
    incidentStatus: null,
    incidentNote: '',
    handledByOpsId: null,
    handledByName: null,
    handledAt: null,
    lessonDiary: 'Học sinh phát âm chuẩn các âm đuôi /s/ và /z/. Hoàn thành bài thuyết trình về Animals.',
    students: [
      {
        name: 'Vũ Hoàng Yến',
        code: 'HS-2026-045',
        gradeText: 'Khối 4 - Trình độ Nâng cao',
        attendance: 'Có mặt',
        aiComment: 'Hoàng Yến phát âm chuẩn các âm đuôi /s/ và /z/, ngữ điệu tự nhiên. Bài thuyết trình về chủ đề Animals của con rất sinh động và lưu loát.',
        criteria: ['Phát âm chuẩn', 'Ngữ điệu tự nhiên', 'Thuyết trình tự tin']
      }
    ]
  },
  {
    sessionCode: 'BD004',
    sessionDate: '2026-10-06',
    classCode: 'ENG_K05_TC_15_01',
    className: 'Tiếng Anh Tiêu Chuẩn - Lớp 5',
    levelText: 'Tiêu chuẩn',
    modelText: 'Nhóm 1-5',
    subject: 'ANH',
    grade: 5,
    timeSlot: '19:45 - 21:15',
    room: 'ClassIn-Room-08',
    roomUrl: 'https://classin.com/vuihoc_room_08',
    recordingUrl: null,
    primaryTeacher: 'Bùi Thu Ngân',
    coverTeacher: null,
    attendance: 'ABSENT',
    checkinTime: null,
    status: 'NGHI_HOC',
    hasIncident: true,
    incidentParent: 'GRP-STU',
    incidentChild: 'INC-STU-01',
    incidentUrgency: 'ADVANCED',
    incidentStatus: 'DA_GIAI_QUYET',
    incidentNote: 'Phụ huynh báo học sinh đi thi học sinh giỏi cấp trường, xin dời ca học sang cuối tuần.',
    handledByOpsId: 'OPS-002',
    handledByName: 'Trần Thị Mai Lan',
    handledAt: '17:00:00',
    lessonDiary: 'Học sinh nghỉ học có phép đi thi HSG. Đã bảo lưu buổi học.',
    students: [
      {
        name: 'Đặng Ngọc Mai',
        code: 'HS-2026-068',
        gradeText: 'Khối 5 - Trình độ Tiêu chuẩn',
        attendance: 'Xin nghỉ phép',
        aiComment: 'Học sinh có đơn xin nghỉ phép tham gia kỳ thi học sinh giỏi. Đã thông báo tới phụ huynh về lịch bù.',
        criteria: ['Nghỉ có phép']
      }
    ]
  },
  {
    sessionCode: 'BD005',
    sessionDate: '2026-10-06',
    classCode: 'TOAN_K02_TC_11_01',
    className: 'Toán Tiêu Chuẩn - Lớp 2',
    levelText: 'Tiêu chuẩn',
    modelText: 'Kèm 1-1',
    subject: 'TOAN',
    grade: 2,
    timeSlot: '19:45 - 21:15',
    room: 'Zoom-Room-03',
    roomUrl: 'https://zoom.us/j/vuihoc_tutor_03',
    recordingUrl: null,
    primaryTeacher: 'Phạm Thái Hà',
    coverTeacher: null,
    attendance: 'ATTENDED',
    checkinTime: '19:40:00',
    status: 'KHAI_GIANG',
    hasIncident: false,
    incidentParent: null,
    incidentChild: null,
    incidentUrgency: null,
    incidentStatus: null,
    incidentNote: '',
    handledByOpsId: null,
    handledByName: null,
    handledAt: null,
    lessonDiary: 'Buổi khai giảng đầu tiên của khóa học. Học sinh hào hứng làm quen với giáo viên.',
    students: [
      {
        name: 'Phạm Bảo Nam',
        code: 'HS-2026-118',
        gradeText: 'Khối 2 - Trình độ Tiêu chuẩn',
        attendance: 'Có mặt',
        aiComment: 'Bảo Nam tự tin trong buổi khai giảng đầu tiên. Con tiếp thu nhanh và hào hứng làm quen môn học.',
        criteria: ['Hào hứng', 'Tự tin']
      }
    ]
  },
  {
    sessionCode: 'BD006',
    sessionDate: '2026-10-06',
    classCode: 'TOAN_K05_NC_11_01',
    className: 'Toán Nâng Cao - Lớp 5',
    levelText: 'Nâng cao',
    modelText: 'Kèm 1-1',
    subject: 'TOAN',
    grade: 5,
    timeSlot: '19:45 - 21:15',
    room: 'ClassIn-Room-09',
    roomUrl: 'https://classin.com/vuihoc_room_09',
    recordingUrl: null,
    primaryTeacher: 'Nguyễn Văn An',
    coverTeacher: 'Đặng Quốc Huy',
    attendance: 'ATTENDED',
    checkinTime: '19:35:10',
    status: 'DAY_THAY',
    hasIncident: true,
    incidentParent: 'GRP-TCH',
    incidentChild: 'INC-TCH-01',
    incidentUrgency: 'ADVANCED',
    incidentStatus: 'DA_GIAI_QUYET',
    incidentNote: 'GV chính bận lịch thi tại trường, đã bàn giao giáo án trước 3 tiếng cho thầy Đặng Quốc Huy.',
    handledByOpsId: 'OPS-002',
    handledByName: 'Trần Thị Mai Lan',
    handledAt: '15:10:00',
    lessonDiary: 'Học sinh tiếp thu nhanh các bài toán chuyển động đều nâng cao.',
    students: [
      {
        name: 'Bùi Đức Anh',
        code: 'HS-2026-033',
        gradeText: 'Khối 5 - Trình độ Nâng cao',
        attendance: 'Có mặt',
        aiComment: 'Đức Anh tiếp thu nhanh phương pháp giải bài toán chuyển động đều hai vật ngược chiều. Kỹ năng tư duy logic và biến đổi công thức rất tốt.',
        criteria: ['Tư duy logic tốt', 'Tiếp thu nhanh', 'Tập trung cao']
      }
    ]
  },
  {
    sessionCode: 'BD007',
    sessionDate: '2026-10-06',
    classCode: 'ENG_K03_TC_13_01',
    className: 'Tiếng Anh Tiêu Chuẩn - Lớp 3',
    levelText: 'Tiêu chuẩn',
    modelText: 'Nhóm 1-3',
    subject: 'ANH',
    grade: 3,
    timeSlot: '19:45 - 21:15',
    room: 'Zoom-Room-07',
    roomUrl: 'https://zoom.us/j/vuihoc_tutor_07',
    recordingUrl: null,
    primaryTeacher: 'Trần Kim Oanh',
    coverTeacher: null,
    attendance: 'ABSENT',
    checkinTime: null,
    status: 'CO_SU_CO',
    hasIncident: true,
    incidentParent: 'GRP-TCH',
    incidentChild: 'INC-TCH-04',
    incidentUrgency: 'EMERGENCY',
    incidentStatus: 'DANG_XU_LY',
    incidentNote: 'Giáo viên báo hỏng microphone sát giờ, đang kiểm tra thay thế thiết bị.',
    handledByOpsId: 'OPS-002',
    handledByName: 'Trần Thị Mai Lan',
    handledAt: '19:40:00',
    lessonDiary: '',
    students: [
      {
        name: 'Lê Quỳnh Anh',
        code: 'HS-2026-140',
        gradeText: 'Khối 3 - Trình độ Tiêu chuẩn',
        attendance: 'Chưa vào',
        aiComment: 'Ca học đang xử lý sự cố thiết bị.',
        criteria: []
      }
    ]
  },

  // Ca học Hôm qua: 2026-10-05
  {
    sessionCode: 'BD008',
    sessionDate: '2026-10-05',
    classCode: 'TOAN_K03_NT2_13_01',
    className: 'Toán Nền Tảng 2 - Lớp 3',
    levelText: 'Nền tảng 2',
    modelText: 'Nhóm 1-3',
    subject: 'TOAN',
    grade: 3,
    timeSlot: '18:00 - 19:30',
    room: 'Zoom-Room-01',
    roomUrl: 'https://zoom.us/j/vuihoc_tutor_01',
    recordingUrl: 'https://vuihoc.vn/recordings/rec_BD008_20261005.mp4',
    primaryTeacher: 'Nguyễn Văn An',
    coverTeacher: null,
    attendance: 'ATTENDED',
    checkinTime: '17:53:00',
    status: 'DA_HOC',
    hasIncident: false,
    incidentParent: null,
    incidentChild: null,
    incidentUrgency: null,
    incidentStatus: null,
    incidentNote: '',
    handledByOpsId: null,
    handledByName: null,
    handledAt: null,
    lessonDiary: 'Học sinh ôn tập phép trừ phân số. Hoàn thành toàn bộ phiếu bài tập.',
    students: [
      {
        name: 'Trần Gia Bảo',
        code: 'HS-2026-089',
        gradeText: 'Khối 3 - Trình độ Nền tảng 2',
        attendance: 'Có mặt',
        aiComment: 'Gia Bảo nắm chắc kiến thức trừ phân số, làm bài nghiêm túc.',
        criteria: ['Chăm chỉ', 'Tiếp thu tốt']
      }
    ]
  },
  {
    sessionCode: 'BD009',
    sessionDate: '2026-10-05',
    classCode: 'ENG_K04_NC_11_01',
    className: 'Tiếng Anh Nâng Cao - Lớp 4',
    levelText: 'Nâng cao',
    modelText: 'Kèm 1-1',
    subject: 'ANH',
    grade: 4,
    timeSlot: '18:00 - 19:30',
    room: 'Zoom-Room-05',
    roomUrl: 'https://zoom.us/j/vuihoc_tutor_05',
    recordingUrl: 'https://vuihoc.vn/recordings/rec_BD009_20261005.mp4',
    primaryTeacher: 'Bùi Thu Ngân',
    coverTeacher: null,
    attendance: 'ATTENDED',
    checkinTime: '17:51:10',
    status: 'DA_HOC',
    hasIncident: false,
    incidentParent: null,
    incidentChild: null,
    incidentUrgency: null,
    incidentStatus: null,
    incidentNote: '',
    handledByOpsId: null,
    handledByName: null,
    handledAt: null,
    lessonDiary: 'Luyện tập phát âm từ vựng Unit 3. Học sinh tự tin.',
    students: [
      {
        name: 'Vũ Hoàng Yến',
        code: 'HS-2026-045',
        gradeText: 'Khối 4 - Trình độ Nâng cao',
        attendance: 'Có mặt',
        aiComment: 'Hoàng Yến phát âm rõ ràng, tiến bộ rõ rệt trong kỹ năng nghe.',
        criteria: ['Phát âm tốt', 'Tập trung']
      }
    ]
  },
  {
    sessionCode: 'BD010',
    sessionDate: '2026-10-05',
    classCode: 'TOAN_K05_NC_11_01',
    className: 'Toán Nâng Cao - Lớp 5',
    levelText: 'Nâng cao',
    modelText: 'Kèm 1-1',
    subject: 'TOAN',
    grade: 5,
    timeSlot: '19:45 - 21:15',
    room: 'ClassIn-Room-09',
    roomUrl: 'https://classin.com/vuihoc_room_09',
    recordingUrl: 'https://vuihoc.vn/recordings/rec_BD010_20261005.mp4',
    primaryTeacher: 'Nguyễn Văn An',
    coverTeacher: 'Phạm Thái Hà',
    attendance: 'ATTENDED',
    checkinTime: '19:38:00',
    status: 'DAY_THAY',
    hasIncident: true,
    incidentParent: 'GRP-TCH',
    incidentChild: 'INC-TCH-02',
    incidentUrgency: 'EMERGENCY',
    incidentStatus: 'DA_GIAI_QUYET',
    incidentNote: 'GV An kẹt xe, đã gán GV Phạm Thái Hà dạy thay kịp giờ.',
    handledByOpsId: 'OPS-002',
    handledByName: 'Trần Thị Mai Lan',
    handledAt: '19:15:00',
    lessonDiary: 'Cô Hà dạy thay tốt, học sinh hiểu trọn vẹn bài chuyển động đều.',
    students: [
      {
        name: 'Bùi Đức Anh',
        code: 'HS-2026-033',
        gradeText: 'Khối 5 - Trình độ Nâng cao',
        attendance: 'Có mặt',
        aiComment: 'Đức Anh thích nghi tốt với cô giáo dạy thay, tiếp thu bài nhanh.',
        criteria: ['Tiếp thu nhanh', 'Hợp tác tốt']
      }
    ]
  },
  {
    sessionCode: 'BD011',
    sessionDate: '2026-10-05',
    classCode: 'ENG_K05_TC_15_01',
    className: 'Tiếng Anh Tiêu Chuẩn - Lớp 5',
    levelText: 'Tiêu chuẩn',
    modelText: 'Nhóm 1-5',
    subject: 'ANH',
    grade: 5,
    timeSlot: '19:45 - 21:15',
    room: 'ClassIn-Room-08',
    roomUrl: 'https://classin.com/vuihoc_room_08',
    recordingUrl: null,
    primaryTeacher: 'Bùi Thu Ngân',
    coverTeacher: null,
    attendance: 'ABSENT',
    checkinTime: null,
    status: 'NGHI_HOC',
    hasIncident: true,
    incidentParent: 'GRP-STU',
    incidentChild: 'INC-STU-01',
    incidentUrgency: 'ADVANCED',
    incidentStatus: 'DA_GIAI_QUYET',
    incidentNote: 'Học sinh xin nghỉ phép đi khám bệnh, đã thông báo dời ca.',
    handledByOpsId: 'OPS-001',
    handledByName: 'Nguyễn Văn Đức',
    handledAt: '15:00:00',
    lessonDiary: 'Ca học nghỉ có phép.',
    students: [
      {
        name: 'Đặng Ngọc Mai',
        code: 'HS-2026-068',
        gradeText: 'Khối 5 - Trình độ Tiêu chuẩn',
        attendance: 'Xin nghỉ phép',
        aiComment: 'Học sinh nghỉ học có phép.',
        criteria: ['Nghỉ có phép']
      }
    ]
  },

  // Ca học Ngày mai: 2026-10-07
  {
    sessionCode: 'BD012',
    sessionDate: '2026-10-07',
    classCode: 'TOAN_K03_NT2_13_01',
    className: 'Toán Nền Tảng 2 - Lớp 3',
    levelText: 'Nền tảng 2',
    modelText: 'Nhóm 1-3',
    subject: 'TOAN',
    grade: 3,
    timeSlot: '18:00 - 19:30',
    room: 'Zoom-Room-01',
    roomUrl: 'https://zoom.us/j/vuihoc_tutor_01',
    recordingUrl: null,
    primaryTeacher: 'Nguyễn Văn An',
    coverTeacher: null,
    attendance: 'ABSENT',
    checkinTime: null,
    status: 'CHUA_HOC',
    hasIncident: false,
    incidentParent: null,
    incidentChild: null,
    incidentUrgency: null,
    incidentStatus: null,
    incidentNote: '',
    handledByOpsId: null,
    handledByName: null,
    handledAt: null,
    lessonDiary: '',
    students: []
  }
];

export const Module5_OperationsMonitoring: React.FC = () => {
  const { showToast } = useApp();

  // Phiên trực ban Vận hành đang đăng nhập
  const [currentLoggedInOps, setCurrentLoggedInOps] = useState<string>('OPS-002');
  const currentOps = OPS_ACCOUNTS[currentLoggedInOps] || OPS_ACCOUNTS['OPS-002'];
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);

  // Đồng hồ hệ thống trực ban
  const [systemClock, setSystemClock] = useState<string>('19:30:00 • Thứ Ba, 06/10/2026');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
      setSystemClock(`${timeStr} • Thứ Ba, 06/10/2026`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Chế độ thời gian vận hành (Tháng?, Ngày bắt đầu, Ngày kết thúc, Tuần sau)
  const [dateMode, setDateMode] = useState<'TODAY' | 'DAY' | 'WEEK' | 'MONTH'>('TODAY');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-06');
  const [dateFrom, setDateFrom] = useState<string>('2026-10-06');
  const [dateTo, setDateTo] = useState<string>('2026-10-06');
  const [selectedWeek, setSelectedWeek] = useState<string>('W1');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');

  // Tab chính
  const [activeTab, setActiveTab] = useState<'diary' | 'incidents'>('diary');

  // Danh sách ca dạy toàn hệ thống
  const [sessions, setSessions] = useState<MonitoringSession[]>(initialSessionsList);

  // Bộ lọc cột cho Tab 1 (Nhật ký & Giám sát buổi học)
  const [colFilterCode, setColFilterCode] = useState('');
  const [colFilterClass, setColFilterClass] = useState('');
  const [colFilterTeacher, setColFilterTeacher] = useState('');
  const [colFilterTime, setColFilterTime] = useState('ALL');
  const [colFilterAttendance, setColFilterAttendance] = useState('ALL');
  const [colFilterStatus, setColFilterStatus] = useState('ALL');

  // Bộ lọc cột cho Tab 2 (Thông tin Sự cố & Điều phối Dạy thay)
  const [incColFilterCode, setIncColFilterCode] = useState('');
  const [incColFilterClass, setIncColFilterClass] = useState('');
  const [incColFilterTarget, setIncColFilterTarget] = useState('ALL');
  const [incColFilterType, setIncColFilterType] = useState('');
  const [incColFilterUrgency, setIncColFilterUrgency] = useState('ALL');
  const [incColFilterCover, setIncColFilterCover] = useState('');
  const [incColFilterStatus, setIncColFilterStatus] = useState('ALL');
  const [incColFilterOps, setIncColFilterOps] = useState('');

  // Modals state
  const [selectedClassViewSession, setSelectedClassViewSession] = useState<MonitoringSession | null>(null);
  const [selectedIncidentSession, setSelectedIncidentSession] = useState<MonitoringSession | null>(null);
  const [coverScheduleTeacherName, setCoverScheduleTeacherName] = useState<string | null>(null);
  const [isCheckinSimOpen, setIsCheckinSimOpen] = useState(false);
  const [simSessionCode, setSimSessionCode] = useState('BD001');

  // Incident Modal internal form state
  const [incParent, setIncParent] = useState<'GRP-TCH' | 'GRP-STU' | 'GRP-SYS'>('GRP-TCH');
  const [incChild, setIncChild] = useState<string>('INC-TCH-02');
  const [incUrgency, setIncUrgency] = useState<'EMERGENCY' | 'ADVANCED'>('EMERGENCY');
  const [incStatus, setIncStatus] = useState<'DA_GIAI_QUYET' | 'DANG_XU_LY' | 'HUY_CA'>('DANG_XU_LY');
  const [incNote, setIncNote] = useState<string>('');
  const [incHasCover, setIncHasCover] = useState<boolean>(false);
  const [incCoverTeacher, setIncCoverTeacher] = useState<string>('');

  // Điều hướng chuyển ngày nhanh
  const navigateDate = (delta: number) => {
    const parts = selectedDate.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    d.setDate(d.getDate() + delta);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const nextDate = `${y}-${m}-${day}`;
    setSelectedDate(nextDate);
    if (nextDate === '2026-10-06') {
      setDateMode('TODAY');
    } else {
      setDateMode('DAY');
    }
  };

  // Lọc theo phạm vi ngày / tuần / tháng
  const dateFilteredSessions = sessions.filter(s => {
    if (!s.sessionDate) return true;
    if (dateFrom && dateTo) {
      return s.sessionDate >= dateFrom && s.sessionDate <= dateTo;
    }
    if (dateFrom) return s.sessionDate >= dateFrom;
    if (dateTo) return s.sessionDate <= dateTo;
    if (selectedMonth && selectedMonth !== 'ALL') {
      return s.sessionDate.startsWith(selectedMonth);
    }
    return true;
  });

  // Lọc Tab 1
  const diaryFilteredSessions = dateFilteredSessions.filter(s => {
    if (colFilterCode && !s.sessionCode.toLowerCase().includes(colFilterCode.toLowerCase())) return false;
    if (colFilterClass && !(s.className.toLowerCase().includes(colFilterClass.toLowerCase()) || s.classCode.toLowerCase().includes(colFilterClass.toLowerCase()))) return false;
    if (colFilterTeacher) {
      const q = colFilterTeacher.toLowerCase();
      const matchPrimary = s.primaryTeacher && s.primaryTeacher.toLowerCase().includes(q);
      const matchCover = s.coverTeacher && s.coverTeacher.toLowerCase().includes(q);
      if (!matchPrimary && !matchCover) return false;
    }
    if (colFilterTime !== 'ALL' && s.timeSlot !== colFilterTime) return false;
    if (colFilterAttendance !== 'ALL' && s.attendance !== colFilterAttendance) return false;
    if (colFilterStatus !== 'ALL' && s.status !== colFilterStatus) return false;
    return true;
  });

  // Lọc Tab 2
  const incidentFilteredSessions = dateFilteredSessions.filter(s => {
    if (!s.hasIncident && s.status !== 'CO_SU_CO') return false;
    if (incColFilterCode && !s.sessionCode.toLowerCase().includes(incColFilterCode.toLowerCase())) return false;
    if (incColFilterClass && !(s.className.toLowerCase().includes(incColFilterClass.toLowerCase()) || s.classCode.toLowerCase().includes(incColFilterClass.toLowerCase()))) return false;
    if (incColFilterTarget !== 'ALL' && s.incidentParent !== incColFilterTarget) return false;
    if (incColFilterType) {
      const q = incColFilterType.toLowerCase();
      const parentItems = INCIDENT_MASTER_DATA[s.incidentParent || ''] || [];
      const childObj = parentItems.find(c => c.code === s.incidentChild);
      const childName = (childObj ? childObj.name : (s.incidentChild || '')).toLowerCase();
      const note = (s.incidentNote || '').toLowerCase();
      if (!childName.includes(q) && !note.includes(q)) return false;
    }
    if (incColFilterUrgency !== 'ALL' && s.incidentUrgency !== incColFilterUrgency) return false;
    if (incColFilterCover) {
      if (!s.coverTeacher || !s.coverTeacher.toLowerCase().includes(incColFilterCover.toLowerCase())) return false;
    }
    if (incColFilterStatus !== 'ALL' && s.incidentStatus !== incColFilterStatus) return false;
    if (incColFilterOps) {
      const q = incColFilterOps.toLowerCase();
      const matchName = s.handledByName && s.handledByName.toLowerCase().includes(q);
      const matchId = s.handledByOpsId && s.handledByOpsId.toLowerCase().includes(q);
      if (!matchName && !matchId) return false;
    }
    return true;
  });

  // Thống kê KPI Tab 1
  const kpiTotal = dateFilteredSessions.length;
  const kpiCompleted = dateFilteredSessions.filter(s => s.status === 'DA_HOC').length;
  const kpiIncidents = dateFilteredSessions.filter(s => s.hasIncident || s.status === 'CO_SU_CO' || s.status === 'NGHI_HOC').length;
  const kpiCover = dateFilteredSessions.filter(s => s.coverTeacher || s.status === 'DAY_THAY').length;

  // Thống kê KPI Tab 2
  const kpiIncTotal = dateFilteredSessions.filter(s => s.hasIncident || s.status === 'CO_SU_CO').length;
  const kpiIncEmergency = dateFilteredSessions.filter(s => s.incidentUrgency === 'EMERGENCY').length;
  const kpiIncTeacher = dateFilteredSessions.filter(s => s.incidentParent === 'GRP-TCH').length;
  const kpiIncStudent = dateFilteredSessions.filter(s => s.incidentParent === 'GRP-STU').length;

  // Reset bộ lọc Tab 1
  const resetColFilters = () => {
    setColFilterCode('');
    setColFilterClass('');
    setColFilterTeacher('');
    setColFilterTime('ALL');
    setColFilterAttendance('ALL');
    setColFilterStatus('ALL');
  };

  // Reset bộ lọc Tab 2
  const resetIncColFilters = () => {
    setIncColFilterCode('');
    setIncColFilterClass('');
    setIncColFilterTarget('ALL');
    setIncColFilterType('');
    setIncColFilterUrgency('ALL');
    setIncColFilterCover('');
    setIncColFilterStatus('ALL');
    setIncColFilterOps('');
  };

  // Mở Modal Sự cố
  const openIncidentModal = (session: MonitoringSession) => {
    setSelectedIncidentSession(session);
    const parent = session.incidentParent || 'GRP-TCH';
    setIncParent(parent);
    const childList = INCIDENT_MASTER_DATA[parent] || [];
    setIncChild(session.incidentChild || childList[0]?.code || 'INC-TCH-01');
    setIncUrgency(session.incidentUrgency || 'EMERGENCY');
    setIncStatus(session.incidentStatus || 'DANG_XU_LY');
    setIncNote(session.incidentNote || '');

    if (session.coverTeacher) {
      setIncHasCover(true);
      setIncCoverTeacher(session.coverTeacher);
    } else {
      setIncHasCover(false);
      setIncCoverTeacher('');
    }
  };

  // Đổi Cây Cha trong modal sự cố
  const handleIncParentChange = (val: 'GRP-TCH' | 'GRP-STU' | 'GRP-SYS') => {
    setIncParent(val);
    const list = INCIDENT_MASTER_DATA[val] || [];
    setIncChild(list[0]?.code || '');
    if (val !== 'GRP-TCH') {
      setIncHasCover(false);
      setIncCoverTeacher('');
    }
  };

  // Lưu biên bản sự cố và điều phối cover
  const handleSaveIncidentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentSession) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });

    if (selectedIncidentSession.status !== 'DA_HOC' && incParent === 'GRP-TCH' && incHasCover && !incCoverTeacher) {
      showToast('Vui lòng chọn giáo viên dạy thay từ danh sách cùng môn!', 'error');
      return;
    }

    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.sessionCode === selectedIncidentSession.sessionCode) {
          let nextCover = s.coverTeacher;
          let nextStatus = s.status;

          if (s.status !== 'DA_HOC') {
            if (incParent === 'GRP-TCH') {
              if (incHasCover && incCoverTeacher) {
                nextCover = incCoverTeacher;
                nextStatus = 'DAY_THAY';
              } else {
                nextCover = null;
                if (incStatus === 'HUY_CA') nextStatus = 'NGHI_HOC';
              }
            } else {
              nextCover = null;
              if (incStatus === 'HUY_CA' || incChild === 'INC-STU-01') nextStatus = 'NGHI_HOC';
            }
          }

          return {
            ...s,
            hasIncident: true,
            incidentParent: incParent,
            incidentChild: incChild,
            incidentUrgency: incUrgency,
            incidentStatus: incStatus,
            incidentNote: incNote,
            coverTeacher: nextCover,
            status: nextStatus,
            handledByOpsId: currentOps.id,
            handledByName: currentOps.name,
            handledAt: timeStr,
            isJustUpdated: true
          };
        }
        return { ...s, isJustUpdated: false };
      });
      return updated;
    });

    showToast(`Đã lưu biên bản ca ${selectedIncidentSession.sessionCode}! Vận hành phụ trách: ${currentOps.name}.`, 'success');
    setSelectedIncidentSession(null);
  };

  // Chế độ mô phỏng thời gian phục vụ kiểm thử theo yêu cầu:
  // "ở trong danh mục tạo 1 cca cchotoi từ 12:50 - 13:50 đi, rồi cho 1 giáo viên đđăngkis lịch rảnh đó, rồi tý đến 12:50 giáo viên chưa vào thì màn hình vận hành hiện màu đỏ ô đó đố. để thử nghiệm áy"
  const [testTimeMode, setTestTimeMode] = useState<'12:50' | '12:45' | '13:05' | 'REALTIME'>('12:50');

  // Lấy mốc thời gian hiện thời để đối chiếu
  const getCurrentEffectiveTime = () => {
    if (testTimeMode === '12:45') return '12:45';
    if (testTimeMode === '12:50') return '12:50';
    if (testTimeMode === '13:05') return '13:05';
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  // Hàm kiểm tra ca học đã đến giờ nhưng giáo viên chưa vào phòng -> CHUYỂN TRẠNG THÁI ĐỎ LẬP TỨC
  const isShiftOverdueAndMissing = (s: MonitoringSession) => {
    if (s.status === 'NGHI_HOC' || s.status === 'DA_HOC') return false;
    if (s.attendance === 'ATTENDED' || s.checkinTime !== null) return false;

    const parts = s.timeSlot.split('-');
    if (!parts[0]) return false;
    const startStr = parts[0].trim();
    const [startH, startM] = startStr.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM)) return false;
    const startMinutes = startH * 60 + startM;

    const currentStr = getCurrentEffectiveTime();
    const [curH, curM] = currentStr.split(':').map(Number);
    if (isNaN(curH) || isNaN(curM)) return false;
    const currentMinutes = curH * 60 + curM;

    // Đã đến hoặc quá giờ bắt đầu ca mà GV chưa vào phòng
    return currentMinutes >= startMinutes;
  };

  // Xác nhận nhanh giáo viên vào lớp cho 1 ca học cụ thể (Gỡ bỏ màu đỏ)
  const handleQuickCheckin = (sessionCode: string) => {
    const curTime = getCurrentEffectiveTime();
    setSessions(prev =>
      prev.map(s =>
        s.sessionCode === sessionCode
          ? {
              ...s,
              attendance: 'ATTENDED',
              checkinTime: `${curTime}:15`,
              isJustUpdated: true
            }
          : { ...s, isJustUpdated: false }
      )
    );
    showToast(`Đã xác nhận Giáo viên vào lớp ca [${sessionCode}] lúc ${curTime}:15. Trạng thái cảnh báo đỏ đã được gỡ bỏ!`, 'success');
  };

  // Đặt lại trạng thái chưa vào lớp để kiểm thử lại
  const handleResetCheckin = (sessionCode: string) => {
    setSessions(prev =>
      prev.map(s =>
        s.sessionCode === sessionCode
          ? {
              ...s,
              attendance: 'ABSENT',
              checkinTime: null,
              isJustUpdated: true
            }
          : { ...s, isJustUpdated: false }
      )
    );
    showToast(`Đã đặt lại ca [${sessionCode}] về trạng thái CHƯA VÀO LỚP để thử nghiệm báo động đỏ!`, 'warning');
  };

  // Kích hoạt mô phỏng Check-in
  const triggerSimulateCheckin = (type: 'ON_TIME' | 'LATE') => {
    const targetSession = sessions.find(s => s.sessionCode === simSessionCode);
    if (!targetSession) return;

    const checkinTimeStr = type === 'ON_TIME' ? '17:55:00' : '18:08:30';
    const attendanceVal = type === 'ON_TIME' ? 'ATTENDED' : 'LATE';

    setSessions(prev =>
      prev.map(s =>
        s.sessionCode === simSessionCode
          ? {
              ...s,
              attendance: attendanceVal,
              checkinTime: checkinTimeStr,
              isJustUpdated: true
            }
          : { ...s, isJustUpdated: false }
      )
    );

    setIsCheckinSimOpen(false);
    showToast(
      type === 'ON_TIME'
        ? `Giáo viên ấn Vào lớp lúc ${checkinTimeStr}. Chuyên cần ca ${simSessionCode}: Có mặt đúng giờ`
        : `Giáo viên ấn Vào lớp lúc ${checkinTimeStr}. Chuyên cần ca ${simSessionCode}: Đi muộn`,
      type === 'ON_TIME' ? 'success' : 'warning'
    );
  };

  // Nhãn thời gian hiển thị
  const getDateLabel = () => {
    if (dateFrom && dateTo) {
      if (dateFrom === dateTo) {
        if (dateFrom === '2026-10-06') return 'Thứ Ba, 06/10/2026 (Hôm nay)';
        if (dateFrom === '2026-10-05') return 'Thứ Hai, 05/10/2026 (Hôm qua)';
        return `Ngày ${dateFrom}`;
      }
      return `${dateFrom.slice(8, 10)}/${dateFrom.slice(5, 7)} - ${dateTo.slice(8, 10)}/${dateTo.slice(5, 7)}`;
    }
    if (selectedMonth && selectedMonth !== 'ALL') {
      return `Tháng ${selectedMonth}`;
    }
    return 'Toàn bộ thời gian';
  };

  // Danh sách các ca học bị quá giờ chưa vào
  const overdueSessionsList = diaryFilteredSessions.filter(isShiftOverdueAndMissing);

  return (
    <div className="space-y-5 text-slate-700">
      {/* ================= THANH ĐIỀU HÀNH & BỘ LỌC TRÊN NÓC (TINH GIẢN, NÚT LỌC SỔ HÀNG NGANG) ================= */}
      <div className="bg-white p-2.5 px-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Đồng hồ hệ thống trực ban */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{systemClock}</span>
          </div>

          {/* Nút mở Bộ lọc sổ sang từ cột bên phải */}
          <button
            type="button"
            onClick={() => setIsTimeFilterOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-[#FF5C00] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Mở bảng lọc thời gian & ca trực"
          >
            <Filter className="w-3.5 h-3.5 text-[#FF5C00]" />
            <span>Lọc: <strong>{getDateLabel()}</strong></span>
            <span className="px-1.5 py-0.2 rounded-md bg-white text-[#FF5C00] text-[10px] font-bold border border-orange-200">
              {dateFilteredSessions.length} ca
            </span>
          </button>
        </div>

        {/* Tài khoản Vận hành siêu nhỏ gọn (Ấn vào mới sổ ra) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 hover:border-slate-300 transition-colors cursor-pointer"
            title="Đổi phiên trực ban Vận hành"
          >
            <span className="w-5 h-5 rounded-full bg-orange-100 text-[#FF5C00] font-bold text-[10px] flex items-center justify-center">
              {currentOps.avatar}
            </span>
            <span className="font-semibold text-slate-800 hidden sm:inline">{currentOps.name}</span>
            <span className="text-[10px] text-slate-500 font-normal">({currentOps.role})</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-1.5 border-b border-slate-100 font-bold text-slate-400 text-[10px] uppercase">
                Chuyển phiên trực ban:
              </div>
              {Object.values(OPS_ACCOUNTS).map(acc => {
                const isSelected = acc.id === currentLoggedInOps;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setCurrentLoggedInOps(acc.id);
                      setIsUserMenuOpen(false);
                      showToast(`Phiên trực ban: ${acc.name}`, 'info');
                    }}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected ? 'bg-orange-50 text-[#FF5C00] font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                        {acc.avatar}
                      </span>
                      <div>
                        <div className="font-semibold text-xs leading-tight">{acc.name}</div>
                        <div className="text-[10px] text-slate-400">{acc.role}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#FF5C00]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================= 2 TAB NGANG CHUẨN ================= */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2">
          {/* TAB 1: NHẬT KÝ & GIÁM SÁT BUỔI HỌC */}
          <button
            type="button"
            onClick={() => setActiveTab('diary')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'diary'
                ? 'border-[#FF5C00] text-[#FF5C00]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>1. Nhật ký &amp; Giám sát Buổi học</span>
            <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[#FF5C00] text-[10px] font-bold">
              {dateFilteredSessions.length}
            </span>
          </button>

          {/* TAB 2: THÔNG TIN SỰ CỐ & ĐIỀU PHỐI DẠY THAY */}
          <button
            type="button"
            onClick={() => setActiveTab('incidents')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'incidents'
                ? 'border-[#FF5C00] text-[#FF5C00]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>2. Thông tin Sự cố &amp; Điều phối Dạy thay</span>
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
              {kpiIncTotal}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ================= TAB 1: NHẬT KÝ & GIÁM SÁT BUỔI HỌC ==================== */}
      {/* ========================================================================= */}
      {activeTab === 'diary' && (
        <div className="space-y-5">
          {/* 4 Thẻ KPI Tab 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Tổng buổi học</div>
              <div className="text-2xl font-black text-slate-800 font-mono">{kpiTotal}</div>
              <div className="text-[11px] text-slate-400 mt-1">Toán &amp; Tiếng Anh (Khối 1-5)</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Đã học</div>
              <div className="text-2xl font-black text-slate-700 font-mono">{kpiCompleted}</div>
              <div className="text-[11px] text-slate-500 font-medium mt-1">Hoàn thành ca dạy</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Ca có sự cố phát sinh</div>
              <div className="text-2xl font-black text-rose-600 font-mono">{kpiIncidents}</div>
              <div className="text-[11px] text-rose-500 font-medium mt-1">Cần điều phối sang Tab 2</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Dạy thay</div>
              <div className="text-2xl font-black text-purple-700 font-mono">{kpiCover}</div>
              <div className="text-[11px] text-purple-600 font-medium mt-1">Đã nạp lịch GV dạy thay</div>
            </div>
          </div>

          {/* BẢNG GIÁM SÁT BUỔI HỌC VỚI BỘ LỌC TẠI CỘT */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  {/* Hàng 1: Tiêu đề các cột */}
                  <tr>
                    <th className="py-3 px-3 w-24">MÃ BUỔI</th>
                    <th className="py-3 px-3 min-w-[210px]">LỚP HỌC</th>
                    <th className="py-3 px-3 min-w-[180px]">GIÁO VIÊN</th>
                    <th className="py-3 px-3 min-w-[150px]">THỜI GIAN &amp; NGÀY</th>
                    <th className="py-3 px-3 text-center min-w-[140px]">CHUYÊN CẦN GV</th>
                    <th className="py-3 px-3 text-center min-w-[145px]">TRẠNG THÁI CA</th>
                    <th className="py-3 px-3 text-center min-w-[130px]">HÀNH ĐỘNG</th>
                  </tr>
                  {/* Hàng 2: Bộ lọc trực tiếp tại từng cột */}
                  <tr className="bg-slate-100/70 border-t border-slate-200 normal-case font-normal text-slate-600">
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={colFilterCode}
                        onChange={e => setColFilterCode(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={colFilterClass}
                        onChange={e => setColFilterClass(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={colFilterTeacher}
                        onChange={e => setColFilterTeacher(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-3">
                      <select
                        value={colFilterTime}
                        onChange={e => setColFilterTime(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00] cursor-pointer"
                      >
                        <option value="ALL">Tất cả khung giờ</option>
                        <option value="12:50 - 13:50">Ca Trưa: 12:50 - 13:50</option>
                        <option value="18:00 - 19:30">Ca 1: 18:00 - 19:30</option>
                        <option value="19:45 - 21:15">Ca 2: 19:45 - 21:15</option>
                      </select>
                    </th>
                    <th className="py-2 px-3">
                      <select
                        value={colFilterAttendance}
                        onChange={e => setColFilterAttendance(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00] cursor-pointer"
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="ATTENDED">Có mặt</option>
                        <option value="LATE">Đi muộn</option>
                        <option value="ABSENT">Chưa vào</option>
                      </select>
                    </th>
                    <th className="py-2 px-3">
                      <select
                        value={colFilterStatus}
                        onChange={e => setColFilterStatus(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00] cursor-pointer"
                      >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="CHUA_HOC">Chưa học</option>
                        <option value="DA_HOC">Đã học</option>
                        <option value="NGHI_HOC">Nghỉ học</option>
                        <option value="KHAI_GIANG">Khai giảng</option>
                        <option value="DAY_THAY">Dạy thay</option>
                      </select>
                    </th>
                    <th className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={resetColFilters}
                        className="px-2.5 py-1 text-[10px] text-slate-500 hover:text-rose-600 font-bold rounded-lg bg-white border border-slate-200 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
                      >
                        Reset
                      </button>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium">
                  {diaryFilteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Không có buổi học nào trong khoảng thời gian hoặc điều kiện lọc này!
                      </td>
                    </tr>
                  ) : (
                    diaryFilteredSessions.map(s => {
                      const isCompleted = s.status === 'DA_HOC';
                      const isOverdue = isShiftOverdueAndMissing(s);
                      const highlightClass = isOverdue
                        ? 'bg-rose-100/80 border-l-4 border-l-rose-600 border-b border-rose-200 text-rose-950 hover:bg-rose-100 ring-1 ring-inset ring-rose-300 transition-colors shadow-2xs font-medium'
                        : s.isJustUpdated
                        ? 'bg-orange-50/50 border-l-4 border-l-[#FF5C00]'
                        : 'hover:bg-slate-50/80 border-b border-slate-100';

                      return (
                        <tr key={s.sessionCode} className={`transition-colors ${highlightClass}`}>
                          {/* Mã buổi */}
                          <td className="py-3.5 px-3 font-bold text-slate-800 text-xs font-mono">
                            <div className="flex items-center gap-1.5">
                              {isOverdue && (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                              )}
                              <span>{s.sessionCode}</span>
                            </div>
                          </td>

                          {/* Lớp học */}
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-slate-800 text-xs">{s.className}</div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{s.classCode}</div>
                          </td>

                          {/* Giáo viên */}
                          <td className="py-3.5 px-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                                  isOverdue ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {isOverdue ? 'CHƯA VÀO' : 'CHÍNH'}
                                </span>
                                <span className={`font-semibold ${isOverdue ? 'text-rose-900 font-bold' : 'text-slate-800'}`}>
                                  {s.primaryTeacher}
                                </span>
                              </div>
                              {s.coverTeacher && (
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-purple-600 text-white">
                                    DẠY THAY
                                  </span>
                                  <span className="font-bold text-purple-700">{s.coverTeacher}</span>
                                  <button
                                    type="button"
                                    onClick={() => setCoverScheduleTeacherName(s.coverTeacher)}
                                    className="text-[10px] text-purple-600 underline font-semibold ml-0.5 cursor-pointer"
                                  >
                                    Lịch
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Thời gian & Ngày */}
                          <td className="py-3.5 px-3 text-xs">
                            {isOverdue ? (
                              <div className="space-y-1">
                                <div className="inline-block px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold font-mono text-xs border border-rose-200">
                                  {s.timeSlot}
                                </div>
                                <div className="text-[10px] text-rose-600 font-medium">
                                  Đến ca chưa vào lớp
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {s.sessionDate}
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="font-bold text-slate-800 font-mono">
                                  {s.timeSlot}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                  {s.sessionDate}
                                </div>
                              </>
                            )}
                          </td>

                          {/* Chuyên cần */}
                          <td className="py-3.5 px-3 text-center">
                            {isOverdue ? (
                              <span
                                className="inline-flex items-center px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-semibold text-[11px] border border-rose-200"
                                title="Đã đến giờ ca dạy nhưng Giáo viên chưa vào lớp"
                              >
                                Chưa vào lớp (Quá giờ)
                              </span>
                            ) : s.attendance === 'ATTENDED' ? (
                              <span
                                className="inline-flex items-center px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200"
                                title={`Check-in lúc: ${s.checkinTime}`}
                              >
                                Có mặt lúc {s.checkinTime ? s.checkinTime.slice(0, 5) : 'Đúng giờ'}
                              </span>
                            ) : s.attendance === 'LATE' ? (
                              <span
                                className="inline-flex items-center px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200"
                                title={`Check-in trễ: ${s.checkinTime}`}
                              >
                                Muộn lúc {s.checkinTime ? s.checkinTime.slice(0, 5) : 'Muộn'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                                Chưa vào lớp
                              </span>
                            )}
                          </td>

                          {/* Trạng thái ca */}
                          <td className="py-3.5 px-3 text-center">
                            {isOverdue ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px] border border-rose-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Cảnh Báo Đỏ
                              </span>
                            ) : s.status === 'DA_HOC' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200">
                                <span className="w-2 h-2 rounded-full bg-slate-400" /> Đã học
                              </span>
                            ) : s.status === 'CHUA_HOC' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 font-bold text-[11px] border border-teal-200">
                                <span className="w-2 h-2 rounded-full bg-teal-400" /> Chưa học
                              </span>
                            ) : s.status === 'NGHI_HOC' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                                <span className="w-2 h-2 rounded-full bg-amber-500" /> Nghỉ học
                              </span>
                            ) : s.status === 'KHAI_GIANG' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                                <span className="w-2 h-2 rounded-full bg-rose-500" /> Khai giảng
                              </span>
                            ) : s.status === 'DAY_THAY' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-200">
                                <span className="w-2 h-2 rounded-full bg-purple-600" /> Dạy thay
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                                <span className="w-2 h-2 rounded-full bg-rose-500" /> Có sự cố
                              </span>
                            )}
                          </td>

                          {/* Hành động */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isOverdue && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickCheckin(s.sessionCode)}
                                  className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
                                  title="Xác nhận Giáo viên vào lớp (Gỡ cảnh báo đỏ)"
                                >
                                  GV Vào Lớp
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedClassViewSession(s)}
                                className="px-2.5 py-1.5 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 text-[#FF5C00] font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                                title="Mở Sổ ca dạy"
                              >
                                Sổ Ca Dạy
                              </button>

                              {(s.status === 'DAY_THAY' || s.hasIncident || s.status === 'CO_SU_CO') && (
                                isCompleted ? (
                                  <button
                                    type="button"
                                    disabled
                                    className="px-2 py-1.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-[11px] border border-slate-200 cursor-not-allowed opacity-50"
                                    title="Ca học đã hoàn thành - Khóa điều phối Dạy thay"
                                  >
                                    <span className="line-through">Dạy thay</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('incidents');
                                      openIncidentModal(s);
                                    }}
                                    className="px-2 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 transition-all cursor-pointer"
                                    title="Chuyển sang Tab 2 để điều phối Dạy thay và lập biên bản"
                                  >
                                    Sự cố
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Chú thích chân bảng Tab 1 */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>
                  Chuyên cần giáo viên ghi nhận tự động 100% từ mốc giờ ấn nút <strong>"Vào lớp"</strong> đối chiếu với giờ bắt đầu ca học.
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Trực ban: <span className="font-bold text-slate-700">{currentOps.name} - {currentOps.id}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ================= TAB 2: THÔNG TIN SỰ CỐ & ĐIỀU PHỐI COVER ============== */}
      {/* ========================================================================= */}
      {activeTab === 'incidents' && (
        <div className="space-y-5">
          {/* 4 Thẻ KPI Tab 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Tổng sự cố phát sinh</div>
              <div className="text-2xl font-black text-rose-600 font-mono">{kpiIncTotal}</div>
              <div className="text-[11px] text-slate-400 mt-1">Toàn bộ biên bản sự cố</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Sự cố đột xuất sát giờ</div>
              <div className="text-2xl font-black text-amber-600 font-mono">{kpiIncEmergency}</div>
              <div className="text-[11px] text-amber-600 font-medium mt-1">Chưa báo trước dưới 2 tiếng</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Đối tượng: Giáo viên</div>
              <div className="text-2xl font-black text-purple-700 font-mono">{kpiIncTeacher}</div>
              <div className="text-[11px] text-purple-600 font-medium mt-1">Nghỉ ốm / Đi muộn / Lỗi mic</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="text-slate-400 text-xs mb-1">Đối tượng: Học sinh</div>
              <div className="text-2xl font-black text-blue-600 font-mono">{kpiIncStudent}</div>
              <div className="text-[11px] text-blue-600 font-medium mt-1">Xin dời ca / Nghỉ có phép</div>
            </div>
          </div>

          {/* BẢNG QUẢN LÝ SỰ CỐ VỚI BỘ LỌC TẠI CỘT */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  {/* Hàng 1: Tiêu đề cột Tab 2 */}
                  <tr>
                    <th className="py-3.5 px-3 w-20">MÃ BUỔI</th>
                    <th className="py-3.5 px-3 min-w-[200px]">LỚP HỌC</th>
                    <th className="py-3.5 px-3 min-w-[130px]">ĐỐI TƯỢNG</th>
                    <th className="py-3.5 px-3 min-w-[210px]">LOẠI SỰ CỐ CHI TIẾT</th>
                    <th className="py-3.5 px-3 min-w-[110px]">TÍNH CHẤT</th>
                    <th className="py-3.5 px-3 min-w-[160px]">GIÁO VIÊN DẠY THAY</th>
                    <th className="py-3.5 px-3 text-center min-w-[120px]">TIẾN ĐỘ XỬ LÝ</th>
                    <th className="py-3.5 px-3 min-w-[160px] bg-orange-50/40 border-l border-orange-100">
                      <div className="text-[#FF5C00] font-bold">VẬN HÀNH XỬ LÝ</div>
                    </th>
                    <th className="py-3.5 px-3 text-center min-w-[120px]">THAO TÁC</th>
                  </tr>
                  {/* Hàng 2: Bộ lọc trực tiếp từng cột */}
                  <tr className="bg-slate-100/70 border-t border-slate-200 normal-case font-normal text-slate-600">
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={incColFilterCode}
                        onChange={e => setIncColFilterCode(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={incColFilterClass}
                        onChange={e => setIncColFilterClass(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-3">
                      <select
                        value={incColFilterTarget}
                        onChange={e => setIncColFilterTarget(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00] cursor-pointer"
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="GRP-TCH">Giáo viên</option>
                        <option value="GRP-STU">Học sinh</option>
                        <option value="GRP-SYS">Kỹ thuật</option>
                      </select>
                    </th>
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={incColFilterType}
                        onChange={e => setIncColFilterType(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-3">
                      <select
                        value={incColFilterUrgency}
                        onChange={e => setIncColFilterUrgency(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00] cursor-pointer"
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="EMERGENCY">Đột xuất</option>
                        <option value="ADVANCED">Báo trước</option>
                      </select>
                    </th>
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={incColFilterCover}
                        onChange={e => setIncColFilterCover(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-3">
                      <select
                        value={incColFilterStatus}
                        onChange={e => setIncColFilterStatus(e.target.value)}
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:border-[#FF5C00] cursor-pointer"
                      >
                        <option value="ALL">Tất cả</option>
                        <option value="DA_GIAI_QUYET">Đã giải quyết</option>
                        <option value="DANG_XU_LY">Đang xử lý</option>
                      </select>
                    </th>
                    <th className="py-2 px-3">
                      <input
                        type="text"
                        value={incColFilterOps}
                        onChange={e => setIncColFilterOps(e.target.value)}
                        placeholder="Tìm kiếm..."
                        className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#FF5C00]"
                      />
                    </th>
                    <th className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={resetIncColFilters}
                        className="px-2.5 py-1 text-[10px] text-slate-500 hover:text-rose-600 font-bold rounded-lg bg-white border border-slate-200 hover:border-rose-300 transition-colors shadow-2xs cursor-pointer"
                      >
                        Reset
                      </button>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium">
                  {incidentFilteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        Không có ca sự cố nào trong phạm vi ngày hoặc bộ lọc đã chọn!
                      </td>
                    </tr>
                  ) : (
                    incidentFilteredSessions.map(s => {
                      const isCompleted = s.status === 'DA_HOC';
                      const highlightClass = s.isJustUpdated
                        ? 'bg-orange-50/50 border-l-4 border-l-[#FF5C00]'
                        : 'hover:bg-slate-50/80 border-b border-slate-100';

                      const parentItems = INCIDENT_MASTER_DATA[s.incidentParent || ''] || [];
                      const childObj = parentItems.find(c => c.code === s.incidentChild);
                      const childName = childObj ? childObj.name : (s.incidentChild || 'Sự cố đang trực ban');

                      return (
                        <tr key={s.sessionCode} className={`transition-colors ${highlightClass}`}>
                          {/* Mã buổi */}
                          <td className="py-3.5 px-3 font-bold text-slate-800 font-mono">
                            {s.sessionCode}
                          </td>

                          {/* Lớp học & Ngày */}
                          <td className="py-3.5 px-3">
                            <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200 font-mono">
                              {s.classCode}
                            </span>
                            <div className="font-bold text-slate-800 text-xs mt-0.5">{s.className}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              {s.sessionDate} &bull; {s.timeSlot}
                            </div>
                          </td>

                          {/* Đối tượng */}
                          <td className="py-3.5 px-3">
                            {s.incidentParent === 'GRP-STU' ? (
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                                Học sinh
                              </span>
                            ) : s.incidentParent === 'GRP-SYS' ? (
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                                Kỹ thuật LMS
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-purple-50 text-purple-700 border border-purple-200">
                                Giáo viên
                              </span>
                            )}
                          </td>

                          {/* Loại sự cố chi tiết */}
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-slate-800">{childName}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{s.incidentNote || ''}</div>
                          </td>

                          {/* Tính chất */}
                          <td className="py-3.5 px-3">
                            {s.incidentUrgency === 'EMERGENCY' ? (
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                                Đột xuất
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-600">
                                Báo trước
                              </span>
                            )}
                          </td>

                          {/* Giáo viên dạy thay */}
                          <td className="py-3.5 px-3">
                            {s.coverTeacher ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-purple-600 text-white">
                                  DẠY THAY
                                </span>
                                <span className="font-bold text-purple-700">{s.coverTeacher}</span>
                                <button
                                  type="button"
                                  onClick={() => setCoverScheduleTeacherName(s.coverTeacher)}
                                  className="text-[10px] text-purple-600 underline font-semibold ml-0.5 cursor-pointer"
                                >
                                  Lịch
                                </button>
                              </div>
                            ) : s.incidentParent !== 'GRP-TCH' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                Không gán Cover
                              </span>
                            ) : isCompleted ? (
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-400 border border-slate-200 opacity-60 flex items-center gap-1 w-fit"
                                title="Ca học đã hoàn thành - Khóa điều phối Dạy thay"
                              >
                                <span className="line-through">Chưa gán dạy thay</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Chưa gán Cover
                              </span>
                            )}
                          </td>

                          {/* Tiến độ xử lý */}
                          <td className="py-3.5 px-3 text-center">
                            {s.incidentStatus === 'DA_GIAI_QUYET' ? (
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Đã giải quyết
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                                Đang xử lý
                              </span>
                            )}
                          </td>

                          {/* Vận hành xử lý */}
                          <td className="py-3.5 px-3 bg-orange-50/20 border-l border-orange-100/60">
                            {s.handledByName ? (
                              <div>
                                <div className="font-bold text-slate-800 text-[11px]">{s.handledByName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {s.handledByOpsId} &bull; {s.handledAt ? s.handledAt.slice(0, 5) : 'Đã ghi nhận'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Chưa ghi nhận</span>
                            )}
                          </td>

                          {/* Thao tác */}
                          <td className="py-3.5 px-3 text-center">
                            {isCompleted ? (
                              <button
                                type="button"
                                onClick={() => openIncidentModal(s)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[11px] border border-slate-200 transition-all cursor-pointer"
                                title="Ca học đã hoàn thành - Chỉ xem và cập nhật biên bản"
                              >
                                Biên bản
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openIncidentModal(s)}
                                className="px-3 py-1.5 rounded-xl bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                              >
                                Xử lý ca
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Chú thích chân bảng Tab 2 */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                <span>
                  Khi gán Giáo viên dạy thay, ca học sẽ <strong>tự động nạp vào lịch cá nhân</strong> của Giáo viên đó và cập nhật trạng thái ca.
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Trực ban: <span className="font-bold text-slate-700">{currentOps.name} - {currentOps.id}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 1: SỔ CA DẠY (READ-ONLY) ================= */}
      {selectedClassViewSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 max-h-[94vh] overflow-y-auto text-xs">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-slate-800">Sổ Ca Dạy &amp; Nhật Ký Giảng Dạy</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                    Vận hành Giám sát (Read-Only)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  {selectedClassViewSession.classCode} - Môn {selectedClassViewSession.subject === 'TOAN' ? 'Toán' : 'Tiếng Anh'} - {selectedClassViewSession.modelText}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClassViewSession(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Main Layout 2 cột chuẩn */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
              {/* CỘT TRÁI (4 cols): THÔNG TIN LỚP & TIẾN ĐỘ TUẦN */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">THÔNG TIN LỚP HỌC</div>
                  <div className="font-bold text-slate-800 text-xs font-mono">
                    {selectedClassViewSession.classCode}
                  </div>
                  <div className="text-[#FF5C00] font-bold text-xs">
                    Môn {selectedClassViewSession.subject === 'TOAN' ? 'Toán' : 'Tiếng Anh'} &bull; {selectedClassViewSession.modelText}
                  </div>
                  <div className="text-slate-600 font-medium text-[11px] pt-1 border-t border-slate-200/60">
                    Lớp {selectedClassViewSession.grade} ({selectedClassViewSession.levelText})
                  </div>
                  <div className="text-slate-600 font-medium text-[11px] font-mono">
                    {selectedClassViewSession.timeSlot} | (Thứ 3, Chủ Nhật)
                  </div>
                </div>

                {/* Lịch dạy trong tuần */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LỊCH DẠY TRONG TUẦN</span>
                    <span className="text-[10px] text-slate-400 font-mono">&lt; 05/10 - 11/10 &gt;</span>
                  </div>

                  {/* Buổi 1 */}
                  <div className="p-3 rounded-2xl border border-[#FF5C00] bg-orange-50/40">
                    <div className="text-[11px] font-mono font-bold text-slate-800 mb-1">
                      {selectedClassViewSession.sessionDate} {selectedClassViewSession.timeSlot}
                    </div>
                    <div className="text-xs font-bold text-slate-800">
                      {selectedClassViewSession.lessonDiary ? selectedClassViewSession.lessonDiary.slice(0, 45) + '...' : 'Bài giảng trọng tâm theo phân phối chương trình'}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-orange-100">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Buổi 1 (Hôm nay)
                      </span>
                      <span className="text-[10px] text-[#FF5C00] font-bold">Đang xem</span>
                    </div>
                  </div>

                  {/* Buổi 2 */}
                  <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50">
                    <div className="text-[11px] font-mono text-slate-500 mb-1">
                      2026-10-11 18:00 - 19:30
                    </div>
                    <div className="text-xs font-medium text-slate-700">
                      Hình tròn, tâm, đường kính, bán kính
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-600">
                        Buổi 2
                      </span>
                      <span className="text-[10px] text-slate-400">Chưa bắt đầu</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI (8 cols): THÔNG TIN GIẢNG DẠY, NHẬT KÝ BÀI DẠY & NHẬN XÉT HỌC VIÊN */}
              <div className="lg:col-span-8 space-y-4">
                {/* 3 Thẻ ngang */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Thẻ 1: Giáo viên */}
                  <div className="p-3 rounded-2xl border border-slate-200 bg-white space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giáo viên phụ trách</div>
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {selectedClassViewSession.coverTeacher ? `${selectedClassViewSession.coverTeacher} (GV dạy thay)` : selectedClassViewSession.primaryTeacher}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Mã: {selectedClassViewSession.primaryTeacher === 'Nguyễn Văn An' ? 'GV001' : 'GV002'}
                    </div>
                    <div className={`text-[10px] font-semibold ${selectedClassViewSession.attendance === 'ATTENDED' ? 'text-emerald-700' : selectedClassViewSession.attendance === 'LATE' ? 'text-amber-700' : 'text-rose-700'}`}>
                      Check-in: {selectedClassViewSession.checkinTime || 'Chưa check-in'}
                    </div>
                  </div>

                  {/* Thẻ 2: Phòng học & Bản ghi */}
                  <div className="p-3 rounded-2xl border border-slate-200 bg-white space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phòng học &amp; Bản ghi</div>
                    <div className="text-[10px] text-slate-500 truncate">Phòng: {selectedClassViewSession.room}</div>
                    {selectedClassViewSession.status === 'DA_HOC' ? (
                      <a
                        href={selectedClassViewSession.recordingUrl || 'https://vuihoc.vn/recordings/demo-lesson-archive.mp4'}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center justify-center w-full py-1.5 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-[11px] transition-colors shadow-2xs"
                      >
                        XEM LẠI BẢN GHI
                      </a>
                    ) : (
                      <a
                        href={selectedClassViewSession.roomUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center justify-center w-full py-1.5 px-3 rounded-xl bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold text-[11px] transition-colors shadow-2xs"
                      >
                        VÀO LỚP TRỰC TUYẾN
                      </a>
                    )}
                  </div>

                  {/* Thẻ 3: Học liệu & BTVN */}
                  <div className="p-3 rounded-2xl border border-slate-200 bg-white space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Học liệu &amp; BTVN</div>
                    <div className="space-y-0.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Slide GV:</span>
                        <span className="text-orange-600 font-semibold underline cursor-pointer">Slide_Buoi_1.pdf</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Bài tập:</span>
                        <span className="text-orange-600 font-semibold underline cursor-pointer">LMS_BTVN_1</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nhật ký bài dạy & dặn dò (Lesson Diary) */}
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Nhật ký Giảng dạy &amp; Dặn dò bài tập (Lesson Diary)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 font-bold">
                      {selectedClassViewSession.lessonDiary ? 'Đã ghi nhận' : 'Chưa có nhật ký'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-700 text-xs leading-relaxed border border-slate-100">
                    {selectedClassViewSession.lessonDiary || '-- Giáo viên chưa nộp nhật ký bài dạy cho ca học này --'}
                  </div>
                </div>

                {/* Danh sách học viên, điểm danh & Nhận xét AI */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xs text-slate-800 border-b-2 border-[#FF5C00] pb-0.5">Danh sách Học viên</span>
                      <span className="text-[11px] text-slate-400">Điểm danh học sinh</span>
                      <span className="text-[11px] text-[#FF5C00] font-bold">Nhận xét AI gửi Phụ huynh</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Trạng thái: {selectedClassViewSession.status}
                    </span>
                  </div>

                  <div className="p-4 space-y-3">
                    {selectedClassViewSession.students.length === 0 ? (
                      <div className="text-center py-4 text-slate-400">Không có dữ liệu học sinh trong ca.</div>
                    ) : (
                      selectedClassViewSession.students.map(stu => (
                        <div key={stu.code} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <div>
                              <div className="font-bold text-slate-800 text-xs">{stu.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{stu.code} &bull; {stu.gradeText}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-[11px]">
                                Điểm danh HS: <strong className="text-emerald-700">{stu.attendance}</strong>
                              </span>
                              <span className="px-2.5 py-1 rounded-xl bg-orange-100 text-[#FF5C00] font-bold text-[11px]">
                                Nhận xét AI đã lưu
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              Nội dung nhận xét gửi Phụ huynh:
                            </div>
                            <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 leading-relaxed text-[11px]">
                              "{stu.aiComment}"
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="text-[10px] text-slate-400 font-medium">Tiêu chí sư phạm đã tick:</span>
                            {stu.criteria.map(c => (
                              <span key={c} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[10px] font-semibold">
                                ✓ {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const s = selectedClassViewSession;
                  setSelectedClassViewSession(null);
                  setActiveTab('incidents');
                  openIncidentModal(s);
                }}
                className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 transition-colors cursor-pointer"
              >
                Chuyển sang Tab 2: Xử lý Sự cố &amp; Cover ➔
              </button>

              <button
                type="button"
                onClick={() => setSelectedClassViewSession(null)}
                className="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: XỬ LÝ SỰ CỐ & ĐIỀU PHỐI COVER (TAB 2) ================= */}
      {selectedIncidentSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto text-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold text-xs font-mono">
                    {selectedIncidentSession.sessionCode}
                  </span>
                  <h3 className="font-bold text-base text-slate-800">
                    Ghi nhận Sự cố &amp; Điều phối Dạy thay ca {selectedIncidentSession.sessionCode}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                  {selectedIncidentSession.classCode} &bull; {selectedIncidentSession.timeSlot} &bull; {selectedIncidentSession.className}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncidentSession(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveIncidentSubmit} className="mt-4 space-y-4">
              {/* Khối Vận hành trực phụ trách (Tự động gán) */}
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-[#FF5C00] uppercase tracking-wider">
                    Cán bộ Vận hành phụ trách xử lý (Tự động gán):
                  </span>
                  <div className="font-bold text-slate-800 text-xs">
                    {currentOps.name} (Mã: {currentOps.id} &bull; {currentOps.role})
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-emerald-700 border border-emerald-200">
                  Phiên trực hợp lệ
                </span>
              </div>

              {/* Cây phân loại sự cố (Đồng bộ Phân hệ 2) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Phân loại Sự cố (Đồng bộ Cây Cha - Con từ Danh mục Dùng chung)</span>
                  <span className="text-[10px] text-slate-500 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">
                    NHOM_SU_CO &amp; LOAI_SU_CO
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Đối tượng phát sinh sự cố <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={incParent}
                      onChange={e => handleIncParentChange(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-[#FF5C00]"
                    >
                      <option value="GRP-TCH">Đối tượng: Giáo viên</option>
                      <option value="GRP-STU">Đối tượng: Học sinh</option>
                      <option value="GRP-SYS">Đối tượng: Kỹ thuật / Hệ thống LMS</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Loại sự cố chi tiết <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={incChild}
                      onChange={e => setIncChild(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-[#FF5C00]"
                    >
                      {(INCIDENT_MASTER_DATA[incParent] || []).map(item => (
                        <option key={item.code} value={item.code}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tính chất thông báo <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={incUrgency}
                      onChange={e => setIncUrgency(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-[#FF5C00]"
                    >
                      <option value="EMERGENCY">Chưa báo trước (Đột xuất sát giờ &lt; 2h)</option>
                      <option value="ADVANCED">Có báo trước (&gt; 2h, có phép)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Trạng thái giải quyết sự cố <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={incStatus}
                      onChange={e => setIncStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-[#FF5C00]"
                    >
                      <option value="DA_GIAI_QUYET">Đã giải quyết xong</option>
                      <option value="DANG_XU_LY">Đang xử lý / Chờ đối soát</option>
                      <option value="HUY_CA">Hủy ca do sự cố</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Biên bản xử lý &amp; Diễn biến trực ban:</label>
                  <input
                    type="text"
                    value={incNote}
                    onChange={e => setIncNote(e.target.value)}
                    placeholder="Nhập tóm tắt diễn biến liên hệ giáo viên, phụ huynh..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
              </div>

              {/* Khối Điều phối Cover (Dạy thay) - chỉ dành cho Giáo viên */}
              {incParent === 'GRP-TCH' ? (
                selectedIncidentSession.status === 'DA_HOC' ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 font-medium">
                    Buổi học này <strong>đã hoàn thành</strong>. Chức năng gán Cover đã được tự động khóa (chỉ cho phép xem và cập nhật biên bản sự cố).
                  </div>
                ) : (
                  <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl space-y-2.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={incHasCover}
                        onChange={e => setIncHasCover(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 accent-purple-600"
                      />
                      <span className="font-bold text-purple-900 text-xs">Chỉ định Giáo viên Dạy thay (Cover) cho ca này</span>
                    </label>

                    {incHasCover && (
                      <div className="space-y-1.5 pt-1">
                        <label className="block font-bold text-purple-900 text-[11px]">
                          Chọn Giáo viên Cover (Hệ thống tự lọc GV cùng môn &amp; trống lịch):
                        </label>
                        <select
                          value={incCoverTeacher}
                          onChange={e => setIncCoverTeacher(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-purple-200 bg-white font-medium text-slate-800 focus:outline-none focus:border-purple-600"
                        >
                          <option value="">-- Chọn Giáo viên dạy thay --</option>
                          {TEACHERS_COVER_DATABASE.filter(t => t.subject === selectedIncidentSession.subject && t.name !== selectedIncidentSession.primaryTeacher).map(t => (
                            <option key={t.id} value={t.name}>
                              {t.name} - Mã {t.id} - Môn {t.subject === 'TOAN' ? 'Toán' : 'Tiếng Anh'} - {t.status}
                            </option>
                          ))}
                        </select>
                        <div className="text-[10px] text-purple-700">
                          Sau khi lưu, buổi học sẽ được <strong>tự động nạp vào Lịch cá nhân</strong> của Giáo viên Cover này.
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="p-3 bg-slate-100 border border-slate-200 rounded-2xl text-[11px] text-slate-500">
                  Sự cố do <strong>{incParent === 'GRP-STU' ? 'Học sinh' : 'Kỹ thuật'}</strong> không kích hoạt nghiệp vụ Giáo viên dạy thay (Cover).
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedIncidentSession(null)}
                  className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-[#FF5C00] hover:bg-[#E05200] text-white font-bold transition-all cursor-pointer shadow-xs"
                >
                  Lưu Biên bản &amp; Tự động gán người xử lý
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: XEM LỊCH CÁ NHÂN CỦA GV COVER ================= */}
      {coverScheduleTeacherName && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  Thời khóa biểu cá nhân: {coverScheduleTeacherName}
                </h3>
                <p className="text-[10px] text-slate-400">Kiểm tra ca dạy đã tự động được nạp vào lịch</p>
              </div>
              <button
                type="button"
                onClick={() => setCoverScheduleTeacherName(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-3.5 space-y-2.5 max-h-72 overflow-y-auto">
              {sessions.filter(s => s.coverTeacher === coverScheduleTeacherName || s.primaryTeacher === coverScheduleTeacherName).length === 0 ? (
                <div className="p-3 bg-slate-50 text-slate-400 text-center rounded-xl">Chưa có ca học nào trong ngày.</div>
              ) : (
                sessions
                  .filter(s => s.coverTeacher === coverScheduleTeacherName || s.primaryTeacher === coverScheduleTeacherName)
                  .map(s => {
                    const isCover = s.coverTeacher === coverScheduleTeacherName;
                    return (
                      <div
                        key={s.sessionCode}
                        className={`p-3 rounded-2xl border ${isCover ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'} flex items-center justify-between`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 text-xs font-mono">{s.sessionCode} &bull; {s.classCode}</span>
                            {isCover ? (
                              <span className="px-2 py-0.5 rounded font-bold bg-purple-600 text-white text-[10px]">Ca Dạy Thay</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded font-bold bg-slate-200 text-slate-700 text-[10px]">Ca Đứng Chính</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-700 font-semibold mt-1">{s.className}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{s.timeSlot} &bull; Phòng: {s.room}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-600 block">Đã nạp vào lịch</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Sẵn sàng giảng dạy</span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setCoverScheduleTeacherName(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: MÔ PHỎNG GIÁO VIÊN VÀO LỚP ================= */}
      {isCheckinSimOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="font-bold text-sm text-slate-800">
                Mô phỏng: Giáo viên ấn nút "Vào lớp"
              </div>
              <button
                type="button"
                onClick={() => setIsCheckinSimOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <p className="text-slate-500">
                Hệ thống đối chiếu mốc giờ ấn <strong>Vào lớp</strong> với giờ bắt đầu ca để tự động ghi nhận Chuyên cần:
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn ca học muốn mô phỏng:</label>
                <select
                  value={simSessionCode}
                  onChange={e => setSimSessionCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-800 focus:outline-none focus:border-[#FF5C00]"
                >
                  {sessions.map(s => (
                    <option key={s.sessionCode} value={s.sessionCode}>
                      {s.sessionCode}: {s.classCode} ({s.timeSlot})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => triggerSimulateCheckin('ON_TIME')}
                  className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 transition-colors text-left cursor-pointer"
                >
                  <span className="block">Bấm Đúng Giờ</span>
                  <span className="block text-[10px] text-emerald-600 font-mono mt-0.5">Vào lúc 17:55:00</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerSimulateCheckin('LATE')}
                  className="p-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 font-bold hover:bg-amber-100 transition-colors text-left cursor-pointer"
                >
                  <span className="block">Bấm Đi Muộn</span>
                  <span className="block text-[10px] text-amber-600 font-mono mt-0.5">Vào trễ lúc 18:08:30</span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCheckinSimOpen(false)}
                className="px-4 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BỘ LỌC CỘT BÊN PHẢI (SLIDE-OVER DRAWER) CHO GIÁM SÁT VẬN HÀNH */}
      <FilterDrawer
        isOpen={isTimeFilterOpen}
        onClose={() => setIsTimeFilterOpen(false)}
        title="Bộ lọc Giám sát & Vận hành"
        subtitle="Chọn mốc thời gian, tháng, ngày bắt đầu - kết thúc, tuần và ca trực ban"
        activeCount={dateFrom || dateTo || selectedMonth !== '2026-10' ? 2 : 1}
        onReset={() => {
          setDateFrom('2026-10-06');
          setDateTo('2026-10-06');
          setSelectedMonth('2026-10');
          setSelectedWeek('W1');
          setColFilterTime('ALL');
          showToast('Đã đặt lại về ngày Hôm nay (06/10/2026)!', 'info');
        }}
        onApply={() => {
          showToast(`Đã áp dụng lọc: ${getDateLabel()}`, 'success');
        }}
      >
        <div className="space-y-4 text-xs">
          <StandardTimeFilter
            label="Mốc thời gian ca dạy & vận hành:"
            month={selectedMonth}
            onMonthChange={setSelectedMonth}
            startDate={dateFrom}
            onStartDateChange={setDateFrom}
            endDate={dateTo}
            onEndDateChange={setDateTo}
            selectedWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
            accentColor="orange"
          />

          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Khung giờ ca dạy:</label>
            <select
              value={colFilterTime}
              onChange={e => setColFilterTime(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#FF5C00]"
            >
              <option value="ALL">Tất cả khung giờ trong ngày</option>
              <option value="12:50 - 13:50">Ca Trưa: 12:50 - 13:50</option>
              <option value="18:00 - 19:30">Ca 1: 18:00 - 19:30</option>
              <option value="19:45 - 21:15">Ca 2: 19:45 - 21:15</option>
            </select>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] space-y-1">
            <div className="font-bold flex items-center gap-1">
              <span>⚡ Mẹo vận hành:</span>
            </div>
            <div>
              Ngoài bộ lọc thời gian tổng quát, bạn có thể lọc trực tiếp tại từng cột bảng (Mã buổi, Lớp học, Giáo viên, Khung giờ, Chuyên cần, Trạng thái).
            </div>
          </div>
        </div>
      </FilterDrawer>

    </div>
  );
};
