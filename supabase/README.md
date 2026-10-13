# Bộ SQL Supabase Vuihoc

**Mật khẩu hiện tại:** dùng một cột `NGUOI_DUNG.matkhau` dạng text, 6–8 chữ số. Database đang có chạy `migrations/20261012_plaintext_passwords.sql` sau các bản cũ. Xem [PLAINTEXT_PASSWORDS.md](PLAINTEXT_PASSWORDS.md). Không chạy lại các migration mã hóa/xóa tài khoản cũ sau bản này; `schema.sql` mới đã chứa đầy đủ.

**Bản tinh gọn:** xem [NORMALIZATION.md](NORMALIZATION.md). Database hiện có 32 bảng cần chạy migration normalize_database sau các migration cũ.

**File chính: [schema.sql](schema.sql)** — tạo đầy đủ 31 bảng, dữ liệu mẫu, khóa ngoại, trigger và view. Đây là file dùng khi tạo database mới.

## Chọn file để chạy

| Database hiện tại | File cần chạy |
| --- | --- |
| Chưa có schema vuihoc | Chạy toàn bộ schema.sql trong Supabase SQL Editor |
| Đã có bản 23 bảng | Chạy migrations/20261011_timed_workflow.sql, sau đó migrations/20261011_teacher_evaluations.sql |
| Đã có bản 31 bảng | Chỉ chạy migrations/20261011_teacher_evaluations.sql |
| Đã có đủ 32 bảng | Chạy migrations/20261011_simple_accounts.sql (nếu chưa có), rồi migrations/20261011_encrypted_passwords.sql; xem ENCRYPTED_PASSWORDS.md |

Sau khi chạy schema.sql mới, chạy thêm migrations/20261012_incident_credit.sql để bật tự động chốt hệ số công theo sự cố. Với database hiện có, chỉ cần chạy migration này; không xóa dữ liệu cũ.

Để lưu ngày bắt đầu lớp và chỉ tạo lịch từ ngày đó, chạy tiếp migrations/20261013_class_start_date.sql. Database đã có trước đây giữ nguyên các lớp cũ chưa đặt ngày bắt đầu.

## Các file còn dùng

Bảng công tháng hiện có: chạy **`migrations/20261014_normalize_monthly_payroll.sql`**
cuối cùng để chuyển dữ liệu, dùng truy vấn và xóa hai cột danh sách JSONB.
Xem [NORMALIZED_PAYROLL.md](NORMALIZED_PAYROLL.md). Không chạy lại seed/schema
hoặc các bản đồng bộ công cũ sau bước này.

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

Đã nối đọc/lưu các dữ liệu nghiệp vụ UI hiện có bằng RPC qua phiên đăng nhập. Database đang có cần chạy [migrations/20261011_business_persistence.sql](migrations/20261011_business_persistence.sql). Xem [BUSINESS_PERSISTENCE.md](BUSINESS_PERSISTENCE.md) để biết phạm vi đã nối, bước triển khai và những nguồn JSONB còn cần chuyển đổi để hoàn tất chuẩn hóa. Tệp schema.sql mới đã chứa migration này.

Chưa chạy migration lên Supabase thật trong phiên này. Chưa upload tệp nhị phân lên Storage; chatbot/AI còn mô phỏng. Không dùng Supabase Auth, RLS vẫn chặn truy cập bảng trực tiếp từ anon.

## Kiểm tra cục bộ

Các bài tests/databaseContract.test.ts, tests/timedWorkflow.test.ts và tests/teacherEvaluationSchema.test.ts dùng PGLITE_MODULE_PATH trỏ tới thư mục cài @electric-sql/pglite. Đã kiểm tra tạo mới/chạy lại, migration nâng cấp, khóa ngoại, tuần riêng biệt, sinh công đúng tháng, dạy thay, khóa kỳ và liên kết biên bản với đúng giáo viên.

## Don cot tai khoan

Sau ban mat khau text, chay `migrations/20261012_cleanup_user_columns.sql` de bo `NGUOI_DUNG.maxacthuc` (ma Supabase Auth cu khong con dung). Giu cac cot phien dang nhap, khoa tai khoan, thong tin ho so, nhom quyen va thoi gian. File schema.sql moi da bao gom buoc nay.

## Dong bo he so su co vao doi soat cong

Chay theo thu tu: `migrations/20261012_incident_credit.sql`, `migrations/20261013_negative_work_credit.sql`, `migrations/20261013_sync_incident_catalog_credit.sql`. Ban cuoi dong bo he so thay doi trong danh muc sang su co va bang cong thang chua khoa, gom he so am; sua cac snapshot cu khi nang cap. Ky da khoa giu nguyen. Tong cong = cong chuan + cong su co (vi du 5 + (-1) = 4). Viec sua ghi chu su co khong ghi de he so da doi soat.

Kiem thu: `node tests/incidentCatalogCredit.test.mjs` voi `PGLITE_MODULE_PATH` tro den thu muc `@electric-sql/pglite`.
