# Luồng ca học, nhận xét và tính công

Chạy migrations/20261017_session_workflow.sql rồi migrations/20261018_auto_checkout.sql trong Supabase SQL Editor, sau 20261016_complete_foreign_keys.sql. Đây là bản thay thế bản nháp persist_monitoring_status chưa chạy. Không chạy lại schema/seed hoặc bản nháp.

## Dữ liệu

- BUOI_HOC.trangthai là cột trạng thái duy nhất. Bỏ cột trạng thái hiển thị trùng trong CHI_TIET_CA_LOP sau khi lưu giá trị cũ vào nhật ký dạng trường.
- Chính / Dạy thay truy vấn từ magiaovienchinh / magiaoviendaythay và khóa ngoại phân công.
- NHAN_XET_BUOI_HOC lưu một dòng cho mỗi học sinh của buổi. Khi check-in, tạo các dòng nhận xét trống để giữ danh sách học sinh của buổi ngay cả khi học sinh chuyển lớp về sau.
- Tiến độ nhận xét là SELECT: Chưa nhận xét; Chưa đủ x/y; Đã đủ x/y. Không có bảng/cột trạng thái nhận xét mới.
- Không tạo cột JSON/JSONB. JSON trong tham số/kết quả API chỉ vận chuyển dữ liệu, không lưu thành cột.

## Trạng thái

| Điều kiện | Trạng thái | Cảnh báo cả dòng |
|---|---|---|
| Chưa đến giờ | Chưa diễn ra | Không |
| Đã đến giờ, chưa check-in, kể cả hết buổi | Chưa học | Đỏ |
| Đã check-in, chưa hết giờ, chưa checkout | Đang học | Không |
| Đã check-in, đến giờ kết thúc | Tự checkout, Đã học | Không |
| Checkout sớm hơn 5 phút | Chưa hoàn tất | Cam |
| Có check-in và checkout, kết thúc sớm tối đa 5 phút hoặc đúng giờ | Đã học | Không |
| Vận hành hủy/nghỉ buổi | Nghỉ học | Không |

Trigger cập nhật khi ghi dữ liệu. Supabase Cron cập nhật theo giờ mỗi phút và tạo các ca theo lịch trong 7 ngày tới. Lần đầu tạo các ca từ đầu tháng đến 7 ngày tới, bỏ qua kỳ công đã khóa. Màn hình làm mới dữ liệu khi quay lại tab và định kỳ. Không cần thao tác xem danh sách để ghi dữ liệu.

## Nhận xét và công

Giáo viên tự nhập/sửa nhận xét; không sinh nhận xét bằng AI hoặc bắt chọn tiêu chí. Chatbot tra cứu vẫn giữ. Nút nhận xét bị mờ cho đến khi checkout đã lưu; SQL cũng chặn nhận xét mới trước checkout.

Nút Kết thúc lớp lưu checkout theo thời điểm bấm. Nếu không bấm, Cron tự ghi đúng giờ kết thúc theo lịch (không lấy giờ Cron chạy trễ), chỉ cho ca có check-in và chưa checkout. Không tự checkout ca chưa học, ca hủy, kỳ công đã khóa hoặc ca lịch sử trước ngày hôm qua. Checkout sớm hơn 5 phút vẫn là Chưa hoàn tất và chưa sinh công chuẩn; có thể nhận xét sau khi checkout đã lưu.

Checkout không bắt buộc đã nhận xét đủ. Công STANDARD/COVER chỉ sinh khi trạng thái Đã học, có check-in + checkout và mọi học sinh có nhận xét không trống. Nhận xét cuối cùng có thể được lưu sau checkout; SQL ghi công lúc đó. Sửa nội dung không tạo công trùng hoặc đặt lại hệ số đã điều chỉnh. Không được xóa học sinh khỏi danh sách nhận xét sau check-in, hoặc để trống nhận xét của ca đã ghi công chuẩn.

Các điều chỉnh công do sự cố của vận hành vẫn dùng luồng sự cố hiện có (EMERGENCY); đây là xử lý hệ số sự cố, không phải tự xác nhận đã dạy. Công lịch sử/đã khóa được giữ nguyên; migration không ghi thêm công chỉ vì đồng hồ chuyển trạng thái.

## Kiểm tra sau khi chạy

```sql
SELECT madinhdanh,ngayhoc,trangthai,magiaovienchinh,magiaoviendaythay,
       vuihoc.tien_do_nhan_xet_ca(madinhdanh)
FROM vuihoc."BUOI_HOC" ORDER BY ngayhoc DESC,batdau;
SELECT jobname,schedule,active FROM cron.job WHERE jobname='vuihoc-session-lifecycle';
SELECT table_name,column_name FROM information_schema.columns
WHERE table_schema='vuihoc' AND data_type IN ('json','jsonb'); -- 0 dòng
```

Nếu môi trường không cung cấp pg_cron, migration báo NOTICE; cần bật Supabase Cron để trạng thái cập nhật theo giờ khi không có người thao tác. Cron có độ trễ tối đa khoảng một phút, cộng chu kỳ làm mới màn hình.
