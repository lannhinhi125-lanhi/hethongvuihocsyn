# Rà soát lưu trữ theo phân màn — 15/10/2026

**Báo cáo này ghi nhận trước khi bỏ sáu cột JSONB cuối.** Bản chuyển đổi nằm ở
[NO_JSON_STORAGE.md](NO_JSON_STORAGE.md) và migration `20261015_remove_remaining_json.sql`.
Kết quả trên Supabase chỉ thay đổi sau khi chạy migration đó.

Phạm vi: đối chiếu mã giao diện, mapper, RPC, `schema.sql` và
`apply_relational_update.sql` (đã sửa lỗi JSON null). Chưa kết nối Supabase thật.
Các kết luận về cấu trúc bên dưới giả định đã chạy đầy đủ bản cập nhật quan hệ.
Chạy `diagnostics/relational_storage_audit.sql` để xác nhận trên database thật;
câu SQL chỉ đọc metadata, không xuất mật khẩu hay dữ liệu cá nhân.

## Nguyên tắc áp dụng

- Dữ liệu người dùng thêm/sửa/xóa có bảng, cột có kiểu rõ ràng và khóa phù hợp.
  Danh sách con có nhiều phần tử lưu thành nhiều hàng trong bảng con.
- Danh sách, tìm kiếm, lọc, thống kê lấy từ dữ liệu gốc bằng SELECT/JOIN hoặc view.
  Không tạo bảng chứa riêng kết quả lọc hay kết quả hiển thị.
- Nút **lưu mẫu báo cáo** là một thao tác ghi: lưu tên và cấu hình mẫu vào bảng
  MAU_BAO_CAO/CHI_SO_MAU_BAO_CAO/BO_LOC_MAU_BAO_CAO. Lọc tạm thời trên màn hình
  không phải thao tác lưu mẫu.
- RPC có thể nhận/trả JSON để truyền dữ liệu. Điều đó không có nghĩa database
  lưu dữ liệu nghiệp vụ trong cột JSON; cần kiểm tra kiểu cột bảng nền.

## Sáu cột JSONB vẫn tồn tại sau bản cập nhật quan hệ

| Bảng.cột | Dữ liệu | Hướng xử lý |
| --- | --- | --- |
| LOP_HOC.hoclieu | Học liệu theo tháng/tuần/buổi: tiêu đề, slide, LMS | Bảng học liệu với mã lớp, kỳ/tuần, số buổi, tiêu đề và liên kết riêng; xác định rõ mẫu học liệu và học liệu của ca thực tế |
| LOP_HOC.chitietcahoc | Trạng thái, vào/ra lớp, điểm danh, nhận xét, học liệu của từng ca | BUOI_HOC, DIEM_DANH_BUOI_HOC, NHAN_XET_BUOI_HOC, TIEU_CHI_NHAN_XET làm nguồn chính; giữ đủ trường trước khi bỏ JSON |
| LOP_HOC.phancongdaythay | Danh sách phân công theo ca | Liên kết buổi thực tế với mã giáo viên; dùng BUOI_HOC.magiaoviendaythay nếu chỉ cần người đang được phân công; bảng lịch sử riêng nếu cần lưu lịch sử thay đổi |
| BUOI_HOC.hoclieu | Học liệu riêng của ca | Cột/bảng học liệu riêng, xác định quan hệ với mẫu học liệu lớp |
| BIEN_BAN_DU_GIO.diemtieuchi | Điểm tc1/tc2/tc3 | Ba cột numeric có CHECK 0–10 nếu bộ tiêu chí cố định; bảng điểm chi tiết nếu bộ tiêu chí thay đổi |
| GIAO_VIEN.diemtieuchi | Điểm tiêu chí hiển thị ở hồ sơ | Đọc từ biên bản dự giờ được chọn theo quy tắc nghiệp vụ; tránh lưu thêm bản sao |

Đây là sáu cột xác định từ mã SQL, không phải số đếm trực tiếp trên Supabase.
JSON tham số, biến trung gian và JSON kết quả RPC không nằm trong số này.

## Đối chiếu các phân màn

| Phân màn | Nguồn lưu thao tác | Kết quả rà soát |
| --- | --- | --- |
| 1. Người dùng, nhóm quyền | NGUOI_DUNG, NHOM_QUYEN; RPC tài khoản | Có cột hồ sơ, nhóm quyền. danhsachquyen còn text[]; nếu yêu cầu mỗi quyền là một hàng có khóa thì cần bảng quyền và bảng gán quyền. soluongnguoidung nên COUNT từ NGUOI_DUNG |
| 2. Danh mục | MON_HOC, TRINH_DO, KHUNG_GIO, MO_HINH_LOP, CAP_HOC/LUA_CHON_CAP_HOC, DANH_MUC_SU_CO/LOAI_SU_CO, DANH_MUC_BO_SUNG/MUC_DANH_MUC | Danh sách con đã chuyển thành bảng riêng trong bản cập nhật quan hệ; danh sách/bộ lọc đọc dữ liệu |
| 3. Giáo viên, dự giờ | GIAO_VIEN, GIAO_VIEN_KHOI, GIAO_VIEN_MO_HINH, BIEN_BAN_DU_GIO | Khối/mô hình/biên bản đã có bảng riêng. Điểm tiêu chí còn JSON, thông tin đánh giá ở hồ sơ còn trùng với biên bản |
| 4. Học sinh, lớp, xếp lịch, học liệu | HOC_SINH, LOP_HOC, BUOI_HOC | Ba cột JSON của lớp còn tồn tại. danhsachmahocsinh là text[], lichdangky là text[], lichhoc là chuỗi mô tả; cần bảng ghép lớp, đăng ký lịch và lịch lớp nếu chuẩn hóa đầy đủ |
| Giáo viên: lịch rảnh | LICH_RANH_TUAN/CHI_TIET_LICH_RANH; LICH_RANH_DINH_KY | Đã có hàng/cột riêng. Hai loại lịch có ý nghĩa khác nhau: mẫu định kỳ và đăng ký tuần có ngày cụ thể; cần quy tắc ưu tiên rõ ràng |
| Giáo viên: vào lớp, điểm danh, nhận xét | BUOI_HOC, DIEM_DANH_BUOI_HOC, NHAN_XET_BUOI_HOC, TIEU_CHI_NHAN_XET | Có bảng nghiệp vụ nhưng còn đường ghi qua LOP_HOC.chitietcahoc và trigger; chưa có một nguồn lưu duy nhất |
| 5. Giám sát, sự cố, dạy thay | BUOI_HOC, SU_CO_BUOI_HOC; monitoringPersistence | Giám sát ghi ca/sự cố vào bảng riêng. Phân công dạy thay ở lớp và ca cần thống nhất nguồn; danh sách lịch giám sát được dựng từ dữ liệu |
| 6. AI Studio | NHOM_TIEU_CHI/TIEU_CHI/LUA_CHON_TIEU_CHI, TAI_LIEU_QUY_TRINH, CAU_HINH_TRO_LY, VAN_PHONG_NHAN_XET, CAU_HINH_HE_THONG | Cấu hình/danh mục có bảng/cột. Khung thử AI dùng useState/setTimeout và bộ đếm mô phỏng, chưa phải lịch sử AI được lưu. Chỉ cần bảng lịch sử nếu nghiệp vụ yêu cầu lưu kết quả thử |
| 7. Công, giải trình | BANG_CONG_THANG, CONG_DAY_BUOI_HOC, DOI_SOAT_CONG_GIAO_VIEN, GIAI_TRINH_CONG_DAY, LINK_MINH_CHUNG_CONG | Đã chuyển danh sách công/giải trình sang bảng riêng. Tổng hợp công là truy vấn/view; trạng thái khóa, gửi, duyệt và hệ số là dữ liệu cần lưu |
| 8. Báo cáo | Truy vấn dữ liệu nghiệp vụ; MAU_BAO_CAO, CHI_SO_MAU_BAO_CAO, BO_LOC_MAU_BAO_CAO cho mẫu được lưu | Lọc, tìm kiếm, biểu đồ là tính toán từ dữ liệu đã tải, không ghi bảng kết quả. Mẫu được lưu có bảng/cột riêng, đúng nguyên tắc |

## Những điểm cấu trúc chưa hợp lý

1. **Hai nguồn của cùng ca học.** `LOP_HOC.chitietcahoc` vẫn lưu điểm danh,
   nhận xét, giờ vào/ra và trạng thái; BUOI_HOC cùng các bảng con cũng có dữ liệu
   này. Trigger `ghi_cong_khi_du_nhan_xet` còn đọc JSON lớp để ghi ca/nhận xét.
   Không thể chỉ DROP cột: cần chuyển cả đường ghi, đường đọc và trigger.
2. **Quan hệ học sinh–lớp chưa thành hàng riêng.** Mã học sinh nằm trong mảng
   của lớp, còn HOC_SINH.malophientai giữ thêm lớp hiện tại. RPC có kiểm tra mã
   và sĩ số, nhưng từng phần tử mảng không có khóa ngoại riêng. Nếu một học sinh
   học nhiều môn/lớp thì một malophientai cũng không diễn tả đủ quan hệ.
3. **Lịch còn là văn bản.** `LOP_HOC.lichhoc` và `HOC_SINH.lichdangky` chứa
   lịch dùng để xếp lớp nhưng không có khóa khung giờ/ngày riêng cho từng mục.
4. **Số liệu hiển thị còn được lưu.** Số người dùng nhóm quyền, số ca rảnh/bận,
   cờ kín lịch và thông tin đánh giá giáo viên cần xác định nguồn gốc, rồi tính
   từ bảng nghiệp vụ. Nếu giữ cache thì phải có cơ chế cập nhật nhất quán.
5. **TUY_CHON_NGUOI_DUNG chưa có luồng sử dụng.** Trong mã hiện tại chỉ thấy
   khai báo/ánh xạ; activeModule, workspaceMode, teacherPortalTab dùng state.
   Bảng này không cần cho bộ lọc tạm thời. Chỉ giữ nếu thật sự muốn lưu lựa chọn
   giao diện giữa các phiên; chưa nên xóa khi chưa kiểm tra database thực tế.
6. **Ngày còn không đồng nhất.** Ngày bắt đầu/kết thúc giáo viên vẫn khai báo
   text; ngày cập nhật SOP cũng là text. Nên dùng date nếu trường chỉ mang ngày.
   Giờ vào/ra lớp, hết hạn phiên và sự kiện nhật ký cần giữ thời điểm đầy đủ.
7. **Tài liệu cũ và cách cài mới chưa đồng bộ.** DATA_DICTIONARY còn liệt kê
   các JSON đã DROP; schema.sql vẫn tạo cấu trúc trước cập nhật quan hệ.
   Không dùng số bảng trong README để xác định database đã cập nhật đầy đủ.

## Các phần đã chuyển khỏi JSON

Danh mục cấp học/sự cố/tiêu chí/danh mục bổ sung; khối và mô hình giáo viên;
lịch rảnh định kỳ; danh sách biên bản và ca hoàn thành của giáo viên; cấu hình
mẫu báo cáo; tiêu chí nhận xét; link minh chứng; chi tiết nhật ký; danh sách
công và giải trình tháng đã có bảng riêng hoặc được dựng bằng SELECT.

## Cách xác nhận và thứ tự sửa

1. Chạy file SQL chẩn đoán và xuất kết quả. Nó liệt kê JSON/mảng thực tế, bảng
   còn thiếu, trường trùng/tính toán, ngày dạng text, view và trạng thái RLS.
   Dòng cảnh báo là mục cần kiểm tra, không tự kết luận dữ liệu đã sai.
2. Ưu tiên thống nhất ca học/điểm danh/nhận xét/dạy thay và học liệu; đây là
   phần còn JSON có nhiều luồng ghi nhất.
3. Chuẩn hóa điểm dự giờ; quan hệ học sinh–lớp; lịch đăng ký/lịch lớp và quyền.
4. Đối soát dữ liệu trước/sau, kiểm thử thêm/sửa/xóa và tải lại từng phân màn;
   chỉ bỏ cột cũ sau khi mọi đường đọc/ghi chuyển sang nguồn chính.
5. Cập nhật hướng dẫn cài mới và từ điển dữ liệu theo cấu trúc cuối cùng.

Lần rà soát này thêm báo cáo và SQL chẩn đoán; chưa thay đổi cấu trúc hoặc
dữ liệu trên Supabase, chưa triển khai các đề xuất chuyển đổi ở trên.
