export const moduleNavigation: Record<number, { id: string; label: string }[]> = {
  1: [{ id: 'users', label: 'Danh sách Tài khoản' }, { id: 'roles', label: 'Thiết lập Nhóm quyền' }],
  3: [{ id: 'profile', label: 'Hồ sơ Giáo viên' }, { id: 'availability', label: 'Lịch rảnh & Thời khóa biểu' }, { id: 'evaluation', label: 'Đánh giá Dự giờ' }],
  4: [{ id: 'students', label: 'Hồ sơ Học sinh' }, { id: 'classes', label: 'Quản lý Lớp học' }, { id: 'materials', label: 'Phân phối Học liệu' }],
  5: [{ id: 'diary', label: 'Nhật ký giám sát' }, { id: 'incidents', label: 'Sự cố & điều phối dạy thay' }],
  6: [{ id: 'knowledge', label: 'Tài liệu tri thức' }, { id: 'rag-config', label: 'Bot chat AI' }],
  7: [{ id: 'summary', label: 'Tổng hợp công theo nhân sự' }, { id: 'sessions', label: 'Chi tiết buổi học & Chốt công' }, { id: 'disputes', label: 'Giải trình & Khiếu nại công' }],
};
