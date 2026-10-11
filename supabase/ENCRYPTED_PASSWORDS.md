# Mật khẩu mã hóa có thể xem lại

## Áp dụng cho database đang dùng

1. Chạy toàn bộ migrations/20261011_encrypted_passwords.sql trong Supabase SQL Editor. File này cần phần tài khoản nội bộ (20261011_simple_accounts.sql) đã có trước đó.
2. Tải lại ứng dụng, đăng xuất và đăng nhập lại bằng tài khoản/mật khẩu hiện tại.
3. Trong Tài khoản & Phân quyền, giữ nút mắt ở cột mật khẩu để xem; thả ra, đổi tab hoặc rời cửa sổ thì ẩn.

Không chạy lại setup_admin.sql chỉ để đổi cơ chế lưu. Không tạo lại database, không dùng Supabase Auth, vẫn 32 bảng.

## Hành vi

- NGUOI_DUNG.matkhau_mahoa (bytea) lưu bản mã AES-256 của mật khẩu mới. Khi cấp/đặt lại mật khẩu, matkhau_bam được để NULL.
- Mật khẩu băm cũ không thể khôi phục từ hash. Người dùng đăng nhập đúng lần đầu sau nâng cấp sẽ được chuyển tự động sang bản mã từ mật khẩu vừa nhập. Trước lúc đó, quản trị có thể đặt mật khẩu mới qua màn sửa tài khoản.
- Mật khẩu cũ chưa được chuyển đổi vẫn đăng nhập bình thường. Sai mật khẩu không chuyển dữ liệu.
- Khóa được sinh tự động một lần trong CAU_HINH_HE_THONG.khoamatkhau, bản ghi global; không đưa khóa lên frontend và không thay khóa khi chạy lại SQL.
- Hàm public.vuihoc_reveal_password yêu cầu phiên hợp lệ và đồng thời quyền xem danh sách tài khoản, quyền chỉnh sửa tài khoản/mật khẩu. Danh sách tài khoản thông thường không chứa mật khẩu, hash hoặc bản mã.
- Nút mắt tải mật khẩu khi nhấn giữ. Thả nút sẽ xóa giá trị đang hiển thị và hủy yêu cầu đang chờ, tránh mật khẩu hiện muộn sau khi đã thả.
- Nhật ký chỉ ghi việc đổi mật khẩu; không chứa mật khẩu gốc, hash, bản mã hay khóa.

Khóa được lưu cùng database để không thêm dịch vụ. Người có toàn quyền SQL có thể truy cập khóa và giải mã; đây là cơ chế cho phép quản trị xem lại mật khẩu. Khi sao lưu/phục hồi cần giữ cả bản mã và khóa; không xóa hoặc tự thay khoamatkhau, vì bản mã cũ sẽ không giải mã được.

Database mới: schema.sql đã bao gồm cơ chế này. setup_admin.sql mới đặt mật khẩu quản trị trực tiếp dưới dạng mã hóa. Chạy migration theo thứ tự, không chạy lại bản simple_accounts một mình sau bản encrypted_passwords vì nó định nghĩa lại các hàm đăng nhập/lưu cũ.

Kiểm tra: tests/encryptedPasswords.test.ts và tests/simpleAccounts.test.ts dùng pgcrypto thật trong PostgreSQL/PGlite. Chưa áp dụng SQL lên project Supabase của người dùng.
