# Rà soát luồng dữ liệu — 21/10/2026

Phạm vi: mã nguồn hiện tại, dữ liệu kiểm thử PostgreSQL cục bộ qua PGlite và trình duyệt Edge. Không đăng nhập hoặc thay đổi Supabase đang vận hành.

## Các lỗi đã sửa

| Luồng | Trước | Sau |
|---|---|---|
| Tài khoản → môn học | Chỉ chọn Toán/Tiếng Anh; tên môn suy từ hai mã cố định | Chọn và hiển thị bằng danh mục `subjects`; giữ mục đã chọn khi ngưng áp dụng |
| Hồ sơ giáo viên → thống kê, dự giờ | Thống kê hai môn, lọc ba cấp cố định | Dùng môn/cấp học đang tải từ Supabase |
| Bảng công, giải trình → môn học | RPC quy mọi môn khác tiếng Anh về Toán | RPC trả mã môn gốc; bộ lọc, chi tiết và môn của ca đang chờ công dùng mã đó |
| Bảng công → tên môn | Nối mã môn với ID dòng danh mục, chỉ đúng khi hai giá trị trùng nhau | Nối bằng `MON_HOC.mamonhoc`; đổi tên danh mục cập nhật nhãn truy vấn |
| Giám sát → nhóm/loại sự cố | Nhóm cố định, tự chọn nhóm giáo viên; ẩn loại ngừng áp dụng cả trong lịch sử | Nhóm/tên lấy từ danh mục; yêu cầu chọn nhóm; lịch sử vẫn tra được tên mục ngừng áp dụng |
| Nhập file → link phòng lớp | Không đọc file, tạo URL ngẫu nhiên | Đọc CSV/XLSX, kiểm tra mã lớp/link/trùng dòng trước khi lưu; chờ Supabase xác nhận |
| Lịch rảnh → tuần/tháng | Dùng các tuần mẫu tháng 10/2026 | Tính tuần/tháng từ lịch thực tế, xử lý ranh giới tháng/năm |
| Bộ lọc → truy vấn | Một số chọn năm học không tác động truy vấn | Bỏ bộ lọc không có tác dụng; giữ ngày/kỳ công làm điều kiện truy vấn |
| Kỳ công → lịch sử | Chỉ có hai kỳ gần nhất | Bao gồm kỳ thực có trong bảng công và buổi học |
| Lịch rảnh → giáo viên/lớp | Có trường hợp đoán giáo viên bằng tên chứa nhau | Dùng `teacherId`; ngày dạy thay tính từ đầu tuần |
| Kiểm tra giao diện báo cáo | Store thiếu snapshot khi render tĩnh | Cung cấp snapshot cho kiểm thử giao diện và hộp xác nhận |

Các giá trị mẫu khởi tạo môn, cấp, trình độ, mô hình và lịch học đã được bỏ khỏi biểu mẫu. Thông tin lịch/ngày được tính toán không phải dữ liệu giả lưu vào Supabase.

## Kiểm chứng đã chạy

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit --singleThreaded`.
- Build production: `npm.cmd run build`.
- 61 file kiểm thử TS/TSX không cần database: 74 kiểm thử qua, 0 lỗi. Dùng esbuild biên dịch sang ESM trước khi chạy Node test.
- `tests/monitoringSourceConsistency.test.mjs`: giám sát dùng mã buổi đã lưu, thời điểm nguồn và biên bản liên kết.
- `tests/reenrollmentClassDuration.test.mjs`: áp dụng lặp các migration 20261111–20261114; tạm dừng/tiếp tục qua RPC; giữ giáo viên/đăng ký học sinh; sửa lý do; tái nhập học; thời hạn lớp; sinh buổi theo học liệu; tự kết thúc lớp; không có cột lưu JSON/JSONB trong schema `vuihoc` đã nâng cấp.
- Cùng bộ tích hợp trên: thêm môn mới có ID khác code qua RPC, tạo tài khoản giáo viên cho môn đó, đăng nhập cổng giáo viên và đọc được riêng danh mục lý do tạm dừng; đổi ID/tên môn vẫn truy vấn đúng tên trong bảng công.
- Bảy bộ tích hợp database khác đều qua: `foreignKeys`, `incidentCatalogCredit`, `incidentPayrollUpsert`, `manualStudentFeedback`, `studentSubjectEnrollments`, `inspectionSessionQueries`, `normalizedPayroll`.
- Trình duyệt: `tests/dropdowns.browser.test.mjs` và `tests/roomLinkImport.browser.test.mjs`; XLSX dạng lưu thẳng và dạng nén deflate đều nhập đúng URL được cung cấp.

## Áp dụng

Chạy `supabase/migrations/20261114_catalog_query_consistency.sql` sau bản 20261113, đồng thời cập nhật ứng dụng. Migration chỉ sửa hàm truy vấn, không thêm cột, không đổi số công hoặc hệ số đã lưu. Phiên bản SQL cũ vẫn có thể trả mã môn TOAN/ANH và không khớp bộ lọc mới nếu chưa áp dụng migration.

## Giới hạn còn lại

- Lịch rảnh hiện lưu lịch lặp trong `LICH_RANH_DINH_KY`. Chọn tuần/ngày dùng để đối chiếu lớp; không tạo một lịch đăng ký độc lập có hiệu lực riêng từng tuần. Giao diện đã nói rõ điều này.
- Chưa kiểm chứng phiên bản migration, quyền và dữ liệu thực tế trên Supabase đang vận hành; kết quả database là kiểm chứng cục bộ với RPC thật và dữ liệu kiểm thử.
- Không kiểm thử gọi dịch vụ AI bên ngoài hoặc tải tài liệu gốc lên dịch vụ lưu trữ. Không xem các bộ kiểm thử trên là chứng nhận mọi tính năng ngoài phạm vi này.
- Trình duyệt khác tài khoản làm mới theo chu kỳ 30 giây/khi quay lại cửa sổ; trong cùng phiên, các màn hình dùng chung store và nhận dữ liệu RPC sau khi lưu. Tài liệu/bảng số liệu đã xuất là bản chụp tại thời điểm xuất.
