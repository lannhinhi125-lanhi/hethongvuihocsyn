# Lịch sử câu hỏi chatbot theo tài khoản

Chạy toàn bộ **setup_teacher_question_history.sql** trong SQL Editor. File cài phần lưu câu hỏi và truy vấn lịch sử trong một transaction; chạy lại được, kể cả khi đã cài bản 20261106.

Nếu đã chạy bản lịch sử giáo viên trước đó, chỉ cần chạy toàn bộ **migrations/20261108_chat_history_accounts.sql** để mở tính năng cho quản trị có quyền AI. Bản nâng cấp giữ nguyên câu hỏi cũ và bổ sung chủ sở hữu tài khoản từ liên kết giáo viên–tài khoản hiện có.

| Bảng | Cột |
| --- | --- |
| PHIEN_CHAT_AI | maphien (UUID, khóa chính), manguoidung (khóa ngoại NGUOI_DUNG, bắt buộc), magiaovien (khóa ngoại GIAO_VIEN, có thể trống), thoigianbatdau |
| CAU_HOI_CHAT_AI | macauhoi (UUID, khóa chính), maphien (khóa ngoại PHIEN_CHAT_AI), noidung (text), thoigianhoi |

Chỉ lưu câu hỏi. Không lưu câu trả lời AI, bản sao tài liệu, JSON/JSONB hoặc tiêu đề chat. Tiêu đề danh sách được truy vấn từ câu hỏi đầu tiên. Không thêm cột cho chức năng xem lịch sử. Danh sách và câu hỏi được truy vấn theo trang 20 dòng, kèm một dòng kiểm tra còn trang tiếp theo; có chỉ mục theo giáo viên/phiên và thời gian.

Mã người dùng lấy từ phiên đăng nhập trong database. Hồ sơ giáo viên được liên kết nếu tài khoản có hồ sơ; tài khoản quản trị không cần có hồ sơ giáo viên. Chủ sở hữu không được nhận từ trình duyệt. RPC chỉ truy vấn hoặc thay đổi lịch sử thuộc tài khoản đang đăng nhập, kể cả khi tài khoản có quyền quản trị toàn hệ thống. Browser không có quyền đọc/ghi trực tiếp hai bảng.

Cả cổng giáo viên và cổng quản trị dùng chung các nút lịch sử, tạo cuộc trò chuyện mới, hỏi lại và xóa. Quyền AI vẫn được kiểm tra ở giao diện, API Gemini và RPC lịch sử; tài khoản chỉ có quyền quản trị nhưng chưa có quyền AI không được tự động cấp thêm quyền.

- **Lịch sử câu hỏi:** chọn cuộc trò chuyện để đọc câu hỏi. Câu trả lời cũ không được khôi phục vì không lưu.
- **Hỏi lại câu này:** gọi Gemini dựa trên tài liệu đang bật hiện tại; không tạo bản sao câu hỏi cũ.
- **Cuộc trò chuyện mới:** mở khung trống, giữ lịch sử cũ. Chỉ tạo phiên database khi gửi câu hỏi đầu tiên.
- **Đóng bot bằng X:** giữ lịch sử câu hỏi. Câu trả lời có thể còn trong bộ nhớ khi màn hình vẫn mở.
- **Xóa chat:** xác nhận trước; xóa phiên hiện tại cùng câu hỏi bằng khóa ngoại ON DELETE CASCADE. Xóa database thành công mới xóa màn hình; nếu lỗi thì giữ lại và báo lỗi.

Câu hỏi được lưu trước khi gọi Gemini; dù Gemini lỗi vẫn có thể xem lại và bấm Hỏi lại. Câu trả lời AI chỉ giữ trong bộ nhớ. Tải lại trang hoặc chuyển cuộc trò chuyện không khôi phục được câu trả lời cũ. Ngữ cảnh gửi Gemini gồm tối đa 6 cặp hỏi/đáp đã có câu trả lời trong bộ nhớ, tối đa 24.000 ký tự; không ghép lịch sử câu hỏi cũ thành các lượt hỏi/đáp giả. Mỗi câu hỏi mới giới hạn 8.000 ký tự ở giao diện.

Khung thử nghiệm quản trị cũng lưu câu hỏi vào lịch sử riêng của tài khoản. Không cần service role key hoặc biến môi trường mới.
