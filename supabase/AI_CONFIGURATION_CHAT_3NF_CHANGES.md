# Chuẩn hóa tiếp cấu hình AI và chat — đợt 20261204

Migration: [20261204_normalize_ai_configuration_chat.sql](migrations/20261204_normalize_ai_configuration_chat.sql), chạy sau `20261203_document_uploaders.sql`. Đã sửa SQL và kiểm thử cục bộ; chưa triển khai Supabase thật.

## Năm bảng đang hoạt động

| Bảng | Toàn bộ cột trước | Toàn bộ cột sau | Xử lý |
| --- | --- | --- | --- |
| `PHIEN_CHAT_AI` | `maphien, magiaovien, thoigianbatdau, manguoidung` | `maphien, thoigianbatdau, manguoidung` | 4 → 3, bỏ mã giáo viên lưu trùng theo tài khoản |
| `CAU_HOI_CHAT_AI` | `macauhoi, maphien, noidung, thoigianhoi` | Như trước | 4 → 4, giữ câu hỏi theo phiên |
| `CAU_HINH_TRO_LY` | `madinhdanh, loichaomung, vanphong, chiduatrentailieu, cautraloiduphong, chidanhethong, ngaytao, ngaycapnhat` | Như trước | 8 → 8, thêm chỉ mục duy nhất cho một cấu hình dùng chung |
| `CAU_HINH_HE_THONG` | `madinhdanh, mavanphongdangchon, ngaytao, ngaycapnhat` | Như trước | 4 → 4, thêm chỉ mục duy nhất cho một cấu hình dùng chung |
| `VAN_PHONG_NHAN_XET` | `madinhdanh, tenvanphong, chidan, ngaytao, ngaycapnhat` | Như trước | 5 → 5, giữ nội dung cấu hình độc lập theo mã |

Các cột trên là cấu trúc sau chuỗi nâng cấp trước đợt này, không phải riêng `schema.sql` cũ. Khóa mã hóa cũ trong cấu hình hệ thống đã được bỏ từ `20261012_plaintext_passwords.sql`.

## Phụ thuộc và khóa

`PHIEN_CHAT_AI`: PK `maphien`; FK bắt buộc `manguoidung → NGUOI_DUNG.madinhdanh ON DELETE CASCADE`. `GIAO_VIEN.manguoidung` là UNIQUE nên mã giáo viên hiện tại có thể truy vấn từ tài khoản. RPC `20261108` đã dùng tài khoản cho toàn bộ quyền sở hữu; chỉ đường tạo phiên còn ghi thêm giáo viên. Đợt này bỏ đường ghi đó, cột cũ và các index/FK gắn cột. Không sao chép tên giáo viên/tài khoản hay tạo bảng thay thế. Không chuyển quyền sở hữu sang người đang chạy migration. Phiên thuộc tài khoản tồn tại độc lập với hồ sơ giáo viên; xóa tài khoản vẫn xóa các phiên của tài khoản đó.

`CAU_HOI_CHAT_AI`: PK `macauhoi`; FK bắt buộc `maphien → PHIEN_CHAT_AI.maphien ON DELETE CASCADE`. Nội dung/thời gian hỏi phụ thuộc vào chính câu hỏi. Không lưu lại mã chủ sở hữu, tên người dùng hay tiêu đề phiên. Danh sách phiên truy vấn tiêu đề từ câu hỏi đầu; câu trả lời AI không được lưu trong hai bảng này.

Bản sửa tương thích RPC: cài trực tiếp helper kiểm quyền tài khoản cùng năm RPC mở phiên/ghi câu hỏi/xóa phiên/liệt kê phiên/đọc câu hỏi. Không dò chuỗi định nghĩa RPC cũ. Khôi phục owner quản trị và quyền gọi có kiểm tra token cho `anon/authenticated`, thu hồi gọi trực tiếp helper. Nhờ đó các bản RPC khác cách trình bày hoặc còn dùng giáo viên đều được chuyển đầy đủ; chạy lại vẫn sửa được RPC khi cột giáo viên đã bỏ.

`CAU_HINH_TRO_LY`: PK `madinhdanh`; các thuộc tính mô tả một cấu hình trợ lý. `vanphong` là nội dung người dùng nhập cho trợ lý tra cứu, không phải mã của danh mục văn phong nhận xét học sinh. Không ép FK sai nghĩa hoặc tạo danh mục chứa bản sao nội dung. `loichaomung`, `cautraloiduphong` và `chidanhethong` là ba vai trò nội dung riêng, không gộp vì cùng kiểu text.

`CAU_HINH_HE_THONG`: PK `madinhdanh`; FK `mavanphongdangchon → VAN_PHONG_NHAN_XET.madinhdanh ON DELETE SET NULL`. Chỉ lưu mã văn phong đang chọn, không chép tên/chỉ dẫn. Hai chỉ mục duy nhất trên hằng số `true` buộc mỗi bảng cấu hình có tối đa một hàng, phù hợp hợp đồng ứng dụng đang đọc phần tử đầu tiên. Đây là củng cố tính toàn vẹn cấu hình, không phải bằng chứng rằng nhiều hàng tự nó vi phạm 3NF.

`VAN_PHONG_NHAN_XET`: PK `madinhdanh`; tên/chỉ dẫn và ngày thuộc về một văn phong. Không suy diễn tên là khóa duy nhất: hai văn phong có thể có cùng tên nhưng nội dung riêng. Không phát hiện thuộc tính tài khoản hay danh mục khác được lưu trùng ở bảng này trong phạm vi rà mã.

## Bảng/trường cũ không tạo lại

- `CAU_HINH_TRO_LY.cauhoinhanh` đã bị bỏ từ `20261015_relational_teacher_reports.sql`; UI hiện không có caller `quickPrompts`. Không có bảng câu hỏi gợi ý đang hoạt động để chuẩn hóa trong chuỗi hiện tại; không tạo lại chức năng đã nghỉ. Ánh xạ cũ còn trong mã không chứng minh cột còn tồn tại.
- `TUY_CHON_NGUOI_DUNG` đã bỏ từ `20261104_remove_unused_legacy_tables.sql`.
- `LUOT_NHAN_XET_AI` đã bỏ từ `20261103_remove_unused_ai_review_usage.sql`.

## Bảo toàn dữ liệu và kiểm thử

Chạy [ai_configuration_chat.sql](diagnostics/ai_configuration_chat.sql) chỉ đọc trước khi nâng cấp. Có phiên lệch cặp giáo viên–tài khoản hoặc nhiều hàng cấu hình thì migration dừng nguyên tử; không tự sửa người sở hữu, chọn cấu hình hoặc xóa bản ghi để vượt kiểm tra. Phụ thuộc SQL ngoài dự kiến cũng chặn DROP vì không dùng CASCADE.

Kiểm thử tập trung: đặt `PGLITE_MODULE_PATH`, chạy `node --liftoff-only --wasm-num-compilation-tasks=1 tests/documentUploaders.test.mjs`. Bộ ca AI/chat trong `tests/aiConfigurationChatCases.mjs` kiểm tra rollback khi lệch nguồn/nhiều cấu hình, chạy lặp, bảo toàn phiên/câu hỏi/cấu hình/văn phong, singleton, sửa cấu hình và chọn văn phong qua RPC, tạo/đọc/xóa chat qua RPC, hai tài khoản không đọc/ghi/xóa chat của nhau, chặn ghi muộn và xóa cascade khi xóa tài khoản. Cùng bộ ca đã gắn vào cuối chuỗi kiểm thử đầy đủ; không coi fixture tập trung là đã chạy lại toàn bộ chuỗi.

Đã chạy đạt cả fixture tập trung và toàn bộ `tests/reenrollmentClassDuration.test.mjs`, bao gồm ba biến thể RPC cũ và chạy lại `apply_documents_ai_update.sql` hai lần sau toàn bộ các bước chuẩn hóa.

Kết luận giới hạn ở năm bảng nêu trên. Không tuyên bố mọi bảng trong hệ thống đã đạt 3NF hoặc database thật đã được cập nhật.
