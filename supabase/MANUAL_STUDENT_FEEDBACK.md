# Nhận xét học sinh nhập tay

Chạy migrations/20261021_manual_student_feedback.sql sau 20261020_remove_general_audit.sql. Không chạy lại schema/seed hoặc migration cũ.

Giữ bảng NHAN_XET_BUOI_HOC với khóa chính (mabuoi,mahocsinh), khóa ngoại tới BUOI_HOC/HOC_SINH, noidung kiểu text, manguoicapnhat liên kết NGUOI_DUNG và các ngày tạo/cập nhật đã có. Khi lưu nội dung mới, tự ghi người thao tác và thời gian vào trường có sẵn. Không tạo bảng nhận xét khác hoặc trường trạng thái trùng lặp; không thêm JSON/JSONB.

Bỏ bảng TIEU_CHI_NHAN_XET và các danh mục nhận xét học sinh LUA_CHON_TIEU_CHI, TIEU_CHI, NHOM_TIEU_CHI; bỏ mavanphong/soluottaoai không dùng trên nhận xét. Nội dung text cũ được giữ nguyên. Không đụng tiêu chí/điểm dự giờ đánh giá giáo viên hoặc chatbot/kho tri thức.

Màn hình giáo viên chỉ có ô nhập nội dung. Nhận xét bị khóa đến khi checkout đã lưu (bấm Kết thúc lớp hoặc tự checkout đúng giờ). Kết thúc sớm hơn 5 phút vẫn Chưa hoàn tất theo luồng hiện có. Công chuẩn chỉ ghi khi đủ điều kiện kết thúc và toàn bộ nhận xét không trống.

Chi tiết lịch học hiện Nhận xét: Chưa nhận xét (0/n), Chưa nhận xét đủ (x/n), hoặc Đã nhận xét (n/n). Trạng thái là truy vấn NHAN_XET_BUOI_HOC qua tien_do_nhan_xet_ca, không tạo bảng/cột trạng thái mới.

Quyền nhận xét tay dùng quyền Check-in/Check-out hiện có, tách khỏi quyền dùng chatbot AI. Các kiểm tra giáo viên chính/dạy thay, lớp/học sinh và kỳ công khóa vẫn được giữ.

Kiểm thử: manualStudentFeedback.test.mjs; noJsonStorage.test.mjs với TEST_FOREIGN_KEYS, TEST_MONITORING_STATE, TEST_AUTO_CHECKOUT, TEST_CLASS_TRACE, TEST_REMOVE_AUDIT và TEST_MANUAL_FEEDBACK cùng bật.
