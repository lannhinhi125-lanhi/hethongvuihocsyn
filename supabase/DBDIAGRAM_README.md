# Vẽ sơ đồ VuiHoc trên dbdiagram.io

## Bản chính dành cho đồ án — 29 bảng

Dùng [vuihoc_29_bang_chinh.dbml](vuihoc_29_bang_chinh.dbml): sao chép toàn bộ rồi dán vào ô DBML trên dbdiagram.io. Bản này dưới 30 bảng, chia đúng 8 nhóm phân hệ, giữ toàn bộ cột của các bảng được chọn. Bản đầy đủ 50 bảng vẫn ở file riêng phía dưới.

| Phân hệ | Số bảng | Bảng đưa lên sơ đồ chính |
| --- | ---: | --- |
| 1. Tài khoản/quyền | 2 | `NHOM_QUYEN`, `NGUOI_DUNG` |
| 2. Danh mục cốt lõi | 4 | `MON_HOC`, `TRINH_DO`, `MO_HINH_LOP`, `KHUNG_GIO` |
| 3. Giáo viên/lịch rảnh/dự giờ | 4 | `GIAO_VIEN`, `PHIEN_BAN_LICH_RANH`, `CHI_TIET_PHIEN_BAN_LICH_RANH`, `BIEN_BAN_DU_GIO` |
| 4. Học sinh/đăng ký/lớp | 7 | `HOC_SINH`, `DANG_KY_MON_HOC`, `LICH_DANG_KY_MON_HOC`, `XEP_LOP_DANG_KY`, `LOP_HOC`, `LICH_LOP`, `HOC_LIEU_LOP` |
| 5. Buổi học/giám sát/sự cố | 6 | `BUOI_HOC`, `DIEM_DANH_BUOI_HOC`, `NHAN_XET_BUOI_HOC`, `DANH_MUC_SU_CO`, `LOAI_SU_CO`, `SU_CO_BUOI_HOC` |
| 6. Tài liệu phục vụ AI | 1 | `TAI_LIEU_QUY_TRINH` |
| 7. Công/đối soát/giải trình | 4 | `BANG_CONG_THANG`, `CONG_DAY_BUOI_HOC`, `DOI_SOAT_CONG_GIAO_VIEN`, `GIAI_TRINH_CONG_DAY` |
| 8. Mẫu báo cáo | 1 | `MAU_BAO_CAO` — lưu mẫu cấu hình, không lưu kết quả báo cáo |
| **Tổng** | **29** | **Các bảng vẫn là bảng thật trong CSDL hiện tại** |

21 bảng không đưa lên bản chính thuộc nhóm: chi tiết gán quyền; danh mục cấp/khối và bổ sung; liên kết chuyên môn giáo viên; lịch sử đăng ký/xếp lớp; ánh xạ ca; loại tài liệu/cấu hình AI/chat; minh chứng; chỉ số và bộ lọc mẫu báo cáo. Chúng **chỉ bị lược khỏi sơ đồ**, không bị xóa, gộp hay coi là không dùng.

Không thêm các cột danh sách, tên sao chép hoặc đường FK giả để thay các bảng bị lược. Mỗi FK tới bảng ngoài bản chính được ghi nguyên định nghĩa trong Note của bảng con. Chỉ các FK có cả hai đầu thuộc 29 bảng được vẽ thành đường nối; vì vậy đây là một sơ đồ vật lý lược bớt, không phải mô hình CSDL mới.

Gợi ý bố cục khi đưa vào đồ án: nhóm tài khoản/danh mục phía trên; giáo viên và học sinh/lớp ở giữa; buổi học/sự cố bên dưới; công/đối soát phía phải; tài liệu và mẫu báo cáo ở mép sơ đồ. File đã đặt thứ tự và TableGroup theo phân hệ; có thể kéo các nhóm để cân lại khổ trang.

Chú thích dùng dưới hình:

> Sơ đồ các bảng nghiệp vụ chính của hệ thống, trình bày 29 trong tổng số 50 bảng vật lý. Một số bảng cấu hình, danh mục phụ, bảng liên kết và lịch sử chi tiết được lược bớt để làm rõ luồng nghiệp vụ; cấu trúc đầy đủ trình bày tại phụ lục.

Đã kiểm tra bản rút gọn bằng bộ phân tích DBML chính thức: **29 bảng, 291 cột, 54 quan hệ và 8 nhóm**; không có đường nối tới bảng ngoài sơ đồ.

Sinh lại bản rút gọn:

```sh
node scripts/export-dbdiagram.mjs --summary
```

## Bản đầy đủ — 50 bảng

File dùng để dán vào trình soạn thảo DBML: [vuihoc_50_tables.dbml](vuihoc_50_tables.dbml).

1. Mở dbdiagram.io và tạo sơ đồ.
2. Xóa nội dung mẫu trong ô soạn thảo DBML.
3. Sao chép toàn bộ nội dung file trên và dán vào ô soạn thảo.
4. Sơ đồ có 8 nhóm phân hệ; có thể kéo các nhóm/bảng để bố trí lại.

## Phạm vi

- **50 bảng vật lý, 392 cột**, schema `vuihoc`, sau chuỗi cập nhật đến 20261209.
- **50 PK**, **27 khóa UNIQUE**, **90 FK**; **64 CHECK** giữ nguyên ở chú thích SQL để tương thích cả bộ phân tích DBML cũ và mới.
- Giữ nguyên các khóa ghép và quan hệ FK ghép. FK duy nhất ở phía con được vẽ một–một; các FK còn lại vẽ nhiều–một. Tính nullable của từng cột được giữ.
- Không vẽ view như bảng vật lý; không thêm bảng nối hoặc quan hệ suy đoán.
- 6 unique index theo biểu thức/điều kiện của PostgreSQL được ghi nguyên định nghĩa trong ghi chú bảng. Không biến unique index có `WHERE` thành UNIQUE toàn bảng.
- Thông tin `DEFERRABLE`, `MATCH FULL` và hành vi FK được giữ trong chú thích định nghĩa SQL; các hành vi update/delete còn được thể hiện ở `Ref` theo khả năng DBML.

Nguồn là [final_3nf_schema_review.sql](diagnostics/final_3nf_schema_review.sql), không phải `schema.sql` khởi tạo cũ. Đây là cấu trúc đã rà trong mã, không phải một lần xuất trực tiếp mới từ Supabase.

## Giới hạn dùng file

File phục vụ vẽ ERD. Bản kiểm kê chỉ có họ kiểu dữ liệu, không có đủ precision/scale của numeric, DEFAULT hoặc thuộc tính IDENTITY; file không tự đoán các thông số đó. Cột GENERATED được ghi chú nhưng không dựng lại biểu thức sinh.

**Không chạy SQL xuất ngược từ sơ đồ để tạo lại hoặc thay đổi Supabase.** Các migration hiện có mới là nguồn DDL đầy đủ, gồm trigger, quyền, RLS và các quy tắc nghiệp vụ không được thể hiện bằng đường nối trên ERD.

Sinh lại file từ hợp đồng cấu trúc đã rà:

```sh
node scripts/export-dbdiagram.mjs
```

Script không đọc/ghi database, không thêm dependency vào ứng dụng. Nó kiểm tra đủ bảng/cột, PK, cột FK và khóa đích trước khi xuất.

Đã kiểm tra bằng bộ phân tích chính thức `@dbml/core` phiên bản 10.3.1: đọc thành công 50 bảng, 392 cột và 90 quan hệ. Bộ phân tích chỉ được cài tạm để kiểm tra, không thêm vào dependency ứng dụng.

Cú pháp tham khảo: [tài liệu DBML chính thức](https://dbml.dbdiagram.io/docs/).
