# Lưu dữ liệu nghiệp vụ lên Supabase

Mã nguồn đã nối đọc/lưu dữ liệu qua RPC và phiên đăng nhập nội bộ, không tạo lại CA_HOC và không dùng service_role ở trình duyệt.

Bảng công tháng đã có bản nâng cấp riêng: chạy `migrations/20261014_normalize_monthly_payroll.sql` cuối cùng. Bản này chuyển công/giải trình sang các bảng hiện có, thêm bảng trạng thái gửi đối soát theo giáo viên/kỳ, rồi xóa hai cột danh sách JSONB. Màn hình nhận danh sách truy vấn qua RPC. Xem [NORMALIZED_PAYROLL.md](NORMALIZED_PAYROLL.md).

## Nâng cấp database đang có

Trong Supabase → SQL Editor → New query, chạy toàn bộ migrations/20261011_business_persistence.sql một lần. Cần cấu trúc đã tinh gọn và migration đăng nhập/hồ sơ giáo viên đã có trước đó. Tệp này chỉ thêm/cập nhật hàm RPC, không xóa bảng hoặc dữ liệu hiện có. Có thể chạy lại.

Database mới: schema.sql đã chứa các hàm này; không cần chạy migration này thêm. Không chạy schema.sql lên database cũ chỉ để bật CRUD vì schema có dữ liệu mẫu.

Chưa triển khai migration này lên Supabase thật từ phiên làm việc hiện tại. Chỉ URL và anon key không đủ nếu database chưa có RPC.

## Các luồng đã nối

- Danh mục môn, trình độ, khung giờ, mô hình, cấp học, sự cố/hệ số và danh mục bổ sung.
- Hồ sơ giáo viên, chỉnh sửa/khóa tài khoản liên quan, lịch rảnh và báo cáo dự giờ theo cấu trúc UI hiện có. Tạo giáo viên vẫn dùng RPC riêng tạo hồ sơ + tài khoản trong một giao dịch.
- Học sinh, lớp, gán học sinh/giáo viên, link phòng, học liệu, điểm danh và nhận xét trong dữ liệu lớp hiện có.
- Giám sát: xác nhận vào lớp, biên bản sự cố lưu vào BUOI_HOC và SU_CO_BUOI_HOC theo ngày, lớp, khung giờ. Phân công cover đi cùng giao dịch lưu.
- Tiêu chí, văn phong, cấu hình trợ lý, nội dung văn bản/metadata SOP, số lượt tạo nhận xét AI.
- Kỳ công, gửi đối soát, giải trình cá nhân, duyệt, khóa/mở kỳ có lý do.
- Mẫu báo cáo theo chủ tài khoản.

Thay đổi liên quan trong cùng thao tác UI được gửi theo một giao dịch. Máy chủ kiểm tra quyền, cột cho phép, dữ liệu trước khi sửa và ràng buộc DB. Xung đột phiên không bị ghi đè âm thầm. UI phục hồi dữ liệu đã xác nhận khi lưu lỗi, chỉ báo thành công sau phản hồi DB, tải lại bản ghi từ máy chủ sau lưu và cảnh báo khi đóng trang đang lưu.

## Phạm vi còn giữ cấu trúc cũ

Đây là bước nối lưu dữ liệu, không phải migration chuyển toàn bộ JSONB sang quan hệ. Lịch rảnh UI vẫn lưu trong GIAO_VIEN.lichranh; học liệu/điểm danh/nhận xét phòng học và báo cáo dự giờ UI còn dùng các cột JSONB có sẵn. Bảng theo tuần, điểm danh/nhận xét riêng và BIEN_BAN_DU_GIO chưa thay thế hoàn toàn các nguồn UI đó. Riêng bảng công sau bản nâng cấp ngày 14/10 đọc/ghi từ CONG_DAY_BUOI_HOC và GIAI_TRINH_CONG_DAY; BANG_CONG_THANG chỉ giữ metadata của kỳ. Không nên coi cấu trúc hiện tại là hoàn tất chuẩn hóa toàn dự án.

Tệp minh chứng/tệp SOP nhị phân chưa upload Supabase Storage; nội dung văn bản và metadata được lưu. Chatbot/nhận xét AI hiện là mô phỏng; lịch sử chat và bộ lọc tạm thời không phải bản ghi nghiệp vụ.

## Kiểm chứng

Đã có tests/businessPersistence.test.ts kiểm tra CRUD/tải lại, quyền, xung đột, rollback, đồng bộ tài khoản, giải trình riêng, ca/sự cố và 31 bảng bằng PostgreSQL giả lập. tests/businessQueue.test.ts kiểm tra gom giao dịch, sửa liên tiếp, thông báo xác nhận, phục hồi khi lỗi và đổi phiên bằng RPC giả lập. Chưa thay thế nghiệm thu trên Supabase thật.

Sau khi chạy migration: đăng nhập → tạo/sửa dữ liệu → đợi thông báo lưu thành công → F5 → kiểm tra dữ liệu còn; thử tài khoản giáo viên để kiểm tra đúng phạm vi. Khi gặp lỗi, đọc thông báo và bấm Tải lại dữ liệu trước khi sửa lại.
