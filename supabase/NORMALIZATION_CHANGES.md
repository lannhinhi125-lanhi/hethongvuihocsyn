# Theo dõi thay đổi chuẩn hóa

Đợt **20261209 — lịch rảnh theo lần cập nhật**: [đủ bảng/cột trước–sau, PK/FK, nguồn và luồng](AVAILABILITY_VERSION_3NF_CHANGES.md). Ba bảng cũ thành hai bảng phiên bản/chi tiết; lịch có hiệu lực đến lần cập nhật tiếp theo, không đăng ký lại mỗi tuần. Lịch hiện tại là view, ngày hết hiệu lực được truy vấn. Giữ ô lịch định kỳ cũ; có dữ liệu lịch tuần hoặc thiếu ngày thì dừng toàn bộ để đối soát. Không lưu JSON. Chạy sau 20261208; chưa chạy Supabase thật.

Đợt **20261208 — môn của lịch sử xếp lớp**: [đủ cột trước/sau, FK, nguồn và luồng liên quan](CLASS_TRACE_3NF_CHANGES.md). `TRUY_VET_XEP_LOP` 8→7 cột, bỏ `mamonhoc` sao chép; giữ mã lớp cũ/mới và JOIN `LOP_HOC`. Cập nhật bộ ghi/lịch sử, bảo vệ môn lớp đã có truy vết, chặn dữ liệu lệch nguồn trước khi bỏ cột. Không thêm bảng/cột JSON hoặc xóa sự kiện. Chạy sau 20261207; chưa chạy Supabase thật.

Đợt **20261207 — đường ghi danh mục cấp/khối**: [trước/sau, khóa và luồng liên quan](GRADE_CATALOG_WRITE_CHANGES.md). Giữ cấu trúc chuẩn hóa 20261205, thay xóa/chèn toàn bộ bằng cập nhật theo khóa ổn định. Không thêm/bỏ cột/bảng/FK, không backfill dữ liệu. Đổi nhãn mục đang dùng được; xóa mục đang dùng vẫn bị chặn. Chưa chạy Supabase thật.

Đợt **20261206 — giờ buổi học**: [đủ cột trước/sau, FK và luồng đọc/ghi](LESSON_CLOCK_3NF_CHANGES.md). `BUOI_HOC` 30→28 cột, bỏ `batdau/ketthuc`; giữ FK và JOIN `KHUNG_GIO` làm nguồn duy nhất. Khung đã có buổi sử dụng không sửa giờ trực tiếp. Không tạo bảng nghiệp vụ/cột JSON; giữ thời điểm check-in/out thực tế. Migration chạy sau 20261205; chưa chạy lên Supabase thật.

Đợt **20261202 — mẫu/chỉ số/bộ lọc báo cáo**: [đủ cột trước/sau, PK/FK và luồng](REPORT_TEMPLATE_3NF_CHANGES.md). Bộ lọc tách từng lựa chọn thành dòng (3→4 cột), chỉ số giữ ba cột, mẫu bổ sung bảy tham số chưa được lưu (11→18); không tạo bảng hay cột JSON. Giữ mã nguồn và truy vấn nhãn hiện tại. [Migration](migrations/20261202_normalize_report_templates.sql) sau 20261201; chưa chạy lên Supabase thật.

Đợt **20261201 — nhận xét/danh mục bổ sung**: [đủ cột trước/sau, PK/FK và nguồn truy vấn](FEEDBACK_CATALOG_3NF_CHANGES.md). Ba bảng giữ 6/7/7 cột, không thêm nơi lưu; bổ sung kiểm tra mã trùng/cây vòng lặp và gỡ hợp đồng tiêu chí cũ khỏi giao diện. Bốn bảng tiêu chí đã nghỉ từ 20261021, không phải các bảng cần chuẩn hóa tiếp. Migration chạy sau 20261130; chưa áp dụng lên Supabase thật trong phiên này.

Đợt **20261130 — công/kỳ/đối soát**: [PAYROLL_3NF_CHANGES.md](PAYROLL_3NF_CHANGES.md) ghi đủ cột trước/sau: dòng công 13→11, kỳ 8 giữ nguyên, đối soát 4 giữ nguyên; PK/FK và nguồn JOIN kỳ/vai trò. [Migration 20261130](migrations/20261130_normalize_payroll_sources.sql) chạy sau 20261129, không thay số công hay mở kỳ khóa. Chưa chạy lên Supabase thật trong phiên này.

Đợt **20261129 — giải trình/minh chứng**: [WORK_EVIDENCE_3NF_CHANGES.md](WORK_EVIDENCE_3NF_CHANGES.md) ghi đầy đủ 13→12 cột bảng cha, ba cột bảng con trước/sau, PK/FK và nguồn truy vấn. Bỏ bản sao danh sách ở bảng cha, giữ liên kết tại `LINK_MINH_CHUNG_CONG`; [migration 20261129](migrations/20261129_normalize_work_evidence.sql) chạy sau 20261128. Chưa áp dụng lên Supabase thật trong phiên này.

Đợt mới nhất **20261128 — sự cố và danh mục**: xem [INCIDENT_3NF_CHANGES.md](INCIDENT_3NF_CHANGES.md) để đối chiếu đủ 17→16 cột, các bảng nguồn trước/sau, PK/FK, luồng báo cáo/công/tạm dừng và lý do giữ hệ số đã áp dụng. Migration: [20261128_normalize_incident_names.sql](migrations/20261128_normalize_incident_names.sql), sau 20261127; chưa thực thi trên Supabase thật trong phiên này.

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

Chạy [student_enrollment_legacy.sql](diagnostics/student_enrollment_legacy.sql). Migration dừng nguyên giao dịch nếu nhu cầu môn/mô hình/trình độ cũ không khớp đăng ký thực tế nào, có quan hệ lớp hoặc trạng thái cũ mâu thuẫn chưa giải thích được, có ca cũ chưa khớp nguồn lịch theo môn, khối nhập học cũ không xác định duy nhất cấp, lịch sử có trạng thái khác đợt đã thôi học, hoặc gặp bản ghi trùng vi phạm các UNIQUE mới. Không tự ghi đè sự khác biệt, không tự ghép theo tên, không tự bịa đợt học/lớp/ngày đăng ký.

Bản đối soát đã sửa cho dữ liệu cũ thực tế: malophientai trống trên hồ sơ không phải là quan hệ lớp đối lập với đăng ký môn. Mã lớp cũ đã dừng chỉ được chấp nhận khi TRUY_VET_XEP_LOP chứng minh đã giải phóng đúng học sinh–môn–lớp. Trạng thái cũ DANG_HOC khác trạng thái nguồn CHO_XEP_LOP chỉ được chấp nhận khi có truy vết giải phóng lớp đã dừng/kết thúc. Không bỏ qua khác biệt bảo lưu/thôi học, môn, mô hình hay trình độ. Kiểm thử chạy migration trên nguyên bản fixture demo trước mọi bước điền lại cột cũ; không cập nhật hoặc mở lại lớp để vượt qua đối soát.

Đối soát bổ sung từ CSV Supabase của DEMO-HS-036: bản sao hồ sơ là CHO_XEP_LOP, mã lớp trống; nguồn đăng ký là DANG_HOC, và có sự kiện xếp lớp ban đầu đến đúng mã lớp đang được đăng ký tham chiếu. Khi cả môn/mô hình/trình độ khớp và có đủ truy vết này, migration chấp nhận bản sao trạng thái cũ mà không sửa đăng ký, quan hệ lớp hay lịch. Thiếu truy vết tương ứng vẫn dừng; không mở rộng cho trạng thái bảo lưu/thôi học hoặc trường hợp trỏ tới lớp khác.

Tương thích hàm ghi lịch rảnh 20261105/fix_student_available_slots: UPSERT có thể thêm WHERE ... IS DISTINCT FROM để tránh cập nhật đăng ký không đổi. Bản chuyển đổi nhận cả phiên bản gốc và phiên bản này; helper chuẩn hóa giữ điều kiện chỉ UPDATE nhu cầu hoặc quan hệ lớp khi giá trị thực sự khác. Kiểm thử cài phiên bản lịch rảnh này trước khi chạy 20261121, kiểm tra học lại, sửa hồ sơ và xếp/dừng lớp sau chuyển đổi. Không cần chạy lại các migration cũ để sửa lỗi chuyển đổi hàm.

Những giá trị khối nhập học đã từng bị trigger cũ đồng bộ theo khối hiện tại không thể tự khôi phục về thời điểm ban đầu nếu không có chứng từ; migration giữ giá trị đang có và từ nay ngăn ghi đè tiếp. Các script kiểm thử có bước đối soát fixture cục bộ; bước đó không nằm trong migration dữ liệu thật.

### Đánh giá 3NF trong phạm vi nhóm bảng này

HOC_SINH chỉ giữ thuộc tính hồ sơ theo khóa học sinh. DANG_KY_MON_HOC giữ thuộc tính của nhu cầu/vòng đời theo khóa học sinh–môn, không còn mã lớp tạo phụ thuộc bắc cầu. XEP_LOP_DANG_KY chỉ chứa khóa liên kết, có hai khóa ứng viên học sinh–môn và học sinh–lớp. Hai bảng lịch giữ ca theo toàn bộ khóa đăng ký/đợt và thứ tự; không lưu nhãn ngày/khung giờ. Lịch sử giữ sự thật của từng đợt đóng theo đầy đủ khóa học sinh–môn–đợt, không lưu trạng thái hằng có thể suy ra. Các tên danh mục được JOIN từ nguồn.

Theo các phụ thuộc nghiệp vụ được rà, nhóm quan hệ trên đáp ứng 3NF. Không suy rộng kết luận sang LOP_HOC, BUOI_HOC, dự giờ hoặc toàn bộ CSDL; các phân hệ đó vẫn cần rà riêng. Migration chỉ được chạy và kiểm thử trên PostgreSQL cục bộ, chưa áp dụng lên Supabase thật.

## Lần 7 — Chi tiết ca và phân công dạy thay

Migration: [20261122_normalize_lesson_metadata.sql](migrations/20261122_normalize_lesson_metadata.sql), chạy toàn bộ sau **20261121**. Không chạy schema, seed hoặc reset để nâng cấp dữ liệu thật. Tải lại ứng dụng sau khi chạy.

| Bảng / nguồn | Trước đây trùng gì | Sau khi sửa |
| --- | --- | --- |
| CHI_TIET_CA_LOP | malop, ngaygio, tieude, giovaohienthi, hotennguoivao, hoclieugiaovien, hoclieuhocsinh, baitaplms, magiaoviendaythay cùng mô tả buổi đã có mã mabuoi. codiemdanh/conhanxet lưu thêm cờ về các bảng chi tiết. | Bỏ 11 cột trên. Chỉ giữ **mabuoi, khoaca, sobuoi**; PK chuyển sang mabuoi, giữ FK đến BUOI_HOC.madinhdanh. Không tạo bản sao sang bảng mới. |
| BUOI_HOC | Đã có nội dung thực tế nhưng đôi khi nội dung còn nằm riêng ở chi tiết ca. Giáo viên dạy thay còn có một bản sao ở phân công. | Là nguồn chính ngày/giờ thực tế, lớp, tiêu đề, nội dung đã dùng, check-in/out và giáo viên dạy thay. Không thêm cột. Chỉ điền tiêu đề/ba trường học liệu còn thiếu từ chi tiết ca sau khi đối soát. |
| PHAN_CONG_DAY_THAY | Bảng lưu malop, thutu, sobuoi, ngaygio, magiaovien, mabuoi; cùng một phân công đã nằm ở BUOI_HOC.magiaoviendaythay. | Bỏ bảng lưu vật lý và trigger đồng bộ một chiều. Giữ tên PHAN_CONG_DAY_THAY dưới dạng **VIEW thường** nối buổi và số buổi; không lưu dòng phân công lần hai. |
| DIEM_DANH_BUOI_HOC | Nguồn điểm danh theo buổi–học sinh. | Giữ nguyên; truy vấn trực tiếp, không duy trì cờ bản sao trong chi tiết ca. |
| NHAN_XET_BUOI_HOC | Nguồn nhận xét và danh sách học sinh thực tế của buổi đã vào lớp. | Giữ nguyên; truy vấn trực tiếp, không duy trì cờ bản sao trong chi tiết ca. |
| NGUOI_DUNG, GIAO_VIEN | Danh tính người thao tác / người dạy. | Giữ nguyên; tên người vào lớp lấy theo manguoivaolop, tên giáo viên theo mã giáo viên, không chép tên vào chi tiết ca. |
| HOC_LIEU_LOP, LICH_LOP | Kế hoạch học liệu theo tuần và lịch lặp. | Giữ nguyên; kế hoạch khác buổi thực tế và nội dung thực tế đã dùng. |

### Nguồn chính và các JOIN

- CHI_TIET_CA_LOP.mabuoi → BUOI_HOC.madinhdanh → LOP_HOC.madinhdanh qua malop.
- BUOI_HOC.magiaoviendaythay → GIAO_VIEN.madinhdanh → NGUOI_DUNG qua manguoidung.
- BUOI_HOC.manguoivaolop → NGUOI_DUNG.madinhdanh; giờ hiển thị tính từ vaolopluc theo Asia/Bangkok, không lưu lại chuỗi giờ/tên người.
- Điểm danh và nhận xét lấy theo mabuoi từ hai bảng nghiệp vụ tương ứng. Không chuyển các dữ liệu này vào bảng ca, không tạo mảng JSON lưu trong bảng.
- V_CHI_TIET_CA_LOP chỉ JOIN nguồn để trả lại các trường tương thích RPC cũ. PHAN_CONG_DAY_THAY là view lấy các buổi có giáo viên dạy thay; thứ tự/ngày giờ là kết quả truy vấn.

### Phần riêng của chi tiết ca

sobuoi là số buổi trong nội dung giảng dạy; không đồng nhất với số thứ tự ngày học trong toàn bộ lịch sử. khoaca là khóa của giao diện cũ, không phải bản sao ngày/giờ. Cả hai phụ thuộc toàn phần vào khóa mabuoi. Khi giao diện dùng lại khóa ngắn như "1" vào tuần sau, khóa giao diện cũ chuyển về dạng lesson:<mã buổi>; số buổi của buổi trước được giữ nguyên. Bỏ một khóa khỏi bản đồ giao diện không xóa metadata của buổi lịch sử. Ràng buộc ngăn hai buổi cùng lớp có cùng khóa giao diện.

### Luồng đã chuyển và bảo toàn

Các hàm đọc chi tiết ca/dự giờ, danh sách lớp, dạy thay và RPC nghiệp vụ đọc V_CHI_TIET_CA_LOP hoặc view phân công. Hàm ghi chi tiết chỉ ghi ba trường vào CHI_TIET_CA_LOP, ghi nội dung buổi vào BUOI_HOC, điểm danh/nhận xét vào bảng gốc. Hàm ghi phân công chỉ UPDATE BUOI_HOC khi giáo viên thực sự thay đổi, không xóa rồi chèn lại hàng loạt phân công không đổi.

Xác định buổi từ mã lớp, ngày và giờ thực tế. Dữ liệu phân công chỉ có ngày dùng thêm số buổi/khung lịch để xác định duy nhất; có nhiều ứng viên thì báo lỗi, không tự chọn một buổi. Đường ghi qua view cũ vẫn kiểm tra mã buổi/lớp/ngày/số buổi và dùng trigger kiểm tra của BUOI_HOC.

Giữ các kiểm tra lớp đã dừng, giáo viên/môn phù hợp, quyền sửa ca, kỳ công đã khóa, ca đã phát sinh công và tiến độ nhận xét. Check-out và nhận xét vẫn quyết định ghi công; không phát sinh công chỉ vì chuyển schema. Không đổi trạng thái, ngày/giờ, người check-in/out, giáo viên hoặc các hàng công trong migration.

### Đối soát và chuyển metadata

Chạy [lesson_metadata_legacy.sql](diagnostics/lesson_metadata_legacy.sql) để xem mã buổi và mã lý do cần đối soát. Migration dừng nếu một buổi còn nhiều dòng chi tiết, tiêu đề/học liệu hai nguồn khác nhau khi đều có nội dung, phân công không khớp, hoặc có giờ/tên người vào nhưng thiếu dữ liệu gốc cần thiết. Không chọn một tiêu đề/học liệu khác bằng suy đoán. Trường hợp bản sao ghi chính giáo viên chính làm người dạy thay được coi là không có dạy thay, đúng quy tắc trigger đã dùng trước đó.

Chỉ khi nguồn BUOI_HOC trống mới chuyển tiêu đề/học liệu từ chi tiết ca. Trong đúng giao dịch DDL này, migration ghi nhớ rồi tạm ngắt các user trigger của BUOI_HOC để việc chuyển nội dung cũ không chạy đồng hồ vòng đời hoặc tính lại công kỳ đã khóa. Ngay sau UPDATE metadata, mọi trigger được trả về đúng trạng thái cũ (kể cả trigger vốn bị tắt/replica/always). Bất kỳ lỗi nào hoàn tác cả dữ liệu lẫn DDL. Các luồng ghi bình thường sau migration vẫn chịu đầy đủ trigger khóa công.

### Phạm vi 3NF và xác nhận

CHI_TIET_CA_LOP sau sửa có khóa mabuoi → khoaca, sobuoi, không còn thuộc tính phụ thuộc qua buổi/người/lớp. Phân công dạy thay không còn bảng chứa bản sao; FK giáo viên của BUOI_HOC là nguồn chính duy nhất. Hai view dùng cho hiển thị/khả năng tương thích không phải bảng lưu kết quả denormalized. Đây là phần chi tiết ca–dạy thay đã chuẩn hóa; chưa coi toàn bộ LOP_HOC/BUOI_HOC, sĩ số/thời hạn, dự giờ hoặc toàn CSDL là đã hoàn tất rà soát 3NF.

Kiểm thử trên CSDL có buổi thực tế, metadata, công và các kỳ công: chạy migration hai lần; chặn nội dung mâu thuẫn; chuyển học liệu còn thiếu trong kỳ đã khóa mà không đổi công; giữ nguyên trigger; đọc báo cáo/dự giờ; sửa học liệu qua RPC; đổi/hủy dạy thay và đọc lại ngay qua view; dùng lại khóa giao diện tuần sau; check-in/out, nhận xét tạo đúng một dòng công; chặn sửa kỳ khóa; kiểm tra FK và reset fixture sau nâng cấp.

Bộ reset demo được sửa để nạp kế hoạch học liệu **trước** khi gọi bộ sinh buổi (bộ sinh hiện tại yêu cầu học liệu), tránh kiểm thử trên bảng buổi/công rỗng. Đây chỉ là bộ nạp dữ liệu mẫu có chủ ý xóa dữ liệu, không phải bước chạy migration trên Supabase thật. Các script điều chỉnh thời hạn demo và truy vấn rà FK cũng được cập nhật để không truy vấn cột chi tiết ca đã bỏ.

## Lần 8 — Sĩ số lớp lấy từ mô hình

Migration: [20261123_normalize_class_capacity.sql](migrations/20261123_normalize_class_capacity.sql), chạy sau 20261122. Toàn bộ là một câu DO nguyên tử; chạy lại an toàn. Không tạo bảng lưu dữ liệu mới.

| Bảng | Trước đây | Sau sửa | Các nơi truy vấn nguồn |
|---|---|---|---|
| MO_HINH_LOP | sisotoida là giới hạn theo mô hình | Giữ sisotoida; bổ sung CHECK số nguyên dương và kiểm tra không giảm dưới sĩ số lớp đang có | LOP_HOC JOIN bằng mamohinh; giao diện lớp, ghép học sinh, gợi ý lớp, cổng giáo viên và báo cáo đọc cùng nguồn |
| LOP_HOC | mamohinh và bản chép sisotoida từ mô hình | Bỏ sisotoida; giữ mamohinh cùng FK hiện có đến MO_HINH_LOP.mamohinh | si_so_lop JOIN hai bảng; du_lieu_quan_he trả trường sisotoida dạng kết quả truy vấn |
| XEP_LOP_DANG_KY | Quan hệ học sinh–môn–lớp | Không thêm/bỏ cột; thêm khóa hàng mô hình khi ghi xếp lớp để phối hợp với thay đổi giới hạn | Kiểm tra sĩ số dựa COUNT quan hệ xếp lớp và nguồn MO_HINH_LOP |

### Chính sách và đối soát

Giao diện hiện tạo lớp theo sĩ số của mô hình và không có trường ghi đè sĩ số riêng. Vì vậy nguồn duy nhất là MO_HINH_LOP. Migration chỉ xóa bản chép khi toàn bộ lớp khớp nguồn; nếu có lớp khác mô hình thì dừng với mã lớp, không tự tăng/giảm hoặc bỏ qua. Chạy [class_capacity_legacy.sql](diagnostics/class_capacity_legacy.sql) để đối soát trước/sau; truy vấn tương thích khi cột cũ đã bỏ.

Sửa sĩ số mô hình sẽ áp dụng cho các lớp cùng mô hình, kể cả lớp cũ. Không dùng sĩ số tối đa hiện tại để thay đổi điểm danh, số học sinh thực tế, lịch sử buổi hay số công đã ghi. Hệ thống không cho giảm dưới số học sinh đang được xếp trong bất kỳ lớp nào của mô hình. Xếp lớp/đổi mô hình lớp khóa hàng mô hình bằng FOR SHARE; sửa mô hình giữ khóa UPDATE, kiểm tra sĩ số tại cuối giao dịch. Người dùng có thể điều chỉnh danh sách và giới hạn trong cùng giao dịch khi đủ quyền.

### Luồng đọc/ghi

Mapper không gửi maxStudents trong dữ liệu ghi lớp; vẫn gửi khi sửa danh mục mô hình. RPC từ chối yêu cầu ghi sisotoida vào lớp, nhưng loại trường này khỏi before của màn hình cũ để nó không gây lỗi so sánh dữ liệu nguồn. Các trường khác vẫn được so sánh trước khi ghi và giữ nguyên kiểm tra quyền. Hợp đồng đọc giữ tên sisotoida để giao diện và báo cáo không mất trường hiển thị; trường đó không còn là cột vật lý của LOP_HOC.

Truy vấn tóm tắt ca/dự giờ và kiểm tra xếp lớp đã chuyển sang si_so_lop. Sửa mô hình trả dữ liệu mới qua cùng RPC, cập nhật ngay các lớp trên giao diện; không cần đồng bộ bản sao bằng trigger. Giữ FK mô hình; không suy đoán mô hình bằng tên hoặc giá trị sĩ số. Chỉ bỏ hàm kiểm tra sĩ số hồ sơ một môn đã hết được sử dụng; nếu còn trigger gọi hàm cũ thì migration dừng.

### Phạm vi 3NF và kiểm thử

Đã loại phụ thuộc bắc cầu LOP_HOC.madinhdanh → mamohinh → sisotoida. Phần quan hệ mô hình–sĩ số này dùng một nguồn dữ liệu, đáp ứng yêu cầu chuẩn hóa theo phụ thuộc đã xác định. Chưa kết luận toàn bộ LOP_HOC/BUOI_HOC đạt 3NF: thời hạn lớp, khung giờ và học liệu vẫn là các nhóm rà tiếp; ngày kết thúc tùy chỉnh có ý nghĩa độc lập nên không được xóa như một ngày suy ra từ tháng.

Kiểm thử migration trên dữ liệu có buổi học và công: chạy hai lần, chặn lớp khác mô hình và hoàn tác, giữ nguyên buổi/công/mô hình, giữ nguyên kết quả đọc lớp/giáo viên, sửa mô hình qua RPC cập nhật mọi lớp cùng mô hình, chặn số không hợp lệ và giảm dưới sĩ số thực tế, chặn ghi bản sao vào lớp, tạo/sửa/xóa lớp và đổi mô hình lớp rỗng, kiểm tra FK, chẩn đoán ở giao dịch chỉ đọc và reset fixture sau nâng cấp. Bộ reset demo tương thích trước/sau bỏ cột, chỉ dùng trong môi trường mẫu có chủ ý xóa dữ liệu.

## Lần 9 — Thời hạn lớp liên kết danh mục, ngày kết thúc lấy qua truy vấn

Migration: [20261124_normalize_class_terms.sql](migrations/20261124_normalize_class_terms.sql), chạy sau 20261123. Chạy nguyên câu DO; mọi thay đổi nguyên tử và có thể chạy lại. Không tạo bảng nghiệp vụ mới, không thêm cột JSON/JSONB.

| Bảng / đối tượng | Trước đây | Sau sửa | Nơi truy vấn sang |
|---|---|---|---|
| LOP_HOC | thoihanthang chép số từ mã mục danh mục; ngayketthuc lưu cả ngày tính từ tháng lẫn ngày nhập riêng | Bỏ thoihanthang và ngayketthuc. Giữ ngaybatdau; thêm cặp FK madanhmucthoihan–mathoihan và ngayketthuctuychinh | MUC_DANH_MUC theo đúng cặp madanhmuc–madinhdanh, JOIN DANH_MUC_BO_SUNG để xác nhận CLASS_DURATION |
| MUC_DANH_MUC | ma chứa số tháng, ten chứa nhãn hiển thị | Giữ nguyên cột và dữ liệu; là nguồn số tháng duy nhất | LOP_HOC, biểu mẫu lớp, danh sách/báo cáo, bộ sinh buổi và kiểm tra thời hạn |
| DANH_MUC_BO_SUNG | Định danh danh mục thời hạn | Giữ nguyên cột và dữ liệu | Xác định nhóm CLASS_DURATION, không dựa vào tên hiển thị |
| V_THOI_HAN_LOP | Chưa có | View thường, không lưu kết quả; bổ sung thoihanthang và ngayketthuc tính từ nguồn | Chẩn đoán và script thời hạn demo |

Khóa mục danh mục hiện là khóa ghép (madanhmuc, madinhdanh); mã mục có thể trùng giữa hai nhóm. Vì vậy lớp giữ đủ hai phần của khóa ngoại MATCH FULL, không tạo ràng buộc UNIQUE toàn cục cho mã mục và không chọn mục chỉ theo tên/số tháng. Cặp mã này là một liên kết có phạm vi, không phải bản sao tên/số tháng của danh mục.

### Một nguồn cho mỗi cách đặt thời hạn

Lớp theo tháng giữ cặp FK và ngaybatdau; ngayketthuctuychinh phải NULL. thang_thoi_han JOIN danh mục lấy số tháng 1–120 từ ma; ngay_ket_thuc_lop tính ngày cuối bao gồm trong kỳ theo quy tắc tháng lịch hiện có. Ví dụ 31/01/2028 + một tháng cho ngày cuối 28/02/2028. Không lưu ngày tính được trở lại bảng.

Lớp có ngày kết thúc tùy chỉnh giữ ngayketthuctuychinh và ngaybatdau; hai phần FK phải NULL. Đây là ngày người dùng chọn độc lập, không phải bản sao của danh mục. CHECK không cho đồng thời hai nguồn; FK MATCH FULL không cho mã nhóm/mục bị khuyết một phần. Lớp cũ chưa từng có thời hạn được giữ nguyên ba giá trị NULL; lớp đã có thời hạn không được xóa trắng khi sửa. Chuyển giữa tháng và tùy chỉnh phải đổi đủ các trường trong cùng giao dịch.

### Luồng đọc/ghi và đồng bộ

Biểu mẫu chọn ID mục từ danh mục Supabase, gửi cặp FK hoặc ngày tùy chỉnh. Mapper bỏ durationMonths/endDate khỏi dữ liệu ghi; SQL cũng từ chối trình duyệt cố ghi thoihanthang/ngayketthuc. Các tên này vẫn có trong kết quả đọc để giữ báo cáo/cổng giáo viên và các bộ lọc ngày hoạt động qua truy vấn. Số tính trên biểu mẫu là bản xem trước, kết quả lưu được lấy lại từ RPC.

Hợp đồng lớp được bảo đảm có ngaybatdau: một số chuỗi nâng cấp cũ đã có cột vật lý nhưng bỏ sót cột này trong business_config, làm biểu mẫu không ghi/đọc được đúng ngày gốc. Không thêm bản sao ngày bắt đầu.

Đã chuyển bộ sinh buổi, kiểm tra buổi ngoài hạn, chặn học liệu lớp hết hạn và tự kết thúc lớp sang cùng hàm ngày kết thúc. Đổi tên mục giữ liên kết; đổi số tháng của mục làm các lớp liên kết truy vấn ra ngày mới ngay trong kết quả RPC. Không đổi ngày giờ buổi, trạng thái hay công chỉ vì chạy migration.

Mục ngừng hoạt động vẫn được đọc cho lớp cũ, nhưng không chọn mới. FK chặn xóa mục/nhóm còn được lớp tham chiếu. Ràng buộc FK và kiểm tra danh mục được trì hoãn đến cuối giao dịch để tương thích luồng lưu danh mục xóa–chèn lại các ID giữ nguyên. Đổi số tháng/nhóm danh mục không được làm mất nguồn hợp lệ hoặc đẩy buổi đang có ra ngoài thời hạn mới; toàn bộ giao dịch bị hủy, không xóa buổi để hợp thức hóa. Khi tạo/đổi ngày buổi, trigger khóa SHARE hàng lớp và hàng danh mục để phối hợp với UPDATE thời hạn, kể cả ghi SQL trực tiếp.

### Đối soát và bảo toàn

[class_terms_legacy.sql](diagnostics/class_terms_legacy.sql) chạy chỉ đọc trước/sau migration, trả mã lớp và lý do. Migration dừng nếu số tháng cũ không khớp duy nhất một mục, ngày tính cũ khác công thức, ngày tùy chỉnh không hợp lệ hoặc lịch buổi ngoài hạn. Không tự chọn một mục, sửa ngày hoặc tạo danh mục để vượt qua đối soát. Mục đang ngừng hoạt động vẫn được chuyển nếu đó là nguồn cũ xác định duy nhất.

Chuyển FK/ngày tùy chỉnh bằng backfill giới hạn trong giao dịch DDL: lưu đúng trạng thái các user trigger của LOP_HOC, tạm ngắt để không chạy vòng đời/công khi chuyển dữ liệu, trả lại trạng thái từng trigger rồi bỏ trigger tính/ngày lưu cũ. Không cập nhật thời gian hệ thống hoặc các bảng buổi/công. Lỗi bất kỳ hoàn tác cả dữ liệu và schema.

backfill_demo_class_end_dates.sql dùng view đọc mới sau nâng cấp và chỉ ghi FK, không tái tạo cột bị bỏ; vẫn tương thích trước nâng cấp. apply_demo_class_terms.sql là gói nâng cấp cũ nên từ chối chạy sau 20261124 để không đưa cột/hàm cũ trở lại. Các script demo không phải bước áp dụng lên dữ liệu thật.

### Phạm vi 3NF và kiểm thử

Đã loại thuộc tính chép từ danh mục và ngày kết thúc dẫn xuất khỏi LOP_HOC. Phần thời hạn dùng đúng một nguồn theo từng loại, có FK thật và CHECK loại trừ; view/hàm chỉ truy vấn. Không khẳng định toàn bộ bảng lớp/buổi hoặc toàn hệ thống đã đạt 3NF: khung giờ, lịch và học liệu còn là các bước rà sau.

Kiểm thử trên CSDL cục bộ có buổi/công thực: hai lần migration, mâu thuẫn ngày cũ và mục trùng đều hoàn tác, số bảng không tăng, cột cũ bị bỏ, nguồn danh mục/buổi/công giữ nguyên, trạng thái trigger được bảo toàn. Qua RPC thực: tạo lớp chỉ bằng FK, chuyển tháng/tùy chỉnh, ngày cuối tháng nhuận, sửa tên/mã mục, từ chối xóa/đổi nhóm sai/mã sai/mục ngừng dùng, chặn ghi trường tính được và giảm thời hạn qua lịch đã có. Bộ sinh được thử với học liệu thật ở hai tuần hai phía ngày kết thúc; có buổi được sinh và không buổi nào vượt hạn. Kiểm tra tự kết thúc lớp, chặn học liệu hết hạn, FK, chẩn đoán và reset/backfill demo sau nâng cấp; bộ nâng cấp cũ bị chặn trước khi tái tạo schema dư.

## Lần 10 — Khung giờ chuẩn và các lịch liên kết

Migration: [20261125_normalize_time_slots.sql](migrations/20261125_normalize_time_slots.sql), chạy nguyên câu DO sau 20261124; chạy lại an toàn. Không tạo bảng nghiệp vụ hoặc cột JSON/JSONB mới.

| Bảng / đối tượng | Trước đây | Sau sửa | Các nơi truy vấn sang |
|---|---|---|---|
| KHUNG_GIO | Chuỗi khoanggio và số sophut tính từ chuỗi nhưng lưu độc lập | Bỏ khoanggio, sophut. Thêm giobatdau, gioketthuc kiểu time, là nguồn giờ chuẩn duy nhất. Giữ madinhdanh, makhunggio, tenkhunggio, danghoatdong và hai mốc thời gian hệ thống | V_KHUNG_GIO truy vấn chuỗi hiển thị và số phút; các bảng lịch JOIN qua makhunggio → madinhdanh |
| LICH_LOP | malop, thutu, thutrongtuan, makhunggio và FK đã có | Giữ nguyên bốn cột, PK/FK/UNIQUE; không thêm giờ, tên ca hoặc số phút | JOIN LOP_HOC và KHUNG_GIO/V_KHUNG_GIO |
| LICH_RANH_DINH_KY | Mã giáo viên, khung giờ, thứ và trạng thái khai báo | Giữ nguyên cột và FK; cập nhật truy vấn đọc giờ chuẩn | JOIN KHUNG_GIO theo makhunggio |
| LICH_DANG_KY_MON_HOC, LICH_SU_CA_DANG_KY_HOC | Lịch mong muốn theo đăng ký/đợt, liên kết mã khung giờ | Giữ nguyên cột và FK; không chép giờ/nhãn | JOIN KHUNG_GIO theo makhunggio |
| BUOI_HOC | Mã khung giờ gốc và batdau–ketthuc thực tế của từng buổi | Giữ nguyên dữ liệu/cột/FK; không đồng bộ đè giờ thực tế khi sửa giờ chuẩn | Bộ sinh buổi lấy giờ chuẩn khi tạo; lịch sử, công và giải trình đọc giờ thực tế của BUOI_HOC |
| V_KHUNG_GIO | Chưa có | View thường, không lưu kết quả; khoanggio và sophut là giá trị truy vấn | Danh mục, lịch lớp, lịch rảnh, ghép lớp, cổng giáo viên và các truy vấn nghiệp vụ |

### Một nguồn lưu, các trường còn lại là kết quả đọc

Giờ chuẩn chỉ nằm ở KHUNG_GIO.giobatdau–gioketthuc, có NOT NULL và CHECK giờ khác nhau, chính xác đến phút, trong 00:00–23:59. Số phút và chuỗi HH:MM - HH:MM được tính qua so_phut_khoang_gio/khoang_gio_hien_thi. Giữ cách tính ca qua nửa đêm của biểu mẫu cũ: 23:30–00:15 là 45 phút, không phải số âm; hai đầu giống nhau không được coi là ca 24 giờ.

Không đổi tên/ID ca theo suy đoán; tenkhunggio là nhãn người dùng đặt độc lập. Các khoảng giờ chuẩn phải duy nhất để luồng nhập lịch bằng nhãn có thể tìm đúng một FK thay vì lấy tùy ý một mã. Migration dừng khi có nhiều ID cùng giờ; không tự gộp ID hoặc chuyển liên kết. UNIQUE(giobatdau,gioketthuc) ngăn lặp lại sau sửa.

Biểu mẫu nhập hai giờ, không còn ba state độc lập cho chuỗi/số phút/giờ. Chuỗi và thời lượng chỉ xem trước trong biểu mẫu; giá trị sau lưu lấy lại từ RPC. Mapper bỏ timeRange/durationMinutes khỏi dữ liệu ghi và chuẩn hóa HH:MM thành HH:MM:SS cho hai giờ gốc. SQL chặn trình duyệt cố ghi khoanggio/sophut; before cũ được bỏ hai trường dẫn xuất, các trường gốc khác vẫn so sánh để tránh ghi đè thay đổi từ phiên khác.

### Truy vấn liên quan và lịch sử buổi

Đã chuyển các hàm đọc lịch, kiểm tra ghép lớp/lịch rảnh, thống kê ca, sinh buổi theo học liệu, hồ sơ giáo viên, truy vấn công/giải trình và báo sự cố sang view/giờ gốc. Các phép so giờ chuẩn ở những truy vấn đã có chuyển sang cột time, không cần tách chuỗi để lấy giờ. Hợp đồng đọc giữ khoanggio/sophut để các màn hình/báo cáo hiện có đọc kết quả truy vấn; hai cột không còn trong bảng vật lý.

Mã khung giờ của BUOI_HOC chỉ xác định khung gốc; thời điểm cụ thể của buổi có thể được điều chỉnh hoặc đã xảy ra trước lần sửa danh mục. Vì vậy batdau/ketthuc của buổi là sự thật có phạm vi ngày, không phải bản sao bắt buộc luôn bằng khung chuẩn hiện tại. Migration không UPDATE các buổi, lịch, lịch rảnh hoặc công đã ghi. Buổi đã tồn tại giữ giờ; buổi được tạo mới lấy giờ chuẩn đang có.

Sửa thêm lỗi nguồn của các truy vấn lịch sử: ca_cong_truy_van, giai_trinh_truy_van, danh sách ca hoàn thành trong hồ sơ giáo viên và hàm tìm buổi để ghi công trước đây dùng giờ danh mục. Nay các thông tin giờ buổi đó lấy BUOI_HOC, nên sửa danh mục không làm đổi giờ hiển thị của lịch sử công. Thời lượng công được truy vấn từ giờ thực tế, không tạo thêm cột lưu phút trong bảng công.

RPC báo sự cố theo ngày/giờ tìm buổi thực tế trước rồi dùng mã khung gốc, kể cả khi danh mục đã đổi giờ. Nếu người dùng gửi giờ chuẩn mới nhưng ngày đó đã có buổi cùng mã với giờ thực tế khác thì báo lỗi, không gắn sự cố sang nhầm buổi. Giữ kiểm tra quyền, giáo viên được phân công, danh mục sự cố và khóa công hiện có.

### Đối soát và kiểm thử

[time_slot_legacy.sql](diagnostics/time_slot_legacy.sql) là truy vấn chỉ đọc dùng trước/sau nâng cấp. Dừng khi chuỗi giờ không hợp lệ, số phút không khớp, hai đầu bằng nhau hoặc có nhiều ID cùng khoảng. Không sửa số phút hoặc chọn một ID để vượt qua đối soát. Backfill hai giờ từ chuỗi hợp lệ trong giao dịch DDL, lưu/trả trạng thái trigger để không thay đổi thời gian hệ thống hay kích hoạt tác dụng phụ khi chuyển cấu trúc.

Các chẩn đoán FK/dữ liệu được cập nhật cho cột mới; chẩn đoán công thiếu dùng giờ buổi thực tế. Reset demo dùng view đọc tạm có phạm vi bên trong câu DO, tự bỏ trước khi kết thúc, tương thích trước/sau nâng cấp và chạy lại; đây không phải bước chạy trên dữ liệu thật.

Kiểm thử SQL với dữ liệu có buổi/công/lịch/lịch rảnh: migration hai lần; sai phút, sai chuỗi và ID trùng giờ đều hoàn tác; không tăng số bảng; hai cột cũ bị bỏ; dữ liệu gốc của lịch/buổi/công giữ nguyên. RPC thực tạo/sửa/xóa ca, ca qua nửa đêm, chặn giờ rỗng/bằng nhau/giây lẻ/24:00/trùng khoảng, chặn ghi trường dẫn xuất, chặn xóa ca đang được FK tham chiếu. Sửa giờ chuẩn cập nhật nhãn lịch và API giáo viên; báo cáo công và ca hoàn thành giữ giờ thực tế. Thử báo sự cố sau đổi danh mục, bộ sinh lấy giờ mới cho buổi tạo mới trong fixture có rollback, FK, chẩn đoán chỉ đọc và reset lặp lại. Kiểm thử mapper/biểu mẫu xác nhận chỉ gửi hai giờ gốc và so sánh phiên bản đúng dạng SQL time.

### Phạm vi 3NF

KHUNG_GIO không còn thuộc tính dẫn xuất được lưu độc lập; các thuộc tính giữ lại phụ thuộc vào mã định danh/khóa ứng viên. LICH_LOP giữ lịch theo khóa lớp–thứ tự và các FK, không lưu tên hoặc giờ chép từ khung. Nhóm khung giờ chuẩn–lịch định kỳ đã loại các bản sao trong phạm vi được rà. Giờ thực tế của buổi có ý nghĩa khác nên được giữ. Chưa kết luận toàn bộ BUOI_HOC, học liệu, biên bản dự giờ, đối soát hay toàn CSDL đã hoàn tất 3NF.

## Lần 11 — Kế hoạch học liệu và nguồn học liệu buổi

Migration: [20261126_normalize_class_materials.sql](migrations/20261126_normalize_class_materials.sql), chạy nguyên câu DO sau 20261125. Nguyên tử, chạy lại an toàn. Không thêm bảng nghiệp vụ hoặc cột JSON/JSONB.

| Bảng / đối tượng | Trước đây | Sau sửa | Nguồn / bảng truy vấn sang |
|---|---|---|---|
| HOC_LIEU_LOP | PK malop–thutu; lưu thang/tuan bằng chuỗi và tiêu đề, slide, LMS kế hoạch | Bỏ thang/tuan. Thêm tungay/denngay kiểu date. Đổi thutu thành mahoclieu, giữ nguyên mã cũ nhưng từ nay là định danh ổn định theo lớp. Giữ malop, sobuoi, tieude, lienketslide, lienketlms | V_HOC_LIEU_LOP truy vấn nhãn tháng/tuần; lớp, lịch giáo viên, bộ sinh buổi và BUOI_HOC đọc cùng nguồn |
| BUOI_HOC | hoclieuslide và hoclieugiaovien cùng phục vụ liên kết giảng dạy; hoclieulms và baitaplms cùng phục vụ bài tập, có thể mâu thuẫn; chưa có FK kế hoạch | Bỏ hoclieuslide/hoclieulms sau đối soát. Thêm mahoclieu, FK ghép malop–mahoclieu đến HOC_LIEU_LOP. Giữ hoclieutieude, hoclieugiaovien, hoclieuhocsinh, baitaplms là nội dung thực tế khác kế hoạch | JOIN HOC_LIEU_LOP bằng đúng hai phần khóa; trường thực tế trống dùng nguồn kế hoạch qua hoc_lieu_buoi_truy_van |
| CHI_TIET_CA_LOP | Metadata ba cột đã chuẩn hóa ở 20261122 | Giữ nguyên bảng/cột | View chi tiết ca đọc học liệu hiệu lực từ BUOI_HOC JOIN kế hoạch, không chép thêm vào metadata |
| V_HOC_LIEU_LOP | Chưa có | View thường, không lưu kết quả: cung cấp nhãn thang/tuan và alias thutu để tương thích các truy vấn đọc | Danh sách học liệu lớp, lịch dạy, chẩn đoán và reset fixture |

### Khóa và phạm vi của dữ liệu

Khóa kế hoạch là (malop, mahoclieu), không suy đoán lớp bằng tiêu đề hoặc URL. BUOI_HOC đã có malop nên chỉ thêm một cột mahoclieu; cặp FK bảo đảm không tham chiếu kế hoạch của lớp khác. mahoclieu không còn là vị trí trong mảng; đảo thứ tự danh sách không đổi mã và không xóa–chèn lại những dòng không đổi. Sequence kỹ thuật cấp mã mới để không tái sử dụng mã vừa xóa; sequence không phải bảng lưu thông tin nghiệp vụ lặp.

Khoảng ngày dài tối đa 7 ngày, hai đầu là các giá trị ngày gốc; không bắt buộc mọi khoảng phải đủ 7 ngày nên denngay được giữ độc lập. Nhãn tháng lấy từ tungay; nhãn tuần định dạng từ hai ngày. UNIQUE lớp–từ ngày–số buổi và kiểm tra khoảng chồng ngăn nhiều nguồn cùng áp dụng cho một buổi. Các nhãn cũ chỉ dùng để đối soát/nhận yêu cầu tương thích, không còn là cột lưu.

Backfill liên kết bằng lớp, ngày và số buổi: ưu tiên metadata của buổi đã có; nếu thiếu metadata thì dùng lịch chuẩn để xác định số buổi. Không ghép bằng họ tên, tiêu đề hay URL. Buổi không xác định được kế hoạch gốc vẫn giữ học liệu thực tế và FK trống; không tự tạo kế hoạch giả để lấp liên kết.

### Một nguồn kế hoạch và phần dùng khác thực tế

Giảng dạy theo kế hoạch: các cột thực tế tương ứng để NULL; truy vấn trả tiêu đề/slide/LMS từ HOC_LIEU_LOP. Khi lưu giá trị giống kế hoạch, SQL cũng đưa về NULL thay vì giữ bản sao. Giáo viên dùng tài liệu khác: chỉ lưu giá trị khác trong BUOI_HOC, không sửa kế hoạch của lớp. hoclieuhocsinh là tài liệu riêng cho học sinh, khác liên kết giảng dạy; hoclieutieude là tiêu đề học liệu thực tế, khác tieude là tên buổi học. Không gộp các thuộc tính chỉ vì tình cờ có cùng giá trị.

Hai cặp slide/materialGv và lms/exerciseLms nay chỉ có một cột vật lý cho mỗi ý nghĩa. Tên slide/lms trong JSON trả về là alias đọc để giữ giao diện tương thích, không phải thêm nơi lưu. Hàm ghi nhận khóa canonical; alias cũ được dùng khi yêu cầu không chứa khóa canonical. Dữ liệu cũ có hai giá trị không rỗng khác nhau phải đối soát, không áp dụng quy tắc ưu tiên để âm thầm bỏ giá trị.

### Sửa nguồn và bảo toàn lịch sử

Kế hoạch cho buổi chưa học có thể sửa nội dung, các buổi liên kết dùng mặc định sẽ đọc giá trị mới ngay. Học liệu thực tế dùng khác kế hoạch vẫn giữ nguyên. Nguồn đã được buổi tham chiếu không được xóa hoặc đổi định danh/khoảng ngày/số buổi. Nguồn đã dùng (check-in/out hoặc có công) hay thuộc kỳ công khóa không được ghi đè nội dung; quy tắc này bảo toàn lịch sử khi mặc định được truy vấn thay vì lưu bản sao. Không tạo bảng version/snapshot để giữ thêm bản chép.

Hàm ghi danh sách chỉ INSERT mới/UPDATE khác/DELETE dòng bị bỏ. Dòng cũ không đổi không kích hoạt sửa lịch sử, vì thế vẫn sửa được kế hoạch tương lai trong cùng danh sách có các tuần đã học. Khi gắn kế hoạch mới, bộ sinh tạo buổi có FK; buổi tương lai chưa có nguồn có thể được liên kết nếu lớp/ngày/số buổi khớp, chưa sử dụng và kỳ công chưa khóa. Không tự gắn lại buổi lịch sử hoặc đổi nguồn của buổi đã sử dụng.

Các luồng lớp, lịch giáo viên, chi tiết buổi, tiến độ thiếu học liệu và báo cáo dùng học liệu hiệu lực từ cùng truy vấn. Luồng giáo viên check-in dùng nội dung hiệu lực (gồm phần thực tế đã chỉnh), không lấy kế hoạch ghi đè tài liệu khác của buổi. Nhập giá trị mặc định trong thao tác check-in/out cũng không tạo bản sao vì hàm ghi chuẩn hóa trước khi quyết định UPDATE.

### Đối soát và kiểm thử

[class_material_legacy.sql](diagnostics/class_material_legacy.sql) chạy chỉ đọc trước/sau migration: báo mã kế hoạch/buổi, ngày không hợp lệ, tháng lệch, khoảng chồng, hai cặp liên kết thực tế mâu thuẫn hoặc FK lệch lớp/ngày. Migration dừng và hoàn tác nếu có mâu thuẫn; không tự sửa dữ liệu để vượt qua đối soát.

Backfill chỉ chuyển ngày, gắn FK và chuyển liên kết cũ sang cột thực tế canonical khi đã khớp. Trong đúng giao dịch DDL, ghi nhớ/tạm ngắt rồi khôi phục trạng thái từng user trigger của hai bảng để không tính lại công hoặc đổi thời gian hệ thống của dữ liệu lịch sử. Các giá trị buổi không thuộc nhóm học liệu và các dòng công giữ nguyên. Reset demo được cập nhật cho ngày/khóa mới và hai liên kết canonical, tương thích trước/sau và chạy lại; không phải bước chạy trên dữ liệu thật.

Kiểm thử với buổi/công/kế hoạch có dữ liệu: migration lặp lại, ba loại mâu thuẫn đều rollback, số bảng không tăng, cột cũ bị bỏ, dữ liệu buổi ngoài học liệu và công giữ nguyên, nội dung hiệu lực giữ nguyên. RPC thực: mã ổn định khi đổi thứ tự mảng, lưu mặc định không chép, sửa kế hoạch tương lai cập nhật buổi, giữ override, liên kết lại buổi tương lai thiếu nguồn, chặn xóa nguồn/đổi khóa/ngày/ghi đè nguồn đã dùng, tạo kế hoạch mới sinh buổi có FK. Kiểm tra chẩn đoán trước/sau, FK, không có cột JSON/JSONB và reset lặp lại. Kiểm thử giao diện xác nhận ngày typed từ Supabase và học liệu hiệu lực được ưu tiên đúng khi xem/vào buổi học.

### Phạm vi 3NF

Trong nhóm này, thuộc tính kế hoạch phụ thuộc đầy đủ vào khóa lớp–mã học liệu; không lưu nhãn thời gian suy ra. Buổi chỉ giữ FK kế hoạch và các sự thật dùng khác thực tế, không chép mặc định. Đã loại các cột cùng ý nghĩa cho liên kết giảng dạy/bài tập. Đây là phạm vi kế hoạch–học liệu buổi đã chuẩn hóa; chưa kết luận toàn bộ BUOI_HOC, biên bản dự giờ, đối soát hoặc toàn CSDL đã hoàn tất 3NF.
## Đợt tiếp theo: biên bản dự giờ 20261127


Đối chiếu **đầy đủ 29 cột trước → 16 cột sau**, PK/FK, nguồn JOIN, hai bảng được sửa (BIEN_BAN_DU_GIO đổi cột; BUOI_HOC chỉ thêm bảo vệ giáo viên) và phạm vi 3NF được ghi tại [INSPECTION_3NF_CHANGES.md](INSPECTION_3NF_CHANGES.md). Migration mới: [20261127_normalize_inspection_reports.sql](migrations/20261127_normalize_inspection_reports.sql), áp dụng sau 20261126. Chỉ kiểm thử cục bộ trong phiên này, chưa chạy trên Supabase thật.
