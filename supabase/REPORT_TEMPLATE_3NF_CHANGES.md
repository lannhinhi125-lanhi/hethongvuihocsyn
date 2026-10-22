# Mẫu báo cáo, chỉ số và bộ lọc — 20261202

Migration: [20261202_normalize_report_templates.sql](migrations/20261202_normalize_report_templates.sql), chạy sau đợt 20261201. Chuẩn bị/kiểm thử cục bộ, chưa chạy lên Supabase thật.

## Vấn đề trước khi sửa

`MAU_BAO_CAO.cauhinh` JSONB đã được bỏ từ đợt 20261015. Tuy nhiên, bộ ghi dùng `jsonb_each_text(filters)` nên khi người dùng chọn nhiều giá trị, cả mảng bị ép thành một chuỗi tại `BO_LOC_MAU_BAO_CAO.giatri`. PK cũ `(mamau,truong)` chỉ cho một dòng mỗi trường, không biểu diễn được từng giá trị độc lập. Một số mẫu nghỉ lễ còn dùng chuỗi danh sách do migration chuyển mã cũ.

Giao diện đã có `comparison`, `selection`, `chartType`, `chartMetricId` nhưng SQL chỉ lưu sáu tham số cơ bản, chỉ số và bộ lọc. Các tùy chọn thêm có thể mất khi tải lại từ máy chủ. Đây là thiếu nơi lưu các lựa chọn có ý nghĩa riêng, không phải lý do tạo thêm bảng chép dữ liệu nguồn.

## Toàn bộ cột trước và sau

### MAU_BAO_CAO — 11 → 18 cột

Trước: `madinhdanh, tenmaubaocao, manguoidung, ngaytao, ngaycapnhat, nguondulieu, nhomtheo, khoangngay, tungay, denngay, sapxep`.

Sau: `madinhdanh, tenmaubaocao, manguoidung, ngaytao, ngaycapnhat, nguondulieu, nhomtheo, khoangngay, tungay, denngay, sapxep, sosanhbat, kieusosanh, sosanhtungay, sosanhdenngay, giatrichon, kieubieudo, chisobieudo`.

- Bỏ: không có.
- Giữ: toàn bộ 11 cột cũ, bao gồm người sở hữu và ngày tạo/cập nhật.
- Thêm: bảy thuộc tính riêng của cấu hình mẫu. `sosanhbat` là boolean, hai ngày so sánh là date; bốn trường còn lại là text. NULL biểu thị lựa chọn chưa được cấu hình; không dựng giá trị lịch sử chưa từng được lưu.
- Không thêm `truongchon`: `selection.by` phải bằng `nhomtheo`, nên truy vấn lấy từ `nhomtheo` thay vì lưu bản sao. `giatrichon` chỉ lưu khóa nhóm đang được chọn.
- `tungay/denngay` là khoảng chính; `sosanhtungay/sosanhdenngay` là khoảng so sánh khác ý nghĩa. `chisobieudo` là chỉ số được chọn để vẽ, còn bảng con là tập các chỉ số được chọn cho báo cáo; hai vai trò không đồng nhất.

PK `madinhdanh`. FK giữ nguyên `manguoidung → NGUOI_DUNG.madinhdanh ON DELETE CASCADE`. Không lưu tên người sở hữu, tên môn/lớp/sự cố hay kết quả tổng hợp tại đây.

### CHI_SO_MAU_BAO_CAO — 3 → 3 cột

Trước: `mamau, machiso, thutu`.

Sau: `mamau, machiso, thutu`.

Không bỏ/thêm cột. PK giữ nguyên `(mamau,machiso)`; FK giữ nguyên `mamau → MAU_BAO_CAO.madinhdanh ON DELETE CASCADE`. Thêm UNIQUE `(mamau,thutu)` và CHECK mã không rỗng, thứ tự dương. Không lưu lại nhãn hay số liệu của chỉ số.

### BO_LOC_MAU_BAO_CAO — 3 → 4 cột

Trước: `mamau, truong, giatri`.

Sau: `mamau, truong, giatri, thutu`.

- Bỏ: không có cột; bỏ cách nhét danh sách nhiều lựa chọn vào một ô.
- Giữ: ba cột cũ. `giatri` trở thành một giá trị chọn trên mỗi dòng.
- Thêm: `thutu` integer, giữ thứ tự lựa chọn khi ghép kết quả trả về.
- PK đổi từ `(mamau,truong)` thành `(mamau,truong,giatri)`. Thêm UNIQUE `(mamau,truong,thutu)`; CHECK tên trường/giá trị không rỗng và thứ tự dương.
- FK giữ nguyên `mamau → MAU_BAO_CAO.madinhdanh ON DELETE CASCADE`.

Ví dụ bộ lọc `subject: ["M","E"]` trước nằm ở một dòng có `giatri='["M", "E"]'`; sau nằm tại hai dòng `(mamau,subject,M,1)` và `(mamau,subject,E,2)`.

Mã lựa chọn sự cố hiện dùng định danh ghép nhóm/mục, được giao diện biểu diễn bằng chuỗi như `["nhom","muc"]`. Đây là một mã lựa chọn, không phải hai giá trị chọn. Migration đối chiếu `LOAI_SU_CO` để giữ nguyên mã này; danh sách chứa các mã ghép được tách ở tầng ngoài. Mã cũ không phân biệt chắc được sẽ dừng để đối soát. Không tuyên bố mọi chuỗi bắt đầu bằng `[` là một danh sách hợp lệ.

## Nguồn và luồng liên kết

`CustomReportBuilder` → dataset `report_templates` → `public.vuihoc_save_business` → `vuihoc.ghi_du_lieu_quan_he` → `vuihoc.luu_cau_hinh_mau_bao_cao`: ghi cấu hình vô hướng vào bảng cha, từng chỉ số và từng giá trị lọc vào hai bảng con trong cùng giao dịch.

`public.vuihoc_business_data` → `vuihoc.du_lieu_quan_he` → `vuihoc.cau_hinh_mau_bao_cao`: truy vấn bảng cha và hai bảng con bằng `mamau`, ghép thành `cauhinh` cho mapper/giao diện. `cauhinh` là kết quả truy vấn/API, không phải cột JSON/JSONB. Bộ lọc trả về thống nhất dạng mảng; đầu vào một chuỗi vẫn được chấp nhận và chuyển thành mảng một phần tử. Mảng rỗng không lưu dòng và có nghĩa không áp dụng lọc.

Các dataset báo cáo lấy nhãn và dữ liệu hiện tại từ các nguồn đã có (`MON_HOC`, `LOAI_SU_CO`/nhóm sự cố, lớp, buổi, công…). Mẫu chỉ lưu khóa lựa chọn, không chép nhãn hay dữ liệu báo cáo. Đổi nhãn nguồn không đổi mã lọc; bộ tổng hợp/xuất dùng cùng cấu hình được mở lại từ máy chủ.

`nguondulieu`, `machiso`, `truong` là định danh kỹ thuật của bộ dựng báo cáo hiện có trong mã ứng dụng; hiện không có bảng danh mục SQL cho các định nghĩa này. `giatri` có thể chỉ tới môn, lớp, trạng thái, khoảng thời gian hoặc nhóm tổng hợp tùy trường. Vì vậy không gắn một FK giả cho toàn bộ cột vào một bảng nghiệp vụ bất kỳ, cũng không tạo bảng sao chép định nghĩa để giả lập FK. Ba FK thật trong nhóm này là người sở hữu mẫu và hai liên kết bảng con với mẫu. Các nguồn nghiệp vụ giữ FK riêng ở phân hệ tương ứng. Việc đưa toàn bộ định nghĩa kỹ thuật của bộ dựng báo cáo vào danh mục SQL là một phạm vi khác, không được tuyên bố đã hoàn tất ở đợt này.

## Phạm vi 3NF và tính toàn vẹn

Các thuộc tính bảng cha phụ thuộc vào mã mẫu; mỗi dòng chỉ số phụ thuộc khóa `(mamau,machiso)`; mỗi dòng giá trị lọc phụ thuộc khóa `(mamau,truong,giatri)`, với khóa ứng viên thứ hai `(mamau,truong,thutu)`. Không lưu nhãn nguồn phụ thuộc bắc cầu; mỗi ô giá trị lọc chỉ biểu diễn một lựa chọn. Không thêm bảng vật lý/cột JSON, không lưu kết quả thống kê hay dữ liệu cá nhân trong cấu hình. Đây là kết luận về ba bảng cấu hình trong phạm vi này, không phải toàn bộ hệ thống hoặc một cam kết rằng mọi loại bộ lọc đều có FK tĩnh tới nguồn nghiệp vụ.

SQL kiểm tra kiểu cấu hình, trường không được hỗ trợ, mã/thứ tự trùng, khoảng ngày đảo ngược, nhóm đang chọn lệch `nhomtheo`, loại biểu đồ sai. Giá trị loại biểu đồ, cách sắp xếp và chế độ ngày là giao thức chức năng; tên/giá trị danh mục nghiệp vụ vẫn truy vấn nguồn. Bộ ghi từ chối dữ liệu lỗi và rollback cả bảng cha lẫn con. Ràng buộc nguồn mẫu được kiểm tra ở cuối giao dịch vì RPC hiện tạo đầu mẫu trước khi ghi cấu hình quan hệ. Các hàm nội bộ được thu hồi quyền gọi trực tiếp từ `anon/authenticated`; RPC và quyền sở hữu/phân quyền hiện tại vẫn được dùng.

## Thứ tự chạy

1. Hoàn tất migration 20261201.
2. Chạy chỉ đọc [report_template_legacy.sql](diagnostics/report_template_legacy.sql). Các dòng `INVALID_*` hoặc `DUPLICATE_*` cần đối soát; `LIST_TO_SPLIT` chỉ cho biết chuỗi cũ sẽ được phân tách và không tự nó là lỗi.
3. Chạy migration 20261202. Chuỗi danh sách lỗi, mã lặp hoặc mã sự cố mơ hồ sẽ làm toàn bộ thay đổi rollback; không xóa mẫu hay đoán nguồn để vượt qua kiểm tra. Mẫu cũ thiếu nguồn cần được xác minh/chọn lại nguồn hoặc xóa qua chức năng quản lý mẫu nếu người dùng xác nhận không dùng; không tự gán nguồn bằng migration.
4. Chạy lại diagnostic, mở mẫu báo cáo và thử lưu/mở lại bộ lọc nhiều lựa chọn, so sánh, biểu đồ.

Không chạy migration cũ 20261115 hoặc thấp hơn lên cấu trúc mới. Chạy lại chính 20261202 là an toàn vì toàn bộ DDL/backfill được thực hiện trong một câu DO nguyên tử có kiểm tra trạng thái hoàn tất.

## Kiểm thử

PGlite có dữ liệu: bảo toàn các thuộc tính cũ của đầu mẫu, chỉ số, lớp, buổi, công và người dùng; số bảng không tăng; không có cột JSON/JSONB. Chuỗi lọc thường, danh sách và mã sự cố ghép được chuyển đúng. Dữ liệu lỗi/nhập trùng dừng và rollback. Chạy migration hai lần; kiểm tra đủ 18/3/4 cột và FK. RPC tạo/sửa/xóa mẫu, giữ đầy đủ cấu hình và xóa tùy chọn khi người dùng bỏ chọn; chặn ghi từ snapshot cũ. Đổi tên môn thật qua RPC rồi mở mẫu: nhãn lấy từ nguồn mới, dòng bộ lọc không đổi, kết quả lọc khớp dữ liệu lớp hiện tại. Kiểm tra xóa mẫu cascade và quyền hàm nội bộ.

Các kiểm thử bộ dựng báo cáo hiện có tiếp tục kiểm tra lọc nhiều lựa chọn, mã danh mục cùng tên, so sánh, tám kiểu biểu đồ và bộ lọc sự cố/nghỉ lễ.
