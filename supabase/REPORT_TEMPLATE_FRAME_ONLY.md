# Mẫu báo cáo chỉ lưu khung — 20261212

Chạy toàn bộ `migrations/20261212_drop_report_template_periods.sql` sau `20261202_normalize_report_templates.sql`. Bản 20261211 không bắt buộc; nếu đã chạy thì chạy tiếp 20261212. Migration nguyên tử, chạy lại được, không dùng CASCADE, không thêm bảng hoặc cột JSON/JSONB. Tài liệu này thay thế cách giữ cột tương thích của bản 20261211.

## Bảng sửa: MAU_BAO_CAO

**Trước (18):** `madinhdanh, tenmaubaocao, manguoidung, ngaytao, ngaycapnhat, nguondulieu, nhomtheo, khoangngay, tungay, denngay, sapxep, sosanhbat, kieusosanh, sosanhtungay, sosanhdenngay, giatrichon, kieubieudo, chisobieudo`.

**Bỏ hẳn (8):** `khoangngay, tungay, denngay, sosanhbat, kieusosanh, sosanhtungay, sosanhdenngay, giatrichon`. Thời gian và lựa chọn xem tạm trong mẫu cũ bị loại bỏ theo yêu cầu; chạy lại migration không khôi phục chúng.

**Sau (10):** `madinhdanh, tenmaubaocao, manguoidung, ngaytao, ngaycapnhat, nguondulieu, nhomtheo, sapxep, kieubieudo, chisobieudo`.

Giữ PK `madinhdanh`, FK `manguoidung → NGUOI_DUNG.madinhdanh`. Giữ tên mẫu, người sở hữu, ngày tạo/cập nhật, nguồn, nhóm, sắp xếp và biểu đồ. Không sửa dữ liệu lớp, buổi học, học sinh hoặc công dạy. Tổng cấu trúc trong mã: 50 bảng, 384 cột; chưa xác nhận trên Supabase trực tiếp.

## Bảng con và truy vấn

- `CHI_SO_MAU_BAO_CAO` giữ `mamau, machiso, thutu` để lưu từng chỉ số.
- `BO_LOC_MAU_BAO_CAO` giữ `mamau, truong, giatri, thutu` để lưu từng giá trị lọc.

Cả hai giữ FK `mamau → MAU_BAO_CAO.madinhdanh`. Không thêm cột danh sách hoặc JSON thay thế các bảng con.

Màn hình → RPC nghiệp vụ → `cau_hinh_mau_bao_cao` đọc khung và hai bảng con; `luu_cau_hinh_mau_bao_cao` ghi cùng nguồn. Trigger giữ trống ngày của bản 20261211 được xóa vì các cột không còn. Client cũ gửi thời gian thì hàm ghi bỏ qua; mở mẫu giữ thời gian đang chọn để truy vấn nguồn lại.

DBML 29/27/50 bảng và hợp đồng kiểm tra cấu trúc đã đồng bộ. `ngaytao`, `ngaycapnhat` là thời điểm tạo/sửa mẫu, không phải khoảng ngày lọc.

Kiểm tra tập trung: `tests/reusableReportTemplates.test.mjs` chạy hàm SQL thật, migration lặp lại, xác nhận 8 cột biến mất, client cũ/mới vẫn lưu khung và chỉ số/bộ lọc/ngày tạo giữ nguyên.
