# Lưu bằng cột và bảng con

Database đã chạy `apply_relational_update.sql` chạy tiếp toàn bộ
`migrations/20261015_remove_remaining_json.sql` trong Supabase SQL Editor.
Migration chuyển sáu cột JSONB cuối cùng, giữ dữ liệu rồi bỏ cột cũ trong cùng
giao dịch. Có thể chạy lại chính migration này. Không chạy lại schema, seed
hoặc các migration cũ sau bước này.

| Dữ liệu cũ | Nơi lưu mới |
| --- | --- |
| LOP_HOC.hoclieu | HOC_LIEU_LOP: lớp, thứ tự, tháng, tuần, số buổi, tiêu đề, slide, LMS |
| LOP_HOC.phancongdaythay | PHAN_CONG_DAY_THAY: lớp, thứ tự, số buổi, ngày/giờ, mã giáo viên; tên đọc từ GIAO_VIEN |
| LOP_HOC.chitietcahoc | CHI_TIET_CA_LOP: mã buổi, khóa ca, số buổi, ngày/giờ, tiêu đề, trạng thái hiển thị, học liệu; giờ vào/ra ở BUOI_HOC, điểm danh/nhận xét/tiêu chí ở bảng nghiệp vụ tương ứng |
| BUOI_HOC.hoclieu | Các cột hoclieutieude, hoclieuslide, hoclieulms, hoclieugiaovien, hoclieuhocsinh, baitaplms |
| GIAO_VIEN.diemtieuchi | diemtc1, diemtc2, diemtc3, CHECK 0–10 |
| BIEN_BAN_DU_GIO.diemtieuchi | diemtc1, diemtc2, diemtc3, bắt buộc có giá trị, CHECK 0–10 |

GIAO_VIEN giữ điểm hiện tại của hồ sơ; BIEN_BAN_DU_GIO lưu điểm từng biên bản.
Các mảng text (quyền, lịch đăng ký, mã học sinh của lớp, trường thay đổi trong
nhật ký) nằm ngoài phạm vi chuyển sáu cột JSONB của migration này.

RPC vẫn nhận/trả JSON để truyền dữ liệu cho giao diện. Khi ghi, giá trị được
tách vào cột/hàng; danh sách và bộ lọc đọc kết quả truy vấn. Không tạo bảng
lưu riêng kết quả lọc và không xóa JSON truyền qua HTTP.

Trước chuyển đổi, giá trị gốc của lớp, ca, điểm danh, nhận xét, tiêu chí và
điểm dự giờ được ghi vào nhật ký hiện có dưới dạng từng trường vô hướng
(SU_KIEN_NGHIEP_VU/CHI_TIET_NHAT_KY), với dấu `CHUYEN_SANG_COT_20261015`.
Nếu nhận xét giữa hai nguồn cũ khác nhau, giữ giá trị đang hiển thị trong dữ
liệu lớp cho giao diện; giá trị trước chuyển đổi của cả hai nguồn vẫn tra
được trong nhật ký. Không lưu bản sao JSON.

Migration giữ nguyên khóa kỳ và các dòng công. Trong giao dịch chuyển đổi,
tạm ngừng trigger kiểm tra kỳ công ở ca/điểm danh/nhận xét và trigger sinh
công, rồi bật lại. Lỗi sẽ rollback toàn bộ. Trường chưa được ánh xạ sẽ báo
lỗi thay vì bị bỏ qua khi xóa cột.

## Kiểm tra sau khi chạy

```sql
SELECT c.table_name,c.column_name,c.data_type
FROM information_schema.columns c
JOIN information_schema.tables t
  USING(table_catalog,table_schema,table_name)
WHERE c.table_schema='vuihoc' AND t.table_type='BASE TABLE'
  AND c.data_type IN ('json','jsonb');
```

Kết quả phải **không có dòng nào**. Sau đó tải lại ứng dụng và đăng nhập.

## Database mới

Chạy schema/seed và các nâng cấp trước như luồng hiện có, sau đó
`apply_relational_update.sql`, cuối cùng `20261015_remove_remaining_json.sql`.
`schema.sql` riêng lẻ vẫn là cấu trúc nền trước chuỗi cập nhật, chưa phải cấu
trúc cuối. Dữ liệu mẫu phải nạp trước bước bỏ JSON.

## Kiểm thử

Đặt `PGLITE_MODULE_PATH` tới thư mục đã cài `@electric-sql/pglite`, rồi chạy:

```powershell
node --wasm-lazy-compilation --liftoff-only tests/noJsonStorage.test.mjs
```

Kiểm tra trên database tạm: chuyển dữ liệu, chạy lại, không còn cột JSON,
rollback khi gặp trường lạ, giữ công kỳ đã khóa, CRUD học liệu, ca/nhận xét/
sinh công, điểm dự giờ, quyền giáo viên, dạy thay, báo sự cố và học liệu ca.
Không kết nối Supabase thật.
