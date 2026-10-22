# Rà soát nhận xét và danh mục bổ sung — 20261201

Chạy sau `20261130_normalize_payroll_sources.sql`. Đây là đợt củng cố ràng buộc cho mô hình hiện có, không phải đợt xóa cột trùng. Chưa thực thi trên Supabase thật trong phiên này.

## Đính chính phạm vi

Bốn bảng `NHOM_TIEU_CHI`, `TIEU_CHI`, `LUA_CHON_TIEU_CHI`, `TIEU_CHI_NHAN_XET` đã được bỏ bởi migration `20261021_manual_student_feedback.sql`. Trước/sau đợt này đều không tồn tại; không tạo lại hay xóa thêm. Migration sẽ dừng nếu phát hiện chúng còn tồn tại để tránh đoán phiên bản dữ liệu. Các định nghĩa trong migration lịch sử vẫn được giữ phục vụ dựng cơ sở dữ liệu từ đầu.

## Toàn bộ cột trước và sau

### NHAN_XET_BUOI_HOC — 6 → 6

Trước: `mabuoi, mahocsinh, noidung, manguoicapnhat, ngaytao, ngaycapnhat`.

Sau: `mabuoi, mahocsinh, noidung, manguoicapnhat, ngaytao, ngaycapnhat`.

Không bỏ/thêm cột. PK `(mabuoi, mahocsinh)` xác định nhận xét của một học sinh trong một buổi. FK `mabuoi → BUOI_HOC.madinhdanh`, `mahocsinh → HOC_SINH.madinhdanh`, `manguoicapnhat → NGUOI_DUNG.madinhdanh` giữ nguyên. Không lưu tên học sinh, tên giáo viên, tên lớp hay tiêu chí trong bảng này. Nội dung và thông tin cập nhật là thuộc tính của chính nhận xét.

Luồng giáo viên ghi nhận xét thông qua `public.vuihoc_save_business`; thông tin tác giả được xác định phía SQL. `public.vuihoc_business_data` ghép nhận xét vào `classes.chitietcahoc` theo buổi/học sinh để giao diện lớp và giáo viên đọc. Cấu trúc JSON trả về chỉ là kết quả truy vấn, không phải cột JSON lưu thêm.

### DANH_MUC_BO_SUNG — 7 → 7

Trước: `madinhdanh, madanhmuc, tendanhmuc, mota, madanhmuccha, ngaytao, ngaycapnhat`.

Sau: `madinhdanh, madanhmuc, tendanhmuc, mota, madanhmuccha, ngaytao, ngaycapnhat`.

Không bỏ/thêm cột. PK `madinhdanh`; FK tự liên kết `madanhmuccha → DANH_MUC_BO_SUNG.madinhdanh`. `madanhmuc` là mã nghiệp vụ, khác vai trò với khóa định danh. Giữ UNIQUE hiện có; thêm UNIQUE trên `upper(btrim(madanhmuc))` để chặn mã trùng do hoa/thường/khoảng trắng ở mọi nhánh. Thêm CHECK định danh/mã/tên không rỗng và trigger chặn vòng lặp cha–con. Trigger dùng khóa giao dịch khi kiểm tra cây.

### MUC_DANH_MUC — 7 → 7

Trước: `madanhmuc, madinhdanh, ma, ten, mota, danghoatdong, thutu`.

Sau: `madanhmuc, madinhdanh, ma, ten, mota, danghoatdong, thutu`.

Không bỏ/thêm cột. PK `(madanhmuc, madinhdanh)`; FK `madanhmuc → DANH_MUC_BO_SUNG.madinhdanh`. Lưu ý tên cột `madanhmuc` tại bảng con chứa **định danh bảng cha**, không phải mã nghiệp vụ của cha. Tên/mô tả của mục con là nội dung khác tên/mô tả của nhóm cha.

Thêm UNIQUE `(madanhmuc, upper(btrim(ma)))`: mã mục chỉ duy nhất trong nhóm; các nhóm khác nhau vẫn được có mã mục giống nhau. Thêm CHECK định danh/mã/tên không rỗng, thứ tự dương. Không thêm ràng buộc duy nhất tên vì tên không phải khóa nghiệp vụ.

## Nguồn và các bảng/luồng truy vấn sang

- `CatalogWorkspace` đọc/ghi danh mục qua dataset `custom_catalogs`; SQL ghép `DANH_MUC_BO_SUNG` với các dòng `MUC_DANH_MUC` thành `danhsachmuc`. Danh sách này không phải cột lưu vật lý. Giao diện chặn mã nhóm trùng trên toàn bộ danh mục; SQL cũng bảo vệ ghi trực tiếp/API.
- `LOP_HOC.(madanhmucthoihan, mathoihan)` tiếp tục FK ghép đến `MUC_DANH_MUC.(madanhmuc, madinhdanh)`. Thời hạn lấy từ mục thuộc nhóm thời hạn đã cấu hình trong Supabase. Đổi tên mục không chép tên vào lớp hay dòng công; ID tham chiếu giữ nguyên. Các quy tắc thời hạn/bảo vệ lịch sử từ đợt 20261124 giữ nguyên.
- Gỡ `criteria_categories` khỏi context, hợp đồng mapper/dataset và kiểu TypeScript còn sót. Không thay luồng nhận xét viết tay đang dùng.
- Cập nhật kiểm kê bảng để bốn bảng tiêu chí đã nghỉ không bị báo thiếu; bổ sung kiểm tra các FK nhận xét/danh mục hiện có.

## Kết luận 3NF trong phạm vi này

Ba bảng giữ một nguồn cho từng nội dung; thuộc tính không khóa mô tả khóa của chính thực thể/quan hệ, không có bản sao tên/thông tin của thực thể cha trong bảng con. Không tạo bảng nghiệp vụ, cột hay cột JSON/JSONB mới. Không UPDATE dữ liệu hiện có, không xóa hàng/cột. Việc thêm ràng buộc bảo vệ tính toàn vẹn, không đồng nghĩa trước đó phải xóa cột mới đạt 3NF. Đây không phải kết luận toàn bộ cơ sở dữ liệu đã hoàn tất chuẩn hóa.

## Chạy và kiểm tra

1. Chạy chỉ đọc [feedback_catalog_legacy.sql](diagnostics/feedback_catalog_legacy.sql). Kết quả rỗng là không phát hiện xung đột trong phạm vi kiểm tra.
2. Sau khi đã chạy đợt 20261130, chạy [20261201_review_feedback_catalogs.sql](migrations/20261201_review_feedback_catalogs.sql).
3. Chạy lại diagnostic. Nếu có mã trùng, thiếu dữ liệu hoặc cây vòng lặp, migration dừng và rollback; không tự gộp/xóa/đổi mã.

Kiểm thử PGlite: bảo toàn toàn bộ dòng/cột và số bảng khi migration, chạy lặp; ba loại xung đột dừng/rollback; tài khoản giáo viên thật ghi/đọc nhận xét và tác giả qua RPC; CRUD danh mục, mã mục cùng tên giữa hai nhóm hợp lệ, mã trùng trong cùng nhóm bị chặn, vòng lặp/self-parent bị chặn, không xóa cha đang dùng; đổi tên thời hạn giữ nguyên dữ liệu vật lý lớp/công và khóa tham chiếu. Các fixture chỉ chạy trong cơ sở dữ liệu kiểm thử.
