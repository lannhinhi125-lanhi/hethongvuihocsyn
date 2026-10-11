# Biên bản dự giờ liên kết giáo viên

Bộ schema mới có **32 bảng**. BIEN_BAN_DU_GIO là bảng thứ 32.

- Database mới: chạy [schema.sql](schema.sql).
- Đã có 31 bảng: chạy [migration biên bản dự giờ](migrations/20261011_teacher_evaluations.sql).
- Đã có 23 bảng: chạy migration timed_workflow trước, rồi migration teacher_evaluations.

## Các khóa liên kết

| Cột | Liên kết | Quy tắc |
| --- | --- | --- |
| magiaovien | GIAO_VIEN.madinhdanh | NOT NULL, FK: biên bản luôn có đúng một giáo viên tồn tại |
| mabuoi | BUOI_HOC.madinhdanh | FK; có thể null cho biên bản cũ chưa có ID ca chuẩn |
| malophoc | LOP_HOC.malophoc | NOT NULL, FK; khi có mabuoi phải đúng lớp của ca |
| manguoinhan | NGUOI_DUNG.madinhdanh | FK; phải khớp GIAO_VIEN.manguoidung khi được cung cấp |
| manguoidanhgia | NGUOI_DUNG.madinhdanh | FK tới tài khoản người chấm; tên/vai trò giữ để hiển thị lịch sử |

Nếu gắn mabuoi, giáo viên được đánh giá phải là người thực dạy (cover nếu có, giáo viên chính nếu không). ngaycahoc tự lấy từ ca; nhập ngày khác thì bị từ chối. Ngày đánh giá có thể khác ngày ca, ví dụ lập/gửi biên bản sau buổi học.

Mã biên bản unique. Điểm tổng và tc1/tc2/tc3 trong thang 0–10. Có ngày tạo/cập nhật, trạng thái, người nhận, giờ gửi, nội dung nhận xét, ưu điểm, phần cần cải thiện, khuyến nghị, phòng học và bản ghi. Thay đổi được ghi vào NHAT_KY_NGHIEP_VU.

Dataset mapper: teacher_evaluations. teacherId → magiaovien, lessonId → mabuoi, evaluatorUserId → manguoidanhgia, recipientUserId → manguoinhan. Mapper chuẩn hóa ngày DD/MM/YYYY hoặc YYYY-MM-DD thành DATE ISO; từ chối ngày không tồn tại.

## Giao diện và dữ liệu cũ

Màn Module3_Teachers vốn đã ghi teacherId trong object biên bản. Màn TeacherEvaluationView đã bổ sung teacherId, evaluatorUserId và recipientUserId ở luồng tạo; mã biên bản không còn cố định năm 2026 hoặc dùng ba chữ số ngẫu nhiên dễ trùng.

Dữ liệu trước đây nằm trong GIAO_VIEN.baocaodanhgia JSONB, nên đã thuộc một hồ sơ giáo viên nhưng SQL không ràng buộc khóa ngoại cho từng phần tử. Bảng mới cung cấp ràng buộc thực sự.

**Chưa chuyển các màn sang CRUD Supabase và chưa tự chuyển mảng JSONB cũ sang bảng mới.** Khi chuyển dữ liệu cũ, lấy giáo viên sở hữu từ GIAO_VIEN.madinhdanh; nếu teacherId bên trong mảng mâu thuẫn thì cần xử lý, không tự đổi người. Dùng BIEN_BAN_DU_GIO làm nguồn chính sau khi tích hợp. Chỉ gắn mabuoi khi đã xác định đúng ID ca; không suy đoán bằng tên hoặc số buổi.

RLS bật; chỉ backend service_role có quyền hiện tại. Khóa ngoại xác nhận đối tượng tồn tại, không thay thế kiểm tra quyền người chấm.

Kiểm thử: tests/teacherEvaluationSchema.test.ts — FK giáo viên, giáo viên thực dạy, lớp/ngày ca, tài khoản người nhận, điểm, ngày hợp lệ và migration chạy lại.
