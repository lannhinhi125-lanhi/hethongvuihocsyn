# Rà soát tiếp nối: lịch sử chat

Đã xử lý tiếp bằng migration `20261204_normalize_ai_configuration_chat.sql`: xem [kết quả chuẩn hóa và kiểm thử](AI_CONFIGURATION_CHAT_3NF_CHANGES.md). Các phát hiện/bước tiếp theo dưới đây ghi trạng thái trước bản sửa này.

Mốc đối chiếu: repository đã có migration đến `20261202`. Các số trong tên migration là thứ tự phiên bản, không phải xác nhận ngày triển khai. Đây là rà soát mã SQL, chưa kiểm tra dữ liệu Supabase thật và chưa tạo migration sửa bảng.

## Tiến độ kế thừa

- `20261116–20261126`: giáo viên, quyền, tài khoản, đăng ký học, ca, sĩ số, thời hạn, khung giờ, học liệu.
- `20261127–20261130`: biên bản dự giờ, tên sự cố, minh chứng giải trình, nguồn công/kỳ/đối soát.
- `20261201`: nhận xét và danh mục bổ sung.
- `20261202`: mẫu báo cáo, chỉ số và bộ lọc nhiều lựa chọn.

Tài liệu tổng hợp ghi người dùng xác nhận chạy đến `20261122`; chưa có bằng chứng triển khai các bản sau trong lượt rà này.

## Hai bảng chat hiện có theo chuỗi migration

| Bảng | Cột | Khóa và nguồn |
| --- | --- | --- |
| `PHIEN_CHAT_AI` | `maphien, magiaovien, thoigianbatdau, manguoidung` | PK `maphien`; FK giáo viên và tài khoản; tài khoản bắt buộc từ `20261108`, giáo viên cho phép NULL |
| `CAU_HOI_CHAT_AI` | `macauhoi, maphien, noidung, thoigianhoi` | PK `macauhoi`; FK `maphien` tới phiên, xóa cascade |

Nguồn: `20261106_teacher_chat_questions.sql`, `20261107_teacher_question_history.sql`, `20261108_chat_history_accounts.sql`. Không tìm thấy tham chiếu hai bảng này trong các migration sau `20261108` đến `20261202`.

## Phát hiện cần xử lý tiếp

RPC hiện tại xác định quyền sở hữu, liệt kê, đọc câu hỏi và xóa phiên bằng `manguoidung`. Tuy nhiên RPC mở phiên vẫn lưu thêm `magiaovien`, lấy từ hồ sơ có cùng tài khoản. Đây là ứng viên dư thừa: nếu mã giáo viên là liên kết hiện tại của tài khoản thì có thể truy vấn qua `GIAO_VIEN.manguoidung`.

Chưa kết luận tự động bỏ cột: cần xác minh mã giáo viên có ý nghĩa lịch sử độc lập hay chỉ là đường tương thích. FK giáo viên hiện có `ON DELETE CASCADE`, nên xóa hồ sơ có thể xóa phiên dù tài khoản sở hữu còn tồn tại. Cần đối chiếu chính sách giữ lịch sử trước khi thay đổi FK hoặc nguồn lưu.

`CAU_HOI_CHAT_AI` không sao chép chủ sở hữu, tên giáo viên hay tiêu đề phiên. Tiêu đề danh sách được truy vấn từ câu hỏi đầu tiên. Trong phạm vi đã đọc, chưa thấy phụ thuộc bắc cầu cần tách thêm ở bảng câu hỏi; đây chưa phải chứng minh đầy đủ 3NF cho toàn hệ thống.

## Bước tiếp theo

1. Kiểm tra dữ liệu chỉ đọc: phiên thiếu tài khoản, cặp giáo viên–tài khoản lệch, giáo viên NULL và các phụ thuộc SQL ngoài RPC hiện tại.
2. Đối chiếu caller ứng dụng và luồng xóa hồ sơ/tài khoản; chốt ý nghĩa hiện tại hay lịch sử của mã giáo viên.
3. Nếu chỉ là bản sao liên kết hiện tại: chuẩn bị migration nguyên tử bỏ đường ghi/cột/index cũ, bảo toàn phiên và câu hỏi; kiểm thử quyền sở hữu và xóa cascade.
4. Rà tiếp tài liệu/cấu hình trợ lý, câu hỏi nhanh và văn phong theo schema sau migration, không dùng riêng định nghĩa cũ trong `schema.sql`.
