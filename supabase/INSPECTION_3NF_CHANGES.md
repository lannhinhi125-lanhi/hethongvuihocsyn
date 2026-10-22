# Chuẩn hóa biên bản dự giờ — migration 20261127

Phạm vi: cấu trúc `BIEN_BAN_DU_GIO`, truy vấn lịch sử trong hồ sơ giáo viên, tài khoản giáo viên, báo cáo và hai luồng ghi trực tiếp/qua hồ sơ. Áp dụng sau `20261126_normalize_class_materials.sql`. Đã kiểm thử trên PostgreSQL cục bộ; chưa chạy vào Supabase thật trong phiên này.

## Toàn bộ cột trước và sau

Bảng vật lý **BIEN_BAN_DU_GIO: 29 cột → 16 cột**. Không thêm bảng lưu dữ liệu, không thêm cột nghiệp vụ, không lưu JSON/JSONB. View `V_BIEN_BAN_DU_GIO` chỉ truy vấn.

| Cột trước sửa (đầy đủ 29 cột) | Sau sửa | Nguồn/ý nghĩa |
|---|---|---|
| madinhdanh | Giữ — PK | Định danh biên bản |
| magiaovien | Bỏ | Giáo viên thực dạy của BUOI_HOC: coalesce(magiaoviendaythay, magiaovienchinh) |
| mabienban | Giữ — UNIQUE, NOT NULL | Số biên bản; khóa ứng viên |
| mabuoi | Giữ — FK, đổi thành NOT NULL | Buổi học được đánh giá |
| malophoc | Bỏ | BUOI_HOC.malop → LOP_HOC.malophoc |
| manguoinhan | Bỏ | Giáo viên thực dạy → GIAO_VIEN.manguoidung; quy tắc cũ đã yêu cầu đúng tài khoản này |
| manguoidanhgia | Giữ — FK | Người thực hiện đánh giá, độc lập với giáo viên thực dạy |
| ngaydanhgia | Giữ | Ngày đánh giá, khác ngày buổi học |
| ngaycahoc | Bỏ | BUOI_HOC.ngayhoc |
| macahoc | Bỏ | Cùng mã với mabuoi |
| guiluc | Giữ | Ngày gửi theo kiểu date hiện có; không đổi kiểu trong đợt này |
| sobuoi | Bỏ | CHI_TIET_CA_LOP.sobuoi, JOIN bằng mabuoi |
| tenbuoihoc | Bỏ | BUOI_HOC.tieude |
| khunggio | Bỏ | Định dạng BUOI_HOC.batdau/ketthuc thực tế; không lấy giờ danh mục hiện tại thay lịch sử |
| mohinh | Bỏ | BUOI_HOC.malop → LOP_HOC.mamohinh |
| diemtong | Bỏ | round((diemtc1 + 2 × diemtc2 + diemtc3) / 4, 2) |
| xeploai | Bỏ | Tính từ tổng điểm theo quy tắc chấm hiện hành |
| nhanxetchung | Giữ | Nhận xét của riêng biên bản |
| uudiem | Giữ | Nội dung đánh giá |
| cancaithien | Giữ | Nội dung đánh giá |
| khuyennghi | Giữ | Nội dung đánh giá |
| trangthai | Giữ | Trạng thái phê duyệt của riêng biên bản |
| lienketphonghoc | Bỏ | BUOI_HOC.lienketphonghoc |
| lienketbanghi | Bỏ | BUOI_HOC.lienketbanghi |
| ngaytao | Giữ | Ngày tạo của biên bản |
| ngaycapnhat | Giữ | Ngày cập nhật của biên bản |
| diemtc1 | Giữ | Điểm tiêu chí gốc |
| diemtc2 | Giữ | Điểm tiêu chí gốc |
| diemtc3 | Giữ | Điểm tiêu chí gốc |

**Danh sách sau sửa, đầy đủ 16 cột:**

```text
madinhdanh, mabienban, mabuoi, manguoidanhgia, ngaydanhgia, guiluc,
nhanxetchung, uudiem, cancaithien, khuyennghi, trangthai,
ngaytao, ngaycapnhat, diemtc1, diemtc2, diemtc3
```

**Khóa và ràng buộc sau sửa:**

- PK: `madinhdanh`; khóa ứng viên: `mabienban` (UNIQUE NOT NULL).
- FK giữ: `mabuoi → BUOI_HOC.madinhdanh`, `ON DELETE RESTRICT`; nay bắt buộc có nguồn.
- FK thêm: `mabuoi → CHI_TIET_CA_LOP.mabuoi`, `ON DELETE RESTRICT`, bảo vệ số buổi nguồn khỏi bị xóa riêng.
- FK giữ: `manguoidanhgia → NGUOI_DUNG.madinhdanh`, `ON DELETE SET NULL` theo chính sách tài khoản cũ.
- FK của các cột bị bỏ được loại cùng cột: giáo viên, mã lớp, tài khoản người nhận; các quan hệ này đi qua nguồn buổi học/giáo viên.
- Giữ kiểm tra khoảng điểm từng tiêu chí, trạng thái, các giá trị bắt buộc và trigger cập nhật ngày.
- Không còn trigger lưu tổng điểm/xếp loại. Trigger mới yêu cầu buổi có giáo viên thực dạy và chi tiết số buổi.

## BUOI_HOC và các bảng nguồn

`BUOI_HOC` chỉ thêm trigger bảo vệ: không đổi giáo viên thực dạy của buổi đã có biên bản để tránh chuyển điểm của người này sang người khác. **Không thêm/bỏ/đổi cột của BUOI_HOC trong đợt này.** Toàn bộ 30 cột trước và sau giống nhau:

```text
madinhdanh, malop, ngayhoc, makhunggio, batdau, ketthuc,
magiaovienchinh, magiaoviendaythay, tieude, lienketphonghoc, trangthai,
vaolopluc, ketthucluc, manguoivaolop, manguoiketthuc, chuyencan, nhatky,
lienketbanghi, ngaytao, ngaycapnhat, hoclieutieude, hoclieugiaovien,
hoclieuhocsinh, baitaplms, tamhoandolop, lydotamdung, ghichutamdung,
batdautamdung, manhomtamdung, mahoclieu
```

`LOP_HOC`, `CHI_TIET_CA_LOP`, `GIAO_VIEN`, `NGUOI_DUNG` chỉ được đọc qua quan hệ hiện có; không thay cấu trúc/cột ở đợt này. Không ghi thêm một bản sao điểm vào GIAO_VIEN.

## Nguồn và các nơi truy vấn sang

```text
BIEN_BAN_DU_GIO.mabuoi → BUOI_HOC.madinhdanh
  BUOI_HOC.malop → LOP_HOC.madinhdanh → mã lớp, mô hình
  BUOI_HOC.madinhdanh → CHI_TIET_CA_LOP.mabuoi → số buổi
  giáo viên thực dạy → GIAO_VIEN.madinhdanh → manguoidung → NGUOI_DUNG
BIEN_BAN_DU_GIO.manguoidanhgia → NGUOI_DUNG → tên người đánh giá, nhóm quyền
BIEN_BAN_DU_GIO.diemtc1/2/3 → tổng điểm → xếp loại (chỉ tính khi truy vấn)
```

`V_BIEN_BAN_DU_GIO` cung cấp ngữ cảnh trên cho RPC đọc danh sách biên bản, lịch sử `GIAO_VIEN.baocaodanhgia`, giao diện dự giờ, báo cáo chi tiết/tổng hợp và xuất báo cáo. Hợp đồng đọc vẫn trả các tên trường cũ để các màn hình dùng chung dữ liệu. Mapper không gửi các trường suy ra khi lưu; RPC từ chối ghi trực tiếp các trường đó. Sửa điểm tiêu chí cập nhật ngay tổng điểm/xếp loại truy vấn ở cả danh sách lẫn lịch sử giáo viên. Liên kết bản ghi/phòng của buổi được sửa tại nguồn thì biên bản truy vấn cập nhật theo.

Luồng ghi lịch sử qua hồ sơ dùng `luu_bien_ban_du_gio`: bắt buộc mã buổi đúng giáo viên và mã người đánh giá. Không đoán người đánh giá từ họ tên. Bộ lọc tài khoản giáo viên dùng quan hệ buổi học thực dạy, không phụ thuộc cột giáo viên cũ đã bỏ.

## Vì sao bảng biên bản sau sửa đạt 3NF trong mô hình này

Mỗi hàng là một biên bản, có hai khóa ứng viên `madinhdanh` và `mabienban`. Các cột còn lại là liên kết đến đối tượng được đánh giá và các sự thật riêng của lần đánh giá: người/ngày đánh giá, ba điểm gốc, nhận xét, trạng thái và ngày tạo/cập nhật. Không còn phụ thuộc bắc cầu `mabuoi → thông tin buổi/lớp/giáo viên` trong bảng biên bản; không còn phụ thuộc `điểm tiêu chí → tổng điểm → xếp loại` được lưu vật lý. Ngày đánh giá/ngày gửi/ngày tạo không phải cùng một ý nghĩa nên giữ riêng. Không có quan hệ nghiệp vụ nào cho phép suy ra một điểm tiêu chí hoặc một nội dung nhận xét từ tiêu chí khác.

Kết luận này áp dụng **bảng BIEN_BAN_DU_GIO và quan hệ dự giờ được sửa**, không chứng nhận toàn bộ BUOI_HOC hay toàn CSDL đã hoàn tất 3NF.

## Đối soát, áp dụng và kiểm thử

1. Đã có migration 20261126: chạy [inspection_normalization_legacy.sql](diagnostics/inspection_normalization_legacy.sql). Kết quả rỗng nghĩa là không phát hiện khác biệt trong các trường kiểm tra.
2. Chạy toàn bộ [20261127_normalize_inspection_reports.sql](migrations/20261127_normalize_inspection_reports.sql).
3. Nếu báo mã biên bản không khớp: giao dịch dừng, không xóa cột. Cần đối soát bản khác nguồn trước; không tự xóa bản ghi hoặc ghi đè hai bên để chạy qua lỗi.

Migration không tạo buổi giả, không đoán theo tên hoặc theo ngày, không ghi lại điểm/nhận xét, không thay lịch sử buổi/công và không chạy reset demo trên dữ liệu thật. Các bản ghi không có mabuoi phải được xác nhận nguồn trước khi chuẩn hóa; không tự ghép bằng mã ca có thể khác nghĩa.

Kiểm thử PostgreSQL cục bộ gồm dữ liệu có sẵn, sai khác và rollback, chạy migration hai lần, giữ nguyên 16 cột độc lập và buổi/công, không tăng số bảng, truy vấn danh sách và lịch sử, sửa điểm, tạo/xóa bằng RPC, tài khoản giáo viên chỉ thấy biên bản của mình, cập nhật nguồn liên kết phản ánh sang biên bản, bảo vệ FK/giáo viên, chẩn đoán và reset demo lặp lại. Reset chỉ là fixture cục bộ tương thích trước/sau migration.

Nhóm tiếp tục rà sau phần này: `SU_CO_BUOI_HOC.tensuco` so với tên trong danh mục sự cố và các đường truy vấn công/báo cáo; sau đó `GIAI_TRINH_CONG_DAY.lienketminhchung` so với `LINK_MINH_CHUNG_CONG`. Chưa sửa hoặc kết luận 3NF hai nhóm đó trong đợt này.
