# Nguồn dữ liệu Bàn làm việc và Báo cáo

Luồng đọc: Supabase RPC `public.vuihoc_business_data(p_token)` → `businessPersistence` → `fromSupabaseRow` → các phép lọc và tổng hợp chỉ đọc trên giao diện. Quyền tài khoản được kiểm tra trong RPC; giao diện không tự bổ sung các bản ghi thiếu quyền.

Không có số liệu ngẫu nhiên hoặc dữ liệu thay thế khi truy vấn lỗi. Lúc chưa tải thành công, không hiển thị bảng số liệu bằng 0. Khi làm mới thất bại, giữ lần tải thành công gần nhất và thông báo rõ. Thời điểm cập nhật là thời điểm nhận dữ liệu, không phải thời gian sửa từng bản ghi.

- Lớp, học sinh, giáo viên mới: ngày tạo hồ sơ (`ngaytao`). Hồ sơ thiếu ngày chỉ hiện ở toàn bộ thời gian. Sĩ số và trạng thái là hiện trạng.
- Ca dạy: từ `BUOI_HOC`, giáo viên thực dạy lấy giáo viên dạy thay nếu có.
- Tỷ lệ sự cố: cùng cơ sở ngày học trên Bàn làm việc, Báo cáo chi tiết và Báo cáo động. Đếm buổi có ít nhất một sự cố, không cộng trùng nhiều sự cố cùng buổi. Ngày báo sự cố có thể khác ngày học.
- Báo cáo động dự giờ: từng biên bản `DA_DUYET`, lọc chính xác theo ngày dự giờ. Điểm trung bình tính theo biên bản; số giáo viên đếm mã duy nhất. Mã biên bản và mã buổi được giữ để đối chiếu trong chi tiết nhóm.
- Bàn làm việc và báo cáo chi tiết xếp hạng giáo viên: trung bình điểm của từng giáo viên trong kỳ. Không nhầm với trung bình các biên bản trong Báo cáo động.
- Đăng ký môn và hồ sơ học sinh là hai nguồn riêng: một học sinh đăng ký hai môn vẫn là một hồ sơ.
- Học sinh cũ chuyển lớp: hồ sơ tạo trước kỳ, có lịch sử chuyển từ một lớp sang lớp khác trong kỳ, không dùng bản ghi hiện trạng làm bằng chứng. Chuyển nhiều lần chỉ tính một người. Hồ sơ mới có chuyển lớp được ghi riêng, vẫn nằm trong số hồ sơ mới.
- Lớp được tạo trong kỳ khác lớp mới tăng trưởng. Tăng trưởng yêu cầu ngày tạo lớp trong kỳ, có học sinh, toàn bộ hồ sơ học sinh mới trong kỳ và ghép lớp lần đầu theo môn. Học sinh cũ đăng ký thêm môn không trở thành học sinh mới. Thiếu lịch sử hoặc ngày tạo thì chưa xác định; không tự suy từ danh sách lớp hiện tại. Biểu đồ xu hướng Bàn làm việc dùng lớp mới tăng trưởng; bảng phân loại cộng lại bằng tổng lớp được tạo trong kỳ.
- Mẫu báo cáo chỉ lưu cấu hình vào `report_templates`; không chèn số tổng hợp, công hay bản ghi nghiệp vụ.

Báo cáo chi tiết dùng mẫu có sẵn để tra cứu và xuất bảng. Báo cáo động dùng bốn bước: nguồn dữ liệu, chỉ số, cách nhóm, thời gian. Các cấu hình mới mặc định toàn bộ thời gian; mẫu đã lưu giữ lựa chọn thời gian của người dùng.

Kiểm tra bằng dữ liệu kiểm thử: ranh giới ngày, ngày báo khác ngày học, sự cố trùng, biên bản nháp, nhiều biên bản của cùng giáo viên và nguồn rỗng. Kiểm thử RPC PostgreSQL cục bộ độc lập với Supabase đang triển khai; không xác nhận dữ liệu live hoặc hình ảnh trình duyệt.
