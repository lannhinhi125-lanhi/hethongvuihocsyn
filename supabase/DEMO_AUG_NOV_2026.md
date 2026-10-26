# Bộ dữ liệu demo tháng 8–11/2026

**Sửa lỗi giải trình mẫu:** chạy riêng `supabase/fix_demo_payroll_explanations.sql` với dữ liệu đã nạp, không reset. File thay các đơn chung chung bằng mẫu đúng buổi ở tháng 8–10; giữ đơn thực tế/đã sửa nội dung. Kỳ demo tháng 8–9 được mở có lý do rồi khóa lại trong cùng giao dịch để bổ sung lịch sử. Nếu tháng 10 đã khóa hoặc có công ngoài bộ demo, file dừng và hoàn tác. Bản sửa mới này thay bản chỉ xóa 9 đơn trước đó.

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
| Giải trình công | 7 — 2 tháng 8, 2 tháng 9, 3 tháng 10 |
| Học sinh có chuyển lớp | 4 |

Số buổi lịch cố định; số dòng công, nhận xét và sự cố phụ thuộc ngày chạy. Các buổi từ ngày hiện tại theo múi giờ Bangkok trở đi vẫn chưa diễn ra, không có check-in/check-out hoặc công giả. Vì vậy tháng 11/2026 hiện dùng để demo lịch tương lai và lớp chờ khai giảng.

| Kỳ công | Tình huống |
|---|---|
| 08/2026 | Có 1 đơn duyệt sửa hệ số nhập nhầm, 1 đơn từ chối miễn hệ số đi muộn; đã xử lý trước khi chốt và khóa |
| 09/2026 | Có 1 đơn duyệt và 1 đơn từ chối; đã xử lý trước khi chốt và khóa |
| 10/2026 | Có 1 đơn duyệt, 1 đơn từ chối, 1 đơn chờ; chỉ ca mẫu được gửi sớm, phần công còn lại chưa gửi |
| 11/2026 | Lịch tương lai; chưa sinh công từ các buổi chưa học |

## Các tình huống để demo

- Giáo viên có nhiều/ít/chưa có công; bốn giáo viên phụ trách hai lớp khác giờ, giáo viên mới nhận lớp tháng 9/10 và giáo viên tạm ngưng. Người dạy thay được chọn cùng môn, tài khoản hoạt động và không trùng giờ với lớp chính hoặc ca dạy thay khác.
- Lớp 1–1, 1–3, 1–5; lớp còn chỗ, đủ sĩ số, đang học, tạm dừng và chờ khai giảng. `DEMO-LOP-011` bắt đầu 02/11; `DEMO-LOP-012` có lịch sử đầu tháng 8 rồi tạm dừng.
- Học sinh học hai môn, chờ xếp lớp, bảo lưu, thôi học; điểm danh có mặt, muộn và vắng.
- Buổi hoàn thành, đi muộn, dạy thay, học sinh xin nghỉ, không vào lớp, kết thúc sớm và thiếu nhận xét. Những buổi chưa đủ điều kiện không được cộng công chuẩn như buổi hoàn thành.
- Sự cố đang xử lý và đã giải quyết. Hệ số công sự cố lấy từ danh mục đang có; không tự đặt hệ số khác với chính sách hiện tại.
- Giải trình chọn đúng ca có sự cố muộn 8 phút và hệ số dưới 1. Nội dung có ngày, tên và mã buổi; không gắn đơn chung chung vào ca bình thường. Mẫu được duyệt sửa lỗi nhập nhầm 0 về đúng hệ số sự cố; mẫu từ chối đề nghị tính đủ 1 công dù đã vào muộn; mẫu chờ tháng 10 giữ 0 công để hiển thị sai lệch chưa xử lý. Không tạo URL minh chứng giả.
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
3. Mở tháng 10: đối chiếu công theo từng buổi trước khi gửi đối soát. Cuối tháng kiểm tra đầy đủ, gửi lại nếu có công phát sinh hoặc điều chỉnh, xử lý sai lệch rồi mới khóa kỳ và xuất bàn giao nhân sự.
4. Xem lịch sử xếp lớp của bốn học sinh trong bảng trên và so sánh điểm danh/nhận xét hai lớp theo ngày.
5. Mở lịch tháng 11 để xem lớp sắp khai giảng và các buổi chưa diễn ra; dùng buổi đúng thời gian thực để thao tác check-in/checkout theo quy tắc ứng dụng.

Liên kết phòng học, học liệu và bản ghi dùng `example.com` làm dữ liệu minh họa, không chứa tài liệu hay phòng học thật. Giải trình không gắn URL minh chứng giả; đối chiếu trực tiếp buổi học và sự cố liên quan.

## Kiểm thử và tái tạo file

`scripts/build-demo-dataset.mjs` dựng file reset và file sửa từ fixture nhỏ cùng các fragment `demo_valid_explanations.sql`, `demo_payroll_scenarios.sql`, `demo_payroll_repair_prefix.sql`. Không chạy fragment độc lập.

```powershell
node scripts/build-demo-dataset.mjs
$env:PGLITE_MODULE_PATH=(Resolve-Path '.tmp/demo-validation/node_modules/@electric-sql/pglite').Path
node tests/richDemoDataset.test.mjs
node tests/richDemoDataset.test.mjs --legacy
```

Kiểm thử thực thi SQL trên PostgreSQL PGlite, xác nhận số lượng, lịch sử chuyển lớp, giáo viên không trùng ca, công không nằm ở tương lai, các trạng thái giải trình, khóa công thực sự chặn sửa, tài khoản/danh mục được giữ, chạy lại không nhân đôi và lỗi khóa ngoại bên ngoài hoàn tác nguyên tử. Cần có gói `@electric-sql/pglite` tại đường dẫn biến môi trường.
