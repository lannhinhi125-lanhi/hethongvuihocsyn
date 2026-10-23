# Khối được dạy, mô hình và lịch rảnh — đợt 20261205

Theo dõi tiếp nhóm lịch: [20261209 — phiên bản có hiệu lực đến lần cập nhật sau](AVAILABILITY_VERSION_3NF_CHANGES.md), thay mô hình lịch hiện hành/theo tuần bên dưới theo quy tắc nghiệp vụ mới. Dữ liệu lịch tuần chưa đối soát sẽ chặn migration; không tự xóa.

Theo dõi tiếp: [20261207 — sửa cách ghi danh mục đang được tham chiếu](GRADE_CATALOG_WRITE_CHANGES.md). Đợt mới giữ cấu trúc của bản này, sửa lỗi xóa/chèn danh mục khi có FK đăng ký kiểm tra ngay; không yêu cầu chạy lại 20261205.

Chạy sau bản cập nhật tài liệu/AI đã thành công (`20261204`, hoặc file gộp/V2). File mới: [20261205_normalize_teacher_grade_links.sql](migrations/20261205_normalize_teacher_grade_links.sql). Chưa chạy lên Supabase thật trong phiên này.

## Sáu bảng được rà

| Bảng | Cột trước | Cột sau | Kết quả |
| --- | --- | --- | --- |
| `LUA_CHON_CAP_HOC` | `macaphoc, madinhdanh, nhan, thutu, macha` | Toàn bộ cột cũ và `maluachon` | 5 → 6; thêm mã toàn cục sinh tự động để tham chiếu một lựa chọn đúng phạm vi |
| `GIAO_VIEN_KHOI` | `magiaovien, macaphoc, makhoi, thutu` | `magiaovien, thutu, maluachon` | 4 → 3; bỏ hai mã danh mục ở bảng liên kết, thay bằng một FK |
| `GIAO_VIEN_MO_HINH` | `magiaovien, mamohinh, thutu` | Như trước | 3 → 3; quan hệ giáo viên–mô hình, không chép tên mô hình |
| `LICH_RANH_DINH_KY` | `magiaovien, makhunggio, thutrongtuan, trangthai` | Như trước | 4 → 4; mẫu lịch lặp, không chép tên/giờ của khung giờ |
| `LICH_RANH_TUAN` | `madinhdanh, magiaovien, ngaydautuan, ngaycuoituan, namhoc, manguoicapnhat, ngaytao, ngaycapnhat` | Như trước | 8 → 8; đăng ký một tuần cụ thể |
| `CHI_TIET_LICH_RANH` | `malichtuan, ngay, makhunggio, trangthai, ngaytao, ngaycapnhat` | Như trước | 6 → 6; lựa chọn theo ngày và khung giờ của tuần |

## Phụ thuộc cần sửa

Theo quy tắc hồ sơ hiện tại, một giáo viên có một `macaphoc`. Bảng `GIAO_VIEN_KHOI` cũ dùng PK `(magiaovien,makhoi)` nhưng lưu thêm `macaphoc` được xác định bởi `magiaovien`, một phần của khóa ghép. Đây là phụ thuộc bộ phận cần loại bỏ để tiến tới 3NF, không phải chỉ thiếu khóa ngoại. Chỉ thêm FK giữa các cột cũ sẽ không loại bỏ phần lưu trùng này.

Bảng liên kết mới có PK `(magiaovien,maluachon)`. FK `magiaovien → GIAO_VIEN.madinhdanh ON DELETE CASCADE` giữ nguyên. FK `maluachon → LUA_CHON_CAP_HOC.maluachon` là ràng buộc thật, có thể trì hoãn đến cuối giao dịch và `ON UPDATE CASCADE`. Thứ tự thuộc về chính quan hệ giáo viên–lựa chọn; tên khối và cấp học được truy vấn từ danh mục.

Danh mục vẫn giữ PK `(macaphoc,madinhdanh)` cùng FK tới cấp học và FK cha đã có. `maluachon` là khóa ứng viên UNIQUE, được sinh từ cặp mã nguồn bằng biểu thức có tiền tố độ dài để không đụng mã giữa các cấp học. Không sinh lại mã ngẫu nhiên khi bộ ghi danh mục xóa/chèn lại các lựa chọn cùng mã, không lưu JSON hoặc danh sách trong một ô. Cột sinh không cho nhập độc lập. Không thêm bảng vật lý mới.

View `V_GIAO_VIEN_KHOI` truy vấn lại bốn cột cũ phục vụ các bộ đọc. Bộ ghi giáo viên đổi sang tìm lựa chọn trong cấp học đã chọn rồi lưu một FK. Nếu không tìm thấy thì rollback thay vì bỏ qua khối không hợp lệ. Giao diện giữ nguyên mảng mã khối; không đưa mã kỹ thuật mới ra ô nhập.

Trigger trì hoãn kiểm tra lựa chọn vẫn thuộc cấp học hiện tại của giáo viên, cho phép một giao dịch đổi cấp học và thay danh sách khối. Trigger trước ghi khóa hàng giáo viên để tránh ghi liên kết đồng thời với việc đổi cấp học. Chưa thực hiện kiểm thử cạnh tranh bằng hai kết nối độc lập; các kiểm tra giao dịch tuần tự đã đạt.

## Khóa và phụ thuộc của các bảng còn lại

- `GIAO_VIEN_MO_HINH`: PK `(magiaovien,mamohinh)`; FK tới giáo viên và mã mô hình danh mục. Thứ tự mô hình là thuộc tính của quan hệ. Không phát hiện cột tên/giới hạn sĩ số được chép ở đây.
- `LICH_RANH_DINH_KY`: PK `(magiaovien,makhunggio,thutrongtuan)`; FK tới giáo viên/khung giờ; CHECK ngày 0–6 và trạng thái `free/busy/none`. Trạng thái được xác định theo một ô lịch lặp. Số ca bận/rảnh của hồ sơ đã được đưa sang truy vấn từ các bản trước. Không tự gộp lịch lặp với lịch theo ngày hoặc đổi giá trị `busy` chỉ từ tên trường.
- `LICH_RANH_TUAN`: PK `madinhdanh`, khóa ứng viên UNIQUE `(magiaovien,ngaydautuan)`; FK giáo viên và người cập nhật. `ngaycuoituan` là cột GENERATED `ngaydautuan+6`, không phải hai giá trị nhập độc lập. Đây là dẫn xuất được kiểm soát còn giữ nguyên; nếu yêu cầu mô hình thuần không có thuộc tính dẫn xuất thì cần chuyển sang view riêng trong một đợt khác. `namhoc` là nhãn năm học, không tự coi là năm dương lịch suy từ ngày.
- `CHI_TIET_LICH_RANH`: PK `(malichtuan,ngay,makhunggio)`; FK tới tuần và khung giờ. Không chép giáo viên/ngày đầu tuần. Trigger hiện có kiểm tra ngày nằm trong tuần và khóa việc đổi giáo viên/tuần của đầu đăng ký.

Các bảng lịch theo tuần chưa có caller UI đang hoạt động được tìm thấy trong lượt rà này; vẫn có hợp đồng lưu trữ/trigger và khả năng chứa dữ liệu. Không xóa vì ít được gọi hoặc đang rỗng. Kết luận ở đây không phải chứng nhận toàn bộ CSDL đạt 3NF; bảng lịch tuần vẫn giữ cột dẫn xuất được kiểm soát nêu trên.

## Chạy và kiểm tra

1. Chạy chỉ đọc [teacher_grade_links.sql](diagnostics/teacher_grade_links.sql). `can_doi_soat` phải bằng 0; script dùng được trước/sau nâng cấp.
2. Chạy toàn bộ migration `20261205_normalize_teacher_grade_links.sql`. Cặp cấp học/khối lệch nguồn làm giao dịch dừng, không tự sửa dữ liệu. Phụ thuộc ngoài dự kiến chặn DROP vì không dùng CASCADE.
3. Mở giáo viên, đổi thứ tự/chọn khối; sửa nhãn khối trong danh mục rồi mở lại giáo viên.

Đã cập nhật `reset_demo_dataset.sql` để hỗ trợ cả cấu trúc cũ/mới. Không chạy reset demo để nâng cấp dữ liệu thật.

Kiểm thử tập trung `tests/documentUploaders.test.mjs` gọi `tests/teacherGradeNormalizationCases.mjs`: preflight dừng khi lệch cấp học, chạy migration hai lần, giữ nguyên quan hệ/thứ tự/hồ sơ và bốn bảng mô hình/lịch, sửa khối qua RPC, thay nội dung danh mục qua RPC vẫn giữ FK, chặn mã không có và khối sai cấp học, chặn đổi cấp học trực tiếp khi còn khối không phù hợp. Bộ ca cũng đã gắn vào chuỗi kiểm thử đầy đủ, nhưng chưa chạy lại toàn bộ chuỗi sau đợt 20261205.
