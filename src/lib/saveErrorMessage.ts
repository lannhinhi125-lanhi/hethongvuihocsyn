const tableLabels:Record<string,string>={
 LOP_HOC:'lớp học',GIAO_VIEN:'giáo viên',HOC_SINH:'học sinh',NGUOI_DUNG:'tài khoản',NHOM_QUYEN:'nhóm quyền',
 DANG_KY_MON_HOC:'đăng ký môn học',LICH_LOP:'lịch lớp',LICH_DANG_KY_MON_HOC:'lịch đăng ký môn học',
 LICH_RANH_DINH_KY:'lịch rảnh giáo viên',BUOI_HOC:'buổi học',MON_HOC:'môn học',TRINH_DO:'trình độ',
 CAP_HOC:'cấp học',LUA_CHON_CAP_HOC:'khối lớp',MO_HINH_LOP:'mô hình lớp',KHUNG_GIO:'khung giờ',
 LOAI_TAI_LIEU:'loại tài liệu',TAI_LIEU_QUY_TRINH:'tài liệu',BIEN_BAN_DU_GIO:'biên bản dự giờ',
 HOC_LIEU_LOP:'học liệu lớp',PHAN_CONG_DAY_THAY:'phân công dạy thay',BANG_CONG_THANG:'bảng công tháng',
 DIEM_DANH_BUOI_HOC:'điểm danh buổi học',NHAN_XET_BUOI_HOC:'nhận xét buổi học',LOAI_SU_CO:'loại sự cố',
 DANH_MUC_SU_CO:'danh mục sự cố',SU_CO_BUOI_HOC:'sự cố buổi học'
};
const fieldLabels:Record<string,string>={
 tendangnhap:'Tên đăng nhập',thudientu:'Email',malophoc:'Mã lớp',mamonhoc:'Mã môn học',
 mamohinh:'Mã mô hình lớp',matrinhdo:'Mã trình độ',makhunggio:'Mã khung giờ',maloai:'Mã loại',
 madinhdanh:'Mã định danh',mabienban:'Mã biên bản',mabaocao:'Mã báo cáo'
};

/** Explain database constraints without changing or storing the rejected data. */
export function saveErrorMessage(error:unknown):string {
 const item=error&&typeof error==='object'?error as {message?:unknown;code?:unknown;details?:unknown}:{};
 const message=typeof error==='string'?error:typeof item.message==='string'?item.message:'Chưa lưu được dữ liệu. Vui lòng thử lại.';
 const detail=typeof item.details==='string'?item.details:'';
 const text=`${message} ${detail}`;
 const code=String(item.code||'');
 if(code==='23503'||code==='23001'||/foreign key constraint/i.test(message)){
  const table=text.match(/(?:referenced from|not present in) table "([^"]+)"/i)?.[1]
   ||Array.from(message.matchAll(/on table "([^"]+)"/gi)).at(-1)?.[1];
  const label=table?tableLabels[table.toUpperCase()]:undefined;
  if(/not present in table/i.test(text))return `Không thể lưu vì ${label||'dữ liệu liên kết'} đã bị xóa hoặc không còn tồn tại. Hãy tải lại dữ liệu và chọn lại giá trị hợp lệ.`;
  return `Không thể sửa hoặc xóa vì bản ghi đang được dùng trong ${label||'dữ liệu khác'}. Hãy kiểm tra và xử lý liên kết trước; nếu liên quan đến lớp còn hoạt động, cần dừng lớp để giải phóng phân công.`;
 }
 if(code==='23505'||/violates unique constraint/i.test(message)){
  const field=detail.match(/Key \(([^,)]+)/i)?.[1];
  return `${field&&fieldLabels[field]?fieldLabels[field]:'Giá trị định danh'} đã được sử dụng. Hãy nhập giá trị khác hoặc cập nhật bản ghi đã có.`;
 }
 // Keep business-rule messages (class codes, locked payroll, permissions) intact.
 return message;
}
