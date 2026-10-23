# 20261209 — Lịch rảnh theo lần cập nhật

Quy tắc đã chốt: giáo viên khai báo một mẫu từ thứ Hai đến Chủ Nhật. Mẫu có hiệu lực từ thời điểm lưu đến lần cập nhật tiếp theo, lặp qua các tuần, không đăng ký lại hoặc tự hết hạn cuối tuần. Lần cập nhật mới tạo phiên bản mới; không ghi đè phiên bản trước. Lưu không thay đổi nội dung và sửa thông tin hồ sơ không tạo phiên bản thừa.

## Từng bảng trước và sau

Ba bảng vật lý cũ được thay bằng **hai bảng vật lý**, tái sử dụng đầu lịch tuần và bảng ô lịch định kỳ; không thêm một nơi lưu song song.

| Bảng trước | Đủ cột trước | Bảng sau | Đủ cột sau |
| --- | --- | --- | --- |
| `LICH_RANH_TUAN` — 8 cột | `madinhdanh, magiaovien, ngaydautuan, ngaycuoituan, namhoc, manguoicapnhat, ngaytao, ngaycapnhat` | `PHIEN_BAN_LICH_RANH` — 4 cột | `madinhdanh, magiaovien, manguoicapnhat, hieuluctu` |
| `LICH_RANH_DINH_KY` — 4 cột | `magiaovien, makhunggio, thutrongtuan, trangthai` | `CHI_TIET_PHIEN_BAN_LICH_RANH` — 4 cột | `makhunggio, thutrongtuan, trangthai, maphienban` |
| `CHI_TIET_LICH_RANH` — 6 cột | `malichtuan, ngay, makhunggio, trangthai, ngaytao, ngaycapnhat` | Bỏ bảng **chỉ khi cả đầu và chi tiết lịch tuần đều rỗng** | Không có bản sao thay thế theo ngày |

Ở đầu lịch: giữ mã, FK giáo viên, FK người cập nhật; bỏ ngày đầu/cuối tuần, nhãn năm học và hai dấu thời gian cũ; thêm một thời điểm hiệu lực `hieuluctu`. Không lưu ngày hết hiệu lực: truy vấn `LEAD(hieuluctu)` theo giáo viên. Đầu lịch cũ phải rỗng mới thực hiện chuyển đổi nên không đánh mất năm học, thời gian hoặc lịch tuần đã đăng ký.

Ở chi tiết: bỏ mã giáo viên, thay bằng FK phiên bản; giữ đúng từng khung giờ, thứ và trạng thái cũ. Không chép tên giáo viên, tên/giờ khung giờ, thời điểm hiệu lực hay ngày hết hiệu lực vào ô lịch.

`LICH_RANH_DINH_KY` sau migration là **view thường**, không còn là bảng vật lý. View vẫn trả bốn cột cũ nhưng JOIN từ phiên bản hiện hành. Nhờ vậy các bộ đọc hiện có dùng cùng nguồn; không có bảng lưu thêm “lịch hiện tại”. Phiên bản rỗng có nghĩa là bỏ hết lựa chọn, không quay lại phiên bản cũ có dữ liệu.

## Khóa và 3NF của mô hình lịch mới

- `PHIEN_BAN_LICH_RANH`: PK `madinhdanh`; UNIQUE `(magiaovien,hieuluctu)`; FK `magiaovien → GIAO_VIEN.madinhdanh ON DELETE RESTRICT`; FK `manguoicapnhat → NGUOI_DUNG.madinhdanh ON DELETE SET NULL`.
- `CHI_TIET_PHIEN_BAN_LICH_RANH`: PK `(maphienban,makhunggio,thutrongtuan)`; FK `maphienban → PHIEN_BAN_LICH_RANH.madinhdanh ON DELETE CASCADE`; FK `makhunggio → KHUNG_GIO.madinhdanh`. CHECK thứ 0–6; CHECK trạng thái có giá trị hợp lệ.
- Thuộc tính đầu lịch phụ thuộc vào khóa phiên bản; trạng thái ô phụ thuộc đầy đủ vào khóa phiên bản–khung giờ–thứ. Giáo viên và thời gian hiệu lực chỉ nằm ở đầu lịch. Giờ ca chỉ nằm ở `KHUNG_GIO`. Không có phụ thuộc bộ phận hoặc bắc cầu được đưa thêm vào hai bảng này.
- Một ô ở hai phiên bản là hai dữ kiện theo hai thời kỳ khác nhau. Giữ giá trị của các thời kỳ không phải sao chép trạng thái hiện tại sang bảng tổng hợp.
- Không có cột JSON/JSONB hay danh sách trong một ô. JSON dùng làm hợp đồng truyền RPC và kết quả truy vấn, không lưu vào bảng.

Đánh giá này áp dụng cho hai bảng lịch theo quy tắc nghiệp vụ vừa chốt; không phải chứng nhận mọi bảng trong CSDL đã được rà xong.

## Những bảng truy vấn sang đâu

```text
GIAO_VIEN ← PHIEN_BAN_LICH_RANH ← CHI_TIET_PHIEN_BAN_LICH_RANH → KHUNG_GIO
NGUOI_DUNG ← PHIEN_BAN_LICH_RANH.manguoicapnhat
```

`GIAO_VIEN`, `NGUOI_DUNG`, `KHUNG_GIO`, `LOP_HOC`, `LICH_LOP`, `BUOI_HOC`, `CONG_DAY_BUOI_HOC` không thêm/bỏ cột trong đợt này.

| Luồng | Nguồn sau sửa |
| --- | --- |
| Giáo viên cập nhật lịch | RPC hiện có kiểm tra quyền/chủ hồ sơ, gọi `luu_phien_ban_lich_ranh`; khóa giáo viên, chuẩn hóa mã khung giờ, tạo cả đầu và chi tiết trong cùng giao dịch |
| Màn hình lịch rảnh, bộ lọc hồ sơ, số ca và báo cáo hiện tại | View `LICH_RANH_DINH_KY` JOIN phiên bản có hiệu lực mới nhất |
| Xếp giáo viên vào lớp theo mẫu hiện tại | Tiếp tục đọc lịch hiện tại từ cùng view, không dùng mẫu trên màn hình hoặc đoán theo tên |
| Tìm giáo viên dạy thay cho một buổi có ngày giờ cụ thể | `teacherScheduleAt` chọn phiên bản từ dữ liệu Supabase theo thời điểm buổi học |
| Xem các lần cập nhật trước | `lichsuphienbanlichranh` do bộ đọc RPC truy vấn; giao diện chỉ xem, không lưu danh sách phiên bản cục bộ |
| Truy vấn SQL tại một thời điểm | `lich_ranh_tai_thoi_diem(teacher_id, instant)`; ranh giới đầu bao gồm, cuối không bao gồm |
| Dừng lớp, giải phóng ô `busy` cũ | Nếu cần đổi trạng thái thì tạo phiên bản mới, giữ nguyên các phiên bản đã có |

`lichranhhieuluctu` và `lichsuphienbanlichranh` là hai trường **chỉ đọc** trong hợp đồng RPC. Chúng không phải cột thêm ở `GIAO_VIEN`. Mapper loại khỏi dữ liệu ghi; server cũng từ chối ghi trực tiếp. Thời điểm và người cập nhật được lấy phía server.

Màn hình bỏ bộ chọn tháng/tuần/từ–đến từng gây hiểu nhầm về hạn đăng ký. Thay bằng lựa chọn “Lịch hiện tại” và các lần cập nhật cũ. Quyền kỹ thuật hiện có mang tên `Giáo viên đăng ký lịch rảnh theo tuần` vẫn giữ khóa cũ để không làm mất phân quyền đang cấp; tên quyền này không tạo cơ chế đăng ký lại hàng tuần.

## Bảo toàn dữ liệu cũ

Lịch định kỳ trước đây không có thời điểm hiệu lực/người cập nhật riêng. Migration giữ đúng các ô hiện tại và tạo phiên bản mốc **tại lúc chuyển đổi**, để người cập nhật NULL. Không dùng ngày sửa hồ sơ giáo viên làm ngày sửa lịch, không dựng các phiên bản quá khứ chưa có nguồn.

Giữ nguyên các ô `busy` cũ vì không tự suy rằng chúng đều là `free`. Giáo viên không được tạo trạng thái `busy` mới; các lựa chọn `busy` đang có được giữ nếu gửi lại nguyên trạng. Lớp đang phân công tiếp tục được kiểm tra riêng và ngăn thay đổi ô lịch đang gắn lớp như trước.

Nếu có lịch tuần/chi tiết theo ngày, migration **dừng toàn bộ**, không tự biến lịch chỉ áp dụng một ngày thành mẫu vô thời hạn, không xóa dữ liệu đó. Lịch định kỳ thiếu một trong 7 ngày của khung giờ cũng dừng. Phải đối soát nguồn thực tế trước khi chuyển. Không dùng DROP CASCADE để vượt phụ thuộc ngoài dự kiến.

Lịch sử được giữ qua các thao tác cập nhật trong ứng dụng; quản trị viên có quyền SQL trực tiếp vẫn phải quản lý việc sửa/xóa dữ liệu nguồn của mình. Chưa kiểm thử tranh chấp bằng hai kết nối đồng thời.

## Chạy và kiểm tra

Sau khi 20261208 đã thành công:

1. Chạy [availability_version_legacy.sql](diagnostics/availability_version_legacy.sql): kiểm tra thông báo có lịch tuần cũ hay không, danh sách khung giờ thiếu ngày và cấu trúc thực tế.
2. Chạy toàn bộ [20261209_version_teacher_availability.sql](migrations/20261209_version_teacher_availability.sql).
3. Mở lịch rảnh: lịch cũ phải giữ nguyên. Đổi một ô hợp lệ và lưu; chọn lịch hiện tại để thấy lịch mới, chọn lần cập nhật cũ để xem lịch trước.
4. Chạy lại diagnostic và [foreign_key_audit.sql](diagnostics/foreign_key_audit.sql). Migration chạy lặp được.

Không chạy `reset_demo_dataset.sql` để nâng cấp dữ liệu thật. File reset chỉ được cập nhật để kiểm thử/demo còn hoạt động ở cả cấu trúc cũ và mới. Chưa chạy migration trên Supabase thật trong phiên này.

## Kiểm thử

Đã chạy chuỗi nền SQL đến 20261208, rồi kiểm thử đợt này trên bản chụp đúng trạng thái cuối chuỗi với PGlite. `availabilityVersionCases.mjs` được nối cuối chuỗi chính: preflight lịch tuần/thiếu ngày rollback; giữ nguyên dữ kiện lớp, người dùng, giáo viên, học sinh, buổi, công và truy vết; giữ đúng ô hiện tại; cấu trúc/FK không có JSON; migration lặp; hiệu lực theo thời điểm và không hết hạn; RPC giáo viên tự cập nhật, quyền sở hữu, lịch sử chỉ đọc, chống ghi cũ; lưu không đổi/sửa hồ sơ không tạo phiên bản; giữ lịch quá khứ khi dừng lớp; phiên bản rỗng; diagnostic và reset demo lặp.

`teacherAvailabilityVersions.test.ts` kiểm tra ranh giới chọn phiên bản, phiên bản rỗng, tương thích dữ liệu trước migration và mapper chỉ đọc. TypeScript và build giao diện đã chạy đạt. Đây là kiểm thử cục bộ, không thay cho kiểm tra trên Supabase thật.
