# Truy vấn ca dự giờ

Chạy `migrations/20261023_inspection_session_queries.sql` sau `20261021_manual_student_feedback.sql`, rồi tải lại trang. Có thể chạy lại an toàn.

Danh sách lấy từ `BUOI_HOC`, chỉ chọn trạng thái đã học và đúng giáo viên thực dạy (ưu tiên giáo viên cover). Lớp và khung giờ nối qua khóa ngoại; giờ bắt đầu/kết thúc ưu tiên dữ liệu của chính buổi học. Số buổi lấy từ `CHI_TIET_CA_LOP.mabuoi`, không suy ra theo lịch lớp hiện tại. Mã buổi theo định dạng cũ vẫn đọc được số buổi từ chính mã đó. Khi thiếu số buổi gốc, hệ thống chặn lưu thay vì tự gán buổi 1.

Điểm danh, nhận xét và danh sách học sinh lấy từ `DIEM_DANH_BUOI_HOC` và `NHAN_XET_BUOI_HOC` theo `mabuoi`; không lấy danh sách lớp hiện tại. Học liệu và liên kết lấy từ buổi học được chọn. Chưa có dữ liệu thì hiển thị thiếu dữ liệu.

`thongtindugio` là kết quả SELECT trả qua API, không phải cột hay bảng lưu JSON. API chặn ghi trường này. Chỉ thao tác lưu/gửi phiếu ghi `BIEN_BAN_DU_GIO` với khóa ngoại `mabuoi`; mở danh sách/chi tiết không tạo hoặc sửa buổi học.

Kiểm tra: `tests/inspectionSession.test.ts`, `tests/inspectionSessionQueries.test.mjs`.

Màn hình dự giờ dùng chung `TeachingSessionDetails` với lịch dạy giáo viên, chọn chính xác `lessonId`. Phiếu đánh giá nằm bên dưới. Phần nhận xét học sinh được ẩn; điểm danh chỉ xem, nút kết thúc không ghi dữ liệu trong màn hình dự giờ. Thiếu bản ghi thì nút xem lại bị vô hiệu hóa, không dùng link phòng học thay video.

Để dọn dữ liệu buổi mẫu đã nạp, chạy `migrations/20261024_remove_sample_lessons.sql` sau bản 23. Script chỉ nhắm vào các mã lớp mẫu đã xác định còn dùng link `example.com`; xóa ca và dữ liệu phụ thuộc, dọn link/học liệu mẫu, giữ lớp/học sinh/giáo viên và giữ phiếu đánh giá (bỏ liên kết tới buổi bị xóa). Buổi dùng link thật được giữ lại. Lịch lớp vẫn còn nên các ca tương lai có thể được sinh lại theo lịch với trạng thái ban đầu, không có check-in/out hoặc nhận xét mẫu. Kỳ công khóa phải được mở theo luồng vận hành trước khi dọn; script không tự mở khóa.

Kiểm thử dọn dữ liệu: đặt `TEST_REMOVE_SAMPLE_LESSONS=1` khi chạy `tests/inspectionSessionQueries.test.mjs`.

Sau bản 24, chạy `migrations/20261025_remove_sample_evaluations.sql` để xóa các phiếu dự giờ mẫu còn nguyên nội dung seed và làm sạch trạng thái, điểm, nhận xét, điểm tiêu chí tổng hợp của giáo viên. Phiếu thật và phiếu mẫu đã được sửa nội dung được giữ lại. Tổng hợp được tính lại từ phiếu còn lại; không có phiếu thì `UNSCORED`, điểm NULL, nhận xét rỗng. Giao diện cũng luôn truy vấn trạng thái từ phiếu, không lấy trạng thái mẫu cũ khi danh sách phiếu trống. Không xóa bảng `BIEN_BAN_DU_GIO` vì bảng này lưu phiếu thực tế.
