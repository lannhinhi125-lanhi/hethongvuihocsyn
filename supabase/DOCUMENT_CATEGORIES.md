# Danh mục loại tài liệu

Chạy migrations/20261022_document_categories.sql sau 20261021_manual_student_feedback.sql trong Supabase SQL Editor; tải lại ứng dụng sau khi chạy thành công.

LOAI_TAI_LIEU có 4 cột: madinhdanh (mã loại, PK), tenloai (tên duy nhất), mota, danghoatdong. TAI_LIEU_QUY_TRINH dùng trường phân loại sẵn có, chuyển tên thành mã rồi đổi tên cột thành maloaitailieu và đặt khóa ngoại tới LOAI_TAI_LIEU. Không tạo cột tên loại trùng trong tài liệu. Tên loại SELECT qua quan hệ, API trả trường tenloaitailieu chỉ đọc. Không lưu JSON/JSONB hoặc mảng danh sách loại.

Các loại ban đầu lấy DISTINCT từ phân loại tài liệu đang có. Không seed danh sách loại cố định hoặc tự thêm loại mẫu. Giữ nguyên tài liệu, nội dung, tên phân loại và ngày cập nhật khi chuyển sang FK. Nếu dữ liệu cũ có tên phân loại rỗng, giao dịch dừng để sửa dữ liệu thay vì tự đoán loại.

Trong Tri thức & Cấu hình AI → Tài liệu tri thức, dùng Quản lý loại tài liệu để thêm mã/tên/mô tả, sửa tên/mô tả, ngừng hoặc sử dụng lại. Trong form tài liệu cũng có nút mở danh mục này. Dropdown và bộ lọc SELECT danh mục từ CSDL. Loại mới đang hoạt động có thể chọn ngay sau khi lưu thành công.

Không cho xóa loại đang có tài liệu; dùng Ngừng sử dụng. Loại chưa dùng được xóa. Loại ngừng sử dụng không được gán cho tài liệu mới, nhưng tài liệu đang dùng loại đó vẫn sửa nội dung được. Đổi tên loại tự cập nhật tên hiển thị trên các tài liệu khi đọc lại, không cập nhật tên lặp ở từng tài liệu.

Quyền quản lý dùng quyền Quản lý kho tài liệu tri thức SOP hiện có. Không cấp quyền đọc/ghi trực tiếp bảng cho anon/authenticated; API kiểm tra quyền, khóa ngoại và trạng thái loại. Nút lưu chờ kết quả CSDL và hiển thị lỗi nếu không thành công.

Kiểm thử: tests/documentCategories.test.mjs (bảo toàn dữ liệu, CRUD, FK, loại ngừng, quyền giáo viên, không JSON, chạy lại migration) và tests/documentCategoriesMapper.test.ts (chỉ ghi mã loại, tên chỉ đọc).
