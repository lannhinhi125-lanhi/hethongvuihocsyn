# Cập nhật tốc độ lưu dữ liệu

1. Triển khai frontend mới trước. Frontend vẫn nhận được phản hồi đầy đủ từ SQL cũ.
2. Trong Supabase SQL Editor, chạy toàn bộ [20261220_scoped_save_results.sql](../supabase/migrations/20261220_scoped_save_results.sql). Chạy sau các bản cập nhật quan hệ và quản lý lớp đang dùng; không chạy lại schema hay migration cũ sau file này. File có thể chạy lại.
3. Tải lại trang. Thử sửa tên danh mục, phân lớp và lưu nhận xét; kiểm tra cả các thông tin liên quan và bảng công.

Frontend mới là bắt buộc trước khi áp dụng SQL: phản hồi lưu có `partial: true`, chỉ chứa các nhóm dữ liệu liên quan. Giao diện ghép các nhóm này vào bộ nhớ hiện có; mảng rỗng vẫn có nghĩa là xóa hết nhóm đó. SQL cũ vẫn tương thích với frontend mới.

SQL giữ các kiểm tra quyền, phiên đăng nhập và xung đột dữ liệu của RPC đã cài. Nó bỏ qua các nhóm không liên quan ngay trong vòng truy vấn, không đọc toàn bộ rồi lọc kết quả. Khi cập nhật nhận xét, các nhóm buổi học và công vẫn được trả lại để hiện công mới sinh. Phạm vi hiện tại là nhóm dữ liệu, chưa giới hạn từng bản ghi hay từng tháng trong nhóm.

Các lần tải trang, đăng nhập và làm mới chủ động vẫn đọc đầy đủ dữ liệu được cấp quyền. Lưu dữ liệu nghiệp vụ thông thường không tải lại danh sách tài khoản; tạo hoặc sửa hồ sơ giáo viên vẫn làm mới tài khoản vì có thể thay đổi thông tin liên kết.

Kiểm tra: `tests/scopedSave.test.ts` kiểm tra ghép kết quả, thay đổi tiếp trong lúc lưu, dữ liệu do server sinh, rollback và xóa. `tests/scopedSaveSql.test.mjs` dùng PGlite kiểm tra migration, phân quyền, xung đột và việc bỏ qua bảng không liên quan. Chưa đo độ trễ trên Supabase thực tế.
