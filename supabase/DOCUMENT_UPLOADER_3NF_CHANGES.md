# Tài liệu và người tải lên — đợt 20261203

Chạy sau `20261202_normalize_report_templates.sql`. Bản sửa trong repository; chưa áp dụng lên Supabase thật.

## Bảng được rà

`TAI_LIEU_QUY_TRINH` trước có 11 cột theo chuỗi migration: `madinhdanh, tieude, maloaitailieu, tomtat, ngaycapnhat, noidung, tentepgoc, loaitepgoc, dangsudung, ngaytao, linkdrive`. Sau có 12 cột: toàn bộ 11 cột trên và `manguoitailen`. Giữ tất cả cột hiện hữu, không đổi nội dung hay ngày của tài liệu cũ.

`manguoitailen → NGUOI_DUNG.madinhdanh`, `ON DELETE RESTRICT`. Tài khoản có tài liệu cần được giữ hoặc khóa để bảo toàn nguồn tạo. Người tải là người tạo bản ghi tài liệu, áp dụng cho tải file, thêm liên kết Drive và nhập nội dung. Chưa theo dõi người thay file trong các lần sửa sau.

Máy chủ lấy mã từ tài khoản đăng nhập khi tạo; không nhận mã hoặc tên người tải do client gửi. Khi sửa, giữ mã ban đầu, kể cả NULL của tài liệu cũ. Không suy đoán chủ sở hữu từ người đang chạy migration. Tên hiển thị là kết quả JOIN tới tài khoản; không thêm cột tên người tải vào bảng tài liệu.

`LOAI_TAI_LIEU` trước/sau giữ nguyên bốn cột `madinhdanh, tenloai, mota, danghoatdong`; PK `madinhdanh`, UNIQUE `tenloai`. Tài liệu tham chiếu qua `maloaitailieu` với `ON DELETE RESTRICT ON UPDATE RESTRICT` từ migration `20261022`. Tên loại được truy vấn từ danh mục. Đợt này không thêm bảng danh mục hay chép tên loại/người dùng. `tentepgoc` là tên tệp của tài liệu, không phải tên loại; `tomtat` và `noidung` là hai phần nội dung có thể biên tập riêng. Link Drive chỉ là đường dẫn nguồn, không bảo đảm nội dung đã đồng bộ.

Thiếu người tải là thiếu quan hệ truy xuất nguồn gốc; bản thân điều đó chưa đủ để kết luận vi phạm 3NF. Bổ sung mã FK và truy vấn tên tránh việc lưu lặp thuộc tính của tài khoản. Chưa kết luận toàn bộ hệ thống đạt 3NF.

## Triển khai và xác nhận

Chạy migration `migrations/20261203_document_uploaders.sql`, sau đó mở lại kho tài liệu. Tài liệu cũ hiện “Chưa xác định”; tài liệu tạo mới hiện tên tài khoản tạo. Không chạy lại migration cũ để ghi đè RPC mới.

Kiểm thử SQL tập trung `tests/documentUploaders.test.mjs` đã đạt: chạy lặp migration, đủ 12 cột, bảo toàn nội dung cũ, giữ NULL khi sửa tài liệu lịch sử, gán tác giả từ phiên, chặn giả mạo, giữ tác giả khi sửa, đổi tên tài khoản hiển thị theo nguồn, FK và xóa tài liệu. Đặt `PGLITE_MODULE_PATH` tới package PGlite rồi chạy `node --liftoff-only --wasm-num-compilation-tasks=1 tests/documentUploaders.test.mjs`.

Cùng bộ ca trong `tests/documentUploaderCases.mjs` được gắn cuối `tests/reenrollmentClassDuration.test.mjs` để kiểm tra trên chuỗi nâng cấp đầy đủ. Đã chạy lại toàn bộ chuỗi sau sửa, đạt cả tài liệu, phục hồi RPC AI/chat và chạy file gộp hai lần. Mapper tài liệu, TypeScript và production build đã đạt. Chưa nghiệm thu hình ảnh trên trình duyệt.
