# Cập nhật dữ liệu demo cho báo cáo

Chạy toàn bộ `enrich_demo_reporting.sql` trong Supabase → SQL Editor → Run. Không chạy lại file reset. Sau khi thành công, tải lại ứng dụng để đọc dữ liệu mới.

File cập nhật bộ demo đang có, không sửa hồ sơ ngoài các mã demo. Ngày tạo cũ đang cùng 28/07/2026 nên báo cáo “Hồ sơ học sinh mới” tháng 9 trước đây trả về 0 đúng theo dữ liệu. Báo cáo lọc ngày tiếp nhận từ dữ liệu đã tải qua RPC Supabase; không lấy ngày học hoặc ngày chuyển lớp làm ngày tiếp nhận hồ sơ.

Kết quả kiểm thử ngày 26/10/2026:

| Tháng tạo hồ sơ | Học sinh | Giáo viên |
|---|---:|---:|
| 07/2026 | 0 | 6 |
| 08/2026 | 62 | 14 |
| 09/2026 | 28 | 8 |
| 10/2026 | 30 | 2 |
| Tổng | 120 | 30 |

Ngày tạo được giữ trước buổi học lịch sử đầu tiên. Ngày đăng ký và mốc xếp lớp ban đầu của demo được chỉnh cùng để tránh đăng ký trước khi có hồ sơ; sự kiện chuyển lớp ngày 15/09 giữ nguyên.

Giáo viên bổ sung ở trạng thái Chờ lớp, có đúng khối/cấp học, môn và tài khoản:

| Tài khoản | Họ tên | Cấp học | Môn | Ngày tạo |
|---|---|---|---|---|
| gv.demo25 | Nguyễn Hoài Phương | THCS | Toán | 15/08/2026 |
| gv.demo26 | Trần Minh Hạnh | THCS | Anh | 03/09/2026 |
| gv.demo27 | Lê Quốc Việt | THCS | Toán | 06/10/2026 |
| gv.demo28 | Phạm Thu Trang | THPT | Toán | 23/08/2026 |
| gv.demo29 | Hoàng Bảo Anh | THPT | Anh | 14/09/2026 |
| gv.demo30 | Vũ Đức Long | THPT | Toán | 18/10/2026 |

Mật khẩu khởi tạo `246810`. Chạy lại không tạo tài khoản trùng và không đặt lại mật khẩu tài khoản đã có.

24 lớp demo thiếu hạn được bổ sung: 8 lớp kết thúc tháng 10, 8 lớp tháng 11, 8 lớp tháng 12. Ngày kết thúc đã có được giữ nguyên. Chỉ các buổi tương lai chưa có check-in, checkout, điểm danh, nhận xét, sự cố, công, dự giờ hay phân công dạy thay sau hạn mới được bỏ. Nếu có lịch sử sau hạn dự kiến, toàn bộ cập nhật được hoàn tác để đối chiếu. Học liệu theo tuần vẫn được giữ. Trên bộ gốc, số buổi giảm từ 670 xuống 597 do bỏ lịch tương lai ngoài hạn; công đã ghi không đổi.

Trong báo cáo chọn **Tháng**, dùng lịch hoặc nút kỳ trước/sau để đến tháng 9/2026. Chọn **Tùy chọn** thì sửa ngày, bấm **Lưu ngày** trong popup, rồi **Lưu** trên thanh thời gian để áp dụng cả khoảng. **Hủy** trả lại khoảng đã áp dụng; đổi ngày nháp không tự đổi kết quả báo cáo.

Báo cáo **Lớp sắp kết thúc** lọc đúng theo ngày kết thúc của kỳ đã chọn, gồm cả các tháng 11/12 nằm ngoài 30 ngày tới. Khi chọn **Toàn bộ**, báo cáo vẫn mặc định xem cửa sổ 30 ngày tới. Không còn áp đồng thời cửa sổ mặc định này lên tháng được chọn.

Kiểm thử database và báo cáo thực tế:

```powershell
$env:PGLITE_MODULE_PATH=(Resolve-Path '.tmp/demo-validation/node_modules/@electric-sql/pglite').Path
node --experimental-strip-types --loader ./tests/typescriptLoader.mjs tests/richDemoDataset.test.mjs --reporting-fixture
```

Kiểm thử dùng chính RPC dữ liệu nghiệp vụ, mapper và bộ lọc báo cáo của ứng dụng để đối chiếu số lượng với SQL, xác nhận đăng nhập của sáu giáo viên mới, bảo toàn công/lịch sử và chạy lại không nhân đôi.
