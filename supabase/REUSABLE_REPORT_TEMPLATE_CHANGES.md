# Mẫu báo cáo dùng lại cho nhiều kỳ

> Bản này ghi nhận cách làm trung gian 20261211. Yêu cầu cuối đã được sửa tại [REPORT_TEMPLATE_FRAME_ONLY.md](REPORT_TEMPLATE_FRAME_ONLY.md): chạy `20261212_drop_report_template_periods.sql` để xóa hẳn 8 cột, không giữ cột tương thích.

Chạy toàn bộ `migrations/20261211_reusable_report_templates.sql` sau bản `20261202_normalize_report_templates.sql`. Có thể chạy lại. Migration thực hiện trong một câu lệnh nguyên tử, không tạo bảng hoặc cột JSON/JSONB.

## Trước và sau

**Bảng sửa dữ liệu: `MAU_BAO_CAO`.** Trước đây mẫu lưu nguồn, chỉ số, bộ lọc, nhóm, sắp xếp, biểu đồ cùng khoảng ngày, kỳ so sánh và nhóm đang bấm xem. Nay mẫu chỉ lưu cấu hình dùng lại; khi mở mẫu giữ thời gian đang chọn trên màn hình và truy vấn dữ liệu nguồn lại.

- Xóa giá trị ngày đã lưu ở `tungay`, `denngay`, `sosanhtungay`, `sosanhdenngay`; bỏ thiết lập kỳ ở `sosanhbat`, `kieusosanh` và lựa chọn xem tạm thời `giatrichon` (đặt NULL).
- `khoangngay` giữ giá trị trung tính `all` để tương thích cấu trúc cũ. Giá trị này không được trả trong cấu hình mẫu và không điều khiển thời gian khi mở mẫu.
- Giữ nguyên các cột vật lý, PK/FK và ngày tạo mẫu. Không xóa mẫu, tên, người sở hữu, nguồn, cách nhóm, sắp xếp, biểu đồ hay dữ liệu nghiệp vụ nguồn. Việc xóa thời gian mẫu cũ là thay đổi có chủ đích; không thể khôi phục các giá trị này bằng chạy lại migration.
- Các cột của `MAU_BAO_CAO` trước = sau: `madinhdanh, tenmaubaocao, manguoidung, ngaytao, ngaycapnhat, nguondulieu, nhomtheo, khoangngay, tungay, denngay, sapxep, sosanhbat, kieusosanh, sosanhtungay, sosanhdenngay, giatrichon, kieubieudo, chisobieudo`.

**Bảng giữ nguyên:** `CHI_SO_MAU_BAO_CAO` (`mamau, machiso, thutu`) lưu chỉ số; `BO_LOC_MAU_BAO_CAO` (`mamau, truong, giatri, thutu`) lưu từng giá trị điều kiện lọc. Hai bảng nối bằng FK `mamau` tới PK `MAU_BAO_CAO.madinhdanh`; người sở hữu mẫu liên kết `NGUOI_DUNG` qua `manguoidung`. Không tạo bản sao dữ liệu nguồn báo cáo.

## Luồng truy vấn

Màn hình báo cáo → RPC nghiệp vụ → `cau_hinh_mau_bao_cao` đọc bảng mẫu và hai bảng con. Lưu mẫu → `luu_cau_hinh_mau_bao_cao` ghi cùng nguồn này. Trigger `mau_bao_cao_khong_luu_ky` bảo đảm cả ghi SQL trực tiếp cũng không lưu ngày của lần chạy. Payload JSON chỉ dùng truyền dữ liệu, không thêm cột JSON để lưu.

Ứng dụng bỏ khoảng ngày, kỳ so sánh và lựa chọn bấm xem khi lưu; khi mở mẫu bỏ qua cả ngày từ mẫu cũ. Đổi thời gian xem không đánh dấu mẫu là đã thay đổi. Xuất báo cáo vẫn dùng thời gian người dùng đang chọn.

Kiểm tra: `tests/customReports.test.ts` kiểm tra lưu/mở mẫu qua nhiều kỳ; `tests/reusableReportTemplates.test.mjs` chạy hàm đọc/ghi SQL thật trên PostgreSQL nhúng, kiểm tra chuyển mẫu cũ, chạy migration hai lần, ghi từ client cũ/mới, ghi SQL trực tiếp và giữ chỉ số/bộ lọc/ngày tạo. Chưa chạy trên Supabase trực tiếp.
