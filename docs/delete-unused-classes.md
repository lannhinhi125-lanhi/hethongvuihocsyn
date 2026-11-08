# Xóa vĩnh viễn lớp chưa có buổi học

Chạy toàn bộ `supabase/migrations/20261225_delete_unused_classes.sql` bằng postgres trong Supabase SQL Editor trên database đã nâng cấp đăng ký môn và quản lý lớp. File chỉ cài RPC và trigger; không tự xóa dữ liệu. Sau đó triển khai frontend mới.

Trong danh sách lớp, chọn **Thao tác khác → Xóa lớp vĩnh viễn** và xác nhận. Chỉ người có quyền tạo/sửa/xóa lớp được thực hiện.

- Chặn khi tồn tại bất kỳ bản ghi `BUOI_HOC` nào, kể cả buổi chưa diễn ra, nghỉ hoặc bị hủy. Database kiểm tra lại dưới khóa lớp, không dựa vào dữ liệu giao diện.
- Giữ hồ sơ học sinh và đăng ký môn; trả học sinh của lớp về Chờ xếp lớp và giải phóng ca giáo viên bằng luồng dừng lớp hiện có.
- Xóa lớp và các quan hệ riêng được cấu hình cascade (lịch, học liệu), cùng truy vết xếp/gỡ riêng của lớp. Không thể hoàn tác qua giao diện.
- Chặn lớp có truy vết chuyển trực tiếp sang/từ lớp khác; các khóa ngoại nghiệp vụ khác vẫn được giữ để ngăn xóa lịch sử liên quan.
- Toàn bộ thao tác trong một giao dịch. Nếu bị chặn, mọi thay đổi được hoàn tác. Giao diện chỉ bỏ lớp khỏi danh sách sau khi máy chủ xác nhận thành công.

Kiểm tra sau cài đặt: lớp trống; lớp có giáo viên/học sinh nhưng chưa có buổi; lớp có buổi tương lai; lớp đã học; tài khoản không có quyền; lỗi lưu và thử lại. Hai trường hợp đầu xóa được nếu không có lịch sử liên lớp hoặc khóa ngoại nghiệp vụ khác; các trường hợp có buổi bị chặn.

Kiểm thử tự động: `tests/deleteUnusedClass.test.mjs` chạy migration thật trên fixture PGlite với khóa ngoại và hợp đồng trigger dừng lớp; `tests/deleteUnusedClassPersistence.test.ts` kiểm tra xác nhận máy chủ, lỗi và cập nhật đăng ký. Fixture không thay thế kiểm tra trên database triển khai. Bộ tổng `reenrollmentClassDuration.test.mjs` hiện dừng trước ca mới do lỗi cú pháp SQL có sẵn tại RPC báo sự cố trong `schema.sql` (`END IF;'`), nên chưa xác minh được toàn bộ chuỗi migration qua bộ đó.
