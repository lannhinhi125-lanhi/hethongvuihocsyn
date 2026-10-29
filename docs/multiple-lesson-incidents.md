# Nhiều phiếu sự cố trong một buổi

- Nhật ký giám sát hiện số phiếu trong buổi; mở để xem từng phiếu hoặc thêm sự cố mới.
- Tab sự cố hiển thị một hàng cho mỗi phiếu. Bộ lọc trạng thái và thống kê đếm theo phiếu; số buổi trong nhật ký vẫn đếm theo buổi.
- Thêm phiếu tạo khóa mới; cập nhật dùng đúng khóa phiếu, giữ người báo và thời điểm báo ban đầu. Không ghi đè phiếu mới nhất của buổi.
- Phiếu từ tạm dừng lớp được xem tại đây; sửa lý do tại quản lý lớp để đồng bộ các buổi.
- Mỗi phiếu có mã hiển thị cố định dạng `SC-000001`, bên cạnh cột buổi học `BH-…`; mã này không thay khóa liên kết dữ liệu.
- Phiếu đã giải quyết/hủy ca hiện nút **Biên bản** màu xám. Phiếu còn mở hiện **Xử lý sự cố**. Màu đỏ/cam cảnh báo buổi chưa vào lớp không áp lên hàng phiếu sự cố.
- Mặc định sắp xếp theo cập nhật mới nhất, có lựa chọn cập nhật lâu nhất. Tìm kiếm và lọc được mã phiếu; tìm một mã chỉ hiện đúng phiếu đó.

## Quy tắc công đã chốt

Lấy hệ số dương lớn nhất và hệ số âm thấp nhất; nếu có cả hai thì cộng hai mức. Hệ số 0 là hợp lệ. Không cộng nhiều mức dương hoặc nhiều mức âm.

| Các hệ số | Kết quả |
| --- | --- |
| 1; −0,5 | 0,5 |
| −0,5; −1 | −1 |
| 1; 0,5 | 1 |

Mỗi buổi/giáo viên có một dòng công. Giữ nguyên việc tách người nhận: sự cố giáo viên áp vào giáo viên chính, sự cố khác áp vào người thực dạy. Không cộng công của giáo viên chính và người dạy thay vào nhau.

Chỉ tổng hợp khi các phiếu liên quan đã giải quyết và có hệ số. Không dùng mặc định 1 cho phiếu chưa chốt. Sửa ghi chú không ghi đè công đã điều chỉnh; kỳ đã khóa vẫn được bảo vệ.

## Áp dụng cơ sở dữ liệu

Chạy `supabase/migrations/20261219_multiple_incident_credit.sql` trong Supabase SQL Editor **sau** `20261218_resolve_incident_before_credit.sql`. Có thể chạy lại an toàn. Migration không tự sửa công lịch sử; quy tắc mới áp dụng ở lần thay đổi phiếu tiếp theo.

Giao diện đã chuẩn bị cách hiển thị hệ số tổng hợp, nhưng máy chủ chỉ tính theo quy tắc mới sau khi chạy migration. Việc thay đổi mã cục bộ không tự cập nhật Supabase.

Chạy thêm `supabase/migrations/20261220_incident_display_codes.sql` để cấp mã ngắn và thời điểm cập nhật chính xác cho phiếu. Bản này yêu cầu `20261128_normalize_incident_names.sql` và RPC dữ liệu quan hệ hiện tại. Không cập nhật nội dung phiếu hoặc chạy lại công lịch sử; mã và thời gian cập nhật do máy chủ quản lý. Các bản ghi cũ giữ mốc ngày đã biết, không tự dựng lại giờ đã mất.

## Kiểm tra

- `node tests/multipleLessonIncidents.test.mjs`
- `node --liftoff-only --wasm-num-compilation-tasks=1 tests/incidentDisplayCodes.test.mjs`
- `node --liftoff-only --wasm-num-compilation-tasks=1 tests/multipleIncidentCredit.test.mjs` (PGlite qua `PGLITE_MODULE_PATH`, mặc định thư mục kiểm tra cục bộ `.tmp/demo-validation/node_modules/@electric-sql/pglite`).
- `node tests/multipleLessonIncidents.browser.test.mjs` (Playwright qua `PLAYWRIGHT_MODULE_PATH`, mặc định `.tmp/ui-validation/node_modules/playwright`; tự mở Vite tại cổng 3107 và đóng khi hoàn tất).
- `npm.cmd run lint`, `npm.cmd run build`.
