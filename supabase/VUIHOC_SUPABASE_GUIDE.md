# Supabase theo hệ thống hiện tại

Chạy toàn bộ vuihoc_full_schema.sql trong Supabase → SQL Editor → New query → Run. File tạo 23 bảng trong schema vuihoc, không sửa/xóa public và schema.sql đã được cập nhật cùng nội dung. Chạy lại cùng phiên bản được; các thay đổi sau này cần migration riêng. File có cấu trúc bảng và dữ liệu mẫu, không phải bản xuất dữ liệu trình duyệt. Dùng supabase/schema.sql hoặc vuihoc_full_schema.sql: hai file có cùng nội dung. File tự đổi tên bảng/cột của bản tiếng Anh trước trong schema vuihoc và giữ dữ liệu. Nếu đồng thời tồn tại cả bảng cũ và bảng mới cùng loại, file dừng thay vì tự gộp.

## Cách lưu dữ liệu

Tên bảng dùng IN_HOA_KHONG_DAU, tên cột tiếng Việt không dấu viết liền. Trong SQL luôn đặt tên bảng trong dấu ngoặc kép, ví dụ vuihoc."LOP_HOC". Key bên trong JSONB giữ nguyên camelCase theo TypeScript. ID text giữ mã USR-01, GV-001, HS-... Các trường ngày/giờ hiển thị giữ text theo giao diện; cần chuyển đổi đúng định dạng khi lọc ngày bằng SQL.

BANG_CONG_THANG lưu mỗi tháng một bản ghi: danhsachgiaovien chứa TeacherPayrollSummary và SessionPayrollRecord, danhsachgiaitrinh chứa DisputeItem. kycong lấy từ key payrollStore (YYYY-MM). GIAO_VIEN.baocaodanhgia chứa EvaluationRecord. LOP_HOC.chitietcahoc giữ map buổi học, điểm danh, nhận xét, tiêu chí; hoclieu và phancongdaythay giữ học liệu và dạy thay. GIAO_VIEN.lichranh giữ map slotId → 7 trạng thái free/busy/none. Key của object JSON giữ theo các interface TypeScript hiện tại. Không nhập trùng các mảng này vào bảng con khác.

## Tích hợp với ứng dụng

AppContext đã bỏ LocalStorage và dữ liệu mặc định; các danh sách khởi tạo trống. Giám sát ca học có state riêng. Chạy SQL không tự chuyển dữ liệu trình duyệt lên Supabase. Hai helper src/lib/supabase.ts và supabaseClient.ts dùng cấu trúc cũ, chưa phải adapter cho file này. Cần đổi sang schema vuihoc, viết ánh xạ CRUD theo bảng dưới ; dữ liệu thử nghiệm được nạp trực tiếp từ SQL. Báo cáo tổng hợp được tính lại từ nghiệp vụ, không lưu số liệu dashboard riêng.

passwordRaw là trường cố ý loại bỏ. Tạo tài khoản bằng Supabase Auth rồi gán UUID vào NGUOI_DUNG.maxacthuc; không nhập mật khẩu thô vào bảng hồ sơ. currentUser/phiên đăng nhập quản lý bằng Auth. Các bộ đếm userCount/freeSlots/busySlots và tên hiển thị được giữ để khôi phục object hiện tại, cần cập nhật cùng nguồn khi dữ liệu thay đổi.

Tất cả bảng bật RLS, chưa cấp quyền/policy anon/authenticated vì frontend chưa dùng Supabase Auth. Backend service_role có quyền và chỉ dùng ở máy chủ. Khi nối trình duyệt: thêm vuihoc vào Exposed schemas, cấp USAGE/CRUD tối thiểu, bổ sung policy theo NGUOI_DUNG.trangthai, roleGroups.permissions và phạm vi giáo viên sau khi dùng Auth. Không chỉ kiểm tra quyền ở UI. Không đặt service_role key trong biến VITE_*. Backend gọi supabase.schema("vuihoc").

Tài liệu RLS: https://supabase.com/docs/guides/database/postgres/row-level-security .

## Ánh xạ trường

### NHOM_QUYEN ← SystemRoleGroup

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| portal | congtruycap | text (nullable) |
| id | madinhdanh | text |
| name | tennhomquyen | text |
| category | phanloai | text |
| desc | mota | text |
| userCount | soluongnguoidung | numeric |
| permissions | danhsachquyen | text[] |
| isDefault | macdinh | boolean (nullable) |

### NGUOI_DUNG ← UserAccount

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| roleGroupId | manhomquyen | text (nullable) |
| id | madinhdanh | text |
| name | hoten | text |
| username | tendangnhap | text |
| passwordRaw | Không lưu; Supabase Auth | — |
| email | thudientu | text |
| phone | sodienthoai | text |
| role | vaitro | text |
| subject | mamonhoc | text (nullable) |
| status | trangthai | text |
| avatarInitials | chucaiavatar | text |

### MON_HOC ← SubjectItem

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| id | madinhdanh | text |
| code | mamonhoc | text |
| abbr | tenviettat | text |
| name | tenmonhoc | text |
| desc | mota | text |
| status | danghoatdong | boolean |

### TRINH_DO ← LevelItem

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| id | madinhdanh | text |
| code | matrinhdo | text |
| abbr | tenviettat | text |
| name | tentrinhdo | text |
| target | doituonghocsinh | text |
| objective | muctieu | text |
| status | danghoatdong | boolean |

### KHUNG_GIO ← TimeSlotItem

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| id | madinhdanh | text |
| code | makhunggio | text |
| name | tenkhunggio | text |
| timeRange | khoanggio | text |
| durationMinutes | sophut | numeric |
| status | danghoatdong | boolean |

### GOI_HOC ← PackageDurationItem

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| id | madinhdanh | text |
| code | magoihoc | text |
| name | tengoihoc | text |
| months | sothang | numeric |
| daysConverted | songayquydoi | numeric |
| status | danghoatdong | boolean |

### MO_HINH_LOP ← ClassModelItem

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| id | madinhdanh | text |
| code | mamohinh | text |
| name | tenmohinh | text |
| maxStudents | sisotoida | numeric |
| status | danghoatdong | boolean |

### CAP_HOC ← CategoryGroup

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| status | danghoatdong | boolean (nullable) |
| id | madinhdanh | text |
| name | tencaphoc | text |
| badge | nhanhienthi | text (nullable) |
| options | danhsachluachon | jsonb |

### DANH_MUC_SU_CO ← IncidentCategory

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| id | madinhdanh | text |
| code | manhomsuco | text |
| name | tennhomsuco | text |
| desc | mota | text (nullable) |
| subIncidents | danhsachsuco | jsonb |

### GIAO_VIEN ← TeacherProfile

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| id | madinhdanh | text |
| name | hoten | text |
| username | tendangnhap | text (nullable) |
| passwordRaw | Kh?ng l?u; Supabase Auth | ← |
| subject | mamonhoc | text |
| subjectName | tenmonhoc | text |
| levelId | macaphoc | text |
| levelName | tencaphoc | text |
| grades | danhsachkhoi | text[] |
| models | danhsachmohinh | text[] (nullable) |
| phone | sodienthoai | text |
| email | thudientu | text |
| degree | bangcap | text |
| startDate | ngaybatdau | text (nullable) |
| endDate | ngayketthuc | text (nullable) |
| status | trangthai | text |
| statusLabel | tentrangthai | text |
| evalStatus | trangthaidanhgia | text |
| evalScore | diemdanhgia | text (nullable) |
| evalComment | nhanxetdanhgia | text |
| evalCriteriaScores | diemtieuchi | jsonb (nullable) |
| freeSlots | socaranh | numeric |
| busySlots | socadaxep | numeric |
| isFull | dakinlich | boolean |
| evaluationReports | baocaodanhgia | jsonb (nullable) |
| successfulSessions | cahochoanthanh | jsonb |
| schedule | lichranh | jsonb |

### HOC_SINH ← StudentRecord

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| id | madinhdanh | text |
| name | hoten | text |
| grade | khoi | text |
| subject | mamonhoc | text |
| model | mamohinh | text |
| level | matrinhdo | text |
| fatherName | hotencha | text (nullable) |
| fatherPhone | sodienthoaicha | text (nullable) |
| motherName | hotenme | text (nullable) |
| motherPhone | sodienthoaime | text (nullable) |
| scheduleSlots | lichdangky | text[] |
| status | trangthai | text |
| currentClassCode | malophientai | text (nullable) |

### LOP_HOC ← ClassItem

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| categoryId | macaphoc | text (nullable) |
| status | trangthai | text (nullable) |
| id | madinhdanh | text |
| code | malophoc | text |
| name | tenlophoc | text |
| grade | khoi | text |
| subject | mamonhoc | text |
| level | matrinhdo | text |
| model | mamohinh | text |
| maxStudents | sisotoida | numeric |
| studentIds | danhsachmahocsinh | text[] |
| schedule | lichhoc | text |
| roomLink | lienketphonghoc | text |
| teacherName | hotengiaovien | text |
| teacherId | magiaovien | text (nullable) |
| materials | hoclieu | jsonb |
| activeSessions | chitietcahoc | jsonb (nullable) |
| coverAssignments | phancongdaythay | jsonb (nullable) |

### NHOM_TIEU_CHI ← CriteriaCategory

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| id | madinhdanh | text |
| subject | mamonhoc | text |
| name | tennhomtieuchi | text |
| criteria | danhsachtieuchi | jsonb |

### TAI_LIEU_QUY_TRINH ← SOPDocument

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| id | madinhdanh | text |
| title | tieude | text |
| category | phanloai | text |
| summary | tomtat | text |
| updatedAt | ngaycapnhat | text |
| content | noidung | text |
| sourceFileName | tentepgoc | text (nullable) |
| sourceFileType | loaitepgoc | text (nullable) |
| isEnabled | dangsudung | boolean (nullable) |

### CAU_HINH_TRO_LY ← RAGBotConfig

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| welcomeGreeting | loichaomung | text |
| quickPrompts | cauhoinhanh | text[] |
| personaTone | vanphong | text |
| strictGroundingOnly | chiduatrentailieu | boolean |
| fallbackResponse | cautraloiduphong | text |
| systemPrompt | chidanhethong | text |

### BANG_CONG_THANG ← MonthPayrollData

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| isLocked | dakhoa | boolean |
| adminSentNotice | daguithongbao | boolean |
| GIAO_VIEN | danhsachgiaovien | jsonb |
| disputes | danhsachgiaitrinh | jsonb |

### CA_HOC ← MonitoringSession

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| sessionCode | macahoc | text |
| sessionDate | ngayhoc | text |
| classCode | malophoc | text |
| className | tenlophoc | text |
| levelText | tentrinhdo | text |
| modelText | tenmohinh | text |
| subject | mamonhoc | text |
| grade | khoi | numeric |
| timeSlot | cahoc | text |
| room | phonghoc | text |
| roomUrl | lienketphonghoc | text |
| recordingUrl | lienketbanghi | text (nullable) |
| primaryTeacher | giaovienchinh | text |
| coverTeacher | giaoviendaythay | text (nullable) |
| attendance | diemdanh | text |
| checkinTime | giovaolop | text (nullable) |
| status | trangthai | text |
| hasIncident | cosuco | boolean |
| incidentParent | manhomsuco | text (nullable) |
| incidentChild | masuco | text (nullable) |
| incidentUrgency | muckhancap | text (nullable) |
| incidentStatus | trangthaisuco | text (nullable) |
| incidentNote | ghichusuco | text |
| handledByOpsId | manguoixuly | text (nullable) |
| handledByName | hotenguoixuly | text (nullable) |
| handledAt | thoigianxuly | text (nullable) |
| lessonDiary | nhatkybuoihoc | text |
| HOC_SINH | danhsachhocsinh | jsonb |
| isJustUpdated | vuacapnhat | boolean (nullable) |

### MAU_BAO_CAO ← SavedReportTemplate

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| id | madinhdanh | text |
| name | tenmaubaocao | text |
| config | cauhinh | jsonb |

### DANH_MUC_BO_SUNG ← Catalog

| Trường ứng dụng | Cột SQL | Kiểu |
|---|---|---|
| id | madinhdanh | text |
| code | madanhmuc | text |
| name | tendanhmuc | text |
| desc | mota | text |
| parentId | madanhmuccha | text (nullable) |
| entries | danhsachmuc | jsonb |

## Trường bổ sung

- NGUOI_DUNG.maxacthuc → auth.NGUOI_DUNG.madinhdanh; GIAO_VIEN.manguoidung → NGUOI_DUNG.madinhdanh; MAU_BAO_CAO.manguoidung → NGUOI_DUNG.madinhdanh.
- BANG_CONG_THANG.kycong (YYYY-MM), locked_at, unlock_reason.
- VAN_PHONG_NHAN_XET: id từ key toneDirectives, name, directive. CAU_HINH_HE_THONG: id=global, active_tone_key từ activeToneKey.
- LUOT_NHAN_XET_AI: teacher_id, student_id, usage_count từ vuihoc_ai_review_count_{teacherId}_{studentId}.
- TUY_CHON_NGUOI_DUNG: user_id, active_module, workspace_mode, teacher_portal_tab.
- Các bảng có created_at/updated_at và trigger tự cập nhật updated_at. TAI_LIEU_QUY_TRINH.ngaycapnhat giữ text theo interface; trigger ghi thời gian dưới dạng chuỗi khi sửa.

## Tính toàn vẹn và nguồn dữ liệu

Monitoring dùng mã môn TOAN/ANH, khác SUB-MATH/SUB-ENG; adapter cần chuyển đổi. ID nhúng trong JSON/mảng studentIds và mã danh mục cần validation phía backend; không có FK vào key JSON. Thiết kế giữ đầy đủ object hiện tại, chưa tách mảng thành bảng con. Thay đổi nhiều object liên quan cần giao dịch backend. JSONB kiểm tra kiểu object/array cấp ngoài; chưa kiểm tra từng key.

Các khóa LocalStorage cũ được dọn: vuihoc_tutor_central_clean_v3_{NGUOI_DUNG,roleGroups,teachingCategories,MON_HOC,TRINH_DO,timeSlots,packages,models,incidents,GIAO_VIEN,HOC_SINH,LOP_HOC,criteria,sopDocs,ragConfig,activeToneKey,toneDirectives,payrollStore}; vuihoc_shared_custom_catalogs_v1; vuihoc_custom_report_templates_v1_{userId}; bộ đếm AI. Flag demo, toast và bộ lọc không phải dữ liệu nghiệp vụ.

## Kiểm tra

Cuối SQL trả danh sách bảng và trạng thái RLS. Kiểm tra Table Editor → schema vuihoc. Đã đối chiếu mã nguồn và chạy PostgreSQL tạm: tạo bảng, nạp 79 bản ghi, kiểm tra mã tham chiếu, lịch giáo viên, chạy lại không nhân đôi/không ghi đè dữ liệu đã sửa, trigger cập nhật thời gian và quyền truy cập anon/service_role đều qua. Chưa chạy trên project Supabase thực tế vì phiên này chưa có kết nối project.

## Dữ liệu mẫu và việc xóa dữ liệu local

Đã chuyển dữ liệu mẫu ra khỏi frontend. Khi mở lại/tải lại ứng dụng đã cập nhật, mã khởi động xóa các khóa vuihoc_* trong localStorage và sessionStorage của origin hiện tại. Các origin khác (localhost với cổng khác hoặc tên miền khác) chỉ được dọn khi mở ứng dụng đã cập nhật tại origin đó. Không có quyền truy cập trực tiếp mọi hồ sơ trình duyệt từ phiên sửa mã này.

Danh mục bổ sung, mẫu báo cáo và bộ đếm AI hiện chỉ ở bộ nhớ phiên; tải lại sẽ mất trước khi adapter Supabase được triển khai. Đã bỏ nút khôi phục mẫu; chế độ quản trị xem trước cho phép vào giao diện không đăng nhập. Danh tính xem trước chỉ ở bộ nhớ và không nằm trong danh sách tài khoản nghiệp vụ. Supabase chưa được nối CRUD/Auth; vì vậy các danh sách nghiệp vụ còn trống cho tới khi nạp dữ liệu Supabase.

SQL có 9 hồ sơ người dùng, 6 giáo viên, 6 học sinh (1 chờ xếp lớp), 5 lớp, 8 ca học (1 chưa diễn ra), 2 báo cáo dự giờ, 1 kỳ công tháng 10/2026, 1 giải trình chờ duyệt và danh mục/cấu hình phục vụ các phân hệ. Các link example.com là địa chỉ minh họa. Rerun dùng ON CONFLICT DO NOTHING, không ghi đè bản ghi đã chỉnh sửa.

Các hồ sơ mẫu dùng email demo.*@example.com. SQL không tạo tài khoản đăng nhập Auth và không lưu mật khẩu. Để thử đăng nhập sau khi nối Auth, tạo tài khoản trong Supabase Authentication và gán auth_user_id của hồ sơ tương ứng. Trước đó vẫn cần adapter CRUD, đăng nhập Auth và RLS theo vai trò; chỉ nhập URL/key chưa hoàn tất tích hợp.

Bộ mẫu thống nhất mã lớp, môn, trình độ, mô hình, học sinh, giáo viên, ca dạy và bảng công. Tình huống: dạy chuẩn, đi muộn có giải trình, học sinh nghỉ phép, sự cố thiết bị, dạy thay và ca sắp diễn ra. Tiêu chí tiếng Anh và Toán được lưu riêng. SQL có dữ liệu cho cả 23 bảng.

Báo cáo đã bỏ bộ số liệu viết cứng và tổng hợp từ dữ liệu nghiệp vụ. Adapter sau này cần giữ created_at dưới dạng createdAt hoặc created_at khi nạp lớp/học sinh/giáo viên để các bộ lọc ngày tạo có dữ liệu; không tự gán ngày giả cho bản ghi thiếu ngày.

## Quy ước tên mới

Ví dụ: LOP_HOC có madinhdanh, malophoc, tenlophoc, mamonhoc, matrinhdo, mamohinh, magiaovien; CA_HOC có macahoc, ngayhoc, malophoc, tenlophoc, cahoc, diemdanh. Bảng giữ đúng chữ hoa nhờ dấu ngoặc kép của PostgreSQL; gọi API bằng tên không kèm dấu ngoặc, ví dụ supabase.schema("vuihoc").from("LOP_HOC").select("*"). Key JSONB giữ camelCase của object ứng dụng, chưa phải cột SQL riêng. Ánh xạ đầy đủ nằm trong src/lib/databaseNames.ts.

Bỏ qua đăng nhập chỉ áp dụng giao diện xem trước; không thay đổi RLS và quyền dữ liệu Supabase. Không thêm dữ liệu mẫu vào LocalStorage.

## Vào hệ thống để xem trước

`src/lib/previewMode.ts` bật `PORTAL_PREVIEW_MODE = true`: vào trực tiếp với quyền quản trị xem trước, không tạo tài khoản trong dữ liệu nghiệp vụ. Chế độ này chỉ mở giao diện; dữ liệu Supabase cần adapter CRUD và cấu hình kết nối. `src/lib/databaseNames.ts` chứa ánh xạ đầy đủ tên bảng/cột.
