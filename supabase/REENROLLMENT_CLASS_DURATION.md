# Đăng ký học lại và thời hạn lớp

Chạy toàn bộ `migrations/20261109_reenrollment_class_duration.sql` trong Supabase SQL Editor sau bản cập nhật 20261108, rồi tải lại ứng dụng. Không chạy lại seed hoặc đặt lại dữ liệu. Migration không thay mã học sinh, không gán thời hạn cho lớp cũ và không có học phí/doanh thu.

- Học sinh đã thôi học: chọn **Đăng ký học lại**, nhập nhu cầu mới, lưu để về **Chờ xếp lớp** hoặc ghép lớp phù hợp. Đợt cũ được lưu trong bảng lịch sử quan hệ; giờ học cũ và ngày đăng ký cũ không bị ghi đè. Các môn khác giữ nguyên.
- Danh mục **Thời hạn lớp học** có sẵn 1, 3, 6 và 12 tháng. Có thể thêm hoặc ngừng sử dụng một thời hạn. Thay đổi danh mục không đổi thời hạn đã lưu của lớp.
- Lớp mới cần ngày bắt đầu và thời hạn. Ngày kết thúc tính theo tháng lịch, gồm ngày cuối: 05/10/2026 + 1 tháng → 04/11/2026. Cuối tháng được chặn theo ngày cuối tháng đích trước khi trừ một ngày. Database tự tính lại ngày cuối, không tin giá trị từ trình duyệt.
- Bộ sinh lịch bỏ qua ngày sau hạn. Rút ngắn hạn của lớp đã có buổi sau ngày cuối sẽ bị từ chối để giữ lịch sử; cần xử lý lịch các buổi đó trước. Lớp cũ chưa có thời hạn tiếp tục hoạt động như trước.
- Báo cáo **Các đợt đăng ký học** phân biệt đăng ký lần đầu, thêm môn và học lại. Các đợt trước nâng cấp được đánh dấu chưa xác định vì thiếu bằng chứng lịch sử.
- Báo cáo **Lớp sắp kết thúc** liệt kê lớp còn hoạt động kết thúc trong 30 ngày tới, bao gồm hôm nay, và lọc thời gian theo ngày kết thúc. Chưa tự đổi trạng thái lớp khi hết hạn.

Kiểm thử PostgreSQL cục bộ: đặt `PGLITE_MODULE_PATH` tới thư mục gói `@electric-sql/pglite`, chạy `node tests/reenrollmentClassDuration.test.mjs`. Kiểm thử giao diện/dữ liệu: `npx tsx tests/classDurationReports.test.ts`, `npm run lint`, `npm run build`.

## Bổ sung thời hạn cho lớp demo cũ

Chạy toàn bộ `apply_demo_class_terms.sql` để nâng cấp và bổ sung thời hạn trong cùng một giao dịch (không cần chạy riêng migration 20261109 trước). Nếu đã nâng cấp, file vẫn chạy lại được.

- DEMO-LOP-001 đến 004: kết thúc 31/10/2026.
- DEMO-LOP-005 đến 008: kết thúc 30/11/2026.
- DEMO-LOP-009, 010, 012: kết thúc 31/12/2026.
- DEMO-LOP-011: bắt đầu 02/11/2026 nên thời hạn một tháng kết thúc 01/12/2026. Giữ nguyên ngày bắt đầu đã có.

Chỉ cập nhật 12 lớp demo chưa có thời hạn, không thay lớp đã có hạn hoặc lớp khác. Thêm thời hạn 2 và 4 tháng vào danh mục vì lớp bắt đầu 01/09 cần các thời hạn đó để kết thúc cuối tháng 10/12. Gỡ buổi dự kiến sau hạn và chi tiết lịch chưa sử dụng; nếu có điểm danh, nhận xét (kể cả bản ghi rỗng), dạy thay, dự giờ, sự cố, công hoặc buổi đã đến ngày học thì toàn bộ giao dịch dừng và hoàn tác. Không xóa lịch sử đã dạy. Chạy lại không thay đổi ngày kết thúc đã thiết lập.

File gộp được tạo từ hai nguồn bằng `node supabase/build_demo_class_terms.mjs`.
