# Ca kết thúc sớm và thời điểm ghi công

Chạy toàn bộ `supabase/fix_early_checkout_credit.sql` bằng postgres trong Supabase SQL Editor trên database đã chuẩn hóa khung giờ và có luồng công/sự cố hiện tại. Không chạy lại migration cũ `20261018` hoặc `20261214` sau file này vì chúng thay thế quy tắc. Triển khai frontend mới để bảng công hiện cả ca đang chờ ghi công.

- Ca có giờ vào và checkout đã lưu được hiển thị Đã học; kết thúc sớm vẫn có cảnh báo riêng.
- Nhận xét đủ là điều kiện bắt buộc. Trước giờ kết thúc dự kiến, vận hành duyệt cảnh báo kết thúc sớm thì được ghi công ngay. Duyệt chưa vào lớp không thay cho checkout.
- Chưa duyệt: chờ đến giờ kết thúc dự kiến. Job vòng đời ca học hiện có chạy mỗi phút sẽ thử ghi công dù trạng thái Đã học không đổi. Không tạo thêm job song song.
- Không có sự cố: mặc định 1 công. Có sự cố: giữ nguyên luồng xử lý hệ số sự cố hiện có; không mặc định 1 khi sự cố còn chờ xử lý. Không cộng chồng công chuẩn và công sự cố.
- Duyệt gắn với đúng giờ vào/ra và số phút kết thúc sớm; đổi các dữ liệu này thì duyệt cũ hết hiệu lực.
- Không đặt hệ số giả ở giao diện. Các dòng chờ có hệ số trống và không được cộng vào tổng công.
- Giữ công đã ghi, công điều chỉnh và kỳ đã khóa. Cài lại không cộng trùng. Khi cài đặt chỉ thử khôi phục riêng BH-184684 bằng điều kiện hiện tại, không sửa giờ vào/ra hoặc tạo nhận xét.

Kiểm tra job (chỉ đọc, chạy nếu dự án có pg_cron):

```sql
SELECT jobid, schedule, active, command
FROM cron.job
WHERE jobname = 'vuihoc-session-lifecycle';
```

Job cần hoạt động với lệnh `SELECT vuihoc.dong_bo_trang_thai_ca();`. Bảng công cần tải lại dữ liệu sau khi job chạy; việc đồng bộ database không tự đẩy thay đổi lên trình duyệt.

Kiểm thử: `tests/earlyCheckoutApprovalCredit.test.mjs` chạy SQL thật và hàm ghi công/tổng hợp sự cố hiện có trên fixture PGlite; kiểm tra duyệt sớm, chờ hết giờ, job tự thử lại, thiếu nhận xét, sự cố chưa xử lý và hệ số 0.5, duyệt cũ hết hiệu lực, không cộng trùng, công điều chỉnh/kỳ khóa, cài lặp. Chưa chạy trên database triển khai. Lỗi timeout của RPC lưu tổng quát cần kiểm tra riêng nếu vẫn xuất hiện khi duyệt.
