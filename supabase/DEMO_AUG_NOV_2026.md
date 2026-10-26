# Bộ dữ liệu demo tháng 8–11/2026

**Dữ liệu báo cáo đa dạng:** sau khi nạp bộ gốc, chạy thêm [enrich_demo_reporting.sql](enrich_demo_reporting.sql) để có ngày tiếp nhận/tạo mới trải qua nhiều tháng, 6 giáo viên THCS/THPT và ngày kết thúc 10–12 cho các lớp demo. Xem [quy mô và tài khoản sau cập nhật](DEMO_REPORTING_UPDATE.md). Không cần reset; các số lượng bên dưới mô tả bộ gốc trước khi bổ sung.

**Quy tắc mới:** sau khi đã nạp demo, chạy riêng [20261214_completed_lessons_credit.sql](migrations/20261214_completed_lessons_credit.sql) để áp dụng Đã học kèm cảnh báo Chưa hoàn tất. Kết thúc sớm không tự trừ công; không có sự cố và đã đủ checkout/nhận xét thì được 1 công. Kỳ đang mở sẽ được bổ sung công còn thiếu, nên tổng dòng công có thể tăng so với mốc 366 bên dưới. Kỳ đã khóa được giữ nguyên; nếu cần áp dụng lại cho kỳ đó, mở khóa theo nghiệp vụ rồi chạy lại file cập nhật này. Không chạy lại reset chỉ để đổi quy tắc công.

Chạy **toàn bộ `supabase/reset_demo_aug_nov_2026.sql`** trong Supabase → SQL Editor → New query → Run. Chỉ chạy file này; không cần chạy file reset hoặc seed cũ trước/sau đó. Tải lại ứng dụng sau khi hoàn tất.

File này thay thế hồ sơ giáo viên, học sinh, buổi học, điểm danh, nhận xét, dự giờ, công, giải trình và lịch sử xếp lớp. Tài khoản thuộc cổng TEACHER cũ được thay bằng tài khoản demo. Tài khoản ADMIN, phân quyền, danh mục và tài liệu/cấu hình AI được giữ. Lớp ngoài nhóm mã `DEMO-LOP-xxx` được giữ thông tin, lịch và học liệu, chuyển về tạm dừng và bỏ giáo viên cũ; lịch sử học/công của các lớp đó được xóa. Các lớp demo cũ được tạo lại.

Không chạy lại `schema.sql` hoặc các migration cũ để nạp bộ này. Database phải có luồng buổi học, tự checkout, đăng ký nhiều môn và tài khoản quản trị toàn quyền đang hoạt động. Các môn/khung giờ/mô hình/trình độ cần thiết được kiểm tra trước khi xóa. Nếu có cấu trúc hoặc liên kết ngoài phạm vi chưa hỗ trợ, câu lệnh dừng và hoàn tác toàn bộ thay vì tự xóa lan sang dữ liệu khác.

## Quy mô và thời gian

Kết quả kiểm thử tại ngày **26/10/2026**, trên cả database quan hệ cũ và database đã chuẩn hóa đến migration `20261213`:

| Dữ liệu | Số lượng |
|---|---:|
| Giáo viên | 24 |
| Học sinh, tên khác nhau | 120 |
| Lớp demo | 24 |
| Buổi học trong 01/08–30/11/2026 | 670 |
| Dòng công do nghiệp vụ tự sinh | 366 |
| Sự cố | 144 |
| Giải trình công | 9 |
| Học sinh có chuyển lớp | 4 |

Số buổi lịch cố định; số dòng công, nhận xét và sự cố phụ thuộc ngày chạy. Các buổi từ ngày hiện tại theo múi giờ Bangkok trở đi vẫn chưa diễn ra, không có check-in/check-out hoặc công giả. Vì vậy tháng 11/2026 hiện dùng để demo lịch tương lai và lớp chờ khai giảng.

| Kỳ công | Tình huống |
|---|---|
| 08/2026 | Đã gửi đối soát, đã chốt và khóa |
| 09/2026 | Đã gửi đối soát, đã chốt và khóa |
| 10/2026 | Còn mở; có người chưa gửi, đã gửi, có giải trình và đã xử lý giải trình |
| 11/2026 | Lịch tương lai; chưa sinh công từ các buổi chưa học |

## Các tình huống để demo

- Giáo viên có nhiều/ít/chưa có công; bốn giáo viên phụ trách hai lớp khác giờ, giáo viên mới nhận lớp tháng 9/10 và giáo viên tạm ngưng. Người dạy thay được chọn cùng môn, tài khoản hoạt động và không trùng giờ với lớp chính hoặc ca dạy thay khác.
- Lớp 1–1, 1–3, 1–5; lớp còn chỗ, đủ sĩ số, đang học, tạm dừng và chờ khai giảng. `DEMO-LOP-011` bắt đầu 02/11; `DEMO-LOP-012` có lịch sử đầu tháng 8 rồi tạm dừng.
- Học sinh học hai môn, chờ xếp lớp, bảo lưu, thôi học; điểm danh có mặt, muộn và vắng.
- Buổi hoàn thành, đi muộn, dạy thay, học sinh xin nghỉ, không vào lớp, kết thúc sớm và thiếu nhận xét. Những buổi chưa đủ điều kiện không được cộng công chuẩn như buổi hoàn thành.
- Sự cố đang xử lý và đã giải quyết. Hệ số công sự cố lấy từ danh mục đang có; không tự đặt hệ số khác với chính sách hiện tại.
- Giải trình chờ duyệt, được duyệt, bị từ chối, có liên kết minh chứng. Chấp thuận giải trình không tự ý đổi hệ số công; có thể dùng màn hình điều chỉnh kèm lý do để demo bước đó.
- Dự giờ có nhiều mức điểm/xếp loại, trạng thái chờ góp ý và đã duyệt.

Chuyển lớp ngày **15/09/2026**:

| Học sinh | Lớp cũ | Lớp mới |
|---|---|---|
| DEMO-HS-003 | DEMO-LOP-003 | DEMO-LOP-013 |
| DEMO-HS-033 | DEMO-LOP-013 | DEMO-LOP-003 |
| DEMO-HS-006 | DEMO-LOP-004 | DEMO-LOP-014 |
| DEMO-HS-036 | DEMO-LOP-014 | DEMO-LOP-004 |

Điểm danh và nhận xét trước ngày chuyển thuộc lớp cũ, từ ngày chuyển thuộc lớp mới. Các snapshot lịch sử này được dựng trong giao dịch nạp demo; một số trigger bảo vệ lịch sử được tạm ngưng trong đúng bước dựng dữ liệu rồi khôi phục trạng thái ban đầu. Cách nạp fixture không thay đổi quy tắc chuyển lớp đang hoạt động trong giao diện.

## Đăng nhập và trình tự demo

Mật khẩu tài khoản giáo viên demo: **`246810`**. Ví dụ `gv.minhanh`, `gv.thuha`, `gv.hoangnam`, `gv.ngoclinh`. Giáo viên bổ sung dùng `gv.demo13` đến `gv.demo24`. Tài khoản `gv.baochau` thuộc giáo viên tạm ngưng, được khóa có chủ đích. Tài khoản quản trị dùng thông tin đăng nhập đang có, không bị đổi mật khẩu.

1. Mở báo cáo theo khoảng ngày 01/08–30/11/2026 để xem lịch và xu hướng; lọc 08–09 để xem công các tháng đã chốt.
2. Mở công tháng 08 hoặc 09: xem trạng thái khóa và thử thao tác sửa để thấy hệ thống chặn. Mở khóa cần nhập lý do theo nghiệp vụ hiện tại.
3. Mở tháng 10: lọc giáo viên, xem giải trình `DEMO-GT-1` đến `DEMO-GT-9`, xử lý các giải trình còn chờ và gửi các bảng chưa gửi. Hoàn tất điều kiện trước khi khóa kỳ.
4. Xem lịch sử xếp lớp của bốn học sinh trong bảng trên và so sánh điểm danh/nhận xét hai lớp theo ngày.
5. Mở lịch tháng 11 để xem lớp sắp khai giảng và các buổi chưa diễn ra; dùng buổi đúng thời gian thực để thao tác check-in/checkout theo quy tắc ứng dụng.

Liên kết phòng học, học liệu, bản ghi và minh chứng dùng `example.com` làm dữ liệu minh họa, không chứa tài liệu hay phòng học thật.

## Kiểm thử và tái tạo file

`scripts/build-demo-dataset.mjs` dựng file SQL từ fixture nhỏ có sẵn và fragment `demo_payroll_scenarios.sql`. Fragment không chạy độc lập.

```powershell
node scripts/build-demo-dataset.mjs
$env:PGLITE_MODULE_PATH=(Resolve-Path '.tmp/demo-validation/node_modules/@electric-sql/pglite').Path
node tests/richDemoDataset.test.mjs
node tests/richDemoDataset.test.mjs --legacy
```

Kiểm thử thực thi SQL trên PostgreSQL PGlite, xác nhận số lượng, lịch sử chuyển lớp, giáo viên không trùng ca, công không nằm ở tương lai, các trạng thái giải trình, khóa công thực sự chặn sửa, tài khoản/danh mục được giữ, chạy lại không nhân đôi và lỗi khóa ngoại bên ngoài hoàn tác nguyên tử. Cần có gói `@electric-sql/pglite` tại đường dẫn biến môi trường.
