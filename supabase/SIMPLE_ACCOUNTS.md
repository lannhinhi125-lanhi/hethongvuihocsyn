# Tài khoản và phân quyền đơn giản

Không dùng Supabase Auth, không cần tạo tài khoản trong Authentication → Users. Mọi kiểm tra chạy bằng hàm SQL trong chính Supabase.

## Database đã có 32 bảng

1. Chạy toàn bộ [migrations/20261011_simple_accounts.sql](migrations/20261011_simple_accounts.sql) trong SQL Editor.
2. Mở [setup_admin.sql](setup_admin.sql), sửa mật khẩu THAY_MAT_KHAU_CUA_BAN thành mật khẩu riêng, và sửa tên đăng nhập nếu cần. Chạy file để đặt mật khẩu cho tài khoản quản trị đã có. Dữ liệu mẫu dùng tên admin.tong.
3. Khởi động ứng dụng và đăng nhập bằng tài khoản đó. Tạo tài khoản khác, chọn nhóm quyền trong Tài khoản & Phân quyền. Mật khẩu tài khoản mới cần từ 8 đến 72 byte.

Database mới: chạy schema.sql mới rồi làm bước 2. Không cần chạy lại các migration cũ. Không cần đưa schema vuihoc vào Exposed schemas cho chức năng tài khoản: các RPC nằm trong public. Giữ public được bật trong Data API; chỉ dùng public/anon key tại frontend.

## Cấu trúc giữ 32 bảng

- NGUOI_DUNG.manhomquyen → NHOM_QUYEN.madinhdanh.
- NHOM_QUYEN.congtruycap xác định ADMIN hoặc TEACHER; danhsachquyen chứa quyền thao tác theo phân hệ cố định trong src/lib/portalPermissions.ts. Có thể tạo nhóm tùy chỉnh, chọn cổng và quyền ngay trên giao diện.
- Thêm matkhau_bam, maphien_bam, phienhethan, solansai, tamkhoaden vào NGUOI_DUNG. Không thêm bảng phiên. Mỗi tài khoản có một phiên, đăng nhập mới thay thế phiên cũ; phiên tồn tại tối đa 12 giờ và token giữ trong sessionStorage của tab trình duyệt.
- Giữ cột maxacthuc cũ để tránh mất dữ liệu nhưng bỏ khóa ngoại sang auth.users; cột này không dùng để đăng nhập và không gửi tới UI.
- NHAT_KY_NGHIEP_VU có manguoithuchien liên kết tài khoản. Không ghi mật khẩu băm/token vào lịch sử.
- Bỏ giới hạn vaitro chỉ có bốn tên cũ. Quyền thực tế dựa trên manhomquyen, không suy ra từ chữ “Quản trị” trong tên tài khoản.

## Hành vi

SQL kiểm tra tên đăng nhập, mật khẩu bcrypt, trạng thái hoạt động và nhóm quyền. Sau năm lần sai, tài khoản bị chặn đăng nhập 15 phút. Không trả mật khẩu/hash về trình duyệt. Chỉnh tài khoản có thể để trống mật khẩu để giữ mật khẩu cũ; muốn đổi thì nhập mật khẩu mới. Không xem lại hoặc sao chép mật khẩu cũ.

Đọc/lưu tài khoản và nhóm quyền đều kiểm tra phiên tại database. Khóa tài khoản, đổi mật khẩu hoặc gán lại nhóm quyền sẽ hủy phiên tài khoản đó. Thay đổi nhóm quyền được đọc lại khi lấy phiên, khi tab được mở lại hoặc sau tối đa 60 giây trên màn hình. Không cho xóa nhóm đang được sử dụng hoặc vô hiệu hóa tài khoản quản lý quyền cuối cùng. Lưu đồng thời có kiểm tra dữ liệu cũ để tránh ghi đè âm thầm. Giao diện thông báo lưu thành công sau khi SQL xác nhận; nếu lưu lỗi, thay đổi tài khoản/nhóm quyền cục bộ được hoàn tác.

## Phạm vi tích hợp

Bản sửa này nối đăng nhập và đọc/lưu tài khoản, nhóm quyền. **Các phân hệ nghiệp vụ khác vẫn chưa nối CRUD Supabase**; việc có schema không có nghĩa mọi màn đã lưu. Bảng lịch rảnh/ca/công/biên bản đã thiết kế nhưng vẫn cần nối các màn vào nguồn dữ liệu đó. Không mở quyền đọc/ghi trực tiếp toàn database cho anon để giả lập việc tích hợp.

Kiểm tra cục bộ: tests/simpleAccounts.test.ts chạy PostgreSQL/PGlite với pgcrypto thật, không tạo auth.users hay auth.uid. Chưa nghiệm thu đăng nhập trên project Supabase thật cho tới khi chạy migration và đặt mật khẩu quản trị.
