# Bộ SQL Supabase Vuihoc

**Nhận xét học sinh nhập tay:** Sau bản 20261020, chạy
[migrations/20261021_manual_student_feedback.sql](migrations/20261021_manual_student_feedback.sql).
Dùng NHAN_XET_BUOI_HOC.noidung theo khóa buổi/học sinh, bỏ bảng tiêu chí nhận xét học sinh và cấu hình tiêu chí sinh nhận xét.
Trạng thái đã/chưa nhận xét được SELECT từ tiến độ của buổi, không lưu thêm cột trạng thái.


**Truy vết lớp độc lập, bỏ nhật ký chung:** Chạy
[migrations/20261020_remove_general_audit.sql](migrations/20261020_remove_general_audit.sql)
sau bản 20261018; hỗ trợ cả trường hợp đã chạy 20261019.
Bản này chuyển lịch sử lớp rồi xóa bảng/trigger nhật ký chung, dùng mã số tự tăng và thời gian ngày–giờ trực tiếp.
Xem [STUDENT_CLASS_TRACE.md](STUDENT_CLASS_TRACE.md). Không chạy lại migration cũ sau bản này.


**Checkout tự động và khóa nhận xét:** Sau bản 20261017, chạy
[migrations/20261018_auto_checkout.sql](migrations/20261018_auto_checkout.sql).
Ca đã check-in tự checkout đúng giờ kết thúc qua Cron. Nhận xét chỉ mở sau checkout.
Kết thúc sớm hơn 5 phút là Chưa hoàn tất (cam); còn tối đa 5 phút là Đã học.


**Luồng ca học và nhận xét:** Sau migration khóa ngoại, chạy
[migrations/20261017_session_workflow.sql](migrations/20261017_session_workflow.sql).
Dùng duy nhất BUOI_HOC.trangthai; hình thức dạy và tiến độ nhận xét được truy vấn từ các bảng liên quan.
Xem [SESSION_WORKFLOW.md](SESSION_WORKFLOW.md).

**Liên kết khóa ngoại:** Sau bản bỏ JSONB, chạy
[migrations/20261016_complete_foreign_keys.sql](migrations/20261016_complete_foreign_keys.sql).
Danh sách học sinh lớp được truy vấn từ FK lớp trên HOC_SINH; lịch, quyền,
khối, loại sự cố và phân công/chi tiết buổi có liên kết đầy đủ cho các quan hệ
đã rà soát. Xem [FOREIGN_KEY_LINKS.md](FOREIGN_KEY_LINKS.md) và SQL kiểm tra.

**Cập nhật 15/10/2026 — bỏ JSONB:** Database đã chạy `apply_relational_update.sql`
chạy tiếp [migrations/20261015_remove_remaining_json.sql](migrations/20261015_remove_remaining_json.sql).
Bản này chuyển sáu cột JSONB còn lại sang cột/bảng con và bỏ các cột cũ trong
cùng giao dịch. Xem [NO_JSON_STORAGE.md](NO_JSON_STORAGE.md) về cấu trúc mới,
kiểm tra và thứ tự cài đặt. Không chạy lại schema/seed/migration cũ sau bước này.
Các mô tả và số bảng ở các phần cũ bên dưới thuộc các giai đoạn trước.

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
