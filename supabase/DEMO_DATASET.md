# Bộ dữ liệu demo tháng 9–11/2026

File thực thi: [reset_demo_dataset.sql](reset_demo_dataset.sql).

File này **xóa toàn bộ giáo viên, tài khoản thuộc cổng giáo viên, học sinh, lớp, buổi học và lịch sử nghiệp vụ liên quan**, gồm nhận xét, điểm danh, dự giờ, công, đối soát, giải trình, sự cố và lịch sử xếp lớp. Các kỳ công cũ được xóa kể cả đã khóa, vì đây là yêu cầu đặt lại toàn bộ dữ liệu demo. Đây không phải file cập nhật schema.

Giữ nguyên tài khoản thuộc cổng quản trị/vận hành/chuyên môn, mật khẩu của các tài khoản đó, nhóm quyền, danh mục, tài liệu tri thức AI và cấu hình AI. Lịch sử chat thuộc tài khoản giáo viên cũ bị xóa; lịch sử chat quản trị được giữ. Hệ thống hiện quản lý học sinh bằng hồ sơ, không có tài khoản đăng nhập cổng học sinh để tạo thêm.

## Cách dùng

1. Xuất hoặc sao lưu dữ liệu cũ nếu cần giữ lại; kết quả sau khi chạy là bộ demo thay thế hoàn toàn.
2. Đăng xuất các tài khoản đang thử để tránh màn hình cũ lưu dữ liệu trở lại sau khi nạp.
3. Trong Supabase SQL Editor, chạy **toàn bộ** `reset_demo_dataset.sql`. Không chạy lại `schema.sql`, seed cũ hoặc các migration cũ.
4. Chờ kết quả thống kê cuối file, đăng nhập lại tài khoản quản trị đang có và tải lại trang.
5. Chọn năm học 2026–2027, lịch tháng 9–11/2026. Báo cáo lịch sử nên chọn 01/09/2026–17/10/2026.

File cần database đã được cập nhật tới đăng ký nhiều môn, nhận xét thủ công và tự checkout. Nếu thiếu danh mục hoặc gặp khóa ngoại ngoài phạm vi, giao dịch dừng và hoàn tác. Các kiểm tra khóa ngoại vẫn hoạt động; hai nhóm trigger bảo vệ lịch sử chỉ tạm dừng trong bước xóa rồi được khôi phục trước bước nạp. Không thay đổi các hàm tính công.

File tự cài lại trigger tính điểm dự giờ theo công thức `(TC1 + 2×TC2 + TC3)/4` nếu database thiếu hoặc đã tắt trigger đó. Chỉ nạp ba điểm tiêu chí; tổng điểm và xếp loại tiếp tục tự sinh. Nếu lần chạy trước báo lỗi `diemtong` bị NULL, chạy lại toàn bộ bản file mới; giao dịch lần lỗi chưa commit nên không nạp dở dữ liệu.

Bản mới gói toàn bộ bước đặt lại và nạp trong một lệnh `DO $demo_reset$ ... END $demo_reset$;`, giữ các bảng tạm trong cùng lần thực thi và hoàn tác cả khối nếu có lỗi. Bước xóa giáo viên cũ không còn dùng bảng tạm `demo_old_teacher_users`. Khi chạy trong SQL Editor, bỏ chọn đoạn đang bôi đen để chạy toàn bộ file, không chạy riêng các câu lệnh bên trong khối.

Chạy lại file sẽ xóa và dựng lại bộ demo, không cộng dồn. Cron không chạy xen vào trong giao dịch nạp.

## Dữ liệu

Kết quả kiểm thử tại ngày 18/10/2026:

| Nội dung | Số lượng |
|---|---:|
| Giáo viên | 12 |
| Học sinh | 40 |
| Lớp | 12 |
| Buổi học | 273 |
| Nhận xét có nội dung | 379 |
| Công tự sinh | 114 |
| Sự cố | 45 |
| Biên bản dự giờ | 20 |

Số nhận xét/công/sự cố có thể tăng nếu chạy file ở ngày muộn hơn, vì chỉ tạo lịch sử đã học cho ngày trước ngày chạy. Khung lịch cố định là 01/09–30/11/2026. Đây là dữ liệu giả lập; tên, số điện thoại và email dùng cho demo, link `example.com` là chỗ giữ chỗ cho học liệu/phòng học/bản ghi, không phải phòng học hay tài liệu thật.

- Toán và Tiếng Anh, khối 1–5, nhiều trình độ; mô hình 1-1, 1-3 và 1-5.
- 10 lớp đang học, một lớp chờ khai giảng, một lớp tạm dừng còn lịch sử tháng 9.
- 34 học sinh có lớp, 2 chờ xếp lớp, 2 bảo lưu, 2 đã thôi học; hai học sinh đăng ký cả Toán và Anh.
- Giáo viên đang dạy, chờ lớp và tạm ngừng. Giáo viên tạm ngừng có tài khoản khóa.
- Ca hoàn thành, đủ/thiếu nhận xét, học sinh vắng/đi muộn, giáo viên đi muộn, kết thúc sớm 12 phút, không check-in, nghỉ có phép, dạy thay và lịch sắp tới.
- Buổi hoàn thành chỉ tự sinh công STANDARD/COVER khi đủ nhận xét; ca thiếu nhận xét, chưa học, kết thúc sớm chưa có công chuẩn. Sự cố dùng hệ số danh mục hiện tại và trigger sự cố để ghi công EMERGENCY, gồm công 0 của giáo viên chính khi được dạy thay.
- Không INSERT/UPDATE trực tiếp vào bảng công, bảng công tháng hoặc đối soát. Các bảng này do trigger hiện có tự tạo từ dữ liệu nghiệp vụ; giữ trạng thái mặc định chưa gửi, chưa khóa. Bạn thử gửi đối soát và khóa kỳ bằng thao tác thật trên giao diện.
- Buổi học được sinh bằng hàm lịch học hiện có, không INSERT buổi học thủ công. Script chỉ cập nhật nội dung bài, phân công dạy thay, check-in/check-out và ghi nhận nghỉ như các thao tác nghiệp vụ.
- Chỉ nhập ba điểm tiêu chí dự giờ; điểm tổng và xếp loại do trigger tính, không truyền giá trị tính sẵn vào INSERT.

## Tài khoản giáo viên mới

Mật khẩu demo chung: **246810**. Tài khoản quản trị hiện tại giữ nguyên.

| Giáo viên | Tên đăng nhập | Môn | Trạng thái |
|---|---|---|---|
| Nguyễn Minh Anh | gv.minhanh | Toán | Đang dạy |
| Trần Thu Hà | gv.thuha | Tiếng Anh | Đang dạy |
| Lê Hoàng Nam | gv.hoangnam | Toán | Đang dạy |
| Phạm Ngọc Linh | gv.ngoclinh | Tiếng Anh | Đang dạy |
| Đỗ Quang Huy | gv.quanghuy | Toán | Đang dạy |
| Vũ Mai Phương | gv.maiphuong | Tiếng Anh | Đang dạy |
| Bùi Đức Thành | gv.ducthanh | Toán | Đang dạy |
| Đặng Khánh Vy | gv.khanhvy | Tiếng Anh | Đang dạy |
| Hoàng Gia Bảo | gv.giabao | Toán | Đang dạy |
| Ngô Thảo Nguyên | gv.thaonguyen | Tiếng Anh | Đang dạy |
| Dương Tuấn Kiệt | gv.tuankiet | Toán | Chờ lớp |
| Đinh Bảo Châu | gv.baochau | Tiếng Anh | Tạm ngừng, tài khoản khóa |

## Kiểm thử

`tests/demoDataset.test.mjs` dựng database PostgreSQL cục bộ với các migration hiện tại, nạp bộ demo, kiểm tra dữ liệu/quyền/RPC của hai cổng, bảo toàn tài khoản quản trị và danh mục, công tự sinh, chạy lại không trùng và hoàn tác nếu có khóa ngoại ngoài phạm vi.

Đặt `PGLITE_MODULE_PATH` tới package PGlite rồi chạy:

```powershell
node --liftoff-only --wasm-num-compilation-tasks=1 tests/demoDataset.test.mjs
```

Đã kiểm thử trên database cục bộ. File chưa được chạy tự động trên project Supabase của người dùng.
