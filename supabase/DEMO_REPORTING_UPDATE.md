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

Báo cáo **Lớp sắp kết thúc** có lựa chọn **30 ngày tới** riêng và chọn sẵn khi mở báo cáo mới. **Toàn bộ** hiện tất cả ngày kết thúc của lớp đang học/chờ khai giảng, không áp cửa sổ 30 ngày ngầm. Chọn tháng hoặc khoảng tùy chỉnh để xem đúng kỳ đó, gồm cả tháng 11/12.

Để có lớp và học sinh cho sáu giáo viên THCS/THPT, chạy thêm `add_secondary_demo_classes.sql` sau file bổ sung dữ liệu này và quy tắc công `20261214`. File tạo 6 lớp (3 THCS, 3 THPT) cùng 18 học sinh, mỗi lớp 3 em; tổng hồ sơ học sinh là 138. Dùng lại tài khoản `gv.demo25`–`gv.demo30`, không tạo thêm giáo viên/tài khoản.

Các lớp mới có học liệu, lịch hai buổi/tuần và ngày kết thúc tháng 11/12. Nếu kỳ 10/2026 đang mở, lớp bắt đầu 19/10/2026 và có buổi đã học, đi muộn, kết thúc sớm, vắng học và một buổi còn thiếu nhận xét. Không ghi sự cố nên buổi đủ nhận xét được 1 công; ca thiếu nhận xét không có dòng công. Nếu tháng 10 đã khóa, toàn bộ lớp mới bắt đầu 02/11/2026 với trạng thái Chờ khai giảng và lịch tương lai, không bổ sung công vào tháng đã khóa. Chạy lại không nhân đôi hay ghi đè nhận xét đã sửa.

Ở màn hình công admin và giáo viên, các ca chưa ghi công chỉ hiển thị lý do **thiếu nhận xét (đã nhập/tổng học sinh)**; checkout do hệ thống tự ghi khi hết giờ. Các dòng theo dõi này có hệ số “—”, không được cộng vào tổng công, chốt công hoặc gửi giải trình như một dòng công đã ghi.

Kiểm thử database và báo cáo thực tế:

```powershell
$env:PGLITE_MODULE_PATH=(Resolve-Path '.tmp/demo-validation/node_modules/@electric-sql/pglite').Path
node --experimental-strip-types --loader ./tests/typescriptLoader.mjs tests/richDemoDataset.test.mjs --reporting-fixture
```

Kiểm thử dùng chính RPC dữ liệu nghiệp vụ, mapper và bộ lọc báo cáo của ứng dụng để đối chiếu số lượng với SQL, xác nhận đăng nhập của sáu giáo viên mới, bảo toàn công/lịch sử và chạy lại không nhân đôi.
