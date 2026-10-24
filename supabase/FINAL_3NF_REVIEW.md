> Cập nhật 20261212: cấu trúc mới 50 bảng/384 cột sau khi bỏ 8 cột kỳ chạy của MAU_BAO_CAO. Chi tiết dưới đây ghi nhận lần rà 20261209; xem REPORT_TEMPLATE_FRAME_ONLY.md cho thay đổi mới.

# Kết thúc rà soát cấu trúc 3NF sau 20261209

Đã rà đủ **50 bảng vật lý, 392 cột** của schema `vuihoc` dựng từ chuỗi cập nhật hiện tại. Danh sách có đủ tên cột, khóa và nguồn của từng bảng tại [FINAL_3NF_TABLE_INVENTORY.md](FINAL_3NF_TABLE_INVENTORY.md). Không còn bảng vật lý trong cấu trúc dựng cục bộ nằm ngoài kiểm kê.

**Nhóm còn lại không cần thêm DROP/ALTER:** cấu trúc đã có khóa đúng và không phát hiện thêm phụ thuộc bộ phận/bắc cầu phải loại bỏ theo nghiệp vụ đang dùng. Đợt cuối giữ nguyên toàn bộ bảng/cột/dữ liệu; không tạo bảng lưu thông tin hoặc kết quả rà soát. Không tạo migration rỗng để đánh dấu hoàn tất.

Đây là kết luận rà mô hình và mã đang có, với các quy tắc nghiệp vụ đã chốt. Không thể dùng một truy vấn metadata để chứng minh mọi phụ thuộc nghiệp vụ có thể có, hoặc xác nhận database thật giống cấu trúc trong mã. Cấu trúc/cột ngoài dự kiến trên Supabase thật phải được đối chiếu bằng hai SQL cuối bên dưới.

## Năm bảng cuối — trước và sau

| Bảng | Đủ cột trước = sau | Khóa và kết luận |
| --- | --- | --- |
| `LICH_DANG_KY_MON_HOC` | `mahocsinh, mamonhoc, thutu, thutrongtuan, makhunggio` | PK `(mahocsinh,mamonhoc,thutu)`; UNIQUE `(mahocsinh,mamonhoc,thutrongtuan,makhunggio)`. Ngày/khung giờ là yêu cầu của đúng đăng ký, không chép tên/giờ của danh mục. CHECK thứ/thứ tự đã có. |
| `LICH_SU_CA_DANG_KY_HOC` | `mahocsinh, mamonhoc, dotdangky, thutu, thutrongtuan, makhunggio` | PK `(mahocsinh,mamonhoc,dotdangky,thutu)`; UNIQUE ca theo cùng đợt. Đợt khác là dữ kiện lịch sử khác, không lấy ca hiện tại thay lịch đã lưu. CHECK thứ/thứ tự đã có. |
| `DIEM_DANH_BUOI_HOC` | `mabuoi, mahocsinh, trangthai, ghichu, manguoicapnhat, ngaytao, ngaycapnhat` | PK `(mabuoi,mahocsinh)` xác định trạng thái/ghi chú của một học sinh trong buổi. Không phải bản sao chuyên cần giáo viên ở `BUOI_HOC`. |
| `QUYEN` | `maquyen, tenquyen` | PK `maquyen`; nhãn thuộc quyền đó. Mã và nhãn có thể giống nhau lúc tạo nhưng không có cùng vai trò: mã liên kết, nhãn mô tả. |
| `NHOM_QUYEN_CHI_TIET` | `manhom, maquyen, thutu` | PK `(manhom,maquyen)`; thứ tự thuộc quan hệ. Không lưu tên nhóm hoặc tên quyền. |

**Bỏ:** không có. **Thêm:** không có. **Đổi dữ liệu:** không có.

Thêm FK mà vẫn giữ cột mô tả sao chép không tự đạt 3NF. Trong năm bảng này, không có cột sao chép mô tả thực thể nguồn cần bỏ: các mã lặp là thành phần khóa/liên kết có vai trò cần thiết. Thuộc tính không khóa phụ thuộc vào khóa đầy đủ của hàng; không tìm thấy thuộc tính không khóa xác định thuộc tính không khóa khác trong quy tắc hiện có.

## Bảng nào làm nguồn, bảng nào truy vấn sang

| Nơi sử dụng | Nguồn và đường liên kết |
| --- | --- |
| Lịch yêu cầu hiện tại | `LICH_DANG_KY_MON_HOC.(mahocsinh,mamonhoc) → DANG_KY_MON_HOC`; `makhunggio → KHUNG_GIO.madinhdanh` |
| Lịch yêu cầu của đợt cũ | `LICH_SU_CA_DANG_KY_HOC.(mahocsinh,mamonhoc,dotdangky) → LICH_SU_DANG_KY_HOC`; `makhunggio → KHUNG_GIO.madinhdanh` |
| Màn hình học sinh, xếp lớp và lịch sử | `dang_ky_mon_truy_van` và bộ đọc quan hệ ghép các nguồn trên. Không lưu danh sách ca lên hồ sơ học sinh. |
| Điểm danh, giám sát và báo cáo buổi | `DIEM_DANH_BUOI_HOC.mabuoi → BUOI_HOC`; `mahocsinh → HOC_SINH`; `manguoicapnhat → NGUOI_DUNG`. Tên/giờ/lớp được đọc theo các FK. |
| Gán quyền và đăng nhập | `NHOM_QUYEN_CHI_TIET.manhom → NHOM_QUYEN`; `maquyen → QUYEN`. `quyen_nhom`, RPC phiên/tài khoản đọc quyền từ quan hệ; hồ sơ tài khoản chỉ giữ FK nhóm. |

Các FK ghép lịch sử phải giữ đủ đợt. Chỉ lưu học sinh hoặc chỉ lưu môn sẽ không xác định đúng lần đăng ký. Không gộp bảng lịch sử với đăng ký hiện tại bằng cách bỏ khóa đợt.

## Kiểm kê khép kín các phân hệ

| Nhóm | Số bảng | Phạm vi đã đối chiếu |
| --- | ---: | --- |
| Tài khoản/quyền | 4 | Liên hệ một nguồn ở tài khoản; nhóm và gán quyền; thông tin phiên đăng nhập thuộc tài khoản |
| Danh mục nguồn | 10 | Môn, trình độ, khung giờ, mô hình, cấp/khối, nhóm/loại sự cố, nhóm/mục bổ sung; mã theo đúng phạm vi |
| Giáo viên/dự giờ/lịch rảnh | 6 | Hồ sơ nghề nghiệp, khối/mô hình được dạy, phiên bản/chi tiết lịch rảnh, biên bản chấm điểm |
| Học sinh/đăng ký/lớp/học liệu | 11 | Hồ sơ, đăng ký/lịch hiện tại, đợt/lịch lịch sử, xếp/truy vết, lớp/lịch lớp/kế hoạch, ánh xạ ca |
| Buổi/điểm danh/nhận xét/sự cố | 4 | Các dữ kiện theo buổi, theo học sinh và lần xử lý sự cố; tách nguồn danh mục khỏi tên hiển thị |
| Tài liệu/cấu hình/chat | 7 | Loại/tài liệu, cấu hình, văn phong, đầu phiên và câu hỏi; không chép người sở hữu sang câu hỏi |
| Công/đối soát/giải trình | 5 | Dòng công thực tế, kỳ, trạng thái theo giáo viên, giải trình, liên kết minh chứng |
| Mẫu báo cáo | 3 | Mẫu, chỉ số và từng giá trị bộ lọc; không có bảng lưu kết quả báo cáo |
| **Tổng** | **50** | **392 cột** |

Mỗi bảng trong tổng này có một mục riêng ở tài liệu kiểm kê, không gom vào nhận định chung “bảng khác đã ổn”. View đọc không tính thành bảng lưu dữ liệu. Các bảng Supabase Auth/Storage và schema khác ngoài `vuihoc` không thuộc phạm vi mô hình ứng dụng này.

## Những giá trị giống nhau nhưng không được xóa máy móc

- FK giống nhau là liên kết, không phải bản sao tên/thông tin nguồn. Các khóa ứng viên và khóa ghép theo phạm vi phải giữ đầy đủ.
- Liên hệ cha/mẹ đang là thông tin liên hệ của hồ sơ học sinh; không có quy tắc định danh toàn cục rằng một số điện thoại xác định duy nhất một phụ huynh. Không tự tách/gộp phụ huynh theo số điện thoại hay họ tên.
- Yêu cầu đăng ký, khối ở thời điểm đăng ký, dữ kiện lớp hiện tại và dữ kiện đợt lịch sử có thời kỳ/vai trò riêng. Không dùng thông tin hiện tại thay quá khứ.
- Lịch lớp là mẫu; buổi là một ngày học thực tế. Giáo viên thực dạy, check-in/out, ghi đè học liệu và sự cố đã ghi nhận có vòng đời riêng. Giờ chuẩn vẫn chỉ lấy từ `KHUNG_GIO` theo quy tắc đã chốt.
- Hệ số mặc định danh mục, hệ số đã áp dụng cho sự cố và công sau đối soát/giải trình không phải cùng một giá trị luôn được phép JOIN lại. Bảo vệ kỳ đã chốt phải giữ nguyên.
- Lớp tạm dừng, buổi bị nghỉ và biên bản sự cố tự sinh là các bản ghi có phạm vi khác nhau. Biên bản tự sinh đang chịu quy tắc đồng bộ/bảo vệ công; không dùng việc đồng bộ đó làm bằng chứng cho 3NF hoặc tự xóa dữ kiện nghiệp vụ chỉ vì giá trị hiện tại giống nhau. Đợt rà cuối không thay nghiệp vụ tạm dừng/công đã kiểm thử ở các đợt trước.
- Tên quyền/mã quyền, mã nghiệp vụ/mã định danh, nhãn ngắn/tên đầy đủ có thể trùng giá trị khởi tạo nhưng khác vai trò. Không suy ra phụ thuộc từ vài dòng mẫu giống nhau.

## SQL kiểm tra cuối trên Supabase thật

Bạn đã chạy thành công đến 20261209. **Không cần chạy thêm migration thay đổi bảng cho nhóm cuối này.**

1. Chạy toàn bộ [final_3nf_schema_review.sql](diagnostics/final_3nf_schema_review.sql). Cấu trúc đúng bản đã rà trả **50 dòng**, tất cả `status = KHOP_CAU_TRUC_DA_RA`.
2. Chạy [remaining_3nf_data_checks.sql](diagnostics/remaining_3nf_data_checks.sql). **16 kiểm tra** cần có `review_rows = 0`, `status = OK`.

Hai file không thêm/sửa/xóa bảng hoặc dữ liệu. File cấu trúc chỉ đọc metadata và đặt `search_path` cục bộ để PostgreSQL hiển thị tên constraint thống nhất. Không xuất mật khẩu, liên hệ hoặc nội dung hồ sơ.

Ý nghĩa kết quả cấu trúc:

| Trạng thái | Ý nghĩa |
| --- | --- |
| `KHOP_CAU_TRUC_DA_RA` | Cột/kiểu/NULL/GENERATED, PK/UK/FK/CHECK và unique index khớp cấu trúc đã rà |
| `CAN_RA_LAI` | Có khác biệt cấu trúc hoặc constraint chưa xác thực; xem các cột `actual_*`/`reviewed_*`, không tự xóa |
| `THIEU_BANG` | Thiếu một bảng thuộc cấu trúc đã rà |
| `CHUA_RA_BANG_NAY` | Có bảng vật lý ngoài danh sách đã rà; cần xem nghiệp vụ trước khi kết luận |

Danh sách trong SQL là hợp đồng **cấu trúc đã được rà**, không phải danh sách dữ liệu nghiệp vụ cố định đưa lên màn hình. Dữ liệu giao diện tiếp tục lấy từ Supabase. Kết quả khớp chỉ xác nhận database thật khớp cấu trúc đã đánh giá, không biến kiểm tra metadata thành một chứng minh tự động cho mọi quy tắc nghiệp vụ.

Nếu Supabase có bảng/cột do bạn thêm riêng, bộ kiểm tra sẽ báo thay vì âm thầm xác nhận toàn hệ thống đã chuẩn hóa. Không chạy reset demo hoặc chạy lại `schema.sql` cũ để “sửa” kết quả kiểm tra.

## Những gì đã sửa trong đợt cuối

- Hoàn thiện kiểm kê đủ bảng/cột/khóa/nguồn, cùng hai SQL đối soát cuối.
- Sửa `normalization_data_checks.sql` đọc giáo viên dự giờ qua nguồn buổi khi cột giáo viên sao chép đã bỏ; tránh lỗi cột không tồn tại trên cấu trúc hiện tại.
- Gắn kiểm thử rà cuối vào cuối `tests/reenrollmentClassDuration.test.mjs`.
- Không thêm/bỏ bảng hoặc cột nghiệp vụ; không sửa dữ liệu nguồn, luồng giao diện hay cấu hình Supabase thật.

## Bằng chứng kiểm thử

Chuỗi tích hợp SQL từ cấu trúc ban đầu đến 20261209 chạy đạt. Sau đó bộ rà cuối chạy trên bản chụp đúng trạng thái cuối chuỗi đó, với PostgreSQL nhúng PGlite:

- Đủ 50 bảng/392 cột; kiểm tra 231 constraint PK/UK/FK/CHECK và 6 unique index bổ sung.
- Chạy SQL trong transaction READ ONLY, lặp kết quả; so sánh mọi hàng ở mọi bảng trước/sau, không có thay đổi.
- Fixture thêm cột, thêm bảng lạ, thêm JSON, bỏ FK đều được báo; fixture mồ côi được phát hiện. Mọi fixture sai đều rollback.
- Khóa hiện có từ chối ca yêu cầu trùng và ca lịch sử không có đợt cha.
- RPC tái đăng ký giữ ca của đợt cũ, cho lịch yêu cầu mới khác và không thay đăng ký môn còn lại.
- RPC tài khoản tạo/xóa nhóm quyền thực sự ghi/xóa các liên kết FK, không chép nhãn quyền vào bảng gán.

Đây là kiểm thử cục bộ và đánh giá mô hình trong mã. Chưa chạy hai SQL cuối hoặc kiểm tra dữ liệu riêng của database Supabase thật trong phiên này.
