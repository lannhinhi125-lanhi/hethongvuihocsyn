# Tạm nghỉ lớp

Chạy toàn bộ `migrations/20261110_temporary_class_pause.sql` trong SQL Editor, sau bản cập nhật thời hạn lớp 20261109. Sau đó tải lại ứng dụng.

- Menu dấu ba chấm của lớp có **Tạm dừng lớp**, đổi thành **Tiếp tục lớp** khi đang nghỉ.
- Tạm nghỉ giữ nguyên giáo viên, đăng ký học sinh, ca đã xếp và ngày kết thúc lớp.
- Không sinh buổi mới; buổi tương lai chưa bắt đầu được chuyển sang Nghỉ học và đánh dấu nội bộ là hoãn do lớp nghỉ.
- Tiếp tục từ thời điểm bấm nút: chỉ khôi phục buổi tương lai do tạm nghỉ lớp. Không khôi phục các buổi nghỉ vì lý do khác, không sinh bù thời gian đã nghỉ.
- **Kết thúc lớp** ngừng hẳn, trả học sinh về Chờ xếp lớp và giải phóng ca theo luồng hiện có.
- Buổi đang học, lịch sử đã học, nhận xét và công không bị xóa.

Hai cờ boolean là cột quan hệ thông thường, không thêm cột JSON/JSONB. Migration chạy lại được.
