> Cập nhật biên bản dự giờ: schema hiện có 32 bảng. BIEN_BAN_DU_GIO có FK bắt buộc tới GIAO_VIEN; xem [TEACHER_EVALUATIONS.md](TEACHER_EVALUATIONS.md). Luồng UI vẫn chưa chuyển sang CRUD bảng này.

> Cập nhật sau rà soát: đã bổ sung 8 bảng theo thời gian, tổng 31 bảng; xem [TIMED_WORKFLOW.md](TIMED_WORKFLOW.md). Các thiếu hụt cấu trúc tuần/ca/công nêu dưới đã có mô hình mới và kiểm thử database. Các màn UI cũ chưa chuyển nguồn; đánh giá tích hợp UI dưới đây vẫn áp dụng.

# Kiểm tra khả năng lưu dữ liệu và liên thông toàn hệ thống

Ngày kiểm tra: 11/10/2026. Phạm vi: 8 phân hệ quản trị, 4 màn nghiệp vụ giáo viên và màn đăng nhập được khai báo trong src/App.tsx; kèm các component danh mục và báo cáo.

**Kết luận: chưa sẵn sàng kết nối rồi sử dụng ngay.** Có cấu trúc lưu phần lớn object hiện tại, nhưng chưa có đường đọc/ghi từ màn hình đến Supabase và vẫn thiếu dữ liệu ngữ cảnh để lưu đúng nhiều tuần, lịch sử ca, hội thoại và tệp. Không được xem kết quả kiểm tra schema là bằng chứng giao diện đã lưu.

## Kết quả tự động đã xác minh

- schema.sql và vuihoc_full_schema.sql giống nhau; tạo mới và chạy lại thành công trên PGlite (PostgreSQL chạy cục bộ).
- 23 bảng trên database mới, không tạo GOI_HOC.
- 17 interface được kiểm tra, tổng 166 trường cấp đầu, bao gồm hai trường passwordRaw cố ý không lưu. Các trường còn lại có ánh xạ.
- 234 trường ánh xạ (gồm timestamp và metadata ngoài interface) có cột SQL tương ứng.
- 76 bản ghi mẫu đọc → mapper UI → mapper SQL giữ nguyên các giá trị được mapper ghi ra.
- Nhật ký ghi dữ liệu trước/sau, trường thay đổi, auth UID; rollback nghiệp vụ đồng thời rollback nhật ký.
- UPDATE không đổi nội dung và cập nhật tùy chọn điều hướng không tạo nhật ký nghiệp vụ.
- Khóa ngoại môn học từ HOC_SINH từ chối mã không tồn tại.
- TypeScript và các bài kiểm tra workflow, evaluation, customReports, accessControl, portalPermissions, previewAndSchema đều qua.

Bài kiểm tra: tests/databaseContract.test.ts. Cần PGLITE_MODULE_PATH trỏ đến thư mục cài @electric-sql/pglite. Bài kiểm tra không kết nối tài khoản Supabase thật, không chạy trình duyệt, không chứng minh Auth/RLS hay lưu UI đã hoạt động. JSONB nhận được object không có nghĩa mọi liên kết bên trong object đã được database kiểm tra.

## Từng màn hình

| Màn | Dữ liệu nghiệp vụ cần lưu | Nơi chứa hiện có | Tình trạng |
| --- | --- | --- | --- |
| Đăng nhập | Danh tính, trạng thái khóa, phiên xác thực | NGUOI_DUNG.maxacthuc + Supabase Auth | Chưa dùng Supabase Auth; LoginView so tài khoản trong bộ nhớ; PORTAL_PREVIEW_MODE=true |
| PH1 Tài khoản/nhóm quyền | Hồ sơ, nhóm quyền, quyền, khóa/mở | NGUOI_DUNG, NHOM_QUYEN | Có trường hiện tại; chưa CRUD/Auth, cấp/đổi mật khẩu chưa nối Auth |
| PH2 Danh mục | Môn, trình độ, khung giờ, mô hình, cấp học, cây sự cố; danh mục bổ sung | Các bảng danh mục; DANH_MUC_BO_SUNG | Có trường hiện tại; danh mục bổ sung nằm runtimeStorage; chưa CRUD |
| PH3 Giáo viên/dự giờ | Hồ sơ, điểm, biên bản, người nhận, trạng thái gửi | GIAO_VIEN, baocaodanhgia, diemtieuchi | Có trường hiện tại; chưa lưu database; danh sách ca thành công chưa có pipeline đồng bộ từ ca thực |
| PH4 Học sinh/lớp | Học sinh, phụ huynh, ghép lớp, phân công, lịch, học liệu, phòng | HOC_SINH, LOP_HOC | Có trường hiện tại; ghép học sinh và cập nhật lớp cần giao dịch; mã trong mảng/JSONB chưa có FK |
| PH5 Giám sát/sự cố | Ca theo ngày, check-in, sự cố, người xử lý, cover, ghi chú | CA_HOC; LOP_HOC.phancongdaythay | Có trường MonitoringSession; state sessions riêng, không đọc/ghi CA_HOC; biên bản chưa liên thông bảng công |
| PH6 AI/SOP | Cây tiêu chí, văn phong, cấu hình bot, tài liệu/nội dung | NHOM_TIEU_CHI, VAN_PHONG_NHAN_XET, CAU_HINH_TRO_LY, TAI_LIEU_QUY_TRINH | Có trường hiện tại; chưa CRUD; chỉ giữ tên/loại và nội dung trích xuất, chưa có đường dẫn tệp gốc |
| PH7 Đối soát quản trị | Kỳ công, hệ số, gửi công, giải trình, khóa/mở | BANG_CONG_THANG + JSONB | Có trường object hiện tại; chưa sinh công từ ca thực; khóa/mở chưa cập nhật thoigiankhoa/lydomokhoa dù SQL có cột |
| PH8 Báo cáo | Mẫu báo cáo đã lưu; dữ liệu tổng hợp đọc từ nghiệp vụ | MAU_BAO_CAO, các bảng nguồn | Mẫu vẫn ở runtimeStorage; báo cáo dựa trên dữ liệu bộ nhớ; cần nguồn ca nhất quán |
| Giáo viên: lịch/vào lớp/hoàn tất/điểm danh/nhận xét | Ca, thời điểm và người thao tác, điểm danh, nhận xét/tiêu chí | LOP_HOC.chitietcahoc; LUOT_NHAN_XET_AI | Có JSONB và trường checkinAt/checkoutAt trong kiểu UI; chưa ghi database; key ca chỉ 1/2 có thể ghi đè ca tuần trước |
| Giáo viên: lịch rảnh | Lịch theo giáo viên, tuần/ngày hiệu lực, trạng thái khung giờ | GIAO_VIEN.lichranh | Chỉ giữ map khung giờ → 7 ngày; ngày từ/đến và năm học không đi vào dữ liệu lưu |
| Giáo viên: đánh giá | Xem/tạo biên bản dự giờ gắn giáo viên/ca | GIAO_VIEN.baocaodanhgia | Có trường hiện tại; chưa lưu database; liên kết nằm JSONB, chưa FK cho ca |
| Giáo viên: công/giải trình | Công của mình, nội dung, minh chứng, quyết định | BANG_CONG_THANG.danhsachgiaitrinh/danhsachgiaovien | Có trường hiện tại; minh chứng chỉ là chuỗi tên tệp, chưa upload/lưu nội dung |
| Thành phần chatbot trong lịch dạy | Phiên chat, câu hỏi/trả lời, nguồn tham khảo, thời gian, xóa lịch sử | Chỉ botMessages useState | Chưa có bảng/adapter cho hội thoại; đóng chat đang xóa nội dung trong bộ nhớ |

Bộ lọc, phân trang, mở/đóng modal, chọn tab, trạng thái hover không bắt buộc lưu. Bộ lọc nằm trong mẫu báo cáo được người dùng chủ động bấm lưu thì là một phần cấu hình nghiệp vụ cần lưu.

## Các điểm chưa đạt và bằng chứng

1. **Chưa nối đọc/ghi UI.** AppContext khởi tạo dữ liệu trống và thay đổi bằng setState. Không có lời gọi Supabase trong các màn .tsx. runtimeStorage chỉ là Map, mất khi tải lại trang.
2. **API dùng sai tên bảng/cột.** src/lib/supabase.ts và supabaseClient.ts còn gọi users, students, classes, teaching_sessions, dispute_requests, payroll_records và disputes; schema hiện dùng NGUOI_DUNG/HOC_SINH/LOP_HOC/CA_HOC/BANG_CONG_THANG. Một số bảng cũ không tồn tại ngay cả trong mapping.
3. **Auth và quyền chưa nối.** LoginView dùng findLoginAccount; mapper không lưu passwordRaw; không thể đọc password từ Auth để khôi phục UI cũ. SQL revoke quyền schema/bảng của anon/authenticated. Chưa có policy client, chưa xác minh Exposed schemas trên project thật.
4. **Lịch rảnh thiếu ngữ cảnh tuần.** TeacherAvailabilityView.handleSaveAvailability chỉ gửi schedule và freeSlots, không gửi fromDate/toDate/selectedSchoolYear. Đổi bộ lọc tuần không tạo lịch riêng.
5. **Ca lịch sử có thể bị ghi đè.** LOP_HOC.activeSessions dùng key selectedSessionNum (1/2) và dateStr trong giá trị. Bấm ca cùng thứ ở tuần mới thay object của tuần trước. Cần định danh ổn định theo lớp + ngày + khung giờ hoặc dùng CA_HOC làm nguồn chính.
6. **Giám sát và nhận xét chưa đồng nhất.** Module5 giữ sessions riêng. Ghi sự cố cập nhật sessions; chỉ coverAssignments được đẩy sang classes. Khi dựng học sinh trong ca, aiComment='' và criteria=[] thay vì đọc feedback/feedbackCriteria từ ca lớp.
7. **Sự cố/cover vào sai kỳ công.** AppContext.reportIncidentToSession và assignCoverTeacher đều cố định monthKey='2026-09'. Chưa tính kỳ từ ngày ca và chưa tạo/chuyển ca công theo giáo viên cover.
8. **Bảng công chưa tự tạo từ ca.** Không có pipeline đưa ca hoàn tất/ca hủy/check-out/điểm danh sang payrollStore. Có cột lưu không đồng nghĩa ca phát sinh tự vào bảng công.
9. **Liên kết SQL chưa bao phủ dữ liệu lồng.** danhsachmahocsinh, coverAssignments, điểm danh/nhận xét, báo cáo dự giờ, công và giải trình ở mảng/JSONB không có FK tới từng học sinh/giáo viên/ca. CA_HOC.malophoc chưa có FK tới LOP_HOC; giaovienchinh/giaoviendaythay dùng tên, thiếu mã liên kết riêng.
10. **Tệp và chat thiếu nơi lưu hoàn chỉnh.** Giải trình chỉ giữ tên tệp; SOP chưa có storage bucket/path; hội thoại không có bảng. Cần metadata tệp và Supabase Storage, không chỉ cột tên.
11. **Nhật ký thay đổi chưa bao phủ mọi hành động.** NHAT_KY_NGHIEP_VU ghi khi database có INSERT/UPDATE/DELETE; không tự biết người dùng bấm vào lớp lần nữa, xuất báo cáo, mở học liệu hay gửi chat nếu không có ghi database. Cần sự kiện nghiệp vụ có loại hành động, đối tượng, người thực hiện, thời gian, payload và mã chống lặp cho các hành động cần truy vết nhưng không đổi trạng thái.

## Các cấu trúc cần hoàn thiện trước khi chốt “đủ trường, kết nối chạy ngay”

| Phần | Dữ liệu/nguyên tắc cần bổ sung |
| --- | --- |
| Lịch rảnh theo tuần | Mã giáo viên, tuần/ngày bắt đầu-kết thúc hiệu lực, mã khung giờ, ngày/thứ, trạng thái, người và thời điểm cập nhật; không dùng một lịch duy nhất cho mọi tuần |
| Ca học làm nguồn chung | ID ca ổn định, mã lớp, ngày, mã khung giờ, mã giáo viên chính/cover, check-in/check-out, người thao tác; unique lớp/ngày/khung giờ, FK lớp/giáo viên |
| Điểm danh/nhận xét | Gắn ID ca + ID học sinh; lịch sử và liên kết không phụ thuộc map buổi 1/2 bị ghi đè |
| Sự cố và công | ID ca dùng chung từ giám sát → sự cố/cover → công → giải trình → báo cáo; cập nhật cùng giao dịch, kỳ từ ngày ca |
| Chat và tệp | Phiên chat/tin nhắn/nguồn; metadata tệp có bucket/path, loại, kích thước, chủ sở hữu và đối tượng liên quan |
| Hành động không đổi bản ghi | Sự kiện có mã/loại hành động, danh tính Auth, đối tượng, giờ server và payload; không dựa hoàn toàn vào trigger cập nhật |
| Lưu đồng thời | API/RPC/giao dịch, kiểm tra phiên bản để tránh người dùng sau ghi đè cả JSONB của người trước; trả lỗi rõ và chỉ báo thành công sau commit |

## Điều kiện nghiệm thu kết nối thật

Tạo/sửa/xóa qua UI → database xác nhận → tải lại trang → đăng nhập bằng tài khoản thứ hai → thấy đúng dữ liệu và phạm vi quyền. Kiểm tra riêng luồng đăng ký lịch rảnh hai tuần, xếp lớp, vào lớp, điểm danh, nhận xét, hoàn tất, sự cố, cover, sinh công, giải trình, duyệt, gửi/khóa/mở kỳ và báo cáo. Hai tuần không được ghi đè nhau; ca chỉ phát sinh một bản ghi công; mất mạng/lỗi quyền không được báo thành công.

Chưa có bằng chứng nghiệm thu này trên project Supabase thật. Những điểm chưa đạt ở trên được phát hiện trong lần rà soát này, chưa được sửa chỉ bằng việc thêm bài kiểm tra.
