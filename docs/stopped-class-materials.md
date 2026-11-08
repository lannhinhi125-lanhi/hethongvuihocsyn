# Học liệu và lịch giáo viên sau khi dừng hẳn lớp

Chạy toàn bộ `supabase/migrations/20261227_stop_class_future_materials.sql` bằng postgres trong Supabase SQL Editor, trên database đã chuẩn hóa học liệu và khung giờ. Sau đó triển khai frontend mới.

File cài trigger tự dọn khi chuyển lớp sang Dừng hẳn (`TAM_DUNG`) và dọn các lớp đã dừng hẳn từ trước. Đây là thay đổi có xóa kế hoạch học liệu tương lai chưa sử dụng; không áp dụng cho lớp chỉ tạm dừng lịch (`tamdunglich=true`). Hộp xác nhận dừng hẳn lớp thông báo hành vi này.

- Buổi có giờ bắt đầu trong tương lai và chưa có dấu vết sử dụng được gỡ liên kết học liệu, xóa các link học liệu riêng của buổi. Buổi vẫn được giữ trong database phục vụ vận hành.
- Kế hoạch học liệu tương lai không còn được buổi nào tham chiếu được xóa, kể cả kế hoạch cho một ca còn lại trong tuần hiện tại. Kế hoạch dùng chung với lịch sử được giữ nguyên.
- Bảo vệ buổi đã vào/ra lớp, có nhận xét, điểm danh, công, sự cố, dự giờ hoặc thuộc kỳ công đã khóa. Không xóa hồ sơ học sinh, buổi học, nhận xét hay bảng công.
- Lịch giáo viên ẩn các ca tương lai chưa bắt đầu của lớp đã dừng hẳn, kể cả khi database vẫn giữ buổi Nghỉ học. Giữ các ca quá khứ và buổi có giờ vào/ra thực tế.
- Cài lại không dọn lặp các dữ liệu đã sạch. Chức năng xóa lớp chưa phát sinh buổi vẫn giữ điều kiện cũ; việc gỡ học liệu không làm mất bản ghi buổi để vượt điều kiện xóa lớp.

Kiểm thử SQL chạy trên fixture PGlite với các hàm bảo vệ học liệu thật từ migration chuẩn hóa: lớp đã dừng trước khi cài, chuyển sang dừng hẳn, học liệu tuần hiện tại/tương lai, nguồn dùng chung lịch sử, nhận xét/điểm danh/công/sự cố/dự giờ/kỳ khóa, lớp tạm dừng và lớp khác. Chưa chạy trên database triển khai.
