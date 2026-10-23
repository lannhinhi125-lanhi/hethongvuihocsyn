# Giờ buổi học lấy từ khung giờ — 20261206

Cập nhật tiếp nối: lỗi ghi danh mục cấp/khối được nêu ở cuối tài liệu đã có bản sửa riêng [20261207](GRADE_CATALOG_WRITE_CHANGES.md). Các ghi nhận kiểm thử bên dưới mô tả phạm vi của đợt giờ 20261206.

Migration: [20261206_normalize_lesson_clocks.sql](migrations/20261206_normalize_lesson_clocks.sql), chạy sau 20261205. Đã sửa trong repository và kiểm thử cục bộ; chưa chạy trên Supabase thật.

## BUOI_HOC — 30 → 28 cột

Trước: `madinhdanh, malop, ngayhoc, makhunggio, batdau, ketthuc, magiaovienchinh, magiaoviendaythay, tieude, lienketphonghoc, trangthai, vaolopluc, ketthucluc, manguoivaolop, manguoiketthuc, chuyencan, nhatky, lienketbanghi, ngaytao, ngaycapnhat, hoclieutieude, hoclieugiaovien, hoclieuhocsinh, baitaplms, tamhoandolop, lydotamdung, ghichutamdung, batdautamdung, manhomtamdung, mahoclieu`.

Sau: `madinhdanh, malop, ngayhoc, makhunggio, magiaovienchinh, magiaoviendaythay, tieude, lienketphonghoc, trangthai, vaolopluc, ketthucluc, manguoivaolop, manguoiketthuc, chuyencan, nhatky, lienketbanghi, ngaytao, ngaycapnhat, hoclieutieude, hoclieugiaovien, hoclieuhocsinh, baitaplms, tamhoandolop, lydotamdung, ghichutamdung, batdautamdung, manhomtamdung, mahoclieu`.

Bỏ đúng hai cột `batdau`, `ketthuc`. Không thêm cột hay bảng lưu thay thế. Giữ toàn bộ thuộc tính còn lại, đặc biệt `makhunggio`, `vaolopluc`, `ketthucluc`, người thao tác, giáo viên chính/dạy thay, học liệu, trạng thái và dữ liệu nghỉ thực tế.

PK `madinhdanh` và FK `makhunggio → KHUNG_GIO.madinhdanh` giữ nguyên. Lưu ý FK này tham chiếu **định danh** khung giờ, không phải chuỗi mã nghiệp vụ ở cột `KHUNG_GIO.makhunggio`. Các FK khác của buổi giữ nguyên. Ràng buộc kiểm tra hai giờ tại buổi được bỏ cùng cột; tính hợp lệ của khoảng giờ do bảng nguồn kiểm soát.

## KHUNG_GIO — 8 → 8 cột

Trước: `madinhdanh, makhunggio, tenkhunggio, danghoatdong, ngaytao, ngaycapnhat, giobatdau, gioketthuc`.

Sau: `madinhdanh, makhunggio, tenkhunggio, danghoatdong, ngaytao, ngaycapnhat, giobatdau, gioketthuc`.

Không thêm/bỏ cột, không đổi giờ hay tên danh mục hiện có. PK, mã nghiệp vụ và ràng buộc khoảng giờ giữ nguyên. Đây là nơi duy nhất lưu giờ chuẩn của buổi. `V_KHUNG_GIO` vẫn truy vấn khoảng giờ hiển thị và số phút từ hai giờ nguồn.

## Trước và sau về luồng dữ liệu

Trước: bảng buổi vừa có mã khung giờ vừa lưu thêm hai giờ; generator và các đường tạo buổi chép giờ từ danh mục. Theo nghiệp vụ người dùng xác nhận, hai giờ này không phải thuộc tính riêng của buổi.

Sau: buổi chỉ giữ FK khung giờ. View không vật hóa `V_BUOI_HOC` JOIN `BUOI_HOC` với `KHUNG_GIO` để trả alias `batdau/ketthuc` cho các bộ đọc hiện có. Các hàm trạng thái/checkout/công lấy giờ nguồn theo FK. Hai alias trong JSON trả về và mapper phục vụ đọc, không phải cột vật lý hay nơi lưu mới. Giao diện không ghi `startsAt/endsAt`; SQL từ chối yêu cầu ghi hai giờ trực tiếp. Hợp đồng dataset vẫn có alias đọc, nhưng bộ ghi loại chúng khỏi danh sách cột DML.

Ví dụ: khung K lưu 19:00–20:00; buổi B chỉ lưu K. Lịch, giám sát và báo cáo của B đều lấy giờ từ cùng nguồn, không đọc bản sao tại B.

`vaolopluc/ketthucluc` là thời điểm giáo viên thực sự thao tác, khác giờ chuẩn; vẫn lưu tại buổi. Với ca qua nửa đêm, ánh xạ UI dùng ngày kế tiếp cho giờ kết thúc, cùng ý nghĩa với hàm SQL tính kết thúc ca.

## Các bảng/view và bộ đọc liên quan

- `LICH_LOP`, lịch đăng ký và lịch rảnh tiếp tục FK tới khung giờ; không chép thêm giờ.
- Sinh buổi theo lịch/học liệu, tạo buổi khi phân công dạy thay và tạo buổi khi báo sự cố chỉ ghi mã khung giờ.
- `V_CHI_TIET_CA_LOP`, `PHAN_CONG_DAY_THAY` (view), `V_BIEN_BAN_DU_GIO`, các view công và các hàm lịch/buổi đọc giờ nguồn. Không đổi cột vật lý của bảng chi tiết ca, dự giờ hay công.
- `cap_nhat_trang_thai_ca`, `dong_bo_trang_thai_ca`, `tu_dong_checkout`, kiểm tra kỳ khóa, tạm dừng/mở lại/dừng lớp, luồng sự cố và truy vấn công được chuyển khỏi hai cột buổi cũ.
- `public.vuihoc_business_data` và cổng giáo viên vẫn trả đủ giờ bằng truy vấn, với phạm vi quyền hiện tại. Bộ đọc dataset động được bổ sung projection vì nó lấy bảng vật lý theo tên cấu hình.
- `reset_demo_dataset.sql` hỗ trợ cả trước/sau 20261206. Reset chỉ chạy trong DB kiểm thử; không phải bước nâng cấp dữ liệu thật.

## Giữ dữ liệu và chính sách sửa giờ

Migration khóa hai bảng nguồn và đối soát từng cặp giờ. Có buổi thiếu nguồn hoặc khác giờ nguồn thì dừng và rollback; báo mã buổi, không tự ghi đè giờ, sinh mã mới hoặc xóa chênh lệch. Chỉ bỏ cột khi toàn bộ giá trị đã khớp nguồn, vì vậy giờ hiển thị trước/sau và các dòng công đã tồn tại giữ nguyên.

Khi chuyển sang một nguồn, không thể cho sửa giờ của mã khung đã dùng rồi vẫn giữ nguyên giờ lịch sử. Bản này chặn UPDATE hai giờ nếu khung đã có bất kỳ buổi tham chiếu. Đổi tên/nhãn/trạng thái khung vẫn được phép theo quyền hiện tại. Muốn đổi giờ thì tạo khung mới, cập nhật lịch tương lai và những buổi tương lai chưa sử dụng bằng mã mới; không tự chuyển các buổi cũ. Khung chưa có buổi sử dụng vẫn sửa được giờ.

Trigger buổi khóa hàng nguồn khi chèn/đổi FK để phối hợp với cập nhật giờ nguồn; không cho đổi khung của buổi đã vào/kết thúc, có công, thuộc quá khứ hoặc kỳ công khóa. Chưa kiểm thử cạnh tranh bằng hai kết nối độc lập; đã kiểm tra các trường hợp giao dịch tuần tự. Không tạo bảng snapshot hoặc lịch sử giờ.

## Phạm vi chuẩn hóa

Đợt này loại bỏ phụ thuộc `makhunggio → batdau, ketthuc` khỏi bảng buổi theo nghiệp vụ đã xác nhận. Không còn hai thuộc tính này được lưu lặp ở buổi. View và hàm truy vấn không phải bản sao vật lý. Không thêm JSON/JSONB hoặc bảng nghiệp vụ. Kết luận áp dụng cho nguồn giờ; không chứng nhận toàn bộ thuộc tính BUOI_HOC hoặc toàn hệ thống đã đạt 3NF.

## Chạy trên Supabase

1. Đã hoàn tất migration 20261205.
2. Chạy [lesson_clock_source_review.sql](diagnostics/lesson_clock_source_review.sql). Có `CLOCK_MISMATCH` thì đối soát mã buổi/khung và giờ trước khi chạy tiếp. Các dòng liệt kê cột/hàm chỉ là thông tin kiểm kê.
3. Chạy toàn bộ migration 20261206 trong SQL Editor. Có thể chạy lại chính file này; không chạy lại migration cũ lên cấu trúc mới.
4. Chạy lại diagnostic, mở lịch/lớp, giám sát, cổng giáo viên và báo cáo. Hai cột không còn trong bảng vật lý nhưng giờ vẫn được trả qua truy vấn.

Không chạy reset demo để nâng cấp database thật.

## Kiểm thử

Dựng baseline qua các bản trước, áp dụng migration 20261205 rồi kiểm thử đợt giờ trên snapshot PGlite: chạy lặp; cố tình lệch giờ làm rollback; giữ nguyên tất cả cột còn lại của từng buổi, nguồn khung giờ, dòng công và kết quả truy vấn công. API lớp/giáo viên/dự giờ/sự cố/mẫu báo cáo/buổi trả dữ liệu như trước; không tăng số bảng hoặc có cột JSON.

Kiểm tra khung mới và ca qua nửa đêm, sửa nhật ký qua RPC, cấm ghi giờ dẫn xuất, chặn sửa giờ khung đã dùng/đổi khung lịch sử; đổi tên khung vẫn được. Sự cố đọc buổi có sẵn và tự tạo buổi mới; tạo buổi phân công; tạm dừng/mở lại/dừng lớp; tài khoản giáo viên đọc giờ đúng. Reset kiểm thử hai lần, generator, checkout tự động và đồng bộ trạng thái; công/nhận xét/check-in/out vẫn có dữ liệu. Mapper và báo cáo liên quan, TypeScript, build đạt.

Lỗi sửa danh mục cấp/khối của đợt 20261205 vẫn là việc riêng, chưa được sửa ở đợt này. Nhánh kiểm thử `--lesson-clocks` áp dụng 20261205 nhưng bỏ bài CRUD danh mục đang lỗi đó, không tuyên bố toàn bộ chuỗi mặc định đạt.

Lệnh tái hiện với `PGLITE_MODULE_PATH` đã đặt: `node --wasm-lazy-compilation --liftoff-only tests/reenrollmentClassDuration.test.mjs --lesson-clocks`.
