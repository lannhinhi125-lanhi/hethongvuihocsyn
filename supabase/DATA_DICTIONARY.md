# Bảng đối chiếu giao diện và Supabase

Bộ [schema.sql](schema.sql) tạo 32 bảng trong schema vuihoc và dữ liệu mẫu. Mở SQL Editor, chạy toàn bộ file; sau đó chọn schema vuihoc trong Table Editor. Chạy [verify_schema.sql](verify_schema.sql) để kiểm tra cấu trúc.

## Trạng thái tích hợp

Giao diện hiện giữ dữ liệu trong bộ nhớ (AppContext/runtimeStorage), chưa tự ghi vào database. RLS chỉ cấp quyền service_role; anon/authenticated chưa được đọc/ghi. Chỉ điền URL/key chưa đủ để lưu. Helper cũ trong src/lib/supabase.ts và supabaseClient.ts còn dùng tên bảng tiếng Anh, cần chuyển qua supabaseMapper.ts và nối CRUD/Auth với giao diện. service_role chỉ dùng phía backend.

## Phân hệ và nơi lưu

| Nghiệp vụ | Bảng/cột |
| --- | --- |
| Tài khoản, phân quyền | NGUOI_DUNG, NHOM_QUYEN |
| Danh mục | MON_HOC, TRINH_DO, KHUNG_GIO, MO_HINH_LOP, CAP_HOC, DANH_MUC_SU_CO, DANH_MUC_BO_SUNG |
| Hồ sơ, lịch rảnh, đánh giá giáo viên | GIAO_VIEN; lichranh, baocaodanhgia, diemtieuchi |
| Học sinh, phụ huynh | HOC_SINH |
| Lớp, học liệu, điểm danh, nhận xét | LOP_HOC; hoclieu, chitietcahoc, phancongdaythay |
| Giám sát ca, check-in, sự cố | CA_HOC |
| Bảng công, hệ số công, giải trình | BANG_CONG_THANG; danhsachgiaovien, danhsachgiaitrinh |
| AI, SOP | NHOM_TIEU_CHI, TAI_LIEU_QUY_TRINH, CAU_HINH_TRO_LY, VAN_PHONG_NHAN_XET, LUOT_NHAN_XET_AI |
| Báo cáo | MAU_BAO_CAO; số liệu tính từ bảng nghiệp vụ |
| Cấu hình | CAU_HINH_HE_THONG, TUY_CHON_NGUOI_DUNG |

## Dữ liệu lồng và quy ước lưu

- LOP_HOC.chitietcahoc: object theo số buổi, chứa attendance, feedback, feedbackCriteria và các trường ClassRoomSession.
- GIAO_VIEN.lichranh: mã khung giờ → danh sách trạng thái trong tuần. baocaodanhgia chứa EvaluationRecord.
- BANG_CONG_THANG.danhsachgiaovien chứa TeacherPayrollSummary, sessions và hệ số công; danhsachgiaitrinh chứa DisputeItem.
- Cây tiêu chí, cây sự cố và danh mục bổ sung dùng JSONB. Key bên trong giữ nguyên camelCase.
- Khóa ngoại SQL không kiểm tra mã nằm sâu trong JSONB. Backend cần kiểm tra liên kết, cập nhật nhất quán và tránh ghi đè thay đổi của người khác.
- passwordRaw không lưu. NGUOI_DUNG.matkhau_mahoa lưu bản mã; matkhau_bam chỉ giữ tương thích mật khẩu cũ. Phiên đăng nhập trong NGUOI_DUNG. Không dùng Supabase Auth. Xem SIMPLE_ACCOUNTS.md.
- Ngày tạo/cập nhật do SQL quản lý; SOP.updatedAt được mapper ánh xạ riêng.
- Dùng toSupabaseRow/fromSupabaseRow khi gửi/nhận dữ liệu. Chỉ báo lưu thành công khi database xác nhận. Kiểm thử thêm/sửa/xóa và tải lại trang sau khi tích hợp.

## Chi tiết từng trường

### NHOM_QUYEN (role_groups)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| portal | congtruycap | text CHECK ("congtruycap" IN ('ADMIN', 'TEACHER')) |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| name | tennhomquyen | text NOT NULL |
| category | phanloai | text NOT NULL CHECK ("phanloai" IN ('HỆ THỐNG', 'CHUYÊN MÔN', 'VẬN HÀNH', 'GIẢNG DẠY')) |
| desc | mota | text NOT NULL |
| userCount | soluongnguoidung | numeric NOT NULL |
| permissions | danhsachquyen | text[] NOT NULL DEFAULT ARRAY[]::text[] |
| isDefault | macdinh | boolean |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### NGUOI_DUNG (users)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| roleGroupId | manhomquyen | text |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| name | hoten | text NOT NULL |
| username | tendangnhap | text NOT NULL |
| email | thudientu | text NOT NULL |
| phone | sodienthoai | text NOT NULL |
| role | vaitro | text NOT NULL |
| subject | mamonhoc | text |
| status | trangthai | text NOT NULL CHECK ("trangthai" IN ('active', 'locked')) |
| avatarInitials | chucaiavatar | text NOT NULL |
| auth_user_id (ngừng dùng) | maxacthuc | uuid UNIQUE, giữ dữ liệu cũ; không còn FK auth.users và không gửi tới UI |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### MON_HOC (subjects)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| code | mamonhoc | text NOT NULL |
| abbr | tenviettat | text NOT NULL |
| name | tenmonhoc | text NOT NULL |
| desc | mota | text NOT NULL |
| status | danghoatdong | boolean NOT NULL |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### TRINH_DO (levels)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| code | matrinhdo | text NOT NULL |
| abbr | tenviettat | text NOT NULL |
| name | tentrinhdo | text NOT NULL |
| target | doituonghocsinh | text NOT NULL |
| objective | muctieu | text NOT NULL |
| status | danghoatdong | boolean NOT NULL |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### KHUNG_GIO (time_slots)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| code | makhunggio | text NOT NULL |
| name | tenkhunggio | text NOT NULL |
| timeRange | khoanggio | text NOT NULL |
| durationMinutes | sophut | numeric NOT NULL |
| status | danghoatdong | boolean NOT NULL |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### MO_HINH_LOP (class_models)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| code | mamohinh | text NOT NULL |
| name | tenmohinh | text NOT NULL |
| maxStudents | sisotoida | numeric NOT NULL |
| status | danghoatdong | boolean NOT NULL |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### CAP_HOC (teaching_categories)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| status | danghoatdong | boolean |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| name | tencaphoc | text NOT NULL |
| badge | nhanhienthi | text |
| options | danhsachluachon | jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("danhsachluachon") = 'array') |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### DANH_MUC_SU_CO (incident_categories)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| code | manhomsuco | text NOT NULL |
| name | tennhomsuco | text NOT NULL |
| desc | mota | text |
| subIncidents | danhsachsuco | jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("danhsachsuco") = 'array') |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### GIAO_VIEN (teachers)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| name | hoten | text NOT NULL |
| username | tendangnhap | text |
| subject | mamonhoc | text NOT NULL |
| subjectName | tenmonhoc | text NOT NULL |
| levelId | macaphoc | text NOT NULL |
| levelName | tencaphoc | text NOT NULL |
| grades | danhsachkhoi | text[] NOT NULL DEFAULT ARRAY[]::text[] |
| models | danhsachmohinh | text[] |
| phone | sodienthoai | text NOT NULL |
| email | thudientu | text NOT NULL |
| degree | bangcap | text NOT NULL |
| startDate | ngaybatdau | text |
| endDate | ngayketthuc | text |
| status | trangthai | text NOT NULL CHECK ("trangthai" IN ('DANG_DAY', 'CHO_LOP', 'TAM_NGUNG')) |
| statusLabel | tentrangthai | text NOT NULL |
| evalStatus | trangthaidanhgia | text NOT NULL CHECK ("trangthaidanhgia" IN ('SCORED', 'UNSCORED')) |
| evalScore | diemdanhgia | text |
| evalComment | nhanxetdanhgia | text NOT NULL |
| evalCriteriaScores | diemtieuchi | jsonb CHECK (jsonb_typeof("diemtieuchi") = 'object') |
| freeSlots | socaranh | numeric NOT NULL |
| busySlots | socadaxep | numeric NOT NULL |
| isFull | dakinlich | boolean NOT NULL |
| evaluationReports | baocaodanhgia | jsonb CHECK (jsonb_typeof("baocaodanhgia") = 'array') |
| successfulSessions | cahochoanthanh | jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("cahochoanthanh") = 'array') |
| schedule | lichranh | jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof("lichranh") = 'object') |
| user_id | manguoidung | text UNIQUE REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### HOC_SINH (students)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| name | hoten | text NOT NULL |
| grade | khoi | text NOT NULL |
| subject | mamonhoc | text NOT NULL |
| model | mamohinh | text NOT NULL |
| level | matrinhdo | text NOT NULL |
| fatherName | hotencha | text |
| fatherPhone | sodienthoaicha | text |
| motherName | hotenme | text |
| motherPhone | sodienthoaime | text |
| scheduleSlots | lichdangky | text[] NOT NULL DEFAULT ARRAY[]::text[] |
| status | trangthai | text NOT NULL CHECK ("trangthai" IN ('Chờ xếp lớp', 'Đang học', 'Bảo lưu', 'Đã thôi học')) |
| currentClassCode | malophientai | text |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### LOP_HOC (classes)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| categoryId | macaphoc | text |
| status | trangthai | text CHECK ("trangthai" IN ('Chờ khai giảng', 'Đang học', 'Tạm dừng', 'Đã kết thúc')) |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| code | malophoc | text NOT NULL |
| name | tenlophoc | text NOT NULL |
| grade | khoi | text NOT NULL |
| subject | mamonhoc | text NOT NULL |
| level | matrinhdo | text NOT NULL |
| model | mamohinh | text NOT NULL |
| maxStudents | sisotoida | numeric NOT NULL |
| studentIds | danhsachmahocsinh | text[] NOT NULL DEFAULT ARRAY[]::text[] |
| schedule | lichhoc | text NOT NULL |
| roomLink | lienketphonghoc | text NOT NULL |
| teacherName | hotengiaovien | text NOT NULL |
| teacherId | magiaovien | text |
| materials | hoclieu | jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("hoclieu") = 'array') |
| activeSessions | chitietcahoc | jsonb CHECK (jsonb_typeof("chitietcahoc") = 'object') |
| coverAssignments | phancongdaythay | jsonb CHECK (jsonb_typeof("phancongdaythay") = 'array') |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### NHOM_TIEU_CHI (criteria_categories)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| subject | mamonhoc | text NOT NULL |
| name | tennhomtieuchi | text NOT NULL |
| criteria | danhsachtieuchi | jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("danhsachtieuchi") = 'array') |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### TAI_LIEU_QUY_TRINH (sop_documents)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| title | tieude | text NOT NULL |
| category | phanloai | text NOT NULL |
| summary | tomtat | text NOT NULL |
| updatedAt | ngaycapnhat | text NOT NULL |
| content | noidung | text NOT NULL |
| sourceFileName | tentepgoc | text |
| sourceFileType | loaitepgoc | text CHECK ("loaitepgoc" IN ('PDF', 'DOCX')) |
| isEnabled | dangsudung | boolean |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |

### CAU_HINH_TRO_LY (rag_bot_config)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| welcomeGreeting | loichaomung | text NOT NULL |
| quickPrompts | cauhoinhanh | text[] NOT NULL DEFAULT ARRAY[]::text[] |
| personaTone | vanphong | text NOT NULL |
| strictGroundingOnly | chiduatrentailieu | boolean NOT NULL |
| fallbackResponse | cautraloiduphong | text NOT NULL |
| systemPrompt | chidanhethong | text NOT NULL |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### BANG_CONG_THANG (monthly_payroll)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| isLocked | dakhoa | boolean NOT NULL |
| adminSentNotice | daguithongbao | boolean NOT NULL |
| teachers | danhsachgiaovien | jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("danhsachgiaovien") = 'array') |
| disputes | danhsachgiaitrinh | jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("danhsachgiaitrinh") = 'array') |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| month_period | kycong | text NOT NULL UNIQUE CHECK (kycong ~ '^\d{4}-(0[1-9]|1[0-2])$') |
| locked_at | thoigiankhoa | timestamptz |
| unlock_reason | lydomokhoa | text |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### CA_HOC (teaching_sessions)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| sessionCode | macahoc | text NOT NULL |
| sessionDate | ngayhoc | text NOT NULL |
| classCode | malophoc | text NOT NULL |
| className | tenlophoc | text NOT NULL |
| levelText | tentrinhdo | text NOT NULL |
| modelText | tenmohinh | text NOT NULL |
| subject | mamonhoc | text NOT NULL CHECK ("mamonhoc" IN ('SUB-MATH', 'SUB-ENG')) |
| grade | khoi | numeric NOT NULL |
| timeSlot | cahoc | text NOT NULL |
| room | phonghoc | text NOT NULL |
| roomUrl | lienketphonghoc | text NOT NULL |
| recordingUrl | lienketbanghi | text |
| primaryTeacher | giaovienchinh | text NOT NULL |
| coverTeacher | giaoviendaythay | text |
| attendance | diemdanh | text NOT NULL CHECK ("diemdanh" IN ('ATTENDED', 'LATE', 'ABSENT')) |
| checkinTime | giovaolop | text |
| status | trangthai | text NOT NULL CHECK ("trangthai" IN ('DA_HOC', 'CHUA_HOC', 'NGHI_HOC', 'KHAI_GIANG', 'DAY_THAY', 'CO_SU_CO')) |
| hasIncident | cosuco | boolean NOT NULL |
| incidentParent | manhomsuco | text CHECK ("manhomsuco" IN ('GRP-TCH', 'GRP-STU', 'GRP-SYS')) |
| incidentChild | masuco | text |
| incidentUrgency | muckhancap | text CHECK ("muckhancap" IN ('EMERGENCY', 'ADVANCED')) |
| incidentStatus | trangthaisuco | text CHECK ("trangthaisuco" IN ('DA_GIAI_QUYET', 'DANG_XU_LY', 'HUY_CA')) |
| incidentNote | ghichusuco | text NOT NULL |
| handledByOpsId | manguoixuly | text |
| handledByName | hotenguoixuly | text |
| handledAt | thoigianxuly | text |
| lessonDiary | nhatkybuoihoc | text NOT NULL |
| students | danhsachhocsinh | jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("danhsachhocsinh") = 'array') |
| isJustUpdated | vuacapnhat | boolean |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### MAU_BAO_CAO (report_templates)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| name | tenmaubaocao | text NOT NULL |
| config | cauhinh | jsonb NOT NULL CHECK (jsonb_typeof(cauhinh) = 'object') |
| user_id | manguoidung | text NOT NULL REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE CASCADE |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### DANH_MUC_BO_SUNG (custom_catalogs)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| id | madinhdanh | text PRIMARY KEY DEFAULT gen_random_uuid()::text |
| code | madanhmuc | text NOT NULL |
| name | tendanhmuc | text NOT NULL |
| desc | mota | text NOT NULL |
| parentId | madanhmuccha | text |
| entries | danhsachmuc | jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(danhsachmuc) = 'array') |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### VAN_PHONG_NHAN_XET (tone_directives)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| id | madinhdanh | text PRIMARY KEY |
| name | tenvanphong | text NOT NULL |
| directive | chidan | text NOT NULL |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### CAU_HINH_HE_THONG (app_settings)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| id | madinhdanh | text PRIMARY KEY DEFAULT 'global' |
| active_tone_key | mavanphongdangchon | text REFERENCES vuihoc."VAN_PHONG_NHAN_XET"(madinhdanh) ON DELETE SET NULL |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### LUOT_NHAN_XET_AI (ai_review_usage)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| teacher_id | magiaovien | text REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE CASCADE |
| student_id | mahocsinh | text REFERENCES vuihoc."HOC_SINH"(madinhdanh) ON DELETE CASCADE |
| usage_count | soluotsudung | integer NOT NULL DEFAULT 0 CHECK (soluotsudung >= 0), PRIMARY KEY (magiaovien, mahocsinh) |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |

### TUY_CHON_NGUOI_DUNG (user_preferences)

| Trường UI | Cột SQL | Kiểu và ràng buộc |
| --- | --- | --- |
| user_id | manguoidung | text PRIMARY KEY REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE CASCADE |
| active_module | phanhedangchon | integer CHECK (phanhedangchon BETWEEN 1 AND 8) |
| workspace_mode | chedogiaodien | text CHECK (chedogiaodien IN ('ADMIN','TEACHER')) |
| teacher_portal_tab | tabgiaoviendangchon | text CHECK (tabgiaoviendangchon IN ('schedule','availability','payroll','evaluation','reconcile')) |
| created_at | ngaytao | timestamptz NOT NULL DEFAULT now() |
| updated_at | ngaycapnhat | timestamptz NOT NULL DEFAULT now() |


## Nhật ký hành động nghiệp vụ

NHAT_KY_NGHIEP_VU ghi tự động mỗi INSERT/UPDATE/DELETE của bảng nghiệp vụ, trong cùng giao dịch. Gồm madinhdanh, thoigian (giờ server), manguoithuchien (NGUOI_DUNG.madinhdanh từ phiên đã kiểm tra); maxacthuc là cột cũ không còn dùng, vaitroketnoi, tenbang, khoabanghi, thaotac, truongthaydoi, dulieutruoc và dulieusau. Không ghi bộ lọc/tab/phân trang; TUY_CHON_NGUOI_DUNG không tạo nhật ký nghiệp vụ. UPDATE không thay đổi dữ liệu ngoài ngaycapnhat cũng không tạo nhật ký.

| Hành động | Dữ liệu kết quả | Lịch sử |
| --- | --- | --- |
| Vào lớp | LOP_HOC.chitietcahoc: checkinAt, checkinUserId, checkinTime, checkinBy, teacherAttendance | Snapshot trước/sau khi cập nhật lớp |
| Kết thúc ca | LOP_HOC.chitietcahoc: checkoutAt, checkoutUserId, status | Snapshot trước/sau khi cập nhật lớp |
| Đăng ký/sửa lịch rảnh | GIAO_VIEN.lichranh | Snapshot lịch cũ/mới và thời gian |
| Điểm danh/nhận xét | LOP_HOC.chitietcahoc.attendance/feedback/feedbackCriteria | Snapshot trước/sau |
| Phân công, sự cố, đánh giá, bảng công, duyệt giải trình | Bảng nghiệp vụ tương ứng | INSERT/UPDATE/DELETE và trường thay đổi |

Trigger được cài sau seed; dữ liệu mẫu không được coi là hành động của người dùng. SQL Editor không có phiên ứng dụng thì manguoithuchien có thể null. RPC lấy danh tính từ token hợp lệ; không dùng tên tự nhập để xác định người thao tác. Mật khẩu băm và token không được lưu vào nội dung nhật ký. Các trường checkin/checkout trong JSONB là dữ liệu nghiệp vụ phía ứng dụng; thoigian nhật ký do database ghi. Bảng nhật ký không cấp UPDATE/DELETE cho service_role.

Đã bỏ gói thời hạn khỏi schema mới, mapping, kiểu dữ liệu và AppContext. Nếu database cũ đã có GOI_HOC thì file này không tự xóa dữ liệu cũ; bảng đó không còn được ứng dụng sử dụng.

Đây vẫn là bộ cấu trúc lưu trữ: trigger chỉ chạy khi dữ liệu thực sự được ghi vào database. Giao diện chưa nối CRUD nên chưa có lịch sử bền vững từ thao tác UI.


Đã bổ sung 8 bảng nghiệp vụ theo tuần/ngày và luồng sinh công. Xem [thiết kế theo thời gian](TIMED_WORKFLOW.md) để chạy schema mới hoặc migration nâng cấp. Giao diện chưa chuyển sang bảng mới.


Bổ sung bảng thứ 32: BIEN_BAN_DU_GIO có FK bắt buộc tới mã giáo viên. Xem [hướng dẫn](TEACHER_EVALUATIONS.md).

## Bổ sung tài khoản nội bộ (2026-10-11)

NGUOI_DUNG thêm matkhau_bam text, maphien_bam text, phienhethan timestamptz, solansai integer và tamkhoaden timestamptz. NHAT_KY_NGHIEP_VU thêm manguoithuchien text FK NGUOI_DUNG. Cấu trúc vẫn 32 bảng. Thông tin đăng nhập không có trong mapper UI và không trả về client.

## Mật khẩu có giải mã

NGUOI_DUNG thêm matkhau_mahoa bytea; CAU_HINH_HE_THONG thêm khoamatkhau text. Khóa và bản mã không thuộc mapper UI, không có trong nhật ký. public.vuihoc_reveal_password chỉ giải mã khi người có quyền yêu cầu. Xem ENCRYPTED_PASSWORDS.md.
