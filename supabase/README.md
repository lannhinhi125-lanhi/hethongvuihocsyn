# Bộ SQL Supabase Vuihoc

**Bản tinh gọn:** xem [NORMALIZATION.md](NORMALIZATION.md). Database hiện có 32 bảng cần chạy migration normalize_database sau các migration cũ.

**File chính: [schema.sql](schema.sql)** — tạo đầy đủ 31 bảng, dữ liệu mẫu, khóa ngoại, trigger và view. Đây là file dùng khi tạo database mới.

## Chọn file để chạy

| Database hiện tại | File cần chạy |
| --- | --- |
| Chưa có schema vuihoc | Chạy toàn bộ schema.sql trong Supabase SQL Editor |
| Đã có bản 23 bảng | Chạy migrations/20261011_timed_workflow.sql, sau đó migrations/20261011_teacher_evaluations.sql |
| Đã có bản 31 bảng | Chỉ chạy migrations/20261011_teacher_evaluations.sql |
| Đã có đủ 32 bảng | Chạy migrations/20261011_simple_accounts.sql (nếu chưa có), rồi migrations/20261011_encrypted_passwords.sql; xem ENCRYPTED_PASSWORDS.md |

Không cần chạy migration riêng sau khi đã chạy schema.sql mới. Migration được giữ để nâng cấp database hiện có mà không xóa dữ liệu.

## Các file còn dùng

- [schema.sql](schema.sql): cấu trúc đầy đủ và dữ liệu mẫu.
- [verify_schema.sql](verify_schema.sql): truy vấn kiểm tra bảng, khóa ngoại, RLS và dữ liệu.
- [DATA_DICTIONARY.md](DATA_DICTIONARY.md): đối chiếu trường UI với cột SQL của các bảng nền.
- [TIMED_WORKFLOW.md](TIMED_WORKFLOW.md): 8 bảng theo tuần/ngày, liên kết ca học–điểm danh–nhận xét–sự cố–công–giải trình.
- [TEACHER_EVALUATIONS.md](TEACHER_EVALUATIONS.md): biên bản dự giờ, khóa ngoại giáo viên và ca.
- [SIMPLE_ACCOUNTS.md](SIMPLE_ACCOUNTS.md): hướng dẫn đăng nhập bằng NGUOI_DUNG, không dùng Supabase Auth.
- [setup_admin.sql](setup_admin.sql): đặt mật khẩu quản trị đầu tiên.
- [ENCRYPTED_PASSWORDS.md](ENCRYPTED_PASSWORDS.md): nâng cấp để quản trị giữ nút mắt xem lại mật khẩu.
- migrations/: các bản nâng cấp từ cấu trúc cũ.

## Lưu hồ sơ giáo viên

Đã nối tạo hồ sơ và tài khoản giáo viên trong cùng giao dịch, đọc lại hồ sơ/danh mục và đăng nhập giáo viên. Database hiện có cần chạy [migrations/20261011_teacher_persistence.sql](migrations/20261011_teacher_persistence.sql) sau bản tinh gọn. Xem [TEACHER_PERSISTENCE.md](TEACHER_PERSISTENCE.md).

## Trạng thái tích hợp

Đã nối đăng nhập riêng và đọc/lưu tài khoản, nhóm quyền bằng SQL RPC; **không dùng Supabase Auth**. Chạy migration theo SIMPLE_ACCOUNTS.md và ENCRYPTED_PASSWORDS.md; database cũ đã có quản trị không cần đặt lại mật khẩu. Ngoài tạo/đọc hồ sơ giáo viên, các màn nghiệp vụ khác chưa nối CRUD và chưa chuyển sang bảng nghiệp vụ mới. Chỉ nhập URL/key chưa đủ để mọi màn lưu được. RLS tiếp tục chặn truy cập bảng trực tiếp từ anon.

Dữ liệu cũ trong JSONB không tự chuyển sang các bảng mới. Những phần còn cần xử lý khi nối giao diện:

- Lịch rảnh phải ghi vào LICH_RANH_TUAN/CHI_TIET_LICH_RANH theo đúng tuần.
- Ca dùng BUOI_HOC.madinhdanh; các màn dùng cùng mã ca thay vì map buổi 1/2.
- Sự cố/cover/công chuyển sang nguồn mới; bỏ tháng cố định trong hai hàm AppContext cũ.
- Biên bản dự giờ dùng BIEN_BAN_DU_GIO làm nguồn chính thay vì mảng baocaodanhgia.
- API cũ còn dùng tên bảng tiếng Anh cần thay bằng tên/mapper hiện tại.
- Danh mục bổ sung, mẫu báo cáo, lượt AI hiện còn trong bộ nhớ.
- Chatbot và tệp minh chứng/tệp SOP cần lưu trữ riêng; metadata tệp không phải nội dung tệp.
- Kiểm tra quyền, học sinh thuộc lớp, xếp lịch trùng và lưu đồng thời ở backend.

Sau khi tích hợp, nghiệm thu bằng thao tác UI → database xác nhận → tải lại trang → tài khoản khác xem đúng quyền. Các bài kiểm tra hiện tại không thay thế nghiệm thu trên Supabase thật.

## Kiểm tra cục bộ

Các bài tests/databaseContract.test.ts, tests/timedWorkflow.test.ts và tests/teacherEvaluationSchema.test.ts dùng PGLITE_MODULE_PATH trỏ tới thư mục cài @electric-sql/pglite. Đã kiểm tra tạo mới/chạy lại, migration nâng cấp, khóa ngoại, tuần riêng biệt, sinh công đúng tháng, dạy thay, khóa kỳ và liên kết biên bản với đúng giáo viên.
