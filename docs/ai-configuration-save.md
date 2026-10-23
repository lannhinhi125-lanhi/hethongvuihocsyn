# Lưu cấu hình AI và cập nhật SQL

## File SQL cần chạy

Nếu cơ sở dữ liệu đã nâng cấp đủ đến `20261202_normalize_report_templates.sql`, mở Supabase → SQL Editor và chạy toàn bộ `supabase/apply_documents_ai_update.sql`. File gộp hai migration `20261203_document_uploaders.sql` và `20261204_normalize_ai_configuration_chat.sql` trong một giao dịch; có thể chạy lại. Không cần chạy riêng hai file này sau file gộp.

Nếu bản trước báo “Không nhận diện được RPC mở phiên chat theo tài khoản”, lấy lại toàn bộ nội dung file gộp mới rồi chạy lại. Bản sửa cài trực tiếp bộ RPC theo tài khoản và thiết lập lại owner/quyền; không so khớp chuỗi SQL với định nghĩa đang triển khai. Đã kiểm thử với RPC khác cách trình bày, bộ API cũ theo giáo viên và RPC mở phiên đã chuẩn hóa trong khi cột cũ còn tồn tại. File gộp giữ tính nguyên tử nên lỗi của bản cũ không yêu cầu xóa bảng hay lịch sử chat để thử lại.

Đã chạy đạt toàn bộ chuỗi kiểm thử nâng cấp đến báo cáo, tài liệu và AI/chat; file gộp chạy lại hai lần thành công trên cấu trúc đó.

Nếu thiếu bản `20261202`, file dừng với thông báo rõ ràng trước khi sửa dữ liệu. Nếu các cấu hình dùng chung có nhiều dòng hoặc lịch sử chat lệch liên kết tài khoản, cần đối soát theo `supabase/diagnostics/ai_configuration_chat.sql`; không tự chọn/xóa cấu hình hay đoán người sở hữu để bỏ qua kiểm tra. File gộp chưa được áp dụng lên Supabase thật trong phiên làm việc này.

## Sử dụng trong ứng dụng

Vào **AI Studio → Bot chat AI**, sửa câu chào, giọng văn/cách xưng hô, độ dài, hướng dẫn bổ sung, phạm vi tài liệu hoặc câu trả lời dự phòng rồi bấm **Lưu cấu hình AI**. Khi đang sửa, các giá trị nằm ở bản nháp; chatbot dùng cấu hình đã lưu. **Hủy thay đổi** lấy lại bản đang lưu. Nếu cấu hình được cập nhật từ phiên khác trong lúc chỉnh sửa, giao diện yêu cầu lấy bản mới trước khi lưu.

Nút lưu gửi thay đổi qua `vuihoc_save_business`, chờ Supabase xác nhận rồi mới thông báo thành công. Lỗi lưu giữ lại bản nháp để sửa/thử lại. Quyền chỉnh cấu hình là `Cấu hình Prompt văn phong & Tiêu chí nhận xét môn`; người chỉ có quyền chat vẫn dùng chatbot nhưng không sửa cấu hình.

Lưu ở `CAU_HINH_TRO_LY`: `loichaomung`, `vanphong`, `chiduatrentailieu`, `cautraloiduphong`, `chidanhethong`. Độ dài và hướng dẫn bổ sung vẫn dùng trường text `chidanhethong`, không thêm JSON hoặc bảng bản sao.

## Áp dụng vào AI

Chatbot quản trị và giáo viên cùng dùng `useTeacherChatHistory` và cấu hình đã lưu. Giọng văn, hướng dẫn và độ dài đi vào system prompt cho câu hỏi tiếp theo; câu chào hiển thị trong khung chat. Lịch sử câu trả lời cũ giữ nguyên. Các phiên khác nhận bản cấu hình mới qua chu kỳ làm mới dữ liệu hiện có, tối đa khoảng 30 giây khi tab đang hiển thị, hoặc khi quay lại tab/tải lại trang.

Bật **Chỉ trả lời dựa trên tài liệu đang bật**: yêu cầu AI dựa trên tài liệu và dùng đúng câu dự phòng khi thiếu căn cứ. Khi không có tài liệu đang bật có nội dung, ứng dụng trả trực tiếp câu dự phòng, không gọi AI. Tắt tùy chọn: cho phép kiến thức chung và yêu cầu phân biệt với quy định của trung tâm. Tài liệu chỉ có link nhưng chưa trích xuất nội dung không được coi là nguồn đã đọc. Giọng văn/hướng dẫn không cho phép thay đổi sự thật trong tài liệu.

Đã kiểm tra SQL lưu/đọc lại toàn bộ trường cấu hình, prompt sử dụng giá trị đọc từ SQL, prompt hai chế độ, câu dự phòng không có tài liệu, và chuyển system prompt qua dịch vụ Gemini bằng mock. TypeScript và production build đạt. Chưa kiểm thử tương tác trực tiếp trên trình duyệt hoặc câu trả lời từ Gemini thật với cấu hình Supabase của người dùng.
