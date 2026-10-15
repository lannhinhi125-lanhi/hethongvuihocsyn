# Truy vấn ca dự giờ

Chạy `migrations/20261023_inspection_session_queries.sql` sau `20261021_manual_student_feedback.sql`, rồi tải lại trang. Có thể chạy lại an toàn.

Danh sách lấy từ `BUOI_HOC`, chỉ chọn trạng thái đã học và đúng giáo viên thực dạy (ưu tiên giáo viên cover). Lớp và khung giờ nối qua khóa ngoại; giờ bắt đầu/kết thúc ưu tiên dữ liệu của chính buổi học. Số buổi lấy từ `CHI_TIET_CA_LOP.mabuoi`, không suy ra theo lịch lớp hiện tại. Mã buổi theo định dạng cũ vẫn đọc được số buổi từ chính mã đó. Khi thiếu số buổi gốc, hệ thống chặn lưu thay vì tự gán buổi 1.

Điểm danh, nhận xét và danh sách học sinh lấy từ `DIEM_DANH_BUOI_HOC` và `NHAN_XET_BUOI_HOC` theo `mabuoi`; không lấy danh sách lớp hiện tại. Học liệu và liên kết lấy từ buổi học được chọn. Chưa có dữ liệu thì hiển thị thiếu dữ liệu.

`thongtindugio` là kết quả SELECT trả qua API, không phải cột hay bảng lưu JSON. API chặn ghi trường này. Chỉ thao tác lưu/gửi phiếu ghi `BIEN_BAN_DU_GIO` với khóa ngoại `mabuoi`; mở danh sách/chi tiết không tạo hoặc sửa buổi học.

Kiểm tra: `tests/inspectionSession.test.ts`, `tests/inspectionSessionQueries.test.mjs`.
