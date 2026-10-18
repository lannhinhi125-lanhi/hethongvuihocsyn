# Mã buổi học hiển thị

Chạy `supabase/migrations/20261029_lesson_display_codes.sql` cuối cùng trong Supabase SQL Editor. Migration cấp mã cho buổi đã có và buổi tạo về sau. Có thể chạy lại mà không đổi mã đã cấp. Không cần chạy lại file reset dữ liệu mẫu.

`BUOI_HOC.madinhdanh` vẫn là UUID làm khóa chính. `sobuoihienthi` là số tự sinh bằng identity; `mabuoihienthi` là cột generated duy nhất, dạng `BH-000123`. Mã không bị cắt khi vượt sáu chữ số; có thể có khoảng trống trong dãy số. Không suy thứ tự ngày học từ mã.

RPC chỉ bổ sung mã vào các buổi tài khoản được phép đọc. Mã không nằm trong danh sách trường được phép ghi; frontend cũng bỏ `displayCode` khỏi payload lưu. Các liên kết nhận xét, sự cố, công và giải trình tiếp tục dùng UUID.

Giám sát, bảng công, đối soát giáo viên, dự giờ và chi tiết báo cáo dùng mã hiển thị. Tìm kiếm mã mới không thay giá trị khóa của lựa chọn hoặc hành động. Chưa chạy migration thì giao diện ghi “Chưa cấp mã”, không tự cắt UUID hay dùng số thứ tự của trang làm mã.

Đã kiểm tra PostgreSQL cục bộ với dữ liệu mẫu: UUID giữ nguyên, mã duy nhất, RPC quản trị/giáo viên trả mã, RPC từ chối ghi mã, chạy lại giữ mã và buổi tạo tiếp theo tự có mã. Chưa áp dụng vào Supabase live.
