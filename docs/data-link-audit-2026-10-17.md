# Rà soát liên kết dữ liệu các phân hệ — 17/10/2026

> Đây là kết quả trước khi sửa theo yêu cầu tiếp theo. Các luồng đăng ký nhiều môn,
> chuyển/rút lớp và mã giáo viên đã được sửa trong mã và migration mới;
> xem [thiết kế và cách áp dụng](../supabase/STUDENT_SUBJECT_ENROLLMENTS.md).
> Chưa triển khai migration lên Supabase thật.

## Kết luận và phạm vi

Chưa đủ cơ sở kết luận tất cả dữ liệu đã liên kết đúng. Mã ứng dụng đã dùng chung kho dữ liệu đọc/ghi bằng RPC và có migration chuẩn hóa quan hệ. Tuy nhiên có hai đường chọn/lưu giáo viên qua tên có thể gán sai người trùng tên. Chưa truy vấn Supabase thực tế, chưa xác nhận các migration đã được áp dụng hay dữ liệu hiện có có sai lệch.

Rà soát này đọc mã giao diện, AppContext, persistence, mapper, SQL migration và các truy vấn báo cáo. Không sửa nghiệp vụ, chạy migration, đăng nhập tài khoản hoặc thay đổi dữ liệu.

## Đối chiếu phân hệ

| Phân hệ | Liên kết thể hiện trong mã | Đánh giá |
| --- | --- | --- |
| 1. Tài khoản và quyền | accountSession; nhóm quyền, danh mục quyền, bảng gán quyền; tạo giáo viên và tài khoản qua RPC | Có luồng tích hợp; chưa xác nhận dữ liệu và quyền trên server thực tế |
| 2. Danh mục | businessPersistence; bảng danh mục và khóa ngoại cho lịch, khối, loại sự cố | Có cấu trúc liên kết trong các migration; phụ thuộc server đã cập nhật |
| 3. Giáo viên và dự giờ | teacherPersistence; teacher_evaluations, liên kết giáo viên/buổi; dữ liệu ca phục vụ dự giờ qua truy vấn | Có đường đọc/ghi và quan hệ trong mã |
| 4. Học sinh, lớp, lịch, học liệu | HOC_SINH.malophientai; LICH_LOP, LICH_DANG_KY_HOC_SINH; bảng học liệu và chi tiết ca | Có liên kết; chọn giáo viên lớp qua tên còn rủi ro; một hồ sơ chỉ có một lớp hiện tại |
| Cổng giáo viên | Đọc chung classes, dated_lessons; điểm danh, nhận xét thuộc buổi; refresh lịch 15 giây khi trang hiện | Có luồng liên thông; cần kiểm tra thực tế sau lưu và đăng nhập lại |
| 5. Giám sát, sự cố, cover | dated_lessons, lesson_incidents; phân công liên kết BUOI_HOC; refresh 30 giây khi trang hiện | Có luồng liên thông; đường lưu cover chuyển tên về mã có thể chọn nhầm |
| 6. Tài liệu và trợ lý | sop_documents, document_categories, rag_bot_config, tone_directives dùng businessPersistence; migration loại tài liệu có FK | Cấu hình/tài liệu có đường lưu; không dùng việc này để kết luận AI đã tích hợp đầy đủ |
| 7. Công và giải trình | monthly_payroll qua RPC; encode/decode kết quả truy vấn, SQL ghi các trường nghiệp vụ vào bảng quan hệ | Có cấu trúc liên kết ca–công–giải trình; chưa đối soát số liệu thực tế |
| 8. Báo cáo | Đọc dữ liệu dùng chung; dự giờ đọc teacher_evaluations và dated_lessons; mẫu báo cáo có persistence | Có nguồn dữ liệu liên thông trong mã; kết quả phụ thuộc dữ liệu/quyền/migration thực tế |

## Phát hiện cần xử lý

### 1. Chọn giáo viên đứng lớp bằng tên — ưu tiên cao

`src/views/Module4_StudentsClasses.tsx:1842` dùng `value={t.name}` cho lựa chọn giáo viên. Tại dòng 865, mã lấy `eligibleTeachersForClass.find(t => t.name === clsTeacher)` rồi lưu ID của kết quả đầu tiên.

Nếu có hai giáo viên hợp lệ cùng tên, giao diện không giữ được ID người được chọn và có thể lưu ID của người còn lại. Khóa ngoại vẫn hợp lệ nên không phát hiện nhầm người. Cần giữ teacherId trong state/value của lựa chọn và chỉ dùng tên để hiển thị.

### 2. Giáo viên dạy thay bị chuyển ID → tên → ID — ưu tiên cao

`src/views/Module5_OperationsMonitoring.tsx:581` tìm giáo viên theo ID đã chọn, nhưng dòng 612 chỉ đưa tên vào trạng thái ca. `src/lib/monitoringPersistence.ts:29` lấy lại ID bằng `teachers.find(t => t.name === session.coverTeacher)`.

Vì vậy chọn đúng ID ở modal vẫn có thể ghi ID của giáo viên khác trùng tên. Khi mở modal, dòng 543 cũng khôi phục lựa chọn từ tên. Cần giữ coverTeacherId xuyên suốt dữ liệu ca và đường lưu; tên chỉ phục vụ hiển thị.

### 3. Một hồ sơ học sinh chỉ gắn một lớp hiện tại — giới hạn nghiệp vụ

Migration `20261016_complete_foreign_keys.sql` dựng danh sách học sinh lớp từ `HOC_SINH.malophientai`. Đây là liên kết một lớp hiện tại cho mỗi hồ sơ, không phải quan hệ nhiều lớp. Tài liệu `supabase/FOREIGN_KEY_LINKS.md` cũng xác định giới hạn này. Nếu yêu cầu một học sinh học đồng thời Toán và Anh bằng cùng hồ sơ, cấu trúc hiện tại chưa đáp ứng; không tự kết luận dữ liệu hiện có sai.

### 4. Hướng dẫn cài đặt chưa đồng nhất với mã hiện tại

README gốc vẫn nói các màn nghiệp vụ chỉ lưu trong bộ nhớ, trong khi `businessPersistence.ts` đã gọi `vuihoc_business_data` và `vuihoc_save_business`. Các hướng dẫn SQL còn mô tả nhiều giai đoạn cấu trúc và số bảng. Không thể dùng README hay tên ngày migration để xác nhận database đã cập nhật; cần kiểm tra cấu trúc và định nghĩa RPC trên server.

## Kết quả kiểm tra thực thi

- `node node_modules/typescript/bin/tsc --noEmit`: đạt, mã thoát 0.
- Thử chạy bộ test và chạy lại 9 test chọn lọc tuần tự: bị chặn lúc khởi động tsx bởi `uv_os_get_passwd returned ENOMEM`. Chưa chạy được các assertion; đây không phải bằng chứng lỗi nghiệp vụ.
- Chưa có `PGLITE_MODULE_PATH`, thư mục `node_modules/@electric-sql/pglite` không tồn tại; chưa chạy kiểm thử PostgreSQL cục bộ.
- Chưa kiểm tra database Supabase thật. Anon key của frontend không thay thế quyền đọc toàn bộ dữ liệu hoặc metadata qua SQL.

## Kiểm chứng còn cần trên database thực tế

Chạy bằng kết nối SQL được cấp quyền, chỉ đọc:

1. `supabase/diagnostics/foreign_key_audit.sql`: 12 quan hệ được liệt kê cần có trạng thái OK. File này chỉ kiểm tra nhóm FK cụ thể, không đại diện toàn bộ quan hệ nghiệp vụ.
2. `supabase/diagnostics/relational_storage_audit.sql`: đối chiếu bảng, kiểu cột và cấu trúc đang triển khai; diễn giải cùng migration mới vì file chẩn đoán có thể phản ánh thiết kế cũ.
3. Đối soát dữ liệu ca–giáo viên–cover–sự cố–công, sĩ số–danh sách học sinh, và biên bản dự giờ–buổi tương ứng. Có FK không đồng nghĩa đã gắn đúng đối tượng nghiệp vụ.
4. Kiểm tra luồng tạo/sửa lớp, ghép/rút học sinh, phân công cover, điểm danh/nhận xét, phát sinh công và báo cáo sau tải lại, bằng các tài khoản có quyền tương ứng.

Ưu tiên sửa hai đường liên kết giáo viên bằng tên trước, rồi đối soát server để đưa ra kết luận cuối cùng.
