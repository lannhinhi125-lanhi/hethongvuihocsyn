# 20261208 — Môn trong lịch sử xếp lớp

Phạm vi: bỏ bản sao môn của lớp ở `TRUY_VET_XEP_LOP`, cập nhật bộ ghi và truy vấn lịch sử. Không tạo bảng lưu mới, không lưu JSON/JSONB và không xóa sự kiện. Đây là kết quả xử lý phụ thuộc môn ở bảng truy vết, không phải xác nhận toàn bộ CSDL đã đạt 3NF.

## Bảng sửa và đủ cột trước/sau

`TRUY_VET_XEP_LOP` trước có **8 cột**:

`madinhdanh, mahocsinh, malopcu, malopmoi, thoigian, manguoithuchien, nguon, mamonhoc`.

Sau có **7 cột**, giữ nguyên giá trị từng cột:

`madinhdanh, mahocsinh, malopcu, malopmoi, thoigian, manguoithuchien, nguon`.

- Bỏ: `mamonhoc` và FK đi kèm cột này. Trước đây được sao chép từ lớp/đăng ký; có thể lệch nguồn.
- Thêm cột: không có.
- PK giữ nguyên: `madinhdanh` (identity).
- FK giữ nguyên: `mahocsinh → HOC_SINH.madinhdanh`; `malopcu/malopmoi → LOP_HOC.madinhdanh`; `manguoithuchien → NGUOI_DUNG.madinhdanh`. Hai mã lớp là hai vai trò riêng của một sự kiện, cần giữ cả hai.
- Thời gian, người thực hiện, nguồn sự kiện là dữ kiện của sự kiện, không truy vấn thay bằng ngày cập nhật/người hiện tại của lớp.

`LOP_HOC` giữ nguyên **22 cột** trước và sau:

`macaphoc, trangthai, madinhdanh, malophoc, tenlophoc, mamonhoc, matrinhdo, mamohinh, ngaybatdau, lienketphonghoc, magiaovien, ngaytao, ngaycapnhat, makhoi, tamdunglich, lydotamdung, ghichutamdung, batdautamdung, manhomtamdung, madanhmucthoihan, mathoihan, ngayketthuctuychinh`.

Chỉ thêm trigger bảo vệ môn của lớp đã có truy vết. Không sửa dữ liệu lớp trong migration. Danh sách này là cấu trúc thực tế sau 20261207, không khẳng định mọi thuộc tính của lớp đã được rà xong trong đợt này.

## Nguồn và các bảng truy vấn sang

Nguồn môn: `LOP_HOC.mamonhoc → MON_HOC.mamonhoc`. View thường `V_TRUY_VET_XEP_LOP` JOIN hai mã lớp, trả `coalesce(lop_moi.mamonhoc, lop_cu.mamonhoc)` với tên `mamonhoc`. View không lưu bản sao dữ liệu.

`lich_su_lop_hoc(text)` đọc view này, bao gồm truy vấn sự kiện trước đó theo cùng học sinh/môn. RPC `vuihoc_business_data` tiếp tục trả lịch sử cho màn hình/báo cáo qua hàm này. Các giá trị lịch sử trước/sau được đối chiếu trong kiểm thử; frontend không cần lưu thêm trường môn.

Các bảng liên quan giữ nguyên toàn bộ cột:

| Bảng | Cột trước = sau | Vai trò |
| --- | --- | --- |
| `DANG_KY_MON_HOC` | `mahocsinh, mamonhoc, matrinhdo, mamohinh, trangthai, ngaydangky, dotdangky, loaidangky, khoidangky, thoihocluc, macaphocdangky` | Nguồn đăng ký từng môn; PK `(mahocsinh,mamonhoc)` |
| `XEP_LOP_DANG_KY` | `mahocsinh, mamonhoc, malop` | Xếp đăng ký vào lớp; PK `(mahocsinh,mamonhoc)`, UNIQUE `(mahocsinh,malop)`, FK về đăng ký và FK `(malop,mamonhoc)` về lớp để bảo đảm đúng môn |
| `LICH_SU_DANG_KY_HOC` | `mahocsinh, mamonhoc, dotdangky, ngaydangky, ketthucluc, loaidangky, khoi, matrinhdo, mamohinh, macaphoc` | Dữ kiện từng đợt đăng ký; khóa gồm học sinh, môn, đợt; không thay bằng thông tin đăng ký hiện tại |

Mã môn ở các khóa đăng ký là định danh của đăng ký/đợt đăng ký, không bỏ chỉ vì cùng tên với cột môn của lớp. Giá trị trình độ/mô hình yêu cầu và giá trị của lớp được xếp có vai trò riêng. Đợt này không thay đổi các quan hệ đó.

## Quy tắc ghi và bảo vệ lịch sử

Trigger `ghi_truy_vet_dang_ky_mon` trên `XEP_LOP_DANG_KY` chỉ ghi học sinh, lớp cũ/mới, người thực hiện; thời gian/nguồn theo mặc định. Vào lớp, ra lớp và chuyển lớp cùng môn đều truy vấn được môn từ FK lớp.

- Tạm dừng lịch không gỡ xếp lớp, không tạo sự kiện ra/vào giả.
- Dừng lớp và gỡ học sinh tạo sự kiện ra lớp; mở và xếp lại tạo sự kiện vào lớp.
- Hai lớp trong một sự kiện chuyển phải cùng môn. Đổi đăng ký môn khác cần hai sự kiện ra/vào riêng.
- Lớp đã được truy vết không đổi mã môn trực tiếp; dùng lớp khác đúng môn. Điều này bảo vệ ý nghĩa lịch sử khi dùng JOIN thay bản sao. Đổi tên lớp vẫn được; tên được đọc từ nguồn hiện tại.
- FK tiếp tục chặn xóa lớp/học sinh còn được tham chiếu. FK người thực hiện vẫn có quy tắc `ON DELETE SET NULL` như trước.

Migration khóa bảng trong giao dịch, kiểm tra mọi sự kiện rồi mới sửa. Thiếu lớp nguồn, môn cũ khác môn nguồn (kể cả NULL), hoặc hai lớp khác môn đều làm toàn bộ migration thất bại và giữ nguyên cột/dữ liệu. Không tự đoán môn, chuyển lớp hay xóa lịch sử để vượt kiểm tra. Không dùng `DROP ... CASCADE`.

## Chạy SQL

Sau khi đã chạy thành công 20261207:

1. Chạy [diagnostics/trace_subject_legacy.sql](diagnostics/trace_subject_legacy.sql). Kết quả rỗng là không phát hiện lệch nguồn; có dòng thì đối soát trước.
2. Chạy [migrations/20261208_normalize_class_trace_subject.sql](migrations/20261208_normalize_class_trace_subject.sql).
3. Chạy lại diagnostic; kết quả cần rỗng. Bảng vật lý còn 7 cột; view vẫn có môn truy vấn.

Không chạy reset demo trên dữ liệu thật. Migration chạy lặp được. Chưa thực thi lên Supabase thật trong phiên làm việc này.

## Kiểm thử

Đã chạy đạt `tests/classTraceNormalizationCases.mjs`, nối sau 20261207 trong `tests/reenrollmentClassDuration.test.mjs`: lỗi nguồn rollback, chạy lặp, giữ nguyên từng sự kiện và dữ kiện lớp/đăng ký/buổi/công, cùng dữ liệu RPC trước/sau; không thêm bảng/cột JSON, giữ các khóa/ràng buộc còn lại; bảo vệ môn nguồn, cho đổi tên lớp; luồng RPC tạm dừng/dừng/mở và xếp lại, tái đăng ký hai đợt; vào/ra/chuyển cùng môn; diagnostic chỉ đọc, quyền và reset demo lặp. Chuỗi kiểm thử nền đến 20261207 chạy đạt, sau đó kiểm thử đợt 20261208 trên bản chụp đúng trạng thái cuối chuỗi đó. Dùng PostgreSQL nhúng PGlite, không phải kiểm thử trên Supabase thật hay kiểm thử tranh chấp đồng thời nhiều kết nối.
