# Theo dõi thay đổi chuẩn hóa

## Lần 1 — Điểm đánh giá giáo viên

Migration: [20261116_normalize_teacher_evaluations.sql](migrations/20261116_normalize_teacher_evaluations.sql), chạy sau 20261115.

| Bảng | Bỏ | Giữ |
| --- | --- | --- |
| `GIAO_VIEN` | `diemtc1`, `diemtc2`, `diemtc3`, `diemdanhgia`, `nhanxetdanhgia`, `trangthaidanhgia` | Các cột hồ sơ, liên kết tài khoản, môn/cấp học, ngày và trạng thái giảng dạy. Ba cột đếm ca chưa xử lý trong lần này. |
| `BIEN_BAN_DU_GIO` | Không bỏ cột nào | `magiaovien`, ba điểm tiêu chí, tổng điểm, xếp loại, nhận xét, trạng thái duyệt và toàn bộ nội dung biên bản. |
| `NGUOI_DUNG` và các bảng khác | Không bỏ cột nào | Giữ cấu trúc và dữ liệu hiện tại. |

Danh sách cột còn lại của `GIAO_VIEN` theo cấu trúc đã rà soát: `madinhdanh`, `hoten`, `tendangnhap`, `mamonhoc`, `macaphoc`, `sodienthoai`, `thudientu`, `bangcap`, `ngaybatdau`, `ngayketthuc`, `trangthai`, `socaranh`, `socadaxep`, `dakinlich`, `manguoidung`, `ngaytao`, `ngaycapnhat`. Nếu database thật có thêm cột riêng ngoài repository, migration không đụng đến chúng.

Nguồn điểm là `BIEN_BAN_DU_GIO`, có khóa ngoại `magiaovien → GIAO_VIEN.madinhdanh`. Hồ sơ giáo viên chỉ hiển thị điểm của biên bản **đã duyệt gần nhất**, theo ngày đánh giá; trùng ngày phân biệt ổn định bằng mã định danh. Không có biên bản đã duyệt thì hiển thị chưa đánh giá. Toàn bộ lịch sử biên bản vẫn giữ, không lọc mất biên bản nháp khỏi dữ liệu lịch sử.

Các trường `evalStatus`, `evalScore`, `evalComment`, `evalCriteriaScores` trên giao diện là dữ liệu dựng từ truy vấn biên bản, không được gửi ghi ngược vào bảng giáo viên. RPC không còn nhận các cột tóm tắt điểm của giáo viên. Hàm tạo giáo viên và bộ đọc/ghi quan hệ được cập nhật tương ứng. Báo cáo dự giờ tiếp tục đọc điểm từ biên bản, không đọc cột đã bỏ.

### Trước và sau khi chạy

1. Có thể chạy [teacher_evaluation_legacy_check.sql](diagnostics/teacher_evaluation_legacy_check.sql) để xem điểm/nhận xét cũ chưa có biên bản lưu tương ứng. Đây là truy vấn chỉ đọc.
2. Sao chép toàn bộ migration 20261116 vào SQL Editor và chạy nguyên khối. Migration tự kiểm tra cùng điều kiện; nếu còn dữ liệu chỉ tồn tại trong hồ sơ, giao dịch dừng trước khi thay đổi cấu trúc. Không tự xóa dữ liệu chưa đối soát, không tạo biên bản giả và không tự chuyển nháp thành đã duyệt.
3. Chạy thành công thì tải lại ứng dụng đã cập nhật. Không chạy lại schema, seed hoặc các migration cũ để cập nhật môi trường đang có dữ liệu.
4. Kiểm tra hồ sơ giáo viên, lịch sử dự giờ, sửa nhận xét/điểm biên bản, tạo/sửa giáo viên và báo cáo. Thao tác lưu biên bản không cập nhật bảng giáo viên.

Migration không thêm bảng/cột sao lưu điểm khác, không thêm cột JSON/JSONB và không dùng `CASCADE`. Các biên bản cũ và những cột hồ sơ còn lại được giữ nguyên. Script reset dữ liệu demo chỉ được chỉnh để tương thích schema trước/sau; **không cần chạy script reset để chuẩn hóa**.

### Phạm vi 3NF

Lần này loại bỏ nhóm dữ liệu điểm/tóm tắt sao chép từ biên bản sang giáo viên. Đây là một bước trong quá trình chuẩn hóa, **không phải chứng nhận toàn bộ CSDL đã đạt 3NF**. Số ca lưu sẵn, nguồn thông tin cá nhân, đăng ký học cũ và các phụ thuộc dẫn xuất khác còn trong báo cáo rà soát. Tổng điểm/xếp loại trong biên bản vẫn là giá trị được trigger tính từ tiêu chí, chưa chuyển thành view/cột sinh trong lần này.


## Lần 2 — Số ca giáo viên

Migration: [20261117_normalize_teacher_slot_counts.sql](migrations/20261117_normalize_teacher_slot_counts.sql), chạy sau 20261116.

| Vai trò | Bảng / nguồn |
| --- | --- |
| **Nguồn chính lịch rảnh** | LICH_RANH_DINH_KY theo mã giáo viên, thứ và mã khung giờ; dùng tiếp qua các tuần nếu không đổi. |
| **Nguồn phân công lớp** | LICH_LOP JOIN LOP_HOC theo mã lớp; lớp liên kết giáo viên qua magiaovien. |
| **Nguồn dạy thay thực tế** | BUOI_HOC.magiaoviendaythay, ngày và giờ buổi; JOIN LOP_HOC để xác định lớp còn hoạt động. |
| **Nguồn khoảng giờ chuẩn** | KHUNG_GIO, liên kết bằng mã khung giờ. |
| **Truy vấn tổng hợp** | thong_ke_ca_giao_vien(mã giáo viên), được gọi trong chuỗi truy vấn hồ sơ giáo viên. Không tạo bảng tổng hợp hoặc bản sao số ca khác. |
| **Nơi nhận kết quả** | Danh sách/hồ sơ giáo viên, bộ lọc còn ca rảnh/kín lịch và các thống kê dùng hồ sơ giáo viên. Các nơi này nhận cùng kết quả truy vấn. |

| Bảng | Bỏ | Giữ |
| --- | --- | --- |
| GIAO_VIEN | socaranh, socadaxep, dakinlich | Các cột hồ sơ và liên kết còn lại sau lần 1. |
| LICH_RANH_DINH_KY | Không bỏ | Toàn bộ lịch rảnh định kỳ. |
| LICH_LOP, LOP_HOC | Không bỏ | Toàn bộ lịch, thông tin lớp và phân công. |
| BUOI_HOC, KHUNG_GIO | Không bỏ | Buổi học, giáo viên dạy thay và khung giờ. |
| Các bảng khác | Không bỏ | Giữ nguyên. |

Các cột còn lại của GIAO_VIEN theo schema trong repository: madinhdanh, hoten, tendangnhap, mamonhoc, macaphoc, sodienthoai, thudientu, bangcap, ngaybatdau, ngayketthuc, trangthai, manguoidung, ngaytao, ngaycapnhat.

### Cách tính được giữ nguyên

- socaranh: số ô lịch định kỳ được đăng ký free, loại các ô đang có phân công chồng giờ.
- socadaxep: số cặp thứ–khung giờ đang bị chiếm, tính DISTINCT để tránh đếm trùng; không phải tổng số buổi dạy trong một tháng.
- dakinlich: không còn ô rảnh và có ít nhất một ô đang bị chiếm. Giáo viên chưa đăng ký lịch và chưa được phân công không tự bị coi là kín lịch.
- Tạm dừng lớp vẫn giữ phân công; dừng hoặc kết thúc lớp được loại khỏi phân công đang chiếm lịch theo quy tắc truy vấn hiện có.

Ba tên trường vẫn xuất hiện trong dữ liệu RPC trả về vì đó là cột kết quả truy vấn, không còn là cột lưu trong GIAO_VIEN. Mapper giữ việc hiển thị và không gửi ghi ngược; RPC cũng chặn yêu cầu tự ghi số ca. Hàm tạo giáo viên được sửa để không INSERT các cột đã bỏ. Không thay đổi cách tính công, lịch sử dự giờ hoặc dữ liệu cá nhân trong lần này.

Chạy toàn bộ migration rồi tải lại ứng dụng. Không cần mở lại lớp, sửa lịch hay chạy reset dữ liệu demo. SQL chạy lại được, không thêm bảng/cột lưu số ca, không dùng CASCADE. Đây là bước 2 của lộ trình, chưa chứng nhận toàn bộ CSDL đạt 3NF.


## Lần 3 — Số tài khoản trong nhóm quyền

Migration: [20261118_normalize_role_group_counts.sql](migrations/20261118_normalize_role_group_counts.sql), chạy sau 20261117.

| Vai trò | Bảng / nguồn |
| --- | --- |
| **Nguồn chính tài khoản** | NGUOI_DUNG: mỗi tài khoản là một hàng. |
| **Nguồn chính nhóm** | NHOM_QUYEN: mỗi nhóm là một hàng thông tin nhóm, không lưu số tài khoản. |
| **Liên kết** | NGUOI_DUNG.manhomquyen → NHOM_QUYEN.madinhdanh. |
| **Truy vấn số lượng** | nhom_quyen_truy_van dùng COUNT từ NGUOI_DUNG theo manhomquyen; kết quả được trả qua phiên tài khoản. |
| **Nơi dùng kết quả** | Màn hình danh sách nhóm quyền và dữ liệu nhóm trong phiên tài khoản. |
| **Nguồn quyền của nhóm** | NHOM_QUYEN_CHI_TIET liên kết NHOM_QUYEN và QUYEN; giữ nguyên. |

| Bảng | Bỏ | Giữ |
| --- | --- | --- |
| NHOM_QUYEN | soluongnguoidung | congtruycap, madinhdanh, tennhomquyen, phanloai, mota, macdinh, ngaytao, ngaycapnhat. |
| NGUOI_DUNG | Không bỏ | Các tài khoản và khóa ngoại manhomquyen. |
| NHOM_QUYEN_CHI_TIET, QUYEN | Không bỏ | Các hàng quyền và các khóa liên kết hiện tại. |
| Các bảng khác | Không bỏ | Giữ nguyên. |

Số lượng bao gồm cả tài khoản bị khóa vì chúng vẫn thuộc nhóm. Tạo/xóa tài khoản hoặc đổi nhóm làm kết quả COUNT đổi theo; không có trigger hay bảng khác lưu lại tổng số lượng. Tạo/sửa/xóa nhóm vẫn dùng RPC kiểm tra quyền và không cho xóa nhóm còn tài khoản sử dụng. Chỉnh mô tả nhóm không bị báo xung đột chỉ vì số tài khoản vừa thay đổi ở phiên khác; các trường thông tin nhóm khác vẫn được kiểm tra phiên bản như trước.

Trường userCount trên giao diện là kết quả truy vấn, không gửi trong dữ liệu ghi nhóm. Migration sửa bộ đọc nhóm và RPC ghi tài khoản/nhóm, giữ nguyên bảng gán quyền và liên kết tài khoản. Chạy toàn bộ SQL rồi tải lại ứng dụng; không chạy schema hoặc seed để nâng cấp.

Phạm vi hoàn tất của lần này là **nguồn và truy vấn số lượng tài khoản theo nhóm**. Các phần trùng thông tin cá nhân giữa tài khoản và giáo viên chưa được xử lý trong bước này; không coi toàn bộ phân hệ tài khoản–nhân sự đã đạt 3NF.

## Lần 4 — Thông tin cá nhân giáo viên

Migration: [20261119_normalize_teacher_contacts.sql](migrations/20261119_normalize_teacher_contacts.sql), chạy sau 20261118. Chạy toàn bộ file trong SQL Editor. Không chạy schema, seed hoặc reset để nâng cấp dữ liệu thật.

Quy tắc người dùng xác nhận: tạo hồ sơ giáo viên đồng thời cấp tài khoản, tự sinh tên đăng nhập. Giữ RPC tạo cả hai trong cùng giao dịch. Không thêm bảng hồ sơ chung.

| Vai trò | Bảng / truy vấn |
| --- | --- |
| Nguồn chính thông tin cá nhân | NGUOI_DUNG: hoten, tendangnhap, thudientu, sodienthoai. |
| Nguồn chính nghiệp vụ giáo viên | GIAO_VIEN: môn, cấp học, bằng cấp, ngày làm việc, trạng thái và liên kết tài khoản. |
| Khóa ngoại | GIAO_VIEN.manguoidung → NGUOI_DUNG.madinhdanh; UNIQUE hiện có được giữ, thêm NOT NULL và ON DELETE RESTRICT. |
| JOIN dùng chung | V_GIAO_VIEN JOIN hai bảng theo khóa ngoại. Đây là VIEW thường, không lưu bản sao dữ liệu. |
| Nơi truy vấn sang | Hồ sơ giáo viên, cổng giáo viên, danh sách lớp, lịch, dạy thay, dự giờ và báo cáo/công dạy dùng RPC và các hàm truy vấn quan hệ hiện có; thông tin liên hệ được bổ sung từ nguồn tài khoản. |

| Bảng | Bỏ | Giữ |
| --- | --- | --- |
| GIAO_VIEN | hoten, tendangnhap, thudientu, sodienthoai | madinhdanh, mamonhoc, macaphoc, bangcap, ngaybatdau, ngayketthuc, trangthai, manguoidung, ngaytao, ngaycapnhat. |
| NGUOI_DUNG | Không bỏ | Thông tin cá nhân và các cột tài khoản hiện có. |
| Các bảng nghiệp vụ khác | Không bỏ | Giữ dữ liệu và khóa liên kết. |

Bỏ trigger sao chép liên hệ từ tài khoản sang giáo viên. Khi sửa liên hệ ở hồ sơ giáo viên, RPC kiểm tra quyền và phiên bản rồi ghi trực tiếp vào NGUOI_DUNG; không ghi bản sao vào GIAO_VIEN. Sửa tên đăng nhập qua quản lý tài khoản. Cập nhật tài khoản được đọc lại qua JOIN trong hồ sơ và báo cáo. Tài khoản còn gắn hồ sơ giáo viên phải khóa thay vì xóa; xóa hồ sơ giáo viên vẫn giữ hành vi khóa tài khoản hiện có.

Nếu hồ sơ cũ thiếu tài khoản hoặc thông tin hai bên khác nhau, migration dừng nguyên giao dịch. Chạy [teacher_contact_links.sql](diagnostics/teacher_contact_links.sql) để xem mã cần đối soát; không tự ghép theo họ tên, không tự ghi đè dữ liệu khác nhau, không tự sinh mật khẩu cho hồ sơ cũ. Dữ liệu hợp lệ không cần mở lại lớp hay tạo lại hồ sơ.

Phạm vi lần này là loại bỏ bản sao **thông tin cá nhân và tên đăng nhập** giữa hai bảng. Không coi toàn bộ CSDL đã đạt 3NF: các phụ thuộc còn lại, gồm mamonhoc trong tài khoản và giáo viên, cần được xử lý ở các bước sau theo quyền và nghiệp vụ tương ứng.

## Lần 5 — Phụ thuộc môn, nhóm quyền và avatar trong tài khoản

Migration: [20261120_normalize_account_dependencies.sql](migrations/20261120_normalize_account_dependencies.sql), chạy sau 20261119. Chạy toàn bộ file; sau đó tải lại ứng dụng. Không chạy schema, seed hoặc reset để cập nhật dữ liệu thật.

| Bảng đã sửa / liên quan | Trước đây có gì trùng hoặc dẫn xuất | Sau khi sửa |
| --- | --- | --- |
| NGUOI_DUNG | mamonhoc trùng với GIAO_VIEN.mamonhoc của giáo viên liên kết | Bỏ mamonhoc; chỉ truy vấn môn từ GIAO_VIEN theo manguoidung. |
| NGUOI_DUNG | vaitro lưu nhãn vai trò trong khi manhomquyen đã trỏ tới nhóm quyền | Bỏ vaitro; nhãn hiển thị lấy từ NHOM_QUYEN.tennhomquyen theo manhomquyen. Quyền thực tế vẫn từ nhóm, không suy đoán bằng nhãn. |
| NGUOI_DUNG | chucaiavatar lưu kết quả viết tắt từ hoten | Bỏ chucaiavatar; truy vấn tính chữ đầu của hai từ cuối trong họ tên. Tên một từ dùng một chữ, tên rỗng dùng VH. Không thêm cột sinh hay bảng lưu avatar. |
| GIAO_VIEN | Có môn chính, là bản nghiệp vụ cần giữ | Giữ mamonhoc và FK tới MON_HOC; không thêm cột. |
| NHOM_QUYEN | Có tên nhóm chính | Giữ tennhomquyen và thông tin nhóm; không thêm cột. |
| NHOM_QUYEN_CHI_TIET, QUYEN | Quan hệ gán quyền và danh mục quyền | Giữ nguyên các hàng, khóa và quyền hiện có. |

NGUOI_DUNG giữ thông tin cá nhân, tên đăng nhập, trạng thái tài khoản, manhomquyen, thông tin xác thực/phiên hiện có và ngày tạo/cập nhật. Thêm NOT NULL cho manhomquyen; giữ FK nhóm quyền hiện có. Không thay mật khẩu, đăng xuất hàng loạt hay tạo thêm tài khoản trong migration.

### Nguồn và các luồng truy vấn sang

- Môn: NGUOI_DUNG.madinhdanh ← GIAO_VIEN.manguoidung; lấy GIAO_VIEN.mamonhoc → MON_HOC.mamonhoc. Tài khoản chưa gắn hồ sơ giáo viên nhận môn NULL, không tự chọn môn mặc định.
- Nhóm: NGUOI_DUNG.manhomquyen → NHOM_QUYEN.madinhdanh; nhãn là tennhomquyen. Gán quyền qua NHOM_QUYEN_CHI_TIET.manhom / maquyen → QUYEN.maquyen.
- Đăng nhập, phiên hiện tại và danh sách tài khoản dùng tai_khoan_cong_khai. Họ tên/vai trò người đánh giá trong truy vấn dự giờ lấy từ tài khoản / nhóm chính.
- Tạo hồ sơ giáo viên vẫn tạo tài khoản trong cùng giao dịch; môn chỉ INSERT vào GIAO_VIEN. Sửa môn từ hồ sơ giáo viên chỉ ghi GIAO_VIEN, không UPDATE bản sao trong tài khoản.
- Màn hình tài khoản hiển thị môn lấy từ hồ sơ, không nhập/sửa môn riêng. Danh sách chọn nhóm dùng mã nhóm làm giá trị, không ghép theo tên có thể trùng. Tên nhóm/ảnh viết tắt/môn được giữ trong kết quả hiển thị nhưng mapper không gửi ghi lại.
- Sửa hồ sơ hoặc tài khoản sử dụng cơ chế tải lại dữ liệu phiên/nghiệp vụ hiện có. Báo cáo và cổng giáo viên tiếp tục đọc nguồn nghiệp vụ, không thêm bảng kết quả báo cáo.

### Đối soát dữ liệu cũ

Chạy [account_dependencies.sql](diagnostics/account_dependencies.sql). Nếu tài khoản thiếu nhóm, có môn nhưng chưa có hồ sơ giáo viên, hoặc môn tài khoản khác môn hồ sơ, migration dừng nguyên giao dịch trước khi bỏ cột. Không tự xóa môn chưa được đối soát, không tự ghép giáo viên theo tên. Nhãn vai trò cũ được thay bằng tên nhóm thực tế; chữ viết tắt avatar được tính thống nhất lại từ tên.

### Cơ sở đánh giá 3NF và giới hạn

| Quan hệ được rà | Khóa và phụ thuộc nghiệp vụ |
| --- | --- |
| NGUOI_DUNG | madinhdanh là PK; tendangnhap là khóa duy nhất. Các thuộc tính tài khoản còn lại mô tả chính tài khoản. Không lưu tên nhóm qua manhomquyen, môn qua hồ sơ hay chữ viết tắt qua họ tên. |
| NHOM_QUYEN | madinhdanh → tên, phân loại, mô tả, cổng, cờ mặc định và mốc thời gian; số tài khoản đã bỏ ở lần 3. |
| QUYEN | maquyen → tenquyen. |
| NHOM_QUYEN_CHI_TIET | Khóa ghép (manhom, maquyen) xác định thứ tự của quyền trong nhóm; giữ hai FK, không chép tên nhóm/tên quyền. |

Theo các phụ thuộc nghiệp vụ đã kiểm tra trong mã, nhóm bốn quan hệ tài khoản/quyền trên đáp ứng mô hình 3NF sau các migration 20261118–20261120. Đây không phải chứng nhận toàn bộ phân hệ giáo viên/dự giờ hay toàn bộ CSDL: các trường ngữ cảnh biên bản, đăng ký học sinh và các nhóm trong bản rà soát ban đầu vẫn cần xử lý riêng. Chỉ kiểm thử trên PostgreSQL cục bộ; cấu trúc thực tế trên Supabase cần đối chiếu sau khi người dùng áp dụng migration.

Kiểm thử tích hợp: migration chạy hai lần, chặn và hoàn tác khi môn cũ không khớp, không tăng số bảng lưu trữ, giữ các sự thật nguồn còn lại, tạo giáo viên kèm tài khoản, đổi môn, đổi nhóm/đổi tên nhóm, cập nhật avatar theo tên, đăng nhập cổng giáo viên, chặn ghi trường dẫn xuất, truy vấn công và reset fixture cục bộ.

## Lần 6 — Hồ sơ học sinh, nhu cầu đăng ký và xếp lớp

Migration: [20261121_normalize_student_enrollments.sql](migrations/20261121_normalize_student_enrollments.sql), chạy **sau 20261120**, toàn bộ file trong một lần. Cập nhật ứng dụng và tải lại trang sau khi chạy SQL. Không chạy schema, seed hay reset dữ liệu thật để nâng cấp.

### Bảng đã sửa, trước đây trùng gì và sau khi sửa

| Bảng | Trước đây | Sau khi sửa |
| --- | --- | --- |
| HOC_SINH | Lưu mamonhoc, mamohinh, matrinhdo, trangthai, malophientai dù đã có đăng ký theo môn. Một bộ cột chỉ biểu diễn được một môn và có thể cũ hơn nguồn đăng ký. | Bỏ cả 5 cột. Giữ madinhdanh, hoten, hotencha, sodienthoaicha, hotenme, sodienthoaime, macaphoc, makhoi, ngaytao, ngaycapnhat. |
| DANG_KY_MON_HOC | Trộn nhu cầu môn/trình độ/mô hình với malop hiện tại; lớp lại xác định môn/trình độ/mô hình nên để chung còn phụ thuộc bắc cầu. | Bỏ malop. Giữ nhu cầu, vòng đời, thời điểm và số đợt đăng ký. Thêm macaphocdangky làm phần còn thiếu của khóa cấp–khối lúc nhập học. |
| XEP_LOP_DANG_KY — bảng liên kết mới | Quan hệ xếp lớp nằm trong đăng ký. | Chỉ lưu mahocsinh, mamonhoc, malop. PK (mahocsinh,mamonhoc), khóa duy nhất (mahocsinh,malop), FK đến đăng ký và cặp mã lớp–môn. Không chép tên học sinh/lớp, trình độ, mô hình hay trạng thái. |
| LICH_DANG_KY_MON_HOC | Đã lưu lịch theo môn, nhưng chưa chặn cùng ca được ghi nhiều lần bằng các thutu khác nhau. | Giữ làm nguồn lịch đăng ký duy nhất; thêm UNIQUE (mahocsinh,mamonhoc,thutrongtuan,makhunggio) và CHECK thứ tự dương. |
| LICH_DANG_KY_HOC_SINH | Bảng lịch cũ theo hồ sơ, cùng ý nghĩa với lịch của một đăng ký; một số database đã bỏ bảng qua cleanup_unused_tables. | Đối soát các ca cũ với môn tương ứng trước khi DROP TABLE IF EXISTS; không bỏ ca chưa đối soát. |
| LICH_SU_DANG_KY_HOC | Lưu đợt đã thôi học, vẫn lưu thêm trangthai luôn DA_THOI_HOC; mã khối lịch sử thiếu cấp để tạo FK đầy đủ. | Bỏ trangthai sau khi kiểm tra toàn bộ lịch sử là đợt đã thôi học; thêm macaphoc và FK cấp–khối. Giữ môn, số đợt, ngày đăng ký/kết thúc, loại đợt, khối/trình độ/mô hình của đợt cũ. |
| LICH_SU_CA_DANG_KY_HOC | Lịch của từng đợt đã kết thúc. | Giữ lịch riêng theo khóa đợt; thêm UNIQUE chặn trùng ca và CHECK thứ/ngày hợp lệ. |
| LOP_HOC | Nguồn chính thông tin lớp; chưa có UNIQUE ghép mã lớp–môn cho FK mới. | Chỉ bổ sung UNIQUE (madinhdanh,mamonhoc); không sửa dữ liệu lớp. |

### Nguồn chính và các bảng truy vấn sang

- Hồ sơ: HOC_SINH.madinhdanh là nguồn thông tin cá nhân và khối hiện tại. Cặp (macaphoc,makhoi) liên kết LUA_CHON_CAP_HOC; mã khối chỉ duy nhất trong cấp nên cần giữ đủ cặp FK.
- Nhu cầu học: DANG_KY_MON_HOC có PK (mahocsinh,mamonhoc); mahocsinh → HOC_SINH, mamonhoc → MON_HOC, matrinhdo → TRINH_DO, mamohinh → MO_HINH_LOP. Đây là nhu cầu đã đăng ký, không phải bản sao thuộc tính lớp; nhu cầu vẫn tồn tại khi chưa được xếp lớp.
- Xếp lớp hiện tại: XEP_LOP_DANG_KY.(mahocsinh,mamonhoc) → DANG_KY_MON_HOC; (malop,mamonhoc) → LOP_HOC.(madinhdanh,mamonhoc). Trạng thái đăng ký chỉ lưu ở DANG_KY_MON_HOC, bảng xếp lớp không lưu lại trạng thái.
- Lịch mong muốn: LICH_DANG_KY_MON_HOC.(mahocsinh,mamonhoc) → DANG_KY_MON_HOC, makhunggio → KHUNG_GIO. Lịch lớp thực tế vẫn thuộc LICH_LOP; hai lịch có ý nghĩa khác nhau.
- Đợt cũ: LICH_SU_DANG_KY_HOC có PK (mahocsinh,mamonhoc,dotdangky); lịch đợt cũ tham chiếu đủ ba phần khóa này. Ràng buộc chặn một đợt xuất hiện đồng thời ở hiện tại và lịch sử, hoặc lịch sử đứng sau đợt hiện tại.
- Khối lúc bắt đầu đợt: DANG_KY_MON_HOC.(macaphocdangky,khoidangky) và LICH_SU_DANG_KY_HOC.(macaphoc,khoi) → LUA_CHON_CAP_HOC.(macaphoc,madinhdanh). Không còn trigger chép mọi thay đổi khối hiện tại vào khối nhập học. Đợt học lại lấy khối tại thời điểm bắt đầu đợt mới; đợt trước không bị đổi theo.

V_DANG_KY_MON_HOC và V_HOC_SINH là VIEW thường, chỉ JOIN/tính kết quả để giữ hợp đồng RPC; không lưu thêm dữ liệu. V_HOC_SINH có bộ trường học của đăng ký đầu để tương thích các đoạn đọc cũ; danh sách đầy đủ và báo cáo nhiều môn tiếp tục dùng dangkymonhoc. Không thể dùng các trường tương thích này để ghi vào bảng hồ sơ.

### Luồng đã chuyển

Tạo/sửa hồ sơ, thêm môn, xếp lớp, dừng/tạm dừng lớp, kiểm tra sĩ số/trùng lịch, bảo lưu/thôi học, học lại, danh sách lớp/điểm danh, lịch sử xếp lớp, cổng giáo viên và báo cáo tiếp tục dùng chuỗi RPC/truy vấn quan hệ hiện có. Các truy vấn đăng ký đọc V_DANG_KY_MON_HOC; hàm ghi chuẩn hóa ghi nhu cầu vào DANG_KY_MON_HOC và chỉ ghi quan hệ lớp vào XEP_LOP_DANG_KY. Truy vết xếp lớp ghi theo thay đổi quan hệ xếp lớp, không ghi lặp khi chỉ sửa thông tin cá nhân.

Mapper bỏ subject/model/level/status/currentClassCode/scheduleSlots ở cấp hồ sơ khỏi dữ liệu ghi. Thay đổi nhu cầu được gửi trong registrations → dangkymonhoc. SQL chặn trình duyệt cũ cố ghi lại các trường hồ sơ đã bỏ. Tạo hồ sơ cần ít nhất một đăng ký; ràng buộc kiểm tra theo giao dịch cho phép tạo hồ sơ và đăng ký cùng một lần lưu.

Tạm dừng giữ quan hệ xếp lớp. Dừng/kết thúc giải phóng quan hệ và đưa đăng ký về Chờ xếp lớp như trước. Giữ kiểm tra quyền, giới hạn sĩ số, môn/trình độ/mô hình/khối phù hợp, lịch chồng và quy tắc phải dừng lớp trước khi rút học sinh.

### Vì sao những giá trị giống nhau được giữ

Khối hiện tại của hồ sơ và khối lúc bắt đầu đợt là hai sự thật có thời điểm khác nhau. Đăng ký hiện tại và đợt cũ có khóa đợt khác nhau, không phải hai bản sao cùng một đợt. Lịch mong muốn của đăng ký khác lịch vận hành lớp. Truy vết xếp lớp là sự kiện đã xảy ra, khác quan hệ lớp hiện tại. Thông tin cha/mẹ trong hồ sơ là liên hệ theo vai trò được khai báo cho học sinh; không suy đoán danh tính người giám hộ hoặc gộp người chỉ dựa vào họ tên/số điện thoại.

### Đối soát trước khi bỏ dữ liệu cũ

Chạy [student_enrollment_legacy.sql](diagnostics/student_enrollment_legacy.sql). Migration dừng nguyên giao dịch nếu bộ cột cũ không khớp đăng ký thực tế nào, có ca cũ chưa khớp nguồn lịch theo môn, khối nhập học cũ không xác định duy nhất cấp, lịch sử có trạng thái khác đợt đã thôi học, hoặc gặp bản ghi trùng vi phạm các UNIQUE mới. Không tự ghi đè sự khác biệt, không tự ghép theo tên, không tự bịa đợt học/lớp/ngày đăng ký.

Những giá trị khối nhập học đã từng bị trigger cũ đồng bộ theo khối hiện tại không thể tự khôi phục về thời điểm ban đầu nếu không có chứng từ; migration giữ giá trị đang có và từ nay ngăn ghi đè tiếp. Các script kiểm thử có bước đối soát fixture cục bộ; bước đó không nằm trong migration dữ liệu thật.

### Đánh giá 3NF trong phạm vi nhóm bảng này

HOC_SINH chỉ giữ thuộc tính hồ sơ theo khóa học sinh. DANG_KY_MON_HOC giữ thuộc tính của nhu cầu/vòng đời theo khóa học sinh–môn, không còn mã lớp tạo phụ thuộc bắc cầu. XEP_LOP_DANG_KY chỉ chứa khóa liên kết, có hai khóa ứng viên học sinh–môn và học sinh–lớp. Hai bảng lịch giữ ca theo toàn bộ khóa đăng ký/đợt và thứ tự; không lưu nhãn ngày/khung giờ. Lịch sử giữ sự thật của từng đợt đóng theo đầy đủ khóa học sinh–môn–đợt, không lưu trạng thái hằng có thể suy ra. Các tên danh mục được JOIN từ nguồn.

Theo các phụ thuộc nghiệp vụ được rà, nhóm quan hệ trên đáp ứng 3NF. Không suy rộng kết luận sang LOP_HOC, BUOI_HOC, dự giờ hoặc toàn bộ CSDL; các phân hệ đó vẫn cần rà riêng. Migration chỉ được chạy và kiểm thử trên PostgreSQL cục bộ, chưa áp dụng lên Supabase thật.
