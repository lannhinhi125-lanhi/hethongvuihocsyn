# Lưu hồ sơ giáo viên và tài khoản

## Áp dụng

Database đã chạy bản 31 bảng: chạy migrations/20261011_teacher_persistence.sql một lần trong Supabase SQL Editor. Database còn bản 32 bảng: chạy migration normalize_database trước. Tạo mới: schema.sql đã bao gồm các hàm này. Không thêm bảng; tổng vẫn 31.

## Luồng mới

Đăng nhập quản trị hoặc người có quyền tạo hồ sơ giáo viên. Form nạp môn/cấp học/khung giờ/mô hình từ Supabase đang cấu hình trong src/config/supabase.ts (hoặc VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY).

Bấm Lưu: gọi vuihoc_create_teacher bằng token đăng nhập hiện có. Database kiểm tra quyền và danh mục, cấp mã GV-..., sinh mật khẩu, gán nhóm quyền thuộc cổng TEACHER rồi tạo NGUOI_DUNG và GIAO_VIEN trong cùng giao dịch. Nếu một bước lỗi thì không lưu bước nào. Lỗi được hiển thị và form giữ nguyên. Chỉ đóng form sau khi thành công.

Thông tin đăng nhập mới được hiển thị tại chi tiết giáo viên trong phiên tạo, có thể sao chép; không đưa mật khẩu vào danh sách tài khoản hoặc localStorage. Đăng nhập bằng tài khoản mới chuyển sang cổng giáo viên.

Tải lại trang: vuihoc_teacher_data đọc lại hồ sơ và danh mục. Giáo viên chỉ đọc hồ sơ liên kết tài khoản của mình; người có quyền PH3 phù hợp đọc danh sách. Không mở quyền truy cập trực tiếp các bảng cho anon.

## Phạm vi

Đã nối tạo hồ sơ/tài khoản và đọc lại danh sách. Chỉnh sửa/xóa hồ sơ, lịch rảnh và các nghiệp vụ khác chưa được chuyển hết sang CRUD Supabase; không coi thay đổi này là tích hợp toàn bộ hệ thống. Chưa triển khai SQL lên Supabase thật từ môi trường này.

## Kiểm tra

Tạo hồ sơ với email mới → kiểm tra hai bảng có cùng liên kết mã → tải lại → hồ sơ còn → đăng xuất → đăng nhập bằng tài khoản vừa cấp. Kiểm thử cục bộ: tests/teacherPersistence.test.ts.
