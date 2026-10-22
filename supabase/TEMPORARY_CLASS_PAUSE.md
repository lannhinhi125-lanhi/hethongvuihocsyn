# Tạm dừng lớp

Cập nhật mới: chạy toàn bộ [20261115_pause_incident_catalog.sql](migrations/20261115_pause_incident_catalog.sql) sau các migration 20261110–20261114, rồi tải lại ứng dụng. Không chạy lại schema hoặc seed.

- Danh mục sự cố có nhóm **Khác**, chứa Nghỉ lễ / Tết, Nghỉ theo thông báo nhà trường và Lý do khác. Các mục này được chuyển từ danh mục lý do tạm dừng cũ; danh mục cũ được bỏ sau khi chuyển liên kết.
- Giáo viên xin nghỉ dùng lại loại trong nhóm sự cố giáo viên, không tạo lý do trùng.
- Mỗi loại có cấu hình **Cho phép dùng để tạm dừng lớp**. Nghỉ lễ/Tết được đánh dấu **Nghỉ theo lịch**, không phát sinh biên bản sự cố giáo viên hoặc công dạy. Loại sự cố giáo viên dùng hệ số công trong danh mục.
- Nút Tạm dừng lớp lấy các mục đang áp dụng từ Supabase. Lớp và buổi lưu khóa nhóm + khóa loại; lịch giáo viên và báo cáo truy vấn cùng danh mục. Đổi tên cập nhật nhãn hiển thị; mục ngừng áp dụng vẫn tra được lịch sử.
- Lớp đang tạm dừng được giữ nguyên, không cần tiếp tục rồi tạm dừng lại. Migration chuyển liên kết lịch sử và bộ lọc báo cáo đã lưu; không tính lại công cũ. Có thể dùng Sửa lý do tạm dừng để thay lý do.
- Tạm dừng giữ giáo viên, học sinh và ngày kết thúc; ngừng sinh buổi mới. Tiếp tục chỉ khôi phục các buổi tương lai do tạm dừng lớp, giữ lịch sử đã nghỉ.
- Sự cố tự sinh từ tạm dừng được sửa qua lớp. Công đã gửi, điều chỉnh hoặc giải trình phải xử lý đối soát trước khi đổi lý do hoặc tiếp tục.

Dữ liệu lưu bằng cột quan hệ và khóa ngoại; không thêm cột JSON/JSONB, không có danh sách lý do dự phòng trên giao diện. Migration chạy lại được. Kiểm thử: tests/reenrollmentClassDuration.test.mjs và tests/classPauseReporting.test.ts.

Báo cáo dùng chung hai trường **Nhóm sự cố** và **Loại sự cố**, bao gồm các loại nghỉ theo lịch trong nhóm Khác. Không có bộ lọc danh mục lý do tạm dừng riêng. Mẫu báo cáo cũ được chuyển khóa bộ lọc khi đọc; chọn Nghỉ lễ/Tết xem chỉ số Buổi nghỉ theo lịch, không cộng vào Buổi có sự cố.

Nếu gặp lỗi `relation "pause_reason_map" does not exist`: dùng lại file 20261115 đã sửa, sao chép toàn bộ vào một query mới và chạy nguyên khối `DO $pause_catalog_migration$ ... END $pause_catalog_migration$;`. Không cần mở lại lớp hoặc tạo bảng ánh xạ thủ công. Khối SQL thực hiện các bước trong cùng một giao dịch, chạy lại được.
