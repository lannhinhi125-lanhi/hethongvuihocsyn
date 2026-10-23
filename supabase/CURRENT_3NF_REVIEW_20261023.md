# Rà soát tiếp nối theo mã hiện tại — 23/10/2026

Đã chuẩn bị xử lý nhóm lịch ở mục 4 bằng **20261209**, theo quy tắc mới người dùng chốt: [AVAILABILITY_VERSION_3NF_CHANGES.md](AVAILABILITY_VERSION_3NF_CHANGES.md). Lịch theo phiên bản hiệu lực đến lần cập nhật sau, ba bảng thành hai, không đăng ký lại từng tuần; lịch tuần cũ có dữ liệu sẽ chặn chuyển đổi để đối soát. Các nhận định mục 4 phía dưới ghi trạng thái trước bản sửa. Chưa chạy lên Supabase thật.

Đã chuẩn bị xử lý bản sao môn ở mục 3 bằng **20261208**: [CLASS_TRACE_3NF_CHANGES.md](CLASS_TRACE_3NF_CHANGES.md). `TRUY_VET_XEP_LOP` 8→7 cột; môn truy vấn từ lớp, bộ ghi và lịch sử dùng cùng nguồn. Các nhận định ở mục 3 bên dưới ghi trạng thái trước bản sửa. Chưa chạy lên Supabase thật.

Đã chuẩn bị sửa lỗi ghi cấp/khối ở mục 2 bằng **20261207**: [GRADE_CATALOG_WRITE_CHANGES.md](GRADE_CATALOG_WRITE_CHANGES.md). Giữ nguyên cấu trúc 20261205; không xóa/chèn lại các lựa chọn được giữ. Chưa chạy Supabase thật. Các nhận định lỗi bên dưới là phát hiện trước bản sửa này.

Đã chuẩn bị sửa riêng mục giờ buổi bằng đợt **20261206**: [LESSON_CLOCK_3NF_CHANGES.md](LESSON_CLOCK_3NF_CHANGES.md). Kiểm thử cục bộ đạt cho đợt này; chưa chạy Supabase thật. Các mục phát hiện bên dưới ghi trạng thái trước bản sửa giờ. Lỗi ghi danh mục cấp/khối còn tồn tại tại thời điểm đợt 20261206; bản sửa tiếp nối là 20261207 nêu ở trên.

Phạm vi: repository hiện có các migration đến `20261205_normalize_teacher_grade_links.sql`, cùng thay đổi tài liệu/AI và RPC V2 chưa commit. Tên migration là thứ tự phiên bản, không phải xác nhận ngày chạy thật. Không kết nối hoặc sửa dữ liệu Supabase thật trong lượt rà này.

## Các đợt mới đã có trong mã

| Phiên bản | Bảng/nhóm | Thay đổi hiện có |
| --- | --- | --- |
| 20261202 | `MAU_BAO_CAO`, `CHI_SO_MAU_BAO_CAO`, `BO_LOC_MAU_BAO_CAO` | Bộ lọc mỗi lựa chọn một dòng; lưu các tùy chọn so sánh/biểu đồ vào cột vô hướng; FK bảng con về mẫu |
| 20261203 | `TAI_LIEU_QUY_TRINH`, `LOAI_TAI_LIEU` | Người tạo tài liệu lưu bằng FK tài khoản, tên người tải/loại tài liệu được truy vấn |
| 20261204 | `PHIEN_CHAT_AI`, `CAU_HOI_CHAT_AI`, `CAU_HINH_TRO_LY`, `CAU_HINH_HE_THONG`, `VAN_PHONG_NHAN_XET` | Phiên chỉ giữ tài khoản sở hữu, bỏ mã giáo viên sao chép; cấu hình dùng chung được kiểm soát; RPC chat theo tài khoản |
| 20261205 | `LUA_CHON_CAP_HOC`, `GIAO_VIEN_KHOI`, `GIAO_VIEN_MO_HINH`, `LICH_RANH_DINH_KY`, `LICH_RANH_TUAN`, `CHI_TIET_LICH_RANH` | Liên kết khối dùng một FK lựa chọn; bỏ cấp/khối sao chép ở quan hệ giáo viên–khối; lịch rảnh được rà riêng |

Đây là tiến độ các bản sửa trong mã, không phải chứng nhận mọi bảng trong nhóm đã được kiểm chứng 3NF tuyệt đối hay đã triển khai lên database thật. Các bản sửa 20261116–20261201 vẫn có tài liệu riêng trong `NORMALIZATION_CHANGES.md`.

## Thứ tự cần làm tiếp

### 1. BUOI_HOC — vấn đề đã xác định theo nghiệp vụ người dùng

`makhunggio` là FK nguồn giờ. `batdau`, `ketthuc` hiện vẫn tồn tại vật lý và vẫn được nhiều hàm đọc/ghi, trong khi người dùng xác định chúng có cùng ý nghĩa với `KHUNG_GIO.giobatdau/gioketthuc`. Vì thế không tiếp tục coi chúng là giờ độc lập của buổi để kết luận đã chuẩn hóa.

Hướng sửa tiếp: đối soát từng cặp giờ, giữ `makhunggio`, chuyển lịch/generator/giám sát/sự cố/check-in/tính công/báo cáo và các view sang giờ nguồn, rồi mới bỏ hai cột. Giữ `vaolopluc`, `ketthucluc`: đây là thời điểm thao tác thực tế khác ý nghĩa. Khi đối soát có chênh lệch thì phải xác định nguồn đúng trước; không tự ghi đè hoặc bỏ giá trị để vượt kiểm tra.

Phạm vi truy vấn liên quan gồm `V_CHI_TIET_CA_LOP`, `PHAN_CONG_DAY_THAY` (hiện là view, không phải bản sao bảng vật lý), truy vấn buổi/dự giờ và các hàm công/sự cố. `KHUNG_GIO` là bảng nguồn cần giữ, không phải bảng cần xóa giờ. Cần thống nhất cách xử lý sửa khung giờ đã dùng để việc chuyển sang JOIN không âm thầm thay đổi lịch sử/công.

SQL đối soát chỉ đọc: [lesson_clock_source_review.sql](diagnostics/lesson_clock_source_review.sql). Trả số buổi được kiểm tra, buổi thiếu nguồn, buổi khác giờ và các hàm cần rà; không sửa dữ liệu. Kiểm thử trên fixture có trường hợp giống/khác giờ/thiếu nguồn, trong giao dịch READ ONLY, và sau khi đã bỏ cột.

### 2. LUA_CHON_CAP_HOC và các bảng tham chiếu — lỗi ghi đã tái hiện

Chuỗi kiểm thử đầy đủ chạy đến đợt 20261205 phát sinh lỗi FK `dang_ky_khoi_nhap_hoc_fk` khi đổi nhãn lựa chọn của danh mục cấp học qua `public.vuihoc_save_business`. Bộ ghi `ghi_chi_tiet_danh_muc` thực hiện `DELETE FROM LUA_CHON_CAP_HOC WHERE macaphoc=id` rồi chèn lại, trong khi `DANG_KY_MON_HOC.(macaphocdangky,khoidangky)` đang tham chiếu lựa chọn và FK này kiểm tra ngay. Vì vậy việc đổi nhãn cũng bị chặn dù không đổi mã lựa chọn.

Các bảng cần kiểm tra cùng luồng: `CAP_HOC`, `LUA_CHON_CAP_HOC`, `GIAO_VIEN_KHOI`, `DANG_KY_MON_HOC`, `LICH_SU_DANG_KY_HOC`, cùng FK cấp/khối ở học sinh và lớp. Đợt 20261205 đã trì hoãn FK mới của giáo viên nhưng không làm thay đổi ràng buộc đăng ký được thêm từ 20261121. Fixture tập trung cũ không có cùng các tham chiếu đăng ký nên chưa đủ để nghiệm thu luồng này.

Hướng sửa: bộ ghi cập nhật/chèn theo khóa lựa chọn ổn định và chỉ xóa mục thật sự được bỏ; việc xóa mục đang được dùng vẫn phải bị chặn. Không bỏ FK hoặc xóa đăng ký để làm thao tác sửa nhãn thành công. Đây là lỗi phối hợp đường ghi/khóa ngoại, không tự nó là chứng minh cấu trúc liên kết khối mới vi phạm 3NF. Chưa sửa bộ ghi trong lượt kiểm tra này.

### 3. TRUY_VET_XEP_LOP — ứng viên cần xác minh

`mamonhoc` vẫn được lưu bên cạnh `malopcu`, `malopmoi`. Migration 20261026 backfill môn từ `LOP_HOC` theo `coalesce(malopmoi,malopcu)`, còn bộ ghi truy vết tiếp tục ghi môn từ đăng ký. Nếu đây chính là môn của lớp được tham chiếu thì có thể truy vấn thay bản sao. Nếu là sự kiện lịch sử độc lập cần chứng minh quy tắc đó bằng đường ghi và các tình huống chuyển lớp, không mặc định giữ chỉ vì tên bảng có chữ lịch sử.

Chưa xóa cột hoặc kết luận đủ căn cứ đổi FK trong lượt rà. Cần đối soát môn lớp cũ/mới và môn truy vết trước khi quyết định. Không nhầm việc lưu hai mã lớp cũ/mới (hai vai trò riêng của sự kiện) với lưu trùng thuộc tính môn của chúng.

### 4. LICH_RANH_TUAN — thuộc tính dẫn xuất được kiểm soát

`ngaycuoituan` hiện là `GENERATED ... (ngaydautuan + 6) STORED`, không phải hai giá trị nhập độc lập. Nếu áp dụng yêu cầu không lưu thuộc tính tính lại được thì chuyển ngày cuối tuần sang view/truy vấn và sửa các kiểm tra phụ thuộc. Không xếp mức khẩn cấp ngang bản sao giờ có thể lệch nguồn. `namhoc` là nhãn năm học, không tự coi là năm dương lịch được tính từ ngày đầu tuần.

### 5. Rà khép kín các bảng còn lại

Các bảng lịch sử đăng ký, xếp lớp hiện tại, lịch đăng ký, điểm danh, khóa/quyền và các danh mục nguồn vẫn cần được đối chiếu theo khóa và ý nghĩa trường để khép kín kiểm kê. Không kết luận chúng sai chỉ vì chứa các mã FK giống nhau. Những nhóm đã có migration cũng phải được kiểm tra lại theo yêu cầu nghiệp vụ vừa chốt; không dùng nhãn “đã sửa” thay cho việc kiểm tra phụ thuộc hàm.

`LUA_CHON_CAP_HOC.maluachon` mới là khóa ứng viên sinh từ cặp mã phạm vi phục vụ FK, không chép tên/nhãn vào bảng liên kết. Các mã định danh kỹ thuật và khóa ứng viên cần phân biệt với thuộc tính nghiệp vụ nhập trùng.

## Thay đổi trong lượt rà này

- Cập nhật `normalization_review.sql`: giờ buổi học được đánh dấu REVIEW mức 1 theo nghiệp vụ đã xác nhận, không còn nằm trong nhóm giờ thực tế độc lập; bổ sung ứng viên môn truy vết và ngày cuối tuần dẫn xuất.
- Thêm diagnostic giờ chỉ đọc và tài liệu tiến độ hiện tại. Không tạo migration DROP/UPDATE, không sửa các thay đổi tài liệu/AI/khối do người dùng vừa thực hiện.
- Cần chạy diagnostic trên Supabase thật để đối chiếu schema và dữ liệu thực tế; kết quả dựng cục bộ không phải bằng chứng các migration đã chạy ở máy chủ.

## Kết quả kiểm thử lượt rà

Đã chạy `tests/reenrollmentClassDuration.test.mjs` hiện tại trong PGlite. Các nhóm chuẩn hóa đến báo cáo, tài liệu, cấu hình AI/chat (bao gồm khôi phục biến thể RPC và quyền sở hữu) đạt. Chuỗi **chưa đạt toàn bộ**: dừng trong `verifyTeacherGradeNormalization` khi ghi đổi nhãn danh mục như lỗi nêu ở mục 2. Migration liên kết khối chạy được hai lần và kiểm tra bảo toàn/thay đổi khối giáo viên đã đi qua trước khi gặp lỗi ghi danh mục. Không coi đó là toàn bộ đợt 20261205 đã được nghiệm thu.

Diagnostic giờ mới đã chạy được trong giao dịch chỉ đọc trên fixture có giờ giống/khác và nguồn khung giờ thiếu, cả trước/sau khi bỏ hai cột. Thay đổi trong repository ở lượt này chỉ gồm tài liệu và diagnostic; không thực hiện DROP/UPDATE trên database thật.
