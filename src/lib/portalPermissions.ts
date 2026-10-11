import type { SystemRoleGroup } from '../types';
import { TEACHER_PROFILE_PERMISSION } from './teacherAccounts';
export type AccountPortal = 'ADMIN' | 'TEACHER';
export type PermissionModule = { id: string; name: string; features: string[]; readFeatures?: string[] };
export const portalLabels: Record<AccountPortal, string> = { ADMIN: 'Cổng quản trị', TEACHER: 'Cổng giảng dạy' };
export const permissionModules: Record<AccountPortal, PermissionModule[]> = {
  ADMIN: [
    { id: 'PH1', name: 'Tài khoản & Phân quyền', features: ['Xem danh sách tài khoản và nhóm quyền', 'Cấp tài khoản & Mật khẩu người dùng', 'Khóa / Mở khóa tài khoản nhân sự', 'Chỉnh sửa thông tin tài khoản & Mật khẩu', 'Tạo, sửa, xóa & Gán Nhóm quyền'] },
    { id: 'PH2', name: 'Danh mục dùng chung', readFeatures: ['Xem danh mục dùng chung'], features: ['Xem danh mục dùng chung', 'Quản lý danh mục môn học', 'Cấu hình Cấp học & Lớp dạy', 'Quản lý danh mục trình độ', 'Quản lý mô hình lớp và sĩ số tối đa', 'Cấu hình Khung giờ ca dạy chuẩn (Time Slot)', 'Cấu hình Danh mục Sự cố & Vi phạm ca học', 'Cấu hình hệ số công theo sự cố', 'Tạo danh mục bổ sung và danh mục con'] },
    { id: 'PH3', name: 'Hồ sơ giáo viên & Dự giờ', readFeatures: ['Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên'], features: ['Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên', TEACHER_PROFILE_PERMISSION, 'Tạo hồ sơ và cấp tài khoản giáo viên', 'Chấm điểm và cập nhật báo cáo dự giờ'] },
    { id: 'PH4', name: 'Học sinh & Ghép lớp', readFeatures: ['Xem hồ sơ học sinh và danh sách lớp'], features: ['Xem hồ sơ học sinh và danh sách lớp', 'Tiếp nhận học sinh, nhu cầu môn & bảo lưu/hủy', 'Tạo, sửa, xóa lớp và cập nhật link phòng học', 'Ghép học sinh vào lớp (Kiểm soát chặn vượt trần)', 'Phân công giáo viên (Khớp nối môn và lịch rảnh)', 'Thêm, sửa, xóa và nạp học liệu theo tuần'] },
    { id: 'PH5', name: 'Giám sát ca & Sự cố', readFeatures: ['Theo dõi thời khóa biểu toàn hệ thống (Calendar)'], features: ['Theo dõi thời khóa biểu toàn hệ thống (Calendar)', 'Ghi nhận và xử lý sự cố ca dạy', 'Tìm và phân công giáo viên dạy thay'] },
    { id: 'PH6', name: 'Trợ lý AI Giảng dạy', readFeatures: ['Xem cấu hình và tài liệu AI'], features: ['Xem cấu hình và tài liệu AI', 'Cấu hình Prompt văn phong & Tiêu chí nhận xét môn', 'Quản lý kho tài liệu tri thức SOP', 'Sử dụng AI sinh & tinh chỉnh nhận xét học sinh', 'Sử dụng chatbot tra cứu quy chế và nghiệp vụ'] },
    { id: 'PH7', name: 'Đối soát công ca dạy', readFeatures: ['Tổng hợp công dạy toàn bộ giáo viên theo kỳ'], features: ['Tổng hợp công dạy toàn bộ giáo viên theo kỳ', 'Điều chỉnh hệ số công từng buổi kèm lý do', 'Gửi bảng công cho giáo viên đối soát', 'Xử lý & phê duyệt đơn giải trình công dạy', 'Khóa, mở kỳ công và xuất CSV / in bảng công'] },
    { id: 'PH8', name: 'Báo cáo & Thống kê', readFeatures: ['Xem Dashboard chỉ số KPI & Biểu đồ tổng quan'], features: ['Xem Dashboard chỉ số KPI & Biểu đồ tổng quan', 'Xem báo cáo giáo viên, học sinh và lớp học', 'Xem Báo cáo sự cố, dạy thay & dự giờ chuyên môn', 'Công cụ tạo báo cáo tùy biến (Dynamic Report)', 'Lưu và quản lý mẫu báo cáo tùy chỉnh', 'Xuất kết quả báo cáo CSV'] }
  ],
  TEACHER: [
    { id: 'T_AVAILABILITY', name: 'Đăng ký lịch rảnh', features: ['Giáo viên đăng ký lịch rảnh theo tuần', 'Xem lịch rảnh cá nhân'] },
    { id: 'T_SCHEDULE', name: 'Lịch dạy & Phòng học', features: ['Xem lịch dạy và lớp được phân công', 'Giáo viên Check-in / Check-out vào ca dạy', 'Vào phòng học và xem học liệu lớp được giao', 'Báo cáo sự cố ca dạy (đi muộn, lỗi mạng, nghỉ)', 'Sử dụng AI hỗ trợ nhận xét và chatbot giảng dạy'] },
    { id: 'T_EVALUATION', name: 'Hồ sơ & Đánh giá dự giờ', features: ['Xem hồ sơ cá nhân', 'Xem kết quả và nhận xét dự giờ của bản thân'] },
    { id: 'T_RECONCILE', name: 'Đối soát công ca dạy', features: ['Xem bảng kê công dạy cá nhân theo kỳ', 'Gửi giải trình / khiếu nại sai lệch ca dạy', 'Theo dõi kết quả xử lý giải trình cá nhân', 'Xuất bảng công cá nhân'] }
  ]
};
export function rolePortal(role: SystemRoleGroup): AccountPortal {
  return role.portal || (role.category === 'GIẢNG DẠY' ? 'TEACHER' : 'ADMIN');
}
const legacyPermissionLabels: Record<string, string> = {
  "Cấu hình Môn học (Toán, Tiếng Anh) & Khối lớp": "Quản lý danh mục môn học",
  "Cấu hình Khung chương trình / Trình độ": "Quản lý danh mục trình độ",
  "Cấu hình Mô hình lớp & Sĩ số trần (1-1, 1-3, 1-5)": "Quản lý mô hình lớp và sĩ số tối đa",
  "Tạo hồ sơ giáo viên (Gán 1 môn Toán/Anh)": "Tạo hồ sơ và cấp tài khoản giáo viên",
  "Xem hồ sơ giáo viên và kết quả dự giờ": "Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên",
  "Khởi tạo lớp, gán gói thời hạn tự tính ngày kết thúc": "Tạo, sửa, xóa lớp và cập nhật link phòng học",
  "Thực hiện chấm điểm dự giờ sư phạm (3 tiêu chí)": "Chấm điểm và cập nhật báo cáo dự giờ",
  "Khóa sổ Chốt công & Xuất file Excel bàn giao": "Khóa, mở kỳ công và xuất CSV / in bảng công",
  "Xem Báo cáo giáo viên, lớp học & hạn lớp theo gói": "Xem báo cáo giáo viên, học sinh và lớp học",
  "Xem lịch rảnh cá nhân và trạng thái khóa tuần": "Xem lịch rảnh cá nhân",
  "Chatbot AI 24/7 tra cứu quy chế & nghiệp vụ": "Sử dụng chatbot tra cứu quy chế và nghiệp vụ",
  "Nạp học liệu: Thêm theo tuần & Excel mẫu": "Thêm, sửa, xóa và nạp học liệu theo tuần",
  "Quét giáo viên rảnh cùng môn để dạy thay (Cover)": "Tìm và phân công giáo viên dạy thay",
  "Xem tổng hợp lịch rảnh & Khóa sổ đăng ký tuần": "Xem hồ sơ, lịch rảnh, thời khóa biểu và kết quả dự giờ giáo viên"
};
export function expandPermissions(permissions: string[], portal: AccountPortal): string[] {
  permissions = permissions.map(value => legacyPermissionLabels[value] || value);
  const modules = permissionModules[portal];
  const known = new Set(modules.flatMap(module => module.features));
  const selected = new Set(permissions.filter(value => known.has(value)));
  for (const module of modules) {
    if (permissions.includes('ALL') || (portal === 'TEACHER' && permissions.includes('TEACHER_PORTAL')) || permissions.includes(module.id + '_ALL')) {
      module.features.forEach(value => selected.add(value));
    } else if (permissions.includes(module.id + '_READ')) {
      module.readFeatures?.forEach(value => selected.add(value));
    }
    if (portal === 'ADMIN' && module.id === 'PH3' && permissions.includes('PH3_WRITE')) selected.add(TEACHER_PROFILE_PERMISSION);
  }
  return [...selected];
}
// Preserve existing module tokens when their entire scope remains selected.
export function serializePermissions(selected: string[], portal: AccountPortal): string[] {
  const modules = permissionModules[portal], result = new Set(selected);
  for (const module of modules) {
    if (portal === 'ADMIN' && module.features.every(value => result.has(value))) {
      module.features.forEach(value => result.delete(value)); result.add(module.id + '_ALL');
    }
  }
  return [...result];
}
