# Vẽ sơ đồ VuiHoc trên dbdiagram.io

## Lựa chọn hiện tại cho khóa luận — 29 bảng, ẩn vừa phải

Dùng [vuihoc_29_bang_chinh.dbml](vuihoc_29_bang_chinh.dbml). Giữ đủ 29 bảng (bao gồm `HOC_LIEU_LOP` và `NHAN_XET_BUOI_HOC`), 8 phân hệ và 54 quan hệ. Hiển thị **220/283 cột**, ẩn 63 cột phụ; không áp dụng mức rút gọn mạnh của bản 27 bảng.

Chỉ xét ẩn ở bảng có hơn 8 cột. Giữ mọi PK, UNIQUE, FK và khóa ghép, kể cả FK tới bảng ngoài hình. Giữ phần lớn thuộc tính nghiệp vụ: tên, mã, trạng thái, ngày học/đăng ký, điểm tiêu chí, nhận xét chung, thông tin học sinh/phụ huynh, nội dung sự cố/giải trình và hệ số công. Các bảng ngắn giữ nguyên.

Các trường ẩn chủ yếu là ngày tạo/cập nhật ở bảng dài, mật khẩu/thông tin phiên đăng nhập, đường dẫn phòng học/bản ghi/tệp, nội dung tài liệu dài, ghi chú xử lý phụ và một số phần diễn giải chi tiết của biên bản dự giờ. Đã ẩn thêm 12 trường phụ ở BUOI_HOC (chuyencan, hoclieutieude, tamhoandolop), LOAI_SU_CO (mota, loaithongbao, thutu, nghitheolich), SU_CO_BUOI_HOC (baoluc, xulyluc, dotamdunglop) và CONG_DAY_BUOI_HOC (ghichu, guiluc). Danh sách cụ thể nằm trong Note của từng bảng. Không thay đổi database. Bản 50 bảng vẫn giữ đầy đủ thuộc tính.

Sinh lại bằng `node scripts/export-dbdiagram.mjs --summary`. Script đã kiểm tra các khóa và cột tại cả hai đầu của 54 quan hệ; chưa chạy lại bộ phân tích DBML chính thức cho bản 220 cột.

Chú thích dưới hình:

> Sơ đồ tổng quan gồm 29 bảng nghiệp vụ chính. Một số thuộc tính phụ được lược bớt để thuận tiện trình bày; các khóa và quan hệ giữa các bảng trên hình được giữ nguyên.


## Bản đề xuất mới cho sơ đồ tổng quan — 27 bảng

Dùng [vuihoc_27_bang_chinh.dbml](vuihoc_27_bang_chinh.dbml): sao chép toàn bộ rồi dán vào dbdiagram.io. Bản này có **27 bảng, 136 cột, 49 FK được vẽ và 8 nhóm phân hệ**. Script đã kiểm tra số bảng, các cột, PK và khóa đích FK; bản 27 chưa được kiểm tra lại bằng bộ phân tích DBML chính thức.

So với bản 29, chỉ lược hai bảng khỏi **hình tổng quan**:

| Bảng lược | Vai trò vẫn tồn tại trong hệ thống | Trình bày ở đâu |
| --- | --- | --- |
| `HOC_LIEU_LOP` | Kế hoạch học liệu của lớp; buổi học có thể tham chiếu kế hoạch | Sơ đồ chi tiết lớp/buổi học hoặc phụ lục đầy đủ |
| `NHAN_XET_BUOI_HOC` | Nhận xét học sinh theo buổi | Sơ đồ chi tiết giám sát buổi học hoặc phụ lục đầy đủ |

Giữ 2 bảng tài khoản/quyền, 4 bảng danh mục cốt lõi, 4 bảng giáo viên/lịch rảnh/dự giờ, 6 bảng học sinh/đăng ký/lớp, 5 bảng buổi học/điểm danh/sự cố, 1 bảng tài liệu, 4 bảng công/đối soát/giải trình và 1 bảng mẫu báo cáo. Không gộp bảng, thêm cột sao chép hoặc tạo FK thay thế. Những FK đi tới bảng ngoài hình vẫn được ghi trong Note của bảng con.

**Bản 27 là phương án thay thế; lựa chọn hiện tại cho khóa luận là bản 29 bảng ẩn vừa phải thuộc tính.** Giảm tiếp về khoảng 20 sẽ phải lược thêm các phần đang quan trọng với hệ thống, như lịch rảnh có phiên bản, đăng ký học và đối soát công. Hình tổng quan không thay thế sơ đồ đầy đủ hoặc chứng minh độc lập toàn bộ CSDL đạt 3NF.

Chú thích dưới hình:

> Sơ đồ tổng quan trình bày 27 trong tổng số 50 bảng vật lý của hệ thống. Các bảng cấu hình, liên kết và chi tiết được lược bớt để thể hiện các luồng nghiệp vụ chính; cấu trúc đầy đủ trình bày trong phụ lục.

Sinh lại bản 27:

```sh
node scripts/export-dbdiagram.mjs --compact
```


### Bản 27 bảng đã ẩn bớt thuộc tính

Bản `--compact` hiện chỉ hiển thị **136 cột**, giảm 133 cột so với bản 27 bảng trước (269 cột), giảm 147 cột so với bản 29 bảng (283 cột). Giữ đầy đủ PK, UNIQUE, FK (kể cả FK tới bảng ngoài hình), khóa ghép và 49 đường quan hệ giữa các bảng trên hình; giữ thêm tên, trạng thái và một số thuộc tính nghiệp vụ để đọc hiểu bảng.

Ẩn khỏi phần liệt kê cột: ngày tạo/cập nhật, mật khẩu và phiên đăng nhập, thông tin liên hệ phụ huynh, đường dẫn phòng học/bản ghi/tệp, nội dung nhận xét và ghi chú dài, điểm tiêu chí dự giờ, các tùy chọn cấu hình chi tiết. Danh sách cột ẩn được ghi trong Note của từng bảng để đối chiếu. Các cột này vẫn tồn tại trong database và các bản DBML đầy đủ; đây chỉ là lựa chọn trình bày.

Chú thích dùng dưới hình đã rút gọn thuộc tính:

> Sơ đồ tổng quan thể hiện 27 bảng nghiệp vụ chính, các khóa và một số thuộc tính tiêu biểu. Một số bảng phụ và thuộc tính chi tiết được lược khỏi hình để tăng khả năng đọc; cấu trúc đầy đủ trình bày trong phụ lục.

## Mẫu báo cáo sau 20261212

Đã xóa hẳn 8 cột `khoangngay, tungay, denngay, sosanhbat, kieusosanh, sosanhtungay, sosanhdenngay, giatrichon` khỏi `MAU_BAO_CAO`. Mẫu còn 10 cột lưu khung báo cáo, người sở hữu và ngày tạo/sửa. Chỉ số và bộ lọc vẫn lấy từ hai bảng con qua `mamau`. Cả ba bản DBML đã đồng bộ cấu trúc này. Các con số của bản mới được script kiểm tra về cấu trúc; kết quả phân tích DBML chính thức trước đây thuộc bản trước thay đổi.

## Bản chính dành cho đồ án — 29 bảng

Dùng [vuihoc_29_bang_chinh.dbml](vuihoc_29_bang_chinh.dbml): sao chép toàn bộ rồi dán vào ô DBML trên dbdiagram.io. Bản này dưới 30 bảng, chia đúng 8 nhóm phân hệ, giữ các khóa và phần lớn thuộc tính nghiệp vụ; chỉ ẩn vừa phải các trường phụ ở bảng dài hơn 8 cột. Bản đầy đủ 50 bảng vẫn ở file riêng phía dưới.

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

Script đã kiểm tra cấu trúc bản mới: **29 bảng, 220 cột hiển thị, 54 quan hệ và 8 nhóm**; không có đường nối tới bảng ngoài sơ đồ. Kết quả phân tích DBML chính thức trước đó thuộc phiên bản 291 cột, trước khi bỏ 8 cột kỳ chạy.

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

- **50 bảng vật lý, 384 cột**, schema `vuihoc`, sau chuỗi cập nhật đến 20261212.
- **50 PK**, **27 khóa UNIQUE**, **90 FK**; **62 CHECK** giữ nguyên ở chú thích SQL để tương thích cả bộ phân tích DBML cũ và mới.
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

Phiên bản trước thay đổi đã được kiểm tra bằng `@dbml/core` 10.3.1 với 50 bảng, 392 cột và 90 quan hệ. Bản mới 384 cột được script kiểm tra về cấu trúc; chưa chạy lại bộ phân tích chính thức. Không thêm dependency vào ứng dụng.

Cú pháp tham khảo: [tài liệu DBML chính thức](https://dbml.dbdiagram.io/docs/).
