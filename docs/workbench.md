# Bàn làm việc quản trị

Dashboard tổng quan được chuyển từ Báo cáo sang mục Bàn làm việc đầu menu. Tài khoản có quyền xem Bàn làm việc mở trang này khi đăng nhập; tài khoản khác mở phân hệ đầu tiên được cấp quyền. Cổng giáo viên giữ điều hướng riêng.

## Nội dung

- Thanh thời gian chung có Ngày, Tuần, Tháng, Tùy chọn, nút lùi/tiến và trở về hiện tại. Chuyển mục nghiệp vụ giữ nguyên khoảng thời gian.
- Ca dạy: số ca trong kỳ, trạng thái, biểu đồ cột chồng, phân bổ giáo viên và bảng ca học có ngày, giờ, lớp, giáo viên thực dạy.
- Việc cần xử lý: sự cố, giải trình, thiếu học liệu và thiếu nhận xét trong kỳ. Giải trình tính theo tháng giao với kỳ đã chọn; trạng thái xử lý là trạng thái hiện tại.
- Tuyển sinh & lớp học: xu hướng học sinh mới và lớp được tạo, cơ cấu môn; học sinh chờ lớp và lớp thiếu giáo viên được ghi rõ là hiện trạng, không phải ảnh chụp lịch sử.
- Chất lượng đào tạo: tỷ lệ ca có sự cố và kết quả dự giờ đã duyệt trong kỳ, biểu đồ cơ cấu sự cố và xếp loại giáo viên. Điểm tổng quan tính theo trung bình từng giáo viên.
- Các nút dẫn tới phân hệ nghiệp vụ chỉ hoạt động nếu tài khoản có quyền vào phân hệ đó.
- Nút làm mới và chu kỳ cập nhật 30 giây khi trang hiển thị. Không có thao tác ghi dữ liệu từ dashboard.

Báo cáo & thống kê giữ báo cáo chi tiết, báo cáo tùy chỉnh, bộ lọc và xuất kết quả; không còn tab dashboard trùng lặp.

## Phân quyền tại phân hệ 1

Trong nhóm quyền cổng quản trị có phần **Bàn làm việc → Xem Bàn làm việc và biểu đồ tổng quan vận hành**. Quyền này độc lập với báo cáo chi tiết và các quyền thêm/sửa/xóa nghiệp vụ.

Mã feature trong database vẫn là `Xem Dashboard chỉ số KPI & Biểu đồ tổng quan` để dùng các quy tắc đọc hiện có. Khi lưu quyền từ giao diện, Bàn làm việc và Báo cáo được lưu bằng các feature đã tồn tại, không yêu cầu SQL mới.

Các nhóm cũ dùng `PH8_ALL` vẫn có quyền Bàn làm việc và Báo cáo. `PH8_READ` cũ chỉ có Bàn làm việc, không được mở rộng sang báo cáo chi tiết. Khi sửa nhóm quyền, có thể bỏ riêng Bàn làm việc mà vẫn giữ báo cáo. Không thay đổi quyền của cổng giáo viên.

## Nguồn số liệu và kiểm tra

Toàn bộ chỉ số được tổng hợp từ dữ liệu đang đọc qua RPC: buổi học, lớp, đăng ký môn, giáo viên, học liệu, nhận xét, sự cố và giải trình. Không thêm bảng thống kê hay chèn số tổng hợp.

Kiểm tra TypeScript và build production đạt. Bộ 39 file test không cần database đạt. Kiểm thử PostgreSQL cục bộ xác nhận nhóm chỉ có feature Bàn làm việc đọc được dữ liệu tổng quan và không được cập nhật lớp. Unit test kiểm tra ranh giới tuần/ngày, học sinh chờ nhiều môn không bị đếm trùng, công việc chờ xử lý, ca nghỉ và phân bổ đúng giáo viên dạy thay. Chưa nghiệm thu hình ảnh trên trình duyệt hoặc deployment Vercel thực tế.
