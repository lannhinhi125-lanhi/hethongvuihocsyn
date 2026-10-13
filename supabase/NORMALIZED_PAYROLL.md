# Công dạy truy vấn từ các bảng nghiệp vụ

Database hiện có: chạy **toàn bộ** `migrations/20261014_normalize_monthly_payroll.sql`
trong Supabase SQL Editor, sau đó tải lại trang và đăng nhập lại nếu cần.
Không chạy bản nháp, không chạy lại các migration công cũ sau bản này.

Migration chuyển ca/giải trình từ dữ liệu cũ sang `CONG_DAY_BUOI_HOC` và
`GIAI_TRINH_CONG_DAY`, kiểm tra đủ dữ liệu rồi xóa thật hai cột
`BANG_CONG_THANG.danhsachgiaovien` và `BANG_CONG_THANG.danhsachgiaitrinh`.
Toàn bộ thay đổi nằm trong một giao dịch. Nếu ca không có `BUOI_HOC` đúng kỳ,
giao dịch báo mã ca và hủy; hai cột cùng dữ liệu cũ vẫn còn. Chạy lại được.

Giải trình có mã khác nhau trong hai nguồn cũ được giữ thành các bản ghi riêng,
kể cả cùng trỏ tới một ca. Danh sách quản trị hiển thị đầy đủ để xử lý. Đơn mới
bị chặn khi ca đã có giải trình chờ duyệt.

- `BANG_CONG_THANG`: mã kỳ, khóa/mở kỳ, thời gian khóa, lý do mở, thông báo.
- `CONG_DAY_BUOI_HOC`: mỗi ca/giáo viên một dòng, hệ số, loại công, ghi chú,
  trạng thái đối soát và đã gửi. Công giáo viên vắng và công giáo viên dạy thay
  là hai dòng riêng của cùng buổi.
- `GIAI_TRINH_CONG_DAY`: nội dung, loại giải trình, liên kết minh chứng dạng
  text, trạng thái, tài khoản gửi/duyệt và thời gian.
- `DOI_SOAT_CONG_GIAO_VIEN`: mỗi giáo viên/kỳ một dòng, chỉ có đã gửi và trạng
  thái đối soát; giữ được trạng thái của giáo viên chưa có ca, không lưu danh sách.
- `V_BANG_CONG_THEO_GIAO_VIEN`: view truy vấn các cột của công, buổi, lớp,
  hồ sơ giáo viên, sự cố và giải trình.

Các RPC đọc/lưu hiện có đã được thay đường xử lý công. Màn hình vẫn dùng cùng
hợp đồng API, nên tương thích với phiên bản giao diện hiện tại. Các mảng trong
**phản hồi API** được tạo bằng SELECT tại thời điểm đọc, không ghi lại vào cột
JSONB hay text. Tên, lớp, học sinh, thời gian, tổng công và số ca đều truy vấn
từ nguồn; thay đổi hồ sơ sẽ hiện khi đọc lại.

Giáo viên thấy công của mình ngay khi hoàn thành đủ nhận xét hoặc phát sinh
công sự cố, kể cả buổi nghỉ. Chỉ ca đã gửi đối soát mới cho phép giải trình.
Hệ số âm vẫn được cộng vào tổng công; xử lý sự cố lấy tài khoản đang đăng nhập.
Kỳ đã khóa chặn sửa công/sự cố/giải trình. Bản nâng cấp không xóa lớp hay buổi học.

Kiểm thử cục bộ:

```powershell
$env:PGLITE_MODULE_PATH='đường dẫn tới @electric-sql/pglite'
node --wasm-num-compilation-tasks=1 --liftoff-only tests/normalizedPayroll.test.mjs
```

Các file `schema.sql`, `seed_test_data.sql` và migration trước ngày này là nguồn
cài đặt/kiểm thử cấu trúc cũ. Khi cài database mới, hoàn tất các bước cài đặt cũ
trước rồi chạy bản chuẩn hóa này cuối cùng. Không chạy seed/schema cũ trên
database đã chuẩn hóa vì chúng còn tham chiếu hai cột đã bỏ.

Phạm vi bản này là bảng công tháng. Các JSONB ở phân hệ khác cần chuyển riêng;
bản này không tuyên bố đã chuẩn hóa toàn bộ dự án.
