# Bàn làm việc quản trị

Dashboard tổng quan được chuyển từ Báo cáo sang mục Bàn làm việc đầu menu. Tài khoản có quyền xem Bàn làm việc mở trang này khi đăng nhập; tài khoản khác mở phân hệ đầu tiên được cấp quyền. Cổng giáo viên giữ điều hướng riêng.

## Nội dung

- Ca học hôm nay: tổng ca, đang học, cần kiểm tra; bảng lớp, giáo viên thực dạy và trạng thái.
- Việc cần xử lý: sự cố, giải trình, học sinh chờ lớp, lớp thiếu giáo viên, lớp thiếu học liệu tuần này và buổi đã checkout còn thiếu nhận xét.
- Biểu đồ cột chồng về trạng thái ca theo ngày trong tuần, biểu đồ thanh về phân bổ ca theo giáo viên.
- Các biểu đồ tổng quan cũ: đường xu hướng học sinh/lớp mới, cơ cấu môn, vòng tròn sự cố, phân bố kết quả dự giờ. Các biểu đồ tổng quan tiếp tục dùng khoảng thời gian được chọn; khu vận hành phía trên luôn nói rõ hôm nay/tuần này hoặc việc còn tồn.
- Các nút dẫn tới phân hệ nghiệp vụ chỉ hoạt động nếu tài khoản có quyền vào phân hệ đó. Chỉ số chi tiết báo cáo dẫn sang Báo cáo với khoảng thời gian và tiêu chí tương ứng.
- Nút làm mới và chu kỳ cập nhật 30 giây khi trang hiển thị. Không có thao tác ghi dữ liệu từ dashboard.

Báo cáo & thống kê giữ báo cáo chi tiết, báo cáo tùy chỉnh, bộ lọc và xuất kết quả; không còn tab dashboard trùng lặp.

## Phân quyền tại phân hệ 1

Trong nhóm quyền cổng quản trị có phần **Bàn làm việc → Xem Bàn làm việc và biểu đồ tổng quan vận hành**. Quyền này độc lập với báo cáo chi tiết và các quyền thêm/sửa/xóa nghiệp vụ.

Mã feature trong database vẫn là `Xem Dashboard chỉ số KPI & Biểu đồ tổng quan` để dùng các quy tắc đọc hiện có. Khi lưu quyền từ giao diện, Bàn làm việc và Báo cáo được lưu bằng các feature đã tồn tại, không yêu cầu SQL mới.

Các nhóm cũ dùng `PH8_ALL` vẫn có quyền Bàn làm việc và Báo cáo. `PH8_READ` cũ chỉ có Bàn làm việc, không được mở rộng sang báo cáo chi tiết. Khi sửa nhóm quyền, có thể bỏ riêng Bàn làm việc mà vẫn giữ báo cáo. Không thay đổi quyền của cổng giáo viên.

## Nguồn số liệu và kiểm tra

Toàn bộ chỉ số được tổng hợp từ dữ liệu đang đọc qua RPC: buổi học, lớp, đăng ký môn, giáo viên, học liệu, nhận xét, sự cố và giải trình. Không thêm bảng thống kê hay chèn số tổng hợp.

Kiểm tra TypeScript và build production đạt. Bộ 39 file test không cần database đạt. Kiểm thử PostgreSQL cục bộ xác nhận nhóm chỉ có feature Bàn làm việc đọc được dữ liệu tổng quan và không được cập nhật lớp. Unit test kiểm tra ranh giới tuần/ngày, học sinh chờ nhiều môn không bị đếm trùng, công việc chờ xử lý, ca nghỉ và phân bổ đúng giáo viên dạy thay. Chưa nghiệm thu hình ảnh trên trình duyệt hoặc deployment Vercel thực tế.
