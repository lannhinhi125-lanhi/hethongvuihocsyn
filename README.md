# Xây dựng hệ thống quản lý vận hành lớp học tại nền tảng giáo dục trực tuyến VUIHOC tích hợp AI hỗ trợ giáo viên

## Giới thiệu

Đề tài xây dựng hệ thống web phục vụ công tác vận hành lớp học trực tuyến tại VUIHOC. Hệ thống hỗ trợ bộ phận Vận hành, bộ phận Chuyên môn và giáo viên phối hợp trong suốt quá trình tổ chức lớp học, từ xếp lớp, phân công giáo viên và chuẩn bị học liệu đến theo dõi ca dạy, xử lý sự cố, đánh giá dự giờ và tổng hợp báo cáo.

Hệ thống gồm **Cổng quản trị** dành cho quản trị viên, nhân viên Vận hành và nhân viên Chuyên môn, cùng **Cổng giáo viên** để theo dõi lịch dạy, đăng ký lịch rảnh và tra cứu thông tin nghiệp vụ. Trợ lý AI được tích hợp vào Cổng giáo viên, sử dụng tài liệu nội bộ để hỗ trợ giải đáp các câu hỏi về quy trình, quy định và cách xử lý tình huống trong ca dạy.

## Chức năng chính

### Cổng quản trị

| Nhóm chức năng | Nội dung |
| --- | --- |
| **Quản trị tài khoản và phân quyền** | Cấp mới, cập nhật, khóa hoặc mở khóa tài khoản. Thiết lập quyền truy cập các chức năng theo nhóm quyền. |
| **Quản lý danh mục dùng chung** | Thiết lập môn học, khối lớp, trình độ, khung giờ, mô hình lớp, giới hạn sĩ số và danh mục sự cố để sử dụng thống nhất khi xếp lớp và vận hành ca dạy. |
| **Quản lý giáo viên** | Quản lý hồ sơ, thông tin chuyên môn và lịch rảnh của giáo viên. Tra cứu giáo viên phù hợp khi phân công đứng lớp hoặc bố trí dạy thay. |
| **Quản lý và điều phối lớp học** | Tiếp nhận thông tin phục vụ xếp lớp, tạo lớp theo mô hình và giới hạn sĩ số, phân công giáo viên, thiết lập liên kết phòng học và phân phối học liệu theo tuần. |
| **Giám sát ca dạy và xử lý sự cố** | Theo dõi lịch dạy và thời điểm giáo viên vào lớp, cập nhật tình trạng ca dạy, ghi nhận sự cố và điều phối giáo viên dạy thay khi cần. |
| **Đánh giá dự giờ** | Chọn ca dạy để dự giờ, chấm điểm theo các tiêu chí chuyên môn, ghi nhận nhận xét và gửi kết quả cho giáo viên. |
| **Quản lý kho tri thức AI** | Tải lên tài liệu về quy trình vận hành, quy định nội bộ và hướng dẫn xử lý sự cố. Kiểm tra nội dung và bật sử dụng các tài liệu được phép đưa vào phạm vi tra cứu của trợ lý AI. |
| **Báo cáo và thống kê** | Tổng hợp kết quả vận hành ca dạy và đánh giá dự giờ. Hỗ trợ chọn trường dữ liệu, lưu mẫu và xuất báo cáo theo nhu cầu theo dõi. |

### Cổng giáo viên

- **Xem lịch dạy và thực hiện ca dạy** — Theo dõi lịch giảng dạy theo tuần, xem học liệu của từng buổi, truy cập phòng học bằng nút **Vào lớp** và xác nhận hoàn tất ca dạy.
- **Đăng ký lịch rảnh** — Cập nhật các khung giờ có thể giảng dạy để bộ phận Vận hành sử dụng khi phân công lớp hoặc tìm giáo viên dạy thay.
- **Trao đổi với bộ phận Vận hành** — Nhắn tin khi cần hỗ trợ hoặc khi phát sinh vấn đề trong ca dạy. Bộ phận Vận hành tiếp nhận thông tin và cập nhật sự cố vào ca tương ứng.
- **Xem kết quả dự giờ** — Theo dõi điểm đánh giá và nhận xét do bộ phận Chuyên môn gửi.
- **Tra cứu với trợ lý AI** — Đặt câu hỏi về quy trình, quy định nội bộ hoặc cách xử lý tình huống. Trợ lý tra cứu nội dung liên quan trong các tài liệu đang được sử dụng để hỗ trợ trả lời.

## Công nghệ sử dụng

Hệ thống sử dụng **React 19**, **TypeScript**, **Vite** và **Tailwind CSS** cho giao diện, **Supabase** cho cơ sở dữ liệu và **Gemini** cho trợ lý AI. Trong phiên bản này, chức năng đăng nhập, quản lý tài khoản và nhóm quyền đã kết nối Supabase. Các màn hình nghiệp vụ còn lại hiện sử dụng dữ liệu trong bộ nhớ.

## Hướng dẫn chạy và build

Yêu cầu **Node.js 22.12 trở lên** và **npm**. Tại thư mục gốc của dự án, tạo tệp `.env` từ `.env.example` rồi điền `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`. Nếu sử dụng trợ lý AI, cấu hình thêm `GEMINI_API_KEY`.

Cài đặt thư viện và chạy hệ thống ở chế độ phát triển.

```bash
npm install
npm run dev
```

Mở hệ thống tại `http://localhost:3000`. Để tạo bản build, chạy `npm run build`. Kết quả build được lưu trong thư mục `dist/`.
