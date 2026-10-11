-- VUIHOC: CẤU TRÚC DỮ LIỆU THEO MÃ NGUỒN 2026-10-11
-- Chạy toàn bộ file trong Supabase > SQL Editor > New query > Run.
-- Dữ liệu mẫu dùng ON CONFLICT DO NOTHING; chạy lại không ghi đè bản ghi hiện có.
-- Schema vuihoc riêng: không sửa/xóa public; không phải migration schema.sql cũ.
-- Gồm cấu trúc và dữ liệu mẫu; không xuất dữ liệu cá nhân từ LocalStorage.
-- Bảng IN_HOA_KHONG_DAU; cột tiếng Việt không dấu viết liền.
-- Key trong JSONB giữ camelCase để ánh xạ đúng object của giao diện.
-- Đăng nhập bằng NGUOI_DUNG; mật khẩu mã hóa có giải mã, tương thích hash cũ; không dùng Supabase Auth.
-- RLS bật, chưa có policy client: SQL Editor/backend service_role truy cập.
-- RPC đăng nhập/phân quyền nằm cuối file; CRUD nghiệp vụ tích hợp riêng.
-- Backend dùng supabase.schema("vuihoc"); không đưa service_role key vào VITE_*.
-- Chạy lại cùng phiên bản được. Nâng cấp cấu trúc cần migration riêng.
BEGIN;
CREATE SCHEMA IF NOT EXISTS vuihoc;

-- Đổi tên bản tiếng Anh cũ trong cùng schema, giữ dữ liệu và các khóa ngoại.
-- Nếu cả hai tên bảng cùng tồn tại, dừng giao dịch để tránh gộp nhầm dữ liệu.
DO $doiten$
DECLARE bang record; cot record;
BEGIN
 FOR bang IN SELECT key AS tencu, value->>'tenbang' AS tenmoi, value->'cot' AS cots FROM jsonb_each('{"role_groups":{"tenbang":"NHOM_QUYEN","cot":{"portal":"congtruycap","id":"madinhdanh","name":"tennhomquyen","category":"phanloai","description":"mota","user_count":"soluongnguoidung","permissions":"danhsachquyen","is_default":"macdinh","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"users":{"tenbang":"NGUOI_DUNG","cot":{"role_group_id":"manhomquyen","id":"madinhdanh","name":"hoten","username":"tendangnhap","email":"thudientu","phone":"sodienthoai","role":"vaitro","subject_code":"mamonhoc","status":"trangthai","avatar_initials":"chucaiavatar","auth_user_id":"maxacthuc","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"subjects":{"tenbang":"MON_HOC","cot":{"id":"madinhdanh","code":"mamonhoc","abbr":"tenviettat","name":"tenmonhoc","description":"mota","is_active":"danghoatdong","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"levels":{"tenbang":"TRINH_DO","cot":{"id":"madinhdanh","code":"matrinhdo","abbr":"tenviettat","name":"tentrinhdo","target_student":"doituonghocsinh","objective":"muctieu","is_active":"danghoatdong","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"time_slots":{"tenbang":"KHUNG_GIO","cot":{"id":"madinhdanh","code":"makhunggio","name":"tenkhunggio","time_range":"khoanggio","duration_minutes":"sophut","is_active":"danghoatdong","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"class_models":{"tenbang":"MO_HINH_LOP","cot":{"id":"madinhdanh","code":"mamohinh","name":"tenmohinh","max_students":"sisotoida","is_active":"danghoatdong","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"teaching_categories":{"tenbang":"CAP_HOC","cot":{"is_active":"danghoatdong","id":"madinhdanh","name":"tencaphoc","badge":"nhanhienthi","options":"danhsachluachon","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"incident_categories":{"tenbang":"DANH_MUC_SU_CO","cot":{"id":"madinhdanh","code":"manhomsuco","name":"tennhomsuco","description":"mota","sub_incidents":"danhsachsuco","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"teachers":{"tenbang":"GIAO_VIEN","cot":{"id":"madinhdanh","name":"hoten","username":"tendangnhap","subject_code":"mamonhoc","subject_name":"tenmonhoc","level_id":"macaphoc","level_name":"tencaphoc","grades":"danhsachkhoi","models":"danhsachmohinh","phone":"sodienthoai","email":"thudientu","degree":"bangcap","start_date":"ngaybatdau","end_date":"ngayketthuc","status":"trangthai","status_label":"tentrangthai","eval_status":"trangthaidanhgia","eval_score":"diemdanhgia","eval_comment":"nhanxetdanhgia","eval_criteria_scores":"diemtieuchi","free_slots":"socaranh","busy_slots":"socadaxep","is_full":"dakinlich","evaluation_reports":"baocaodanhgia","successful_sessions":"cahochoanthanh","schedule":"lichranh","user_id":"manguoidung","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"students":{"tenbang":"HOC_SINH","cot":{"id":"madinhdanh","name":"hoten","grade":"khoi","subject_code":"mamonhoc","model_code":"mamohinh","level_code":"matrinhdo","father_name":"hotencha","father_phone":"sodienthoaicha","mother_name":"hotenme","mother_phone":"sodienthoaime","schedule_slots":"lichdangky","status":"trangthai","current_class_code":"malophientai","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"classes":{"tenbang":"LOP_HOC","cot":{"category_id":"macaphoc","status":"trangthai","id":"madinhdanh","code":"malophoc","name":"tenlophoc","grade":"khoi","subject_code":"mamonhoc","level_code":"matrinhdo","model_code":"mamohinh","max_students":"sisotoida","student_ids":"danhsachmahocsinh","schedule":"lichhoc","room_link":"lienketphonghoc","teacher_name":"hotengiaovien","teacher_id":"magiaovien","materials":"hoclieu","active_sessions":"chitietcahoc","cover_assignments":"phancongdaythay","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"criteria_categories":{"tenbang":"NHOM_TIEU_CHI","cot":{"id":"madinhdanh","subject_code":"mamonhoc","name":"tennhomtieuchi","criteria":"danhsachtieuchi","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"sop_documents":{"tenbang":"TAI_LIEU_QUY_TRINH","cot":{"id":"madinhdanh","title":"tieude","category":"phanloai","summary":"tomtat","updated_at":"ngaycapnhat","content":"noidung","source_file_name":"tentepgoc","source_file_type":"loaitepgoc","is_enabled":"dangsudung","created_at":"ngaytao"}},"rag_bot_config":{"tenbang":"CAU_HINH_TRO_LY","cot":{"id":"madinhdanh","welcome_greeting":"loichaomung","quick_prompts":"cauhoinhanh","persona_tone":"vanphong","strict_grounding_only":"chiduatrentailieu","fallback_response":"cautraloiduphong","system_prompt":"chidanhethong","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"monthly_payroll":{"tenbang":"BANG_CONG_THANG","cot":{"id":"madinhdanh","is_locked":"dakhoa","admin_sent_notice":"daguithongbao","teachers":"danhsachgiaovien","disputes":"danhsachgiaitrinh","month_period":"kycong","locked_at":"thoigiankhoa","unlock_reason":"lydomokhoa","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"teaching_sessions":{"tenbang":"CA_HOC","cot":{"id":"madinhdanh","session_code":"macahoc","session_date":"ngayhoc","class_code":"malophoc","class_name":"tenlophoc","level_text":"tentrinhdo","model_text":"tenmohinh","subject_code":"mamonhoc","grade":"khoi","time_slot":"cahoc","room":"phonghoc","room_url":"lienketphonghoc","recording_url":"lienketbanghi","primary_teacher":"giaovienchinh","cover_teacher":"giaoviendaythay","attendance":"diemdanh","checkin_time":"giovaolop","status":"trangthai","has_incident":"cosuco","incident_parent":"manhomsuco","incident_child":"masuco","incident_urgency":"muckhancap","incident_status":"trangthaisuco","incident_note":"ghichusuco","handled_by_ops_id":"manguoixuly","handled_by_name":"hotenguoixuly","handled_at":"thoigianxuly","lesson_diary":"nhatkybuoihoc","students":"danhsachhocsinh","is_just_updated":"vuacapnhat","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"report_templates":{"tenbang":"MAU_BAO_CAO","cot":{"config":"cauhinh","id":"madinhdanh","name":"tenmaubaocao","user_id":"manguoidung","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"custom_catalogs":{"tenbang":"DANH_MUC_BO_SUNG","cot":{"entries":"danhsachmuc","id":"madinhdanh","code":"madanhmuc","name":"tendanhmuc","description":"mota","parent_id":"madanhmuccha","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"tone_directives":{"tenbang":"VAN_PHONG_NHAN_XET","cot":{"id":"madinhdanh","name":"tenvanphong","directive":"chidan","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"app_settings":{"tenbang":"CAU_HINH_HE_THONG","cot":{"id":"madinhdanh","active_tone_key":"mavanphongdangchon","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"ai_review_usage":{"tenbang":"LUOT_NHAN_XET_AI","cot":{"teacher_id":"magiaovien","student_id":"mahocsinh","usage_count":"soluotsudung","created_at":"ngaytao","updated_at":"ngaycapnhat"}},"user_preferences":{"tenbang":"TUY_CHON_NGUOI_DUNG","cot":{"user_id":"manguoidung","active_module":"phanhedangchon","workspace_mode":"chedogiaodien","teacher_portal_tab":"tabgiaoviendangchon","created_at":"ngaytao","updated_at":"ngaycapnhat"}}}'::jsonb)
 LOOP
  IF to_regclass(format('vuihoc.%I', bang.tencu)) IS NOT NULL THEN
   IF to_regclass(format('vuihoc.%I', bang.tenmoi)) IS NOT NULL THEN
    RAISE EXCEPTION 'Cùng tồn tại bảng % và %. Hãy xử lý trùng tên trước khi chạy.', bang.tencu, bang.tenmoi;
   END IF;
   EXECUTE format('ALTER TABLE vuihoc.%I RENAME TO %I', bang.tencu, bang.tenmoi);
  END IF;
  IF to_regclass(format('vuihoc.%I', bang.tenmoi)) IS NOT NULL THEN
   FOR cot IN SELECT key AS tencu, value #>> '{}' AS tenmoi FROM jsonb_each(bang.cots)
   LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'vuihoc' AND table_name = bang.tenmoi AND column_name = cot.tencu) THEN
     EXECUTE format('ALTER TABLE vuihoc.%I RENAME COLUMN %I TO %I', bang.tenmoi, cot.tencu, cot.tenmoi);
    END IF;
   END LOOP;
  END IF;
 END LOOP;
END; $doiten$;


-- SystemRoleGroup (src/types/index.ts)
CREATE TABLE IF NOT EXISTS vuihoc."NHOM_QUYEN" (
  "congtruycap" text CHECK ("congtruycap" IN ('ADMIN', 'TEACHER')),
  "madinhdanh" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tennhomquyen" text NOT NULL,
  "phanloai" text NOT NULL CHECK ("phanloai" IN ('HỆ THỐNG', 'CHUYÊN MÔN', 'VẬN HÀNH', 'GIẢNG DẠY')),
  "mota" text NOT NULL,
  "soluongnguoidung" numeric NOT NULL,
  "danhsachquyen" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "macdinh" boolean,
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

-- UserAccount (src/types/index.ts)
CREATE TABLE IF NOT EXISTS vuihoc."NGUOI_DUNG" (
  CONSTRAINT users_role_check CHECK (vaitro IN ('Quản trị Toàn quyền', 'Quản lý Chuyên môn', 'Nhân viên Vận hành Lớp', 'Giáo viên Giảng dạy')),
  "manhomquyen" text,
  "madinhdanh" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "hoten" text NOT NULL,
  "tendangnhap" text NOT NULL,
  "thudientu" text NOT NULL,
  "sodienthoai" text NOT NULL,
  "vaitro" text NOT NULL,
  "mamonhoc" text,
  "trangthai" text NOT NULL CHECK ("trangthai" IN ('active', 'locked')),
  "chucaiavatar" text NOT NULL,
  maxacthuc uuid UNIQUE,
  UNIQUE (tendangnhap),
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

-- SubjectItem (src/types/index.ts)
CREATE TABLE IF NOT EXISTS vuihoc."MON_HOC" (
  "madinhdanh" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "mamonhoc" text NOT NULL,
  "tenviettat" text NOT NULL,
  "tenmonhoc" text NOT NULL,
  "mota" text NOT NULL,
  "danghoatdong" boolean NOT NULL,
  UNIQUE (mamonhoc),
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

-- LevelItem (src/types/index.ts)
CREATE TABLE IF NOT EXISTS vuihoc."TRINH_DO" (
  "madinhdanh" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "matrinhdo" text NOT NULL,
  "tenviettat" text NOT NULL,
  "tentrinhdo" text NOT NULL,
  "doituonghocsinh" text NOT NULL,
  "muctieu" text NOT NULL,
  "danghoatdong" boolean NOT NULL,
  UNIQUE (matrinhdo),
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

-- TimeSlotItem (src/types/index.ts)
CREATE TABLE IF NOT EXISTS vuihoc."KHUNG_GIO" (
  "madinhdanh" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "makhunggio" text NOT NULL,
  "tenkhunggio" text NOT NULL,
  "khoanggio" text NOT NULL,
  "sophut" numeric NOT NULL,
  "danghoatdong" boolean NOT NULL,
  UNIQUE (makhunggio),
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);


-- ClassModelItem (src/types/index.ts)
CREATE TABLE IF NOT EXISTS vuihoc."MO_HINH_LOP" (
  "madinhdanh" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "mamohinh" text NOT NULL,
  "tenmohinh" text NOT NULL,
  "sisotoida" numeric NOT NULL,
  "danghoatdong" boolean NOT NULL,
  UNIQUE (mamohinh),
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

-- CategoryGroup (src/components/CategoryMultiFilter.tsx)
CREATE TABLE IF NOT EXISTS vuihoc."CAP_HOC" (
  "danghoatdong" boolean,
  "madinhdanh" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tencaphoc" text NOT NULL,
  "nhanhienthi" text,
  "danhsachluachon" jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("danhsachluachon") = 'array'),
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

-- IncidentCategory (src/types/index.ts)
CREATE TABLE IF NOT EXISTS vuihoc."DANH_MUC_SU_CO" (
  "madinhdanh" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "manhomsuco" text NOT NULL,
  "tennhomsuco" text NOT NULL,
  "mota" text,
  "danhsachsuco" jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("danhsachsuco") = 'array'),
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

-- TeacherProfile (src/types/index.ts)
CREATE TABLE IF NOT EXISTS vuihoc."GIAO_VIEN" (
  "madinhdanh" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "hoten" text NOT NULL,
  "tendangnhap" text,
  "mamonhoc" text NOT NULL,
  "tenmonhoc" text NOT NULL,
  "macaphoc" text NOT NULL,
  "tencaphoc" text NOT NULL,
  "danhsachkhoi" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "danhsachmohinh" text[],
  "sodienthoai" text NOT NULL,
  "thudientu" text NOT NULL,
  "bangcap" text NOT NULL,
  "ngaybatdau" text,
  "ngayketthuc" text,
  "trangthai" text NOT NULL CHECK ("trangthai" IN ('DANG_DAY', 'CHO_LOP', 'TAM_NGUNG')),
  "tentrangthai" text NOT NULL,
  "trangthaidanhgia" text NOT NULL CHECK ("trangthaidanhgia" IN ('SCORED', 'UNSCORED')),
  "diemdanhgia" text,
  "nhanxetdanhgia" text NOT NULL,
  "diemtieuchi" jsonb CHECK (jsonb_typeof("diemtieuchi") = 'object'),
  "socaranh" numeric NOT NULL,
  "socadaxep" numeric NOT NULL,
  "dakinlich" boolean NOT NULL,
  "baocaodanhgia" jsonb CHECK (jsonb_typeof("baocaodanhgia") = 'array'),
  "cahochoanthanh" jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("cahochoanthanh") = 'array'),
  "lichranh" jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof("lichranh") = 'object'),
  manguoidung text UNIQUE REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

-- StudentRecord (src/types/index.ts)
CREATE TABLE IF NOT EXISTS vuihoc."HOC_SINH" (
  "madinhdanh" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "hoten" text NOT NULL,
  "khoi" text NOT NULL,
  "mamonhoc" text NOT NULL,
  "mamohinh" text NOT NULL,
  "matrinhdo" text NOT NULL,
  "hotencha" text,
  "sodienthoaicha" text,
  "hotenme" text,
  "sodienthoaime" text,
  "lichdangky" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "trangthai" text NOT NULL CHECK ("trangthai" IN ('Chờ xếp lớp', 'Đang học', 'Bảo lưu', 'Đã thôi học')),
  "malophientai" text,
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

-- ClassItem (src/types/index.ts)
CREATE TABLE IF NOT EXISTS vuihoc."LOP_HOC" (
  "macaphoc" text,
  "trangthai" text CHECK ("trangthai" IN ('Chờ khai giảng', 'Đang học', 'Tạm dừng', 'Đã kết thúc')),
  "madinhdanh" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "malophoc" text NOT NULL,
  "tenlophoc" text NOT NULL,
  "khoi" text NOT NULL,
  "mamonhoc" text NOT NULL,
  "matrinhdo" text NOT NULL,
  "mamohinh" text NOT NULL,
  "sisotoida" numeric NOT NULL,
  "danhsachmahocsinh" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "lichhoc" text NOT NULL,
  "lienketphonghoc" text NOT NULL,
  "hotengiaovien" text NOT NULL,
  "magiaovien" text,
  "hoclieu" jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("hoclieu") = 'array'),
  "chitietcahoc" jsonb CHECK (jsonb_typeof("chitietcahoc") = 'object'),
  "phancongdaythay" jsonb CHECK (jsonb_typeof("phancongdaythay") = 'array'),
  UNIQUE (malophoc),
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

-- CriteriaCategory (src/types/index.ts)
CREATE TABLE IF NOT EXISTS vuihoc."NHOM_TIEU_CHI" (
  "madinhdanh" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "mamonhoc" text NOT NULL,
  "tennhomtieuchi" text NOT NULL,
  "danhsachtieuchi" jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("danhsachtieuchi") = 'array'),
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

-- SOPDocument (src/types/index.ts)
CREATE TABLE IF NOT EXISTS vuihoc."TAI_LIEU_QUY_TRINH" (
  "madinhdanh" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tieude" text NOT NULL,
  "phanloai" text NOT NULL,
  "tomtat" text NOT NULL,
  "ngaycapnhat" text NOT NULL,
  "noidung" text NOT NULL,
  "tentepgoc" text,
  "loaitepgoc" text CHECK ("loaitepgoc" IN ('PDF', 'DOCX')),
  "dangsudung" boolean,
  ngaytao timestamptz NOT NULL DEFAULT now()
);

-- RAGBotConfig (src/types/index.ts)
CREATE TABLE IF NOT EXISTS vuihoc."CAU_HINH_TRO_LY" (
  madinhdanh text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "loichaomung" text NOT NULL,
  "cauhoinhanh" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "vanphong" text NOT NULL,
  "chiduatrentailieu" boolean NOT NULL,
  "cautraloiduphong" text NOT NULL,
  "chidanhethong" text NOT NULL,
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

-- MonthPayrollData (src/types/index.ts)
CREATE TABLE IF NOT EXISTS vuihoc."BANG_CONG_THANG" (
  madinhdanh text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dakhoa" boolean NOT NULL,
  "daguithongbao" boolean NOT NULL,
  "danhsachgiaovien" jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("danhsachgiaovien") = 'array'),
  "danhsachgiaitrinh" jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("danhsachgiaitrinh") = 'array'),
  thoigiankhoa timestamptz,
  lydomokhoa text,
  kycong text NOT NULL UNIQUE CHECK (kycong ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

-- MonitoringSession (src/views/Module5_OperationsMonitoring.tsx)
CREATE TABLE IF NOT EXISTS vuihoc."CA_HOC" (
  madinhdanh text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "macahoc" text NOT NULL,
  "ngayhoc" text NOT NULL,
  "malophoc" text NOT NULL,
  "tenlophoc" text NOT NULL,
  "tentrinhdo" text NOT NULL,
  "tenmohinh" text NOT NULL,
  "mamonhoc" text NOT NULL CHECK ("mamonhoc" IN ('SUB-MATH', 'SUB-ENG')),
  "khoi" numeric NOT NULL,
  "cahoc" text NOT NULL,
  "phonghoc" text NOT NULL,
  "lienketphonghoc" text NOT NULL,
  "lienketbanghi" text,
  "giaovienchinh" text NOT NULL,
  "giaoviendaythay" text,
  "diemdanh" text NOT NULL CHECK ("diemdanh" IN ('ATTENDED', 'LATE', 'ABSENT')),
  "giovaolop" text,
  "trangthai" text NOT NULL CHECK ("trangthai" IN ('DA_HOC', 'CHUA_HOC', 'NGHI_HOC', 'KHAI_GIANG', 'DAY_THAY', 'CO_SU_CO')),
  "cosuco" boolean NOT NULL,
  "manhomsuco" text CHECK ("manhomsuco" IN ('GRP-TCH', 'GRP-STU', 'GRP-SYS')),
  "masuco" text,
  "muckhancap" text CHECK ("muckhancap" IN ('EMERGENCY', 'ADVANCED')),
  "trangthaisuco" text CHECK ("trangthaisuco" IN ('DA_GIAI_QUYET', 'DANG_XU_LY', 'HUY_CA')),
  "ghichusuco" text NOT NULL,
  "manguoixuly" text,
  "hotenguoixuly" text,
  "thoigianxuly" text,
  "nhatkybuoihoc" text NOT NULL,
  "danhsachhocsinh" jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("danhsachhocsinh") = 'array'),
  "vuacapnhat" boolean,
  UNIQUE (macahoc),
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

-- SavedReportTemplate (src/lib/customReports.ts)
CREATE TABLE IF NOT EXISTS vuihoc."MAU_BAO_CAO" (
  cauhinh jsonb NOT NULL CHECK (jsonb_typeof(cauhinh) = 'object'),
  "madinhdanh" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenmaubaocao" text NOT NULL,
  manguoidung text NOT NULL REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE CASCADE,
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

-- Catalog (src/components/CatalogWorkspace.tsx)
CREATE TABLE IF NOT EXISTS vuihoc."DANH_MUC_BO_SUNG" (
  danhsachmuc jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(danhsachmuc) = 'array'),
  "madinhdanh" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "madanhmuc" text NOT NULL,
  "tendanhmuc" text NOT NULL,
  "mota" text NOT NULL,
  "madanhmuccha" text,
  UNIQUE (madanhmuc),
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vuihoc."VAN_PHONG_NHAN_XET" (
  madinhdanh text PRIMARY KEY, tenvanphong text NOT NULL, chidan text NOT NULL,
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vuihoc."CAU_HINH_HE_THONG" (
  madinhdanh text PRIMARY KEY DEFAULT 'global', mavanphongdangchon text REFERENCES vuihoc."VAN_PHONG_NHAN_XET"(madinhdanh) ON DELETE SET NULL,
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vuihoc."LUOT_NHAN_XET_AI" (
  magiaovien text REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE CASCADE, mahocsinh text REFERENCES vuihoc."HOC_SINH"(madinhdanh) ON DELETE CASCADE, soluotsudung integer NOT NULL DEFAULT 0 CHECK (soluotsudung >= 0), PRIMARY KEY (magiaovien, mahocsinh),
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vuihoc."TUY_CHON_NGUOI_DUNG" (
  manguoidung text PRIMARY KEY REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE CASCADE, phanhedangchon integer CHECK (phanhedangchon BETWEEN 1 AND 8), chedogiaodien text CHECK (chedogiaodien IN ('ADMIN','TEACHER')), tabgiaoviendangchon text CHECK (tabgiaoviendangchon IN ('schedule','availability','payroll','evaluation','reconcile')),
  ngaytao timestamptz NOT NULL DEFAULT now(),
  ngaycapnhat timestamptz NOT NULL DEFAULT now()
);

DO $rel$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'vuihoc."NGUOI_DUNG"'::regclass AND conname = 'users_role_group_fk') THEN
 ALTER TABLE vuihoc."NGUOI_DUNG" ADD CONSTRAINT users_role_group_fk FOREIGN KEY (manhomquyen) REFERENCES vuihoc."NHOM_QUYEN"(madinhdanh) ON DELETE SET NULL;
 END IF;
END; $rel$;

DO $rel$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'vuihoc."LOP_HOC"'::regclass AND conname = 'classes_teacher_fk') THEN
 ALTER TABLE vuihoc."LOP_HOC" ADD CONSTRAINT classes_teacher_fk FOREIGN KEY (magiaovien) REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE SET NULL;
 END IF;
END; $rel$;

DO $rel$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'vuihoc."DANH_MUC_BO_SUNG"'::regclass AND conname = 'catalog_parent_fk') THEN
 ALTER TABLE vuihoc."DANH_MUC_BO_SUNG" ADD CONSTRAINT catalog_parent_fk FOREIGN KEY (madanhmuccha) REFERENCES vuihoc."DANH_MUC_BO_SUNG"(madinhdanh) ON DELETE RESTRICT;
 END IF;
END; $rel$;

CREATE OR REPLACE FUNCTION vuihoc.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $fn$
BEGIN
 IF TG_TABLE_NAME = 'TAI_LIEU_QUY_TRINH' THEN
  NEW.ngaycapnhat = to_char(now(), 'DD/MM/YYYY');
 ELSE
  NEW.ngaycapnhat = now();
 END IF;
 RETURN NEW;
END; $fn$;
REVOKE ALL ON FUNCTION vuihoc.set_updated_at() FROM PUBLIC;

-- Sửa key JSONB của bản mẫu đã đổi nhầm tên key bên trong object.
CREATE OR REPLACE FUNCTION vuihoc.sua_khoa_jsonb(giatri jsonb) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $json$
DECLARE ketqua jsonb := '{}'::jsonb; muc record; khoamoi text;
BEGIN
 IF jsonb_typeof(giatri)='array' THEN
  SELECT coalesce(jsonb_agg(vuihoc.sua_khoa_jsonb(value) ORDER BY ord),'[]'::jsonb) INTO ketqua FROM jsonb_array_elements(giatri) WITH ORDINALITY AS a(value,ord);
  RETURN ketqua;
 ELSIF jsonb_typeof(giatri)='object' THEN
  FOR muc IN SELECT key,value FROM jsonb_each(giatri) LOOP
   khoamoi := CASE muc.key WHEN 'madinhdanh' THEN 'id' WHEN 'ma' THEN 'code' WHEN 'ten' THEN 'name' WHEN 'tieude' THEN 'title' WHEN 'noidung' THEN 'content' WHEN 'trangthai' THEN 'status' WHEN 'diemdanh' THEN 'attendance' WHEN 'danhsachhocsinh' THEN 'students' WHEN 'danhsachluachon' THEN 'options' WHEN 'danhsachtieuchi' THEN 'criteria' ELSE muc.key END;
   IF ketqua ? khoamoi THEN RAISE EXCEPTION 'Trùng key JSONB: %',khoamoi; END IF;
   ketqua := ketqua || jsonb_build_object(khoamoi,vuihoc.sua_khoa_jsonb(muc.value));
  END LOOP;
  RETURN ketqua;
 END IF;
 RETURN giatri;
END; $json$;
REVOKE ALL ON FUNCTION vuihoc.sua_khoa_jsonb(jsonb) FROM PUBLIC;
DO $json$ DECLARE cot record; BEGIN
 FOR cot IN SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='vuihoc' AND data_type='jsonb' LOOP
  EXECUTE format('UPDATE vuihoc.%I SET %I=vuihoc.sua_khoa_jsonb(%I) WHERE %I IS DISTINCT FROM vuihoc.sua_khoa_jsonb(%I)',cot.table_name,cot.column_name,cot.column_name,cot.column_name,cot.column_name);
 END LOOP;
END; $json$;
DROP FUNCTION vuihoc.sua_khoa_jsonb(jsonb);

-- Chuẩn hóa mã môn của bản trước trước khi thêm khóa ngoại.
DO $mon$ DECLARE rangbuoc record; BEGIN
 FOR rangbuoc IN SELECT conname FROM pg_constraint WHERE conrelid='vuihoc."CA_HOC"'::regclass AND contype='c' AND pg_get_constraintdef(oid) LIKE '%mamonhoc%' LOOP
  EXECUTE format('ALTER TABLE vuihoc."CA_HOC" DROP CONSTRAINT %I',rangbuoc.conname);
 END LOOP;
END; $mon$;
UPDATE vuihoc."CA_HOC" SET mamonhoc=CASE mamonhoc WHEN 'TOAN' THEN 'SUB-MATH' WHEN 'ANH' THEN 'SUB-ENG' ELSE mamonhoc END WHERE mamonhoc IN ('TOAN','ANH');
UPDATE vuihoc."NHOM_TIEU_CHI" SET mamonhoc=CASE mamonhoc WHEN 'TOAN' THEN 'SUB-MATH' WHEN 'ANH' THEN 'SUB-ENG' WHEN 'ENG' THEN 'SUB-ENG' ELSE mamonhoc END WHERE mamonhoc IN ('TOAN','ANH','ENG');
ALTER TABLE vuihoc."CA_HOC" ADD CONSTRAINT cahoc_mamonhoc_check CHECK (mamonhoc IN ('SUB-MATH','SUB-ENG'));

-- Khóa liên kết theo đúng mã UI: mã nghiệp vụ tham chiếu cột mã; ID tham chiếu madinhdanh.
DO $rel$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'vuihoc."NGUOI_DUNG"'::regclass AND conname = 'nguoi_dung_mamonhoc_fk') THEN
  ALTER TABLE vuihoc."NGUOI_DUNG" ADD CONSTRAINT nguoi_dung_mamonhoc_fk FOREIGN KEY (mamonhoc) REFERENCES vuihoc."MON_HOC"(mamonhoc) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
 END IF;
END; $rel$;
DO $rel$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'vuihoc."GIAO_VIEN"'::regclass AND conname = 'giao_vien_mamonhoc_fk') THEN
  ALTER TABLE vuihoc."GIAO_VIEN" ADD CONSTRAINT giao_vien_mamonhoc_fk FOREIGN KEY (mamonhoc) REFERENCES vuihoc."MON_HOC"(mamonhoc) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
 END IF;
END; $rel$;
DO $rel$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'vuihoc."GIAO_VIEN"'::regclass AND conname = 'giao_vien_macaphoc_fk') THEN
  ALTER TABLE vuihoc."GIAO_VIEN" ADD CONSTRAINT giao_vien_macaphoc_fk FOREIGN KEY (macaphoc) REFERENCES vuihoc."CAP_HOC"(madinhdanh) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
 END IF;
END; $rel$;
DO $rel$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'vuihoc."HOC_SINH"'::regclass AND conname = 'hoc_sinh_mamonhoc_fk') THEN
  ALTER TABLE vuihoc."HOC_SINH" ADD CONSTRAINT hoc_sinh_mamonhoc_fk FOREIGN KEY (mamonhoc) REFERENCES vuihoc."MON_HOC"(mamonhoc) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
 END IF;
END; $rel$;
DO $rel$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'vuihoc."HOC_SINH"'::regclass AND conname = 'hoc_sinh_matrinhdo_fk') THEN
  ALTER TABLE vuihoc."HOC_SINH" ADD CONSTRAINT hoc_sinh_matrinhdo_fk FOREIGN KEY (matrinhdo) REFERENCES vuihoc."TRINH_DO"(matrinhdo) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
 END IF;
END; $rel$;
DO $rel$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'vuihoc."HOC_SINH"'::regclass AND conname = 'hoc_sinh_mamohinh_fk') THEN
  ALTER TABLE vuihoc."HOC_SINH" ADD CONSTRAINT hoc_sinh_mamohinh_fk FOREIGN KEY (mamohinh) REFERENCES vuihoc."MO_HINH_LOP"(mamohinh) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
 END IF;
END; $rel$;
DO $rel$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'vuihoc."LOP_HOC"'::regclass AND conname = 'lop_hoc_mamonhoc_fk') THEN
  ALTER TABLE vuihoc."LOP_HOC" ADD CONSTRAINT lop_hoc_mamonhoc_fk FOREIGN KEY (mamonhoc) REFERENCES vuihoc."MON_HOC"(mamonhoc) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
 END IF;
END; $rel$;
DO $rel$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'vuihoc."LOP_HOC"'::regclass AND conname = 'lop_hoc_matrinhdo_fk') THEN
  ALTER TABLE vuihoc."LOP_HOC" ADD CONSTRAINT lop_hoc_matrinhdo_fk FOREIGN KEY (matrinhdo) REFERENCES vuihoc."TRINH_DO"(matrinhdo) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
 END IF;
END; $rel$;
DO $rel$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'vuihoc."LOP_HOC"'::regclass AND conname = 'lop_hoc_mamohinh_fk') THEN
  ALTER TABLE vuihoc."LOP_HOC" ADD CONSTRAINT lop_hoc_mamohinh_fk FOREIGN KEY (mamohinh) REFERENCES vuihoc."MO_HINH_LOP"(mamohinh) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
 END IF;
END; $rel$;
DO $rel$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'vuihoc."LOP_HOC"'::regclass AND conname = 'lop_hoc_macaphoc_fk') THEN
  ALTER TABLE vuihoc."LOP_HOC" ADD CONSTRAINT lop_hoc_macaphoc_fk FOREIGN KEY (macaphoc) REFERENCES vuihoc."CAP_HOC"(madinhdanh) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
 END IF;
END; $rel$;
DO $rel$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'vuihoc."NHOM_TIEU_CHI"'::regclass AND conname = 'nhom_tieu_chi_mamonhoc_fk') THEN
  ALTER TABLE vuihoc."NHOM_TIEU_CHI" ADD CONSTRAINT nhom_tieu_chi_mamonhoc_fk FOREIGN KEY (mamonhoc) REFERENCES vuihoc."MON_HOC"(mamonhoc) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
 END IF;
END; $rel$;
DO $rel$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'vuihoc."CA_HOC"'::regclass AND conname = 'ca_hoc_mamonhoc_fk') THEN
  ALTER TABLE vuihoc."CA_HOC" ADD CONSTRAINT ca_hoc_mamonhoc_fk FOREIGN KEY (mamonhoc) REFERENCES vuihoc."MON_HOC"(mamonhoc) ON UPDATE CASCADE ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
 END IF;
END; $rel$;
DO $rel$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'vuihoc."HOC_SINH"'::regclass AND conname = 'hoc_sinh_malophientai_fk') THEN
  ALTER TABLE vuihoc."HOC_SINH" ADD CONSTRAINT hoc_sinh_malophientai_fk FOREIGN KEY (malophientai) REFERENCES vuihoc."LOP_HOC"(malophoc) ON UPDATE CASCADE ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;
 END IF;
END; $rel$;

CREATE INDEX IF NOT EXISTS users_lookup_idx ON vuihoc."NGUOI_DUNG" (manhomquyen);
CREATE INDEX IF NOT EXISTS teachers_lookup_idx ON vuihoc."GIAO_VIEN" (mamonhoc);
CREATE INDEX IF NOT EXISTS students_lookup_idx ON vuihoc."HOC_SINH" (mamonhoc, trangthai);
CREATE INDEX IF NOT EXISTS classes_lookup_idx ON vuihoc."LOP_HOC" (magiaovien);
CREATE INDEX IF NOT EXISTS teaching_sessions_lookup_idx ON vuihoc."CA_HOC" (ngayhoc, malophoc);
CREATE INDEX IF NOT EXISTS report_templates_lookup_idx ON vuihoc."MAU_BAO_CAO" (manguoidung);
CREATE INDEX IF NOT EXISTS custom_catalogs_lookup_idx ON vuihoc."DANH_MUC_BO_SUNG" (madanhmuccha);


DO $security$
DECLARE table_name text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY['NHOM_QUYEN', 'NGUOI_DUNG', 'MON_HOC', 'TRINH_DO', 'KHUNG_GIO', 'MO_HINH_LOP', 'CAP_HOC', 'DANH_MUC_SU_CO', 'GIAO_VIEN', 'HOC_SINH', 'LOP_HOC', 'NHOM_TIEU_CHI', 'TAI_LIEU_QUY_TRINH', 'CAU_HINH_TRO_LY', 'BANG_CONG_THANG', 'CA_HOC', 'MAU_BAO_CAO', 'DANH_MUC_BO_SUNG', 'VAN_PHONG_NHAN_XET', 'CAU_HINH_HE_THONG', 'LUOT_NHAN_XET_AI', 'TUY_CHON_NGUOI_DUNG']
 LOOP
  EXECUTE format('ALTER TABLE vuihoc.%I ENABLE ROW LEVEL SECURITY', table_name);
  EXECUTE format('REVOKE ALL ON TABLE vuihoc.%I FROM PUBLIC, anon, authenticated', table_name);
  EXECUTE format('GRANT ALL ON TABLE vuihoc.%I TO service_role', table_name);
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = format('vuihoc.%I', table_name)::regclass AND tgname = 'set_updated_at' AND NOT tgisinternal) THEN
   EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON vuihoc.%I FOR EACH ROW EXECUTE FUNCTION vuihoc.set_updated_at()', table_name);
  END IF;
 END LOOP;
END; $security$;
REVOKE ALL ON SCHEMA vuihoc FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA vuihoc TO service_role;


-- Lịch sử nghiệp vụ: lưu trong cùng giao dịch với thay đổi dữ liệu.
-- Không dùng cho bộ lọc, tab, phân trang hay trạng thái hiển thị tạm.
CREATE TABLE IF NOT EXISTS vuihoc."NHAT_KY_NGHIEP_VU" (
  madinhdanh uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thoigian timestamptz NOT NULL DEFAULT clock_timestamp(),
  maxacthuc uuid,
  vaitroketnoi text NOT NULL DEFAULT session_user,
  tenbang text NOT NULL,
  khoabanghi jsonb NOT NULL,
  thaotac text NOT NULL CHECK (thaotac IN ('INSERT','UPDATE','DELETE')),
  truongthaydoi text[] NOT NULL DEFAULT ARRAY[]::text[],
  dulieutruoc jsonb,
  dulieusau jsonb
);

-- BEGIN DEMO SEED: dữ liệu thử nghiệm, chạy lại không ghi đè bản ghi đã có.

INSERT INTO vuihoc."NHOM_QUYEN" ("madinhdanh", "tennhomquyen", "phanloai", "mota", "soluongnguoidung", "danhsachquyen", "macdinh", "congtruycap") VALUES
('ROLE-01', 'Quản trị Toàn quyền', 'HỆ THỐNG', 'Toàn quyền cấu hình bảo mật, tài khoản, chốt sổ và vận hành toàn hệ thống.', 1, ARRAY['ALL']::text[], TRUE, 'ADMIN'),
('ROLE-02', 'Quản lý Chuyên môn', 'CHUYÊN MÔN', 'Dự giờ sư phạm, cấu hình tiêu chí chấm điểm, duyệt học liệu, kiểm soát AI.', 1, ARRAY['PH2_READ', 'PH3_ALL', 'PH6_ALL', 'PH8_ALL']::text[], NULL, 'ADMIN'),
('ROLE-03', 'Nhân viên Vận hành Lớp', 'VẬN HÀNH', 'Tiếp nhận học sinh, khởi tạo lớp, ghép lớp chặn trần, giám sát ca dạy.', 1, ARRAY['PH2_READ', 'PH4_ALL', 'PH5_ALL', 'PH7_READ']::text[], NULL, 'ADMIN'),
('ROLE-04', 'Giáo viên Giảng dạy', 'GIẢNG DẠY', 'Lịch dạy, vào lớp Zoom, điểm danh, AI nhận xét, tra cứu công và giải trình.', 6, ARRAY['TEACHER_PORTAL']::text[], NULL, 'TEACHER')
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."NGUOI_DUNG" ("madinhdanh", "hoten", "tendangnhap", "thudientu", "sodienthoai", "vaitro", "trangthai", "chucaiavatar", "manhomquyen", "mamonhoc") VALUES
('USR-01', 'Trần Quản Trị', 'admin.tong', 'demo.admin@example.com', '0910000000', 'Quản trị Toàn quyền', 'active', 'AD', 'ROLE-01', NULL),
('USR-02', 'Nguyễn Mai Hoa', 'hoa.academic', 'demo.academic@example.com', '0910000001', 'Quản lý Chuyên môn', 'active', 'MH', 'ROLE-02', NULL),
('USR-03', 'Lê Tuấn Quang', 'quang.ops', 'demo.ops@example.com', '0910000002', 'Nhân viên Vận hành Lớp', 'active', 'TQ', 'ROLE-03', NULL),
('GV-001', 'Thầy Trần Anh Tuấn', 'gv.001', 'demo.gv001@example.com', '0900000001', 'Giáo viên Giảng dạy', 'active', 'AT', 'ROLE-04', 'SUB-MATH'),
('GV-002', 'Cô Nguyễn Thị Mai Hoa', 'gv.002', 'demo.gv002@example.com', '0900000002', 'Giáo viên Giảng dạy', 'active', 'MH', 'ROLE-04', 'SUB-ENG'),
('GV-003', 'Thầy Lê Hoàng Nam', 'gv.003', 'demo.gv003@example.com', '0900000003', 'Giáo viên Giảng dạy', 'active', 'HN', 'ROLE-04', 'SUB-MATH'),
('GV-004', 'Thầy Đỗ Minh Đức', 'gv.004', 'demo.gv004@example.com', '0900000004', 'Giáo viên Giảng dạy', 'active', 'MĐ', 'ROLE-04', 'SUB-MATH'),
('GV-005', 'Cô Vũ Phương Linh', 'gv.005', 'demo.gv005@example.com', '0900000005', 'Giáo viên Giảng dạy', 'active', 'PL', 'ROLE-04', 'SUB-ENG'),
('GV-006', 'Thầy Phạm Quốc Huy', 'gv.006', 'demo.gv006@example.com', '0900000006', 'Giáo viên Giảng dạy', 'active', 'QH', 'ROLE-04', 'SUB-MATH')
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."MON_HOC" ("madinhdanh", "mamonhoc", "tenviettat", "tenmonhoc", "mota", "danghoatdong") VALUES
('SUB-1', 'SUB-MATH', 'TOAN', 'Môn Toán', 'Toán tư duy và Toán tiểu học bám sát khung Bộ Giáo Dục', TRUE),
('SUB-2', 'SUB-ENG', 'ENG', 'Môn Tiếng Anh', 'Tiếng Anh giao tiếp và chương trình chuẩn Cambridge', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."TRINH_DO" ("madinhdanh", "matrinhdo", "tenviettat", "tentrinhdo", "doituonghocsinh", "muctieu", "danghoatdong") VALUES
('LVL-1', 'LVL-F1', 'NT1', 'Nền tảng 1', 'Học sinh yếu mất gốc kiến thức', 'Lấy lại kiến thức cơ bản', TRUE),
('LVL-2', 'LVL-F2', 'NT2', 'Nền tảng 2', 'Học sinh củng cố kiến thức cơ bản', 'Thành thạo phép tính căn bản', TRUE),
('LVL-3', 'LVL-STD', 'TC', 'Tiêu chuẩn', 'Học sinh nắm vững chương trình SGK', 'Tự tin giải quyết bài học theo khung chuẩn', TRUE),
('LVL-4', 'LVL-ADV', 'NC', 'Nâng cao', 'Học sinh khá giỏi, tư duy mở rộng', 'Phát triển tư duy logic mở rộng', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."KHUNG_GIO" ("madinhdanh", "makhunggio", "tenkhunggio", "khoanggio", "sophut", "danghoatdong") VALUES
('SLOT-1250', 'SLOT-1250', 'Ca Trưa Thử Nghiệm (12:50 - 13:50)', '12:50 - 13:50', 60, TRUE),
('SLOT-1', 'SLOT-E1', 'Ca Tối 1 (Giờ vàng)', '18:00 - 19:30', 90, TRUE),
('SLOT-2', 'SLOT-E2', 'Ca Tối 2', '19:45 - 21:15', 90, TRUE),
('SLOT-3', 'SLOT-A1', 'Ca Chiều', '16:15 - 17:45', 90, TRUE)
ON CONFLICT DO NOTHING;


INSERT INTO vuihoc."MO_HINH_LOP" ("madinhdanh", "mamohinh", "tenmohinh", "sisotoida", "danghoatdong") VALUES
('MOD-1', '1-1', 'Lớp 1 - 1 (Kèm 1-1)', 1, TRUE),
('MOD-2', '1-n', 'Lớp 1 - n (Nhóm chung)', 5, TRUE),
('MOD-3', '1-5', 'Lớp 1 - 5', 5, TRUE),
('MOD-4', '1-10', 'Lớp 1 - 10', 10, TRUE),
('MOD-5', '1-3', 'Lớp 1 - 3', 3, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."CAP_HOC" ("madinhdanh", "tencaphoc", "nhanhienthi", "danhsachluachon", "danghoatdong") VALUES
('CAP-TH', 'Tiểu học', 'Khối 1 - 5', '[{"id":"Lớp 1","label":"Lớp 1"},{"id":"Lớp 2","label":"Lớp 2"},{"id":"Lớp 3","label":"Lớp 3"},{"id":"Lớp 4","label":"Lớp 4"},{"id":"Lớp 5","label":"Lớp 5"}]'::jsonb, TRUE),
('CAP-THCS', 'THCS', 'Khối 6 - 9', '[{"id":"Lớp 6","label":"Lớp 6"},{"id":"Lớp 7","label":"Lớp 7"},{"id":"Lớp 8","label":"Lớp 8"},{"id":"Lớp 9","label":"Lớp 9"}]'::jsonb, TRUE),
('CAP-THPT', 'THPT', 'Khối 10 - 12', '[{"id":"Lớp 10","label":"Lớp 10"},{"id":"Lớp 11","label":"Lớp 11"},{"id":"Lớp 12","label":"Lớp 12"}]'::jsonb, TRUE),
('CAT-IELTS', 'IELTS & Quốc tế', 'Band 5.0 - 8.5', '[{"id":"IELTS 5.0 - 5.5","label":"IELTS Pre-Inter (5.0 - 5.5)"},{"id":"IELTS 6.0 - 6.5","label":"IELTS Inter (6.0 - 6.5)"},{"id":"IELTS 6.5 - 7.5","label":"IELTS Upper (6.5 - 7.5)"},{"id":"IELTS 8.0+","label":"IELTS Master (8.0+)"},{"id":"Cambridge KET/PET","label":"Cambridge KET / PET"},{"id":"Cambridge Flyers","label":"Cambridge Flyers"}]'::jsonb, TRUE),
('CAT-MATH-SPEC', 'Toán Tư Duy & Nâng Cao', 'Olympic & 1-1', '[{"id":"Toán Tư duy Singapore","label":"Toán Tư duy Singapore"},{"id":"Toán Soroban","label":"Toán Soroban & Tính nhanh"},{"id":"Luyện thi Violympic","label":"Luyện thi Violympic / Kangaroo"},{"id":"Toán Nâng cao 1-3","label":"Toán Nâng cao Nhóm nhỏ (1-3)"},{"id":"Toán 1 kèm 1","label":"Toán Ôn tập Nền tảng 1 kèm 1"}]'::jsonb, TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."DANH_MUC_SU_CO" ("madinhdanh", "manhomsuco", "tennhomsuco", "mota", "danhsachsuco") VALUES
('GRP-TCH', 'GRP-TCH', 'Sự cố giáo viên', 'Tình huống thử nghiệm ca dạy', '[{"id":"INC-TCH-01","code":"INC-TCH-01","name":"Giáo viên xin nghỉ có báo trước","targetParty":"Giáo viên","desc":"Có thể phân công dạy thay","status":true,"creditCoeff":0,"noticeType":"advance"},{"id":"INC-TCH-02","code":"INC-TCH-02","name":"Giáo viên xin nghỉ đột xuất","targetParty":"Giáo viên","desc":"Vận hành xử lý trước ca","status":true,"creditCoeff":0,"noticeType":"unannounced"},{"id":"INC-TCH-03","code":"INC-TCH-03","name":"Giáo viên vào lớp muộn","targetParty":"Giáo viên","desc":"Kiểm tra hệ số công","status":true,"creditCoeff":0.75,"noticeType":"unannounced"}]'::jsonb),
('GRP-STU', 'GRP-STU', 'Sự cố học sinh', 'Nghỉ học và thiết bị học sinh', '[{"id":"INC-STU-01","code":"INC-STU-01","name":"Học sinh xin nghỉ có phép","targetParty":"Học sinh","desc":"Ví dụ để kiểm tra đối soát","status":true,"creditCoeff":0.5,"noticeType":"advance"}]'::jsonb),
('GRP-SYS', 'GRP-SYS', 'Sự cố kỹ thuật', 'Thiết bị hoặc phòng học', '[{"id":"INC-SYS-01","code":"INC-SYS-01","name":"Phòng học gặp lỗi âm thanh","targetParty":"Khách quan","desc":"Dùng thiết bị dự phòng","status":true,"creditCoeff":1,"noticeType":"unspecified"}]'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."GIAO_VIEN" ("madinhdanh", "hoten", "mamonhoc", "tenmonhoc", "macaphoc", "tencaphoc", "danhsachkhoi", "danhsachmohinh", "sodienthoai", "thudientu", "bangcap", "trangthai", "tentrangthai", "trangthaidanhgia", "diemdanhgia", "nhanxetdanhgia", "diemtieuchi", "socaranh", "socadaxep", "dakinlich", "cahochoanthanh", "lichranh", "tendangnhap", "ngaybatdau", "ngayketthuc", "baocaodanhgia", "manguoidung") VALUES
('GV-001', 'Thầy Trần Anh Tuấn', 'SUB-MATH', 'Môn Toán', 'CAP-TH', 'Tiểu học', ARRAY['Lớp 3', 'Lớp 4', 'Lớp 5']::text[], ARRAY['1-1', '1-3', '1-n', '1-5', '1-10']::text[], '0900000001', 'demo.gv001@example.com', 'Đại học Sư phạm Hà Nội - Khoa Toán Tin', 'DANG_DAY', 'Đang dạy', 'SCORED', '9.0', 'Dữ liệu mẫu: tổ chức bài học rõ ràng.', '{"tc1":9,"tc2":9,"tc3":9}'::jsonb, 23, 5, FALSE, '[{"code":"TOAN_K04_VIP_1250-2026-10-06-1","name":"Tiết 12: Phân số & Tư duy hình học thực tế","date":"06/10/2026","dateISO":"2026-10-06","week":"Tuần 1","slot":"12:50 - 13:50","students":"1/1 HS","status":"Hoàn thành","roomLink":"https://example.com/rooms/CLS-1250","recordLink":"https://example.com/recordings/TOAN_K04_VIP_1250-2026-10-06-1","checkin":"12:50:00","gradeLevel":"Lớp 4","model":"1-1"},{"code":"TOAN_K03_NT2_13_01-2026-10-06-1","name":"Giải bài toán bằng 3 bước tính (tiết 2)","date":"06/10/2026","dateISO":"2026-10-06","week":"Tuần 1","slot":"18:00 - 19:30","students":"1/3 HS","status":"Hoàn thành","roomLink":"https://example.com/rooms/CLS-001","recordLink":"https://example.com/recordings/TOAN_K03_NT2_13_01-2026-10-06-1","checkin":"18:00:00","gradeLevel":"Lớp 3","model":"1-3"},{"code":"TOAN_K03_NT2_13_01-2026-10-08-2","name":"Đơn vị đo góc. Góc nhọn - góc tù - góc bẹt","date":"08/10/2026","dateISO":"2026-10-08","week":"Tuần 2","slot":"18:00 - 19:30","students":"1/3 HS","status":"Hoàn thành","roomLink":"https://example.com/rooms/CLS-001","recordLink":"https://example.com/recordings/TOAN_K03_NT2_13_01-2026-10-08-2","checkin":"18:08:00","gradeLevel":"Lớp 3","model":"1-3"}]'::jsonb, '{"SLOT-1250":["busy","busy","busy","free","free","free","free"],"SLOT-E1":["free","busy","free","busy","free","free","free"],"SLOT-E2":["free","free","free","free","free","free","free"],"SLOT-A1":["free","free","free","free","free","free","free"]}'::jsonb, 'gv.001', '2026-09-01', NULL, '[{"teacherId":"GV-001","recipientUserId":"GV-001","sessionCode":"TOAN_K04_VIP_1250-2026-10-06-1","sessionDate":"2026-10-06","sentAt":"2026-10-11T09:00:00+07:00","roomLink":"https://example.com/rooms/CLS-1250","recordLink":"https://example.com/recordings/TOAN_K04_VIP_1250-2026-10-06-1","id":"EVAL-GV-001","reportCode":"BBDG/2026/GV-001","evaluationDate":"11/10/2026","evaluatorName":"Nguyễn Mai Hoa","evaluatorRole":"Quản lý Chuyên môn","classCode":"TOAN_K04_VIP_1250","className":"Toán Nâng Cao Lớp 4 (Ca Trưa 12:50)","sessionNum":1,"sessionName":"Dự giờ ca ôn tập","timeSlot":"12:50 - 13:50","model":"1-1","overallScore":9,"rank":"Xuất sắc","criteriaScores":{"tc1":9,"tc2":9,"tc3":9},"generalComment":"Dữ liệu mẫu: tổ chức bài học rõ ràng.","strengths":"Hướng dẫn dễ hiểu.","improvements":"Tăng thời gian luyện tập.","recommendations":"Bổ sung câu hỏi vận dụng.","status":"DA_DUYET"}]'::jsonb, 'GV-001'),
('GV-002', 'Cô Nguyễn Thị Mai Hoa', 'SUB-ENG', 'Môn Tiếng Anh', 'CAP-TH', 'Tiểu học', ARRAY['Lớp 3', 'Lớp 4']::text[], ARRAY['1-1', '1-3', '1-n', '1-5', '1-10']::text[], '0900000002', 'demo.gv002@example.com', 'Đại học Ngoại ngữ - ĐHQGHN, IELTS 8.0', 'DANG_DAY', 'Đang dạy', 'SCORED', '9.0', 'Dữ liệu mẫu: tổ chức bài học rõ ràng.', '{"tc1":9,"tc2":9,"tc3":9}'::jsonb, 25, 3, FALSE, '[{"code":"ENG_K04_NC_11_01-2026-10-05-1","name":"Present Continuous Tense in Daily Routine","date":"05/10/2026","dateISO":"2026-10-05","week":"Tuần 1","slot":"19:45 - 21:15","students":"1/1 HS","status":"Hoàn thành","roomLink":"https://example.com/rooms/CLS-002","recordLink":"https://example.com/recordings/ENG_K04_NC_11_01-2026-10-05-1","checkin":"19:45:00","gradeLevel":"Lớp 4","model":"1-1"},{"code":"ENG_K04_DEMO_T7-2026-10-10-1","name":"Daily routines: hỏi và trả lời về hoạt động hằng ngày","date":"10/10/2026","dateISO":"2026-10-10","week":"Tuần 2","slot":"18:00 - 19:30","students":"1/1 HS","status":"Hoàn thành","roomLink":"https://example.com/rooms/CLS-DEMO-ENG-T7","recordLink":"https://example.com/recordings/ENG_K04_DEMO_T7-2026-10-10-1","checkin":"18:00:00","gradeLevel":"Lớp 4","model":"1-1"}]'::jsonb, '{"SLOT-1250":["free","free","free","free","free","free","free"],"SLOT-E1":["free","free","free","free","free","busy","free"],"SLOT-E2":["busy","free","free","free","busy","free","free"],"SLOT-A1":["free","free","free","free","free","free","free"]}'::jsonb, 'gv.002', '2026-09-01', NULL, '[{"teacherId":"GV-002","recipientUserId":"GV-002","sessionCode":"ENG_K04_NC_11_01-2026-10-05-1","sessionDate":"2026-10-05","sentAt":"2026-10-11T09:00:00+07:00","roomLink":"https://example.com/rooms/CLS-002","recordLink":"https://example.com/recordings/ENG_K04_NC_11_01-2026-10-05-1","id":"EVAL-GV-002","reportCode":"BBDG/2026/GV-002","evaluationDate":"11/10/2026","evaluatorName":"Nguyễn Mai Hoa","evaluatorRole":"Quản lý Chuyên môn","classCode":"ENG_K04_NC_11_01","className":"Tiếng Anh Nâng Cao - Lớp 4 (T2/T6)","sessionNum":1,"sessionName":"Dự giờ ca ôn tập","timeSlot":"19:45 - 21:15","model":"1-1","overallScore":9,"rank":"Xuất sắc","criteriaScores":{"tc1":9,"tc2":9,"tc3":9},"generalComment":"Dữ liệu mẫu: tổ chức bài học rõ ràng.","strengths":"Hướng dẫn dễ hiểu.","improvements":"Tăng thời gian luyện tập.","recommendations":"Bổ sung câu hỏi vận dụng.","status":"DA_DUYET"}]'::jsonb, 'GV-002'),
('GV-003', 'Thầy Lê Hoàng Nam', 'SUB-MATH', 'Môn Toán', 'CAP-TH', 'Tiểu học', ARRAY['Lớp 3', 'Lớp 4', 'Lớp 5']::text[], ARRAY['1-1', '1-3', '1-n', '1-5', '1-10']::text[], '0900000003', 'demo.gv003@example.com', 'Đại học Bách Khoa HN - Gia sư Toán tư duy & Nhóm nhỏ', 'DANG_DAY', 'Đang dạy', 'UNSCORED', NULL, '', NULL, 27, 1, FALSE, '[{"code":"TOAN_K03_DEMO_T7-2026-10-10-1","name":"Ôn tập phép nhân, phép chia và giải toán có lời văn","date":"10/10/2026","dateISO":"2026-10-10","week":"Tuần 2","slot":"12:50 - 13:50","students":"1/1 HS","status":"Hoàn thành","roomLink":"https://example.com/rooms/CLS-DEMO-MATH-T7","recordLink":"https://example.com/recordings/TOAN_K03_DEMO_T7-2026-10-10-1","checkin":"12:50:00","gradeLevel":"Lớp 3","model":"1-1"}]'::jsonb, '{"SLOT-1250":["free","free","free","free","free","busy","free"],"SLOT-E1":["free","free","free","free","free","free","free"],"SLOT-E2":["free","free","free","free","free","free","free"],"SLOT-A1":["free","free","free","free","free","free","free"]}'::jsonb, 'gv.003', '2026-09-01', NULL, '[]'::jsonb, 'GV-003'),
('GV-004', 'Thầy Đỗ Minh Đức', 'SUB-MATH', 'Môn Toán', 'CAP-THCS', 'THCS', ARRAY['Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9']::text[], ARRAY['1-1', '1-3', '1-n', '1-5', '1-10']::text[], '0900000004', 'demo.gv004@example.com', 'ThS Toán học - ĐH Khoa học Tự nhiên ĐHQGHN', 'DANG_DAY', 'Đang dạy', 'UNSCORED', NULL, '', NULL, 28, 0, FALSE, '[]'::jsonb, '{"SLOT-1250":["free","free","free","free","free","free","free"],"SLOT-E1":["free","free","free","free","free","free","free"],"SLOT-E2":["free","free","free","free","free","free","free"],"SLOT-A1":["free","free","free","free","free","free","free"]}'::jsonb, 'gv.004', '2026-09-01', NULL, '[]'::jsonb, 'GV-004'),
('GV-005', 'Cô Vũ Phương Linh', 'SUB-ENG', 'Môn Tiếng Anh', 'CAP-TH', 'Tiểu học', ARRAY['Lớp 3', 'Lớp 4', 'Lớp 5']::text[], ARRAY['1-1', '1-3', '1-n', '1-5', '1-10']::text[], '0900000005', 'demo.gv005@example.com', 'Cử nhân Ngôn ngữ Anh - IELTS Overall 8.5 (Speaking 8.5)', 'DANG_DAY', 'Đang dạy', 'UNSCORED', NULL, '', NULL, 27, 1, FALSE, '[]'::jsonb, '{"SLOT-1250":["free","free","free","free","free","free","free"],"SLOT-E1":["free","free","free","free","free","busy","free"],"SLOT-E2":["free","free","free","free","free","free","free"],"SLOT-A1":["free","free","free","free","free","free","free"]}'::jsonb, 'gv.005', '2026-09-01', NULL, '[]'::jsonb, 'GV-005'),
('GV-006', 'Thầy Phạm Quốc Huy', 'SUB-MATH', 'Môn Toán', 'CAP-THPT', 'THPT', ARRAY['Lớp 10', 'Lớp 11', 'Lớp 12']::text[], ARRAY['1-1', '1-3', '1-n', '1-5', '1-10']::text[], '0900000006', 'demo.gv006@example.com', 'Thủ khoa Sư phạm Toán - Chuyên gia Luyện thi THPT Quốc Gia', 'CHO_LOP', 'Chờ lớp', 'UNSCORED', NULL, '', NULL, 28, 0, FALSE, '[]'::jsonb, '{"SLOT-1250":["free","free","free","free","free","free","free"],"SLOT-E1":["free","free","free","free","free","free","free"],"SLOT-E2":["free","free","free","free","free","free","free"],"SLOT-A1":["free","free","free","free","free","free","free"]}'::jsonb, 'gv.006', '2026-09-01', NULL, '[]'::jsonb, 'GV-006')
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."HOC_SINH" ("madinhdanh", "hoten", "khoi", "mamonhoc", "mamohinh", "matrinhdo", "hotencha", "sodienthoaicha", "hotenme", "sodienthoaime", "lichdangky", "trangthai", "malophientai") VALUES
('HS-2026-001', 'Trần Gia Bảo', 'Lớp 3', 'SUB-MATH', '1-3', 'LVL-F2', 'Trần Mạnh Hùng (Bố)', '0920000001', 'Nguyễn Thị Thùy (Mẹ)', '0920000002', ARRAY['T3 (18:00 - 19:30)', 'T5 (18:00 - 19:30)']::text[], 'Đang học', 'TOAN_K03_NT2_13_01'),
('HS-2026-002', 'Lê Quỳnh Anh', 'Lớp 4', 'SUB-ENG', '1-1', 'LVL-ADV', 'Lê Quang Minh (Bố)', '0920000001', 'Nguyễn Mai Lan (Mẹ)', '0920000002', ARRAY['T2 (19:45 - 21:15)', 'T6 (19:45 - 21:15)']::text[], 'Đang học', 'ENG_K04_NC_11_01'),
('HS-2026-003', 'Đặng Tuấn Kiệt', 'Lớp 3', 'SUB-MATH', '1-1', 'LVL-F2', 'Đặng Quốc Tuấn (Bố)', '0920000001', 'Phạm Hải Yến (Mẹ)', '0920000002', ARRAY['T7 (12:50 - 13:50)']::text[], 'Đang học', 'TOAN_K03_DEMO_T7'),
('HS-2026-004', 'Nguyễn Hà My', 'Lớp 4', 'SUB-ENG', '1-1', 'LVL-STD', 'Nguyễn Văn Hùng (Bố)', '0920000001', 'Trần Thu Hà (Mẹ)', '0920000002', ARRAY['T7 (18:00 - 19:30)']::text[], 'Đang học', 'ENG_K04_DEMO_T7'),
('HS-2026-005', 'Phạm Minh Anh', 'Lớp 4', 'SUB-MATH', '1-1', 'LVL-ADV', 'Trần Mạnh Hùng (Bố)', '0920000001', 'Nguyễn Thị Thùy (Mẹ)', '0920000002', ARRAY['T2 (12:50 - 13:50)', 'T3 (12:50 - 13:50)', 'T4 (12:50 - 13:50)']::text[], 'Đang học', 'TOAN_K04_VIP_1250'),
('HS-2026-006', 'Vũ Khánh Linh', 'Lớp 3', 'SUB-MATH', '1-3', 'LVL-F2', 'Trần Mạnh Hùng (Bố)', '0920000001', 'Nguyễn Thị Thùy (Mẹ)', '0920000002', ARRAY['T4 (18:00 - 19:30)']::text[], 'Chờ xếp lớp', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."LOP_HOC" ("madinhdanh", "malophoc", "tenlophoc", "khoi", "mamonhoc", "matrinhdo", "mamohinh", "sisotoida", "danhsachmahocsinh", "lichhoc", "lienketphonghoc", "hotengiaovien", "magiaovien", "hoclieu", "macaphoc", "trangthai", "chitietcahoc", "phancongdaythay") VALUES
('CLS-1250', 'TOAN_K04_VIP_1250', 'Toán Nâng Cao Lớp 4 (Ca Trưa 12:50)', 'Lớp 4', 'SUB-MATH', 'LVL-ADV', '1-1', 1, ARRAY['HS-2026-005']::text[], 'T2 (12:50 - 13:50), T3 (12:50 - 13:50), T4 (12:50 - 13:50)', 'https://example.com/rooms/CLS-1250', 'Thầy Trần Anh Tuấn', 'GV-001', '[{"month":"10/2026","week":"Tuần 1: Từ ngày 05/10/2026 đến ngày 11/10/2026","session":1,"title":"Tiết 12: Phân số & Tư duy hình học thực tế","slide":"https://example.com/materials/CLS-1250/1","lms":"https://example.com/exercises/CLS-1250/1"}]'::jsonb, 'CAP-TH', 'Đang học', '{"1":{"sessionNum":1,"dateStr":"2026-10-06 12:50 - 13:50","title":"Tiết 12: Phân số & Tư duy hình học thực tế","status":"Đã hoàn thành","checkinTime":"12:50:00","teacherAttendance":"ATTENDED","checkinBy":"Thầy Trần Anh Tuấn","materialGv":"https://example.com/materials/CLS-1250/1","materialHs":"https://example.com/materials/CLS-1250/1/student","exerciseLms":"https://example.com/exercises/CLS-1250/1","attendance":{"HS-2026-005":"present"},"feedback":{"HS-2026-005":"Con tập trung, nắm được kiến thức và hoàn thành bài tập."},"feedbackCriteria":{"HS-2026-005":{"CRI_T1":"OPT_T1_1"}}}}'::jsonb, '[]'::jsonb),
('CLS-001', 'TOAN_K03_NT2_13_01', 'Toán Nền Tảng 2 - Lớp 3 (T3/T5)', 'Lớp 3', 'SUB-MATH', 'LVL-F2', '1-3', 3, ARRAY['HS-2026-001']::text[], 'T3 (18:00 - 19:30), T5 (18:00 - 19:30)', 'https://example.com/rooms/CLS-001', 'Thầy Trần Anh Tuấn', 'GV-001', '[{"month":"10/2026","week":"Tuần 1: Từ ngày 05/10/2026 đến ngày 11/10/2026","session":1,"title":"Giải bài toán bằng 3 bước tính (tiết 2)","slide":"https://example.com/materials/CLS-001/1","lms":"https://example.com/exercises/CLS-001/1"},{"month":"10/2026","week":"Tuần 1: Từ ngày 05/10/2026 đến ngày 11/10/2026","session":2,"title":"Đơn vị đo góc. Góc nhọn - góc tù - góc bẹt","slide":"https://example.com/materials/CLS-001/2","lms":"https://example.com/exercises/CLS-001/2"}]'::jsonb, 'CAP-TH', 'Đang học', '{"1":{"sessionNum":1,"dateStr":"2026-10-06 18:00 - 19:30","title":"Giải bài toán bằng 3 bước tính (tiết 2)","status":"Đã hoàn thành","checkinTime":"18:00:00","teacherAttendance":"ATTENDED","checkinBy":"Thầy Trần Anh Tuấn","materialGv":"https://example.com/materials/CLS-001/1","materialHs":"https://example.com/materials/CLS-001/1/student","exerciseLms":"https://example.com/exercises/CLS-001/1","attendance":{"HS-2026-001":"present"},"feedback":{"HS-2026-001":"Con tập trung, nắm được kiến thức và hoàn thành bài tập."},"feedbackCriteria":{"HS-2026-001":{"CRI_T1":"OPT_T1_1"}}},"2":{"sessionNum":2,"dateStr":"2026-10-08 18:00 - 19:30","title":"Đơn vị đo góc. Góc nhọn - góc tù - góc bẹt","status":"Đã hoàn thành","checkinTime":"18:08:00","teacherAttendance":"LATE","checkinBy":"Thầy Trần Anh Tuấn","materialGv":"https://example.com/materials/CLS-001/2","materialHs":"https://example.com/materials/CLS-001/2/student","exerciseLms":"https://example.com/exercises/CLS-001/2","attendance":{"HS-2026-001":"present"},"feedback":{"HS-2026-001":"Con tập trung, nắm được kiến thức và hoàn thành bài tập."},"feedbackCriteria":{"HS-2026-001":{"CRI_T1":"OPT_T1_1"}}},"3":{"sessionNum":3,"dateStr":"2026-10-13 18:00 - 19:30","title":"Giải bài toán bằng 3 bước tính (tiết 2)","status":"Chưa diễn ra","materialGv":"https://example.com/materials/CLS-001/3","materialHs":"https://example.com/materials/CLS-001/3/student","exerciseLms":"https://example.com/exercises/CLS-001/3"}}'::jsonb, '[]'::jsonb),
('CLS-002', 'ENG_K04_NC_11_01', 'Tiếng Anh Nâng Cao - Lớp 4 (T2/T6)', 'Lớp 4', 'SUB-ENG', 'LVL-ADV', '1-1', 1, ARRAY['HS-2026-002']::text[], 'T2 (19:45 - 21:15), T6 (19:45 - 21:15)', 'https://example.com/rooms/CLS-002', 'Cô Nguyễn Thị Mai Hoa', 'GV-002', '[{"month":"10/2026","week":"Tuần 1: Từ ngày 05/10/2026 đến ngày 11/10/2026","session":1,"title":"Present Continuous Tense in Daily Routine","slide":"https://example.com/materials/CLS-002/1","lms":"https://example.com/exercises/CLS-002/1"}]'::jsonb, 'CAP-TH', 'Đang học', '{"1":{"sessionNum":1,"dateStr":"2026-10-05 19:45 - 21:15","title":"Present Continuous Tense in Daily Routine","status":"Đã hoàn thành","checkinTime":"19:45:00","teacherAttendance":"ATTENDED","checkinBy":"Cô Nguyễn Thị Mai Hoa","materialGv":"https://example.com/materials/CLS-002/1","materialHs":"https://example.com/materials/CLS-002/1/student","exerciseLms":"https://example.com/exercises/CLS-002/1","attendance":{"HS-2026-002":"present"},"feedback":{"HS-2026-002":"Con tập trung, nắm được kiến thức và hoàn thành bài tập."},"feedbackCriteria":{"HS-2026-002":{"CRI_E1":"OPT_E1_1"}}},"2":{"sessionNum":2,"dateStr":"2026-10-09 19:45 - 21:15","title":"Present Continuous Tense in Daily Routine","status":"Nghỉ có phép","materialGv":"https://example.com/materials/CLS-002/2","materialHs":"https://example.com/materials/CLS-002/2/student","exerciseLms":"https://example.com/exercises/CLS-002/2","attendance":{"HS-2026-002":"absent"},"feedback":{"HS-2026-002":"Học sinh xin nghỉ có phép."},"feedbackCriteria":{"HS-2026-002":{"CRI_E1":"OPT_E1_1"}}}}'::jsonb, '[]'::jsonb),
('CLS-DEMO-MATH-T7', 'TOAN_K03_DEMO_T7', 'Toán Nền tảng Lớp 3 - Ca thứ Bảy', 'Lớp 3', 'SUB-MATH', 'LVL-F2', '1-1', 1, ARRAY['HS-2026-003']::text[], 'T7 (12:50 - 13:50)', 'https://example.com/rooms/CLS-DEMO-MATH-T7', 'Thầy Lê Hoàng Nam', 'GV-003', '[{"month":"10/2026","week":"Tuần 1: Từ ngày 05/10/2026 đến ngày 11/10/2026","session":1,"title":"Ôn tập phép nhân, phép chia và giải toán có lời văn","slide":"https://example.com/materials/CLS-DEMO-MATH-T7/1","lms":"https://example.com/exercises/CLS-DEMO-MATH-T7/1"}]'::jsonb, 'CAP-TH', 'Đang học', '{"1":{"sessionNum":1,"dateStr":"2026-10-10 12:50 - 13:50","title":"Ôn tập phép nhân, phép chia và giải toán có lời văn","status":"Đã hoàn thành","checkinTime":"12:50:00","teacherAttendance":"ATTENDED","checkinBy":"Thầy Lê Hoàng Nam","materialGv":"https://example.com/materials/CLS-DEMO-MATH-T7/1","materialHs":"https://example.com/materials/CLS-DEMO-MATH-T7/1/student","exerciseLms":"https://example.com/exercises/CLS-DEMO-MATH-T7/1","attendance":{"HS-2026-003":"present"},"feedback":{"HS-2026-003":"Con tập trung, nắm được kiến thức và hoàn thành bài tập."},"feedbackCriteria":{"HS-2026-003":{"CRI_T1":"OPT_T1_1"}}}}'::jsonb, '[]'::jsonb),
('CLS-DEMO-ENG-T7', 'ENG_K04_DEMO_T7', 'Tiếng Anh Giao tiếp Lớp 4 - Ca thứ Bảy', 'Lớp 4', 'SUB-ENG', 'LVL-STD', '1-1', 1, ARRAY['HS-2026-004']::text[], 'T7 (18:00 - 19:30)', 'https://example.com/rooms/CLS-DEMO-ENG-T7', 'Cô Vũ Phương Linh', 'GV-005', '[{"month":"10/2026","week":"Tuần 1: Từ ngày 05/10/2026 đến ngày 11/10/2026","session":1,"title":"Daily routines: hỏi và trả lời về hoạt động hằng ngày","slide":"https://example.com/materials/CLS-DEMO-ENG-T7/1","lms":"https://example.com/exercises/CLS-DEMO-ENG-T7/1"}]'::jsonb, 'CAP-TH', 'Đang học', '{"1":{"sessionNum":1,"dateStr":"2026-10-10 18:00 - 19:30","title":"Daily routines: hỏi và trả lời về hoạt động hằng ngày","status":"Dạy thay","checkinTime":"18:00:00","teacherAttendance":"ATTENDED","checkinBy":"Cô Nguyễn Thị Mai Hoa","coverTeacherId":"GV-002","coverTeacherName":"Cô Nguyễn Thị Mai Hoa","materialGv":"https://example.com/materials/CLS-DEMO-ENG-T7/1","materialHs":"https://example.com/materials/CLS-DEMO-ENG-T7/1/student","exerciseLms":"https://example.com/exercises/CLS-DEMO-ENG-T7/1","attendance":{"HS-2026-004":"present"},"feedback":{"HS-2026-004":"Con tập trung, nắm được kiến thức và hoàn thành bài tập."},"feedbackCriteria":{"HS-2026-004":{"CRI_E1":"OPT_E1_1"}}}}'::jsonb, '[{"sessionNum":1,"dateStr":"2026-10-10 18:00 - 19:30","teacherId":"GV-002","teacherName":"Cô Nguyễn Thị Mai Hoa"}]'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."NHOM_TIEU_CHI" ("madinhdanh", "mamonhoc", "tennhomtieuchi", "danhsachtieuchi") VALUES
('CAT_TOAN_01', 'SUB-MATH', '1. Mức độ tập trung & Kỷ luật giờ giấc', '[{"id":"CRI_T1","name":"Mức độ tập trung trong ca học","options":[{"id":"OPT_T1_1","label":"Rất tập trung, hăng hái tương tác","isDefault":true},{"id":"OPT_T1_2","label":"Khá tập trung, chú ý nghe giảng","isDefault":false},{"id":"OPT_T1_3","label":"Còn mất tập trung, nhìn ra ngoài","isDefault":false}]}]'::jsonb),
('CAT_TOAN_02', 'SUB-MATH', '2. Năng lực tiếp thu & Kỹ năng giải toán', '[{"id":"CRI_T2","name":"Khả năng hiểu lý thuyết & Bản chất","options":[{"id":"OPT_T2_1","label":"Nắm rất chắc lý thuyết và bản chất các phép tính","isDefault":true},{"id":"OPT_T2_2","label":"Còn đôi chỗ lúng túng ở các bước tính toán phức tạp","isDefault":false}]}]'::jsonb),
('CAT_ENG_01', 'SUB-ENG', 'Khả năng giao tiếp tiếng Anh', '[{"id":"CRI_E1","name":"Phát âm và tương tác","options":[{"id":"OPT_E1_1","label":"Phát âm rõ, chủ động trả lời","isDefault":true},{"id":"OPT_E1_2","label":"Cần luyện thêm phát âm","isDefault":false}]}]'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."TAI_LIEU_QUY_TRINH" ("madinhdanh", "tieude", "phanloai", "tomtat", "ngaycapnhat", "noidung", "dangsudung") VALUES
('DOC-01', '[MẪU THỬ NGHIỆM] SOP_Bao_Nghi_Va_Su_Co_Ca_Day_2026.txt', 'Sự cố & Báo nghỉ', 'Quy định báo bận trước ca dạy (4 tiếng) và quy trình xử lý mất mạng đột xuất.', '05/10/2026', 'ĐIỀU 1: BÁO NGHỈ ĐỘT XUẤT: Phải báo trước ít nhất 04 TIẾNG để Vận hành kịp xếp Cover. Dưới 2 tiếng xử lý vi phạm mức 2.
ĐIỀU 2: SỰ CỐ MẤT MẠNG/MẤT ĐIỆN: Dùng 4G báo vào Zalo Trực Ban trong 05 phút, tối đa 10 phút khắc phục.', TRUE),
('DOC-02', '[MẪU THỬ NGHIỆM] Quy_Che_Doi_Soat_Cong_Va_Khieu_Nai.txt', 'Chốt công & Đối soát', 'Khóa sổ kỳ công Chủ nhật hàng tuần, thời hạn khiếu nại trước 12h Thứ 2.', '28/09/2026', 'ĐIỀU 1: Khóa sổ kỳ công vào 23h59 Chủ nhật. Bàn giao Kế toán vào sáng Thứ 2.
ĐIỀU 2: Khiếu nại sai lệch gửi trước 12h00 trưa Thứ 2 kèm ảnh minh chứng.', TRUE)
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."CAU_HINH_TRO_LY" ("madinhdanh", "loichaomung", "cauhoinhanh", "vanphong", "chiduatrentailieu", "cautraloiduphong", "chidanhethong") VALUES
('global', 'Dạ em chào Thầy/Cô ạ! Em là Trợ lý AI Vận hành Vuihoc Tutor 24/7. Em có thể hỗ trợ giải đáp nhanh quy chế đào tạo, báo nghỉ và hướng dẫn ca dạy.', ARRAY['Quy định báo nghỉ trước ca dạy bao nhiêu tiếng?', 'Sự cố mất mạng đột xuất xử lý thế nào?', 'Quy trình bàn giao ca dạy và hỗ trợ kỹ thuật']::text[], 'Xưng ''Em'', gọi ''Thầy/Cô''; hòa nhã, ân cần, ngắn gọn và chuẩn mực sư phạm.', TRUE, 'Dạ thưa Thầy/Cô, hiện tại vấn đề này chưa có quy định trong tài liệu SOP. Vui lòng liên hệ trực tiếp Quản lý ca trực qua Zalo Nhóm Vận Hành để được hỗ trợ ạ!', 'Bạn là Trợ lý AI Vận hành VUIHOC TUTOR. Trả lời dựa trên tài liệu SOP được cung cấp.')
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."BANG_CONG_THANG" ("madinhdanh", "kycong", "dakhoa", "daguithongbao", "danhsachgiaovien", "danhsachgiaitrinh") VALUES
('PAYROLL-2026-10', '2026-10', FALSE, TRUE, '[{"teacherId":"GV-001","teacherName":"Thầy Trần Anh Tuấn","staffRole":"GIAO_VIEN","staffRoleName":"Giáo viên","subject":"TOAN","subjectName":"Môn Toán","standardSessions":2,"coverSessions":0,"studentCanceledSessions":0,"lateSessions":1,"emergencySessions":0,"approvedExplanations":0,"payrollSent":true,"reconcileStatus":"CO_GIAI_TRINH","sessions":[{"id":"TOAN_K04_VIP_1250-2026-10-06-1","week":"Tuần 1","date":"2026-10-06","dateStr":"06/10/2026","dayOfWeek":"Thứ Ba","time":"12:50 - 13:50","classCode":"TOAN_K04_VIP_1250","className":"Toán Nâng Cao Lớp 4 (Ca Trưa 12:50)","studentName":"Phạm Minh Anh","studentNames":["Phạm Minh Anh"],"type":"STANDARD","statusText":"Dạy chuẩn","checkin":"12:50:00","checkout":"13:50","hasAiReview":true,"creditCoeff":1,"hrPayNote":"","dispute":null,"teacherId":"GV-001","teacherName":"Thầy Trần Anh Tuấn","staffRole":"GIAO_VIEN","staffRoleName":"Giáo viên","model":"1-1","durationMinutes":60,"studentCount":1,"reconcileStatus":"DA_XAC_NHAN"},{"id":"TOAN_K03_NT2_13_01-2026-10-06-1","week":"Tuần 1","date":"2026-10-06","dateStr":"06/10/2026","dayOfWeek":"Thứ Ba","time":"18:00 - 19:30","classCode":"TOAN_K03_NT2_13_01","className":"Toán Nền Tảng 2 - Lớp 3 (T3/T5)","studentName":"Trần Gia Bảo","studentNames":["Trần Gia Bảo"],"type":"STANDARD","statusText":"Dạy chuẩn","checkin":"18:00:00","checkout":"19:30","hasAiReview":true,"creditCoeff":1,"hrPayNote":"","dispute":null,"teacherId":"GV-001","teacherName":"Thầy Trần Anh Tuấn","staffRole":"GIAO_VIEN","staffRoleName":"Giáo viên","model":"1-3","durationMinutes":90,"studentCount":1,"reconcileStatus":"DA_XAC_NHAN"},{"id":"TOAN_K03_NT2_13_01-2026-10-08-2","week":"Tuần 2","date":"2026-10-08","dateStr":"08/10/2026","dayOfWeek":"Thứ Năm","time":"18:00 - 19:30","classCode":"TOAN_K03_NT2_13_01","className":"Toán Nền Tảng 2 - Lớp 3 (T3/T5)","studentName":"Trần Gia Bảo","studentNames":["Trần Gia Bảo"],"type":"LATE","statusText":"Giáo viên vào muộn","checkin":"18:08:00","checkout":"19:30","hasAiReview":true,"creditCoeff":0.75,"hrPayNote":"Chờ xem xét giải trình","dispute":{"id":"DSP-DEMO-001","teacherId":"GV-001","teacherName":"Thầy Trần Anh Tuấn","staffRole":"GIAO_VIEN","subject":"TOAN","sessionId":"TOAN_K03_NT2_13_01-2026-10-08-2","sessionTime":"08/10/2026 (18:00 - 19:30)","classCode":"TOAN_K03_NT2_13_01","status":"CHO_DUYET","incidentType":"Giải trình vào lớp muộn","content":"Dữ liệu mẫu: giáo viên đề nghị kiểm tra thời điểm kết nối phòng học.","attachment":"","adminNote":""},"teacherId":"GV-001","teacherName":"Thầy Trần Anh Tuấn","staffRole":"GIAO_VIEN","staffRoleName":"Giáo viên","model":"1-3","durationMinutes":90,"studentCount":1,"reconcileStatus":"CO_GIAI_TRINH"}]},{"teacherId":"GV-002","teacherName":"Cô Nguyễn Thị Mai Hoa","staffRole":"GIAO_VIEN","staffRoleName":"Giáo viên","subject":"ANH","subjectName":"Môn Tiếng Anh","standardSessions":1,"coverSessions":1,"studentCanceledSessions":1,"lateSessions":0,"emergencySessions":0,"approvedExplanations":0,"payrollSent":true,"reconcileStatus":"DA_GUI","sessions":[{"id":"ENG_K04_NC_11_01-2026-10-05-1","week":"Tuần 1","date":"2026-10-05","dateStr":"05/10/2026","dayOfWeek":"Thứ Hai","time":"19:45 - 21:15","classCode":"ENG_K04_NC_11_01","className":"Tiếng Anh Nâng Cao - Lớp 4 (T2/T6)","studentName":"Lê Quỳnh Anh","studentNames":["Lê Quỳnh Anh"],"type":"STANDARD","statusText":"Dạy chuẩn","checkin":"19:45:00","checkout":"21:15","hasAiReview":true,"creditCoeff":1,"hrPayNote":"","dispute":null,"teacherId":"GV-002","teacherName":"Cô Nguyễn Thị Mai Hoa","staffRole":"GIAO_VIEN","staffRoleName":"Giáo viên","model":"1-1","durationMinutes":90,"studentCount":1,"reconcileStatus":"DA_XAC_NHAN"},{"id":"ENG_K04_NC_11_01-2026-10-09-2","week":"Tuần 2","date":"2026-10-09","dateStr":"09/10/2026","dayOfWeek":"Thứ Sáu","time":"19:45 - 21:15","classCode":"ENG_K04_NC_11_01","className":"Tiếng Anh Nâng Cao - Lớp 4 (T2/T6)","studentName":"Lê Quỳnh Anh","studentNames":["Lê Quỳnh Anh"],"type":"STUDENT_CANCELED","statusText":"Học sinh xin nghỉ","checkin":"--","checkout":"--","hasAiReview":false,"creditCoeff":0.5,"hrPayNote":"","dispute":null,"teacherId":"GV-002","teacherName":"Cô Nguyễn Thị Mai Hoa","staffRole":"GIAO_VIEN","staffRoleName":"Giáo viên","model":"1-1","durationMinutes":90,"studentCount":1,"reconcileStatus":"DA_XAC_NHAN"},{"id":"ENG_K04_DEMO_T7-2026-10-10-1","week":"Tuần 2","date":"2026-10-10","dateStr":"10/10/2026","dayOfWeek":"Thứ Bảy","time":"18:00 - 19:30","classCode":"ENG_K04_DEMO_T7","className":"Tiếng Anh Giao tiếp Lớp 4 - Ca thứ Bảy","studentName":"Nguyễn Hà My","studentNames":["Nguyễn Hà My"],"type":"COVER","statusText":"Dạy thay","checkin":"18:00:00","checkout":"19:30","hasAiReview":true,"creditCoeff":1,"hrPayNote":"","dispute":null,"teacherId":"GV-002","teacherName":"Cô Nguyễn Thị Mai Hoa","staffRole":"GIAO_VIEN","staffRoleName":"Giáo viên","model":"1-1","durationMinutes":90,"studentCount":1,"reconcileStatus":"DA_XAC_NHAN"}]},{"teacherId":"GV-003","teacherName":"Thầy Lê Hoàng Nam","staffRole":"GIAO_VIEN","staffRoleName":"Giáo viên","subject":"TOAN","subjectName":"Môn Toán","standardSessions":0,"coverSessions":0,"studentCanceledSessions":0,"lateSessions":0,"emergencySessions":1,"approvedExplanations":0,"payrollSent":true,"reconcileStatus":"DA_GUI","sessions":[{"id":"TOAN_K03_DEMO_T7-2026-10-10-1","week":"Tuần 2","date":"2026-10-10","dateStr":"10/10/2026","dayOfWeek":"Thứ Bảy","time":"12:50 - 13:50","classCode":"TOAN_K03_DEMO_T7","className":"Toán Nền tảng Lớp 3 - Ca thứ Bảy","studentName":"Đặng Tuấn Kiệt","studentNames":["Đặng Tuấn Kiệt"],"type":"EMERGENCY","statusText":"Sự cố kỹ thuật","checkin":"12:50:00","checkout":"13:50","hasAiReview":true,"creditCoeff":1,"hrPayNote":"","dispute":null,"teacherId":"GV-003","teacherName":"Thầy Lê Hoàng Nam","staffRole":"GIAO_VIEN","staffRoleName":"Giáo viên","model":"1-1","durationMinutes":60,"studentCount":1,"reconcileStatus":"DA_XAC_NHAN"}]},{"teacherId":"GV-004","teacherName":"Thầy Đỗ Minh Đức","staffRole":"GIAO_VIEN","staffRoleName":"Giáo viên","subject":"TOAN","subjectName":"Môn Toán","standardSessions":0,"coverSessions":0,"studentCanceledSessions":0,"lateSessions":0,"emergencySessions":0,"approvedExplanations":0,"payrollSent":true,"reconcileStatus":"DA_GUI","sessions":[]},{"teacherId":"GV-005","teacherName":"Cô Vũ Phương Linh","staffRole":"GIAO_VIEN","staffRoleName":"Giáo viên","subject":"ANH","subjectName":"Môn Tiếng Anh","standardSessions":0,"coverSessions":0,"studentCanceledSessions":0,"lateSessions":0,"emergencySessions":0,"approvedExplanations":0,"payrollSent":true,"reconcileStatus":"DA_GUI","sessions":[]},{"teacherId":"GV-006","teacherName":"Thầy Phạm Quốc Huy","staffRole":"GIAO_VIEN","staffRoleName":"Giáo viên","subject":"TOAN","subjectName":"Môn Toán","standardSessions":0,"coverSessions":0,"studentCanceledSessions":0,"lateSessions":0,"emergencySessions":0,"approvedExplanations":0,"payrollSent":true,"reconcileStatus":"DA_GUI","sessions":[]}]'::jsonb, '[{"id":"DSP-DEMO-001","teacherId":"GV-001","teacherName":"Thầy Trần Anh Tuấn","staffRole":"GIAO_VIEN","subject":"TOAN","sessionId":"TOAN_K03_NT2_13_01-2026-10-08-2","sessionTime":"08/10/2026 (18:00 - 19:30)","classCode":"TOAN_K03_NT2_13_01","status":"CHO_DUYET","incidentType":"Giải trình vào lớp muộn","content":"Dữ liệu mẫu: giáo viên đề nghị kiểm tra thời điểm kết nối phòng học.","attachment":"","adminNote":""}]'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."CA_HOC" ("macahoc", "ngayhoc", "malophoc", "tenlophoc", "tentrinhdo", "tenmohinh", "mamonhoc", "khoi", "cahoc", "phonghoc", "lienketphonghoc", "lienketbanghi", "giaovienchinh", "giaoviendaythay", "diemdanh", "giovaolop", "trangthai", "cosuco", "manhomsuco", "masuco", "muckhancap", "trangthaisuco", "ghichusuco", "manguoixuly", "hotenguoixuly", "thoigianxuly", "nhatkybuoihoc", "danhsachhocsinh", "vuacapnhat") VALUES
('TOAN_K04_VIP_1250-2026-10-06-1', '2026-10-06', 'TOAN_K04_VIP_1250', 'Toán Nâng Cao Lớp 4 (Ca Trưa 12:50)', 'Nâng cao', 'Lớp 1 - 1 (Kèm 1-1)', 'SUB-MATH', 4, '12:50 - 13:50', 'CLS-1250', 'https://example.com/rooms/CLS-1250', 'https://example.com/recordings/TOAN_K04_VIP_1250-2026-10-06-1', 'Thầy Trần Anh Tuấn', NULL, 'ATTENDED', '12:50:00', 'DA_HOC', FALSE, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL, 'Đã hoàn thành nội dung ôn tập.', '[{"name":"Phạm Minh Anh","code":"HS-2026-005","gradeText":"Lớp 4","attendance":"Có mặt","aiComment":"Con tiếp thu tốt, cần luyện thêm bài tập.","criteria":["Tập trung tốt"]}]'::jsonb, FALSE),
('TOAN_K03_NT2_13_01-2026-10-06-1', '2026-10-06', 'TOAN_K03_NT2_13_01', 'Toán Nền Tảng 2 - Lớp 3 (T3/T5)', 'Nền tảng 2', 'Lớp 1 - 3', 'SUB-MATH', 3, '18:00 - 19:30', 'CLS-001', 'https://example.com/rooms/CLS-001', 'https://example.com/recordings/TOAN_K03_NT2_13_01-2026-10-06-1', 'Thầy Trần Anh Tuấn', NULL, 'ATTENDED', '18:00:00', 'DA_HOC', FALSE, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL, 'Đã hoàn thành nội dung ôn tập.', '[{"name":"Trần Gia Bảo","code":"HS-2026-001","gradeText":"Lớp 3","attendance":"Có mặt","aiComment":"Con tiếp thu tốt, cần luyện thêm bài tập.","criteria":["Tập trung tốt"]}]'::jsonb, FALSE),
('TOAN_K03_NT2_13_01-2026-10-08-2', '2026-10-08', 'TOAN_K03_NT2_13_01', 'Toán Nền Tảng 2 - Lớp 3 (T3/T5)', 'Nền tảng 2', 'Lớp 1 - 3', 'SUB-MATH', 3, '18:00 - 19:30', 'CLS-001', 'https://example.com/rooms/CLS-001', 'https://example.com/recordings/TOAN_K03_NT2_13_01-2026-10-08-2', 'Thầy Trần Anh Tuấn', NULL, 'LATE', '18:08:00', 'DA_HOC', TRUE, 'GRP-TCH', 'INC-TCH-03', 'EMERGENCY', 'DA_GIAI_QUYET', 'Tình huống mẫu để thử giám sát và đối soát.', 'USR-03', 'Lê Tuấn Quang', '2026-10-08T12:00:00+07:00', 'Đã hoàn thành nội dung ôn tập.', '[{"name":"Trần Gia Bảo","code":"HS-2026-001","gradeText":"Lớp 3","attendance":"Có mặt","aiComment":"Con tiếp thu tốt, cần luyện thêm bài tập.","criteria":["Tập trung tốt"]}]'::jsonb, FALSE),
('TOAN_K03_NT2_13_01-2026-10-13-3', '2026-10-13', 'TOAN_K03_NT2_13_01', 'Toán Nền Tảng 2 - Lớp 3 (T3/T5)', 'Nền tảng 2', 'Lớp 1 - 3', 'SUB-MATH', 3, '18:00 - 19:30', 'CLS-001', 'https://example.com/rooms/CLS-001', NULL, 'Thầy Trần Anh Tuấn', NULL, 'ABSENT', NULL, 'CHUA_HOC', FALSE, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL, '', '[{"name":"Trần Gia Bảo","code":"HS-2026-001","gradeText":"Lớp 3","attendance":"Chưa diễn ra","aiComment":"","criteria":[]}]'::jsonb, FALSE),
('ENG_K04_NC_11_01-2026-10-05-1', '2026-10-05', 'ENG_K04_NC_11_01', 'Tiếng Anh Nâng Cao - Lớp 4 (T2/T6)', 'Nâng cao', 'Lớp 1 - 1 (Kèm 1-1)', 'SUB-ENG', 4, '19:45 - 21:15', 'CLS-002', 'https://example.com/rooms/CLS-002', 'https://example.com/recordings/ENG_K04_NC_11_01-2026-10-05-1', 'Cô Nguyễn Thị Mai Hoa', NULL, 'ATTENDED', '19:45:00', 'DA_HOC', FALSE, NULL, NULL, NULL, NULL, '', NULL, NULL, NULL, 'Đã hoàn thành nội dung ôn tập.', '[{"name":"Lê Quỳnh Anh","code":"HS-2026-002","gradeText":"Lớp 4","attendance":"Có mặt","aiComment":"Con tiếp thu tốt, cần luyện thêm bài tập.","criteria":["Tập trung tốt"]}]'::jsonb, FALSE),
('ENG_K04_NC_11_01-2026-10-09-2', '2026-10-09', 'ENG_K04_NC_11_01', 'Tiếng Anh Nâng Cao - Lớp 4 (T2/T6)', 'Nâng cao', 'Lớp 1 - 1 (Kèm 1-1)', 'SUB-ENG', 4, '19:45 - 21:15', 'CLS-002', 'https://example.com/rooms/CLS-002', NULL, 'Cô Nguyễn Thị Mai Hoa', NULL, 'ABSENT', NULL, 'NGHI_HOC', TRUE, 'GRP-STU', 'INC-STU-01', 'ADVANCED', 'DA_GIAI_QUYET', 'Tình huống mẫu để thử giám sát và đối soát.', 'USR-03', 'Lê Tuấn Quang', '2026-10-09T12:00:00+07:00', 'Học sinh xin nghỉ có phép.', '[{"name":"Lê Quỳnh Anh","code":"HS-2026-002","gradeText":"Lớp 4","attendance":"Vắng có phép","aiComment":"","criteria":[]}]'::jsonb, FALSE),
('TOAN_K03_DEMO_T7-2026-10-10-1', '2026-10-10', 'TOAN_K03_DEMO_T7', 'Toán Nền tảng Lớp 3 - Ca thứ Bảy', 'Nền tảng 2', 'Lớp 1 - 1 (Kèm 1-1)', 'SUB-MATH', 3, '12:50 - 13:50', 'CLS-DEMO-MATH-T7', 'https://example.com/rooms/CLS-DEMO-MATH-T7', 'https://example.com/recordings/TOAN_K03_DEMO_T7-2026-10-10-1', 'Thầy Lê Hoàng Nam', NULL, 'ATTENDED', '12:50:00', 'CO_SU_CO', TRUE, 'GRP-SYS', 'INC-SYS-01', 'EMERGENCY', 'DA_GIAI_QUYET', 'Tình huống mẫu để thử giám sát và đối soát.', 'USR-03', 'Lê Tuấn Quang', '2026-10-10T12:00:00+07:00', 'Đã hoàn thành nội dung ôn tập.', '[{"name":"Đặng Tuấn Kiệt","code":"HS-2026-003","gradeText":"Lớp 3","attendance":"Có mặt","aiComment":"Con tiếp thu tốt, cần luyện thêm bài tập.","criteria":["Tập trung tốt"]}]'::jsonb, FALSE),
('ENG_K04_DEMO_T7-2026-10-10-1', '2026-10-10', 'ENG_K04_DEMO_T7', 'Tiếng Anh Giao tiếp Lớp 4 - Ca thứ Bảy', 'Tiêu chuẩn', 'Lớp 1 - 1 (Kèm 1-1)', 'SUB-ENG', 4, '18:00 - 19:30', 'CLS-DEMO-ENG-T7', 'https://example.com/rooms/CLS-DEMO-ENG-T7', 'https://example.com/recordings/ENG_K04_DEMO_T7-2026-10-10-1', 'Cô Vũ Phương Linh', 'Cô Nguyễn Thị Mai Hoa', 'ATTENDED', '18:00:00', 'DAY_THAY', TRUE, 'GRP-TCH', 'INC-TCH-02', 'EMERGENCY', 'DA_GIAI_QUYET', 'Tình huống mẫu để thử giám sát và đối soát.', 'USR-03', 'Lê Tuấn Quang', '2026-10-10T12:00:00+07:00', 'Đã hoàn thành nội dung ôn tập.', '[{"name":"Nguyễn Hà My","code":"HS-2026-004","gradeText":"Lớp 4","attendance":"Có mặt","aiComment":"Con tiếp thu tốt, cần luyện thêm bài tập.","criteria":["Tập trung tốt"]}]'::jsonb, FALSE)
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."MAU_BAO_CAO" ("madinhdanh", "manguoidung", "tenmaubaocao", "cauhinh") VALUES
('REPORT-DEMO-001', 'USR-01', 'Lớp học theo môn', '{"datasetId":"classes","metricIds":["count"],"groupBy":"subject","datePreset":"all","from":"","to":"","filters":{},"sort":"label_asc"}'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."DANH_MUC_BO_SUNG" ("madinhdanh", "madanhmuc", "tendanhmuc", "mota", "danhsachmuc", "madanhmuccha") VALUES
('CAT-DEMO', 'DEMO', 'Danh mục thử nghiệm', 'Dữ liệu mẫu', '[{"id":"ENTRY-DEMO","code":"DEMO-01","name":"Mục thử nghiệm","desc":"Dùng kiểm tra CRUD danh mục","status":true}]'::jsonb, NULL),
('CAT-DEMO-CHILD', 'DEMO-CHILD', 'Danh mục con', 'Kiểm tra cây danh mục', '[]'::jsonb, 'CAT-DEMO')
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."VAN_PHONG_NHAN_XET" ("madinhdanh", "tenvanphong", "chidan") VALUES
('khich-le', 'Khích lệ, ân cần & Khen ngợi (Khuyến nghị cho Tiểu học)', 'Bạn là giáo viên Vuihoc tâm lý, ân cần. Hãy tổng hợp các tiêu chí giáo viên đã tick để viết một đoạn nhận xét ấm áp, khen ngợi nỗ lực của con và dặn dò bài tập chu đáo.'),
('chuan-muc', 'Sư phạm chuẩn mực & Khách quan', 'Bạn là giáo viên bộ môn chuẩn mực. Hãy viết đoạn nhận xét đánh giá đúng thực chất năng lực và nề nếp buổi học của học sinh, nêu rõ ưu điểm và khuyến nghị cụ thể.')
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."CAU_HINH_HE_THONG" ("madinhdanh", "mavanphongdangchon") VALUES
('global', 'khich-le')
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."LUOT_NHAN_XET_AI" ("magiaovien", "mahocsinh", "soluotsudung") VALUES
('GV-001', 'HS-2026-001', 0)
ON CONFLICT DO NOTHING;

INSERT INTO vuihoc."TUY_CHON_NGUOI_DUNG" ("manguoidung", "phanhedangchon", "chedogiaodien", "tabgiaoviendangchon") VALUES
('USR-01', 1, 'ADMIN', 'availability')
ON CONFLICT DO NOTHING;

-- END DEMO SEED


CREATE OR REPLACE FUNCTION vuihoc.ghi_nhat_ky_nghiep_vu()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $audit$
DECLARE truoc jsonb; sau jsonb; fields text[]; keydata jsonb := '{}'::jsonb; col text;
BEGIN
 IF TG_OP <> 'INSERT' THEN truoc := to_jsonb(OLD)-ARRAY['matkhau_mahoa','khoamatkhau','matkhau_bam','maphien_bam','phienhethan','solansai','tamkhoaden']; END IF;
 IF TG_OP <> 'DELETE' THEN sau := to_jsonb(NEW)-ARRAY['matkhau_mahoa','khoamatkhau','matkhau_bam','maphien_bam','phienhethan','solansai','tamkhoaden']; END IF;
 IF TG_OP = 'UPDATE' AND (truoc - 'ngaycapnhat') IS NOT DISTINCT FROM (sau - 'ngaycapnhat') THEN RETURN NEW; END IF;
 SELECT coalesce(array_agg(k ORDER BY k), ARRAY[]::text[]) INTO fields
 FROM (SELECT jsonb_object_keys(coalesce(truoc,'{}'::jsonb) || coalesce(sau,'{}'::jsonb)) AS k) keys
 WHERE k <> 'ngaycapnhat' AND (truoc->k) IS DISTINCT FROM (sau->k);
 FOREACH col IN ARRAY TG_ARGV LOOP keydata := keydata || jsonb_build_object(col, coalesce(sau,truoc)->col); END LOOP;
 INSERT INTO vuihoc."NHAT_KY_NGHIEP_VU" (maxacthuc,tenbang,khoabanghi,thaotac,truongthaydoi,dulieutruoc,dulieusau)
 VALUES (NULL,TG_TABLE_NAME,keydata,TG_OP,fields,truoc,sau);
 IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $audit$;
REVOKE ALL ON FUNCTION vuihoc.ghi_nhat_ky_nghiep_vu() FROM PUBLIC, anon, authenticated;
ALTER TABLE vuihoc."NHAT_KY_NGHIEP_VU" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vuihoc."NHAT_KY_NGHIEP_VU" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON vuihoc."NHAT_KY_NGHIEP_VU" TO service_role;
CREATE INDEX IF NOT EXISTS nhat_ky_nghiep_vu_lookup ON vuihoc."NHAT_KY_NGHIEP_VU" (tenbang,thoigian DESC);
DO $audit_triggers$
DECLARE t record; keys text;
BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='vuihoc'
 AND tablename NOT IN ('NHAT_KY_NGHIEP_VU','TUY_CHON_NGUOI_DUNG','GOI_HOC') LOOP
  SELECT string_agg(quote_literal(a.attname), ',' ORDER BY a.attnum) INTO keys
  FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
  WHERE i.indrelid=format('vuihoc.%I',t.tablename)::regclass AND i.indisprimary;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid=format('vuihoc.%I',t.tablename)::regclass AND tgname='audit_business_change') THEN
   EXECUTE format('CREATE TRIGGER audit_business_change AFTER INSERT OR UPDATE OR DELETE ON vuihoc.%I FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_nhat_ky_nghiep_vu(%s)',t.tablename,keys);
  END IF;
 END LOOP;
END; $audit_triggers$;


-- MÔ HÌNH NGHIỆP VỤ THEO THỜI GIAN.
-- Chạy migration này sau schema.sql trên database đã tồn tại.
-- Schema mới đã bao gồm nội dung này. Không tự suy đoán/chuyển JSONB lịch sử cũ.
CREATE TABLE IF NOT EXISTS vuihoc."LICH_RANH_TUAN" (
 madinhdanh text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 magiaovien text NOT NULL REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE RESTRICT,
 ngaydautuan date NOT NULL CHECK (extract(isodow FROM ngaydautuan)=1),
 ngaycuoituan date GENERATED ALWAYS AS (ngaydautuan + 6) STORED,
 namhoc text,
 manguoicapnhat text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 ngaytao timestamptz NOT NULL DEFAULT now(), ngaycapnhat timestamptz NOT NULL DEFAULT now(),
 UNIQUE(magiaovien,ngaydautuan)
);
CREATE TABLE IF NOT EXISTS vuihoc."CHI_TIET_LICH_RANH" (
 malichtuan text NOT NULL REFERENCES vuihoc."LICH_RANH_TUAN"(madinhdanh) ON DELETE CASCADE,
 ngay date NOT NULL,
 makhunggio text NOT NULL REFERENCES vuihoc."KHUNG_GIO"(madinhdanh) ON DELETE RESTRICT,
 trangthai text NOT NULL CHECK (trangthai IN ('free','none')),
 ngaytao timestamptz NOT NULL DEFAULT now(), ngaycapnhat timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(malichtuan,ngay,makhunggio)
);
-- busy được tính từ BUOI_HOC, không cho giáo viên tự đăng ký busy.
CREATE TABLE IF NOT EXISTS vuihoc."BUOI_HOC" (
 madinhdanh text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 malop text NOT NULL REFERENCES vuihoc."LOP_HOC"(madinhdanh) ON DELETE RESTRICT,
 ngayhoc date NOT NULL,
 makhunggio text NOT NULL REFERENCES vuihoc."KHUNG_GIO"(madinhdanh) ON DELETE RESTRICT,
 batdau timestamptz NOT NULL, ketthuc timestamptz NOT NULL,
 magiaovienchinh text NOT NULL REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE RESTRICT,
 magiaoviendaythay text REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE RESTRICT,
 tieude text NOT NULL DEFAULT '',
 lienketphonghoc text NOT NULL DEFAULT '',
 hoclieu jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(hoclieu)='object'),
 trangthai text NOT NULL DEFAULT 'CHUA_DIEN_RA' CHECK (trangthai IN ('CHUA_DIEN_RA','DANG_HOC','HOAN_THANH','HUY')),
 vaolopluc timestamptz, ketthucluc timestamptz,
 manguoivaolop text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 manguoiketthuc text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 chuyencan text CHECK (chuyencan IN ('ATTENDED','LATE','ABSENT')),
 nhatky text NOT NULL DEFAULT '', lienketbanghi text,
 ngaytao timestamptz NOT NULL DEFAULT now(), ngaycapnhat timestamptz NOT NULL DEFAULT now(),
 UNIQUE(malop,ngayhoc,makhunggio),
 CHECK (ketthuc>batdau),
 CHECK ((batdau AT TIME ZONE 'Asia/Bangkok')::date=ngayhoc),
 CHECK (ketthucluc IS NULL OR (vaolopluc IS NOT NULL AND ketthucluc>=vaolopluc)),
 CHECK (trangthai NOT IN ('DANG_HOC','HOAN_THANH') OR vaolopluc IS NOT NULL),
 CHECK (trangthai<>'HOAN_THANH' OR ketthucluc IS NOT NULL),
 CHECK (magiaoviendaythay IS NULL OR magiaoviendaythay<>magiaovienchinh)
);
CREATE TABLE IF NOT EXISTS vuihoc."DIEM_DANH_BUOI_HOC" (
 mabuoi text NOT NULL REFERENCES vuihoc."BUOI_HOC"(madinhdanh) ON DELETE RESTRICT,
 mahocsinh text NOT NULL REFERENCES vuihoc."HOC_SINH"(madinhdanh) ON DELETE RESTRICT,
 trangthai text NOT NULL CHECK (trangthai IN ('present','late','absent')),
 ghichu text NOT NULL DEFAULT '',
 manguoicapnhat text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 ngaytao timestamptz NOT NULL DEFAULT now(), ngaycapnhat timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(mabuoi,mahocsinh)
);
CREATE TABLE IF NOT EXISTS vuihoc."NHAN_XET_BUOI_HOC" (
 mabuoi text NOT NULL REFERENCES vuihoc."BUOI_HOC"(madinhdanh) ON DELETE RESTRICT,
 mahocsinh text NOT NULL REFERENCES vuihoc."HOC_SINH"(madinhdanh) ON DELETE RESTRICT,
 noidung text NOT NULL DEFAULT '',
 tieuchidachon jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(tieuchidachon)='object'),
 mavanphong text REFERENCES vuihoc."VAN_PHONG_NHAN_XET"(madinhdanh) ON DELETE SET NULL,
 soluottaoai integer NOT NULL DEFAULT 0 CHECK (soluottaoai>=0),
 manguoicapnhat text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 ngaytao timestamptz NOT NULL DEFAULT now(), ngaycapnhat timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(mabuoi,mahocsinh)
);
CREATE TABLE IF NOT EXISTS vuihoc."SU_CO_BUOI_HOC" (
 madinhdanh text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 mabuoi text NOT NULL REFERENCES vuihoc."BUOI_HOC"(madinhdanh) ON DELETE RESTRICT,
 manhomsuco text NOT NULL REFERENCES vuihoc."DANH_MUC_SU_CO"(madinhdanh) ON DELETE RESTRICT,
 masuco text NOT NULL, tensuco text NOT NULL,
 muckhancap text CHECK (muckhancap IN ('EMERGENCY','ADVANCED')),
 noidung text NOT NULL DEFAULT '',
 trangthai text NOT NULL DEFAULT 'DANG_XU_LY' CHECK (trangthai IN ('DANG_XU_LY','DA_GIAI_QUYET','HUY_CA')),
 manguoibao text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 manguoixuly text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 baoluc timestamptz NOT NULL DEFAULT now(), xulyluc timestamptz,
 ghichuxuly text NOT NULL DEFAULT '',
 ngaytao timestamptz NOT NULL DEFAULT now(), ngaycapnhat timestamptz NOT NULL DEFAULT now(),
 CHECK (xulyluc IS NULL OR xulyluc>=baoluc)
);
CREATE TABLE IF NOT EXISTS vuihoc."CONG_DAY_BUOI_HOC" (
 madinhdanh text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 mabuoi text NOT NULL REFERENCES vuihoc."BUOI_HOC"(madinhdanh) ON DELETE RESTRICT,
 magiaovien text NOT NULL REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE RESTRICT,
 kycong text NOT NULL REFERENCES vuihoc."BANG_CONG_THANG"(kycong) ON DELETE RESTRICT,
 vaitro text NOT NULL CHECK (vaitro IN ('CHINH','DAY_THAY')),
 hesocong numeric(6,3) NOT NULL DEFAULT 1 CHECK (hesocong>=0),
 ghichu text NOT NULL DEFAULT '',
 dagui boolean NOT NULL DEFAULT false, guiluc timestamptz,
 ngaytao timestamptz NOT NULL DEFAULT now(), ngaycapnhat timestamptz NOT NULL DEFAULT now(),
 UNIQUE(mabuoi,magiaovien),
 UNIQUE(mabuoi)
);
-- Chính sách mẫu: một ca hoàn tất tính công cho người thực dạy (cover nếu có).
-- Sự cố không tự áp hệ số 0; vận hành điều chỉnh hệ số kèm lý do.
CREATE TABLE IF NOT EXISTS vuihoc."GIAI_TRINH_CONG_DAY" (
 madinhdanh text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 macong text NOT NULL REFERENCES vuihoc."CONG_DAY_BUOI_HOC"(madinhdanh) ON DELETE RESTRICT,
 noidung text NOT NULL, loaisuco text NOT NULL,
 minhchung jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(minhchung)='array'),
 trangthai text NOT NULL DEFAULT 'CHO_DUYET' CHECK (trangthai IN ('CHO_DUYET','DA_DUYET','TU_CHOI')),
 guiluc timestamptz NOT NULL DEFAULT now(),
 manguoigui text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 manguoiduyet text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 duyetluc timestamptz, ghichuduyet text NOT NULL DEFAULT '',
 ngaytao timestamptz NOT NULL DEFAULT now(), ngaycapnhat timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS mot_giai_trinh_dang_cho ON vuihoc."GIAI_TRINH_CONG_DAY"(macong) WHERE trangthai='CHO_DUYET';
CREATE INDEX IF NOT EXISTS buoi_hoc_ngay_gv ON vuihoc."BUOI_HOC"(ngayhoc,magiaovienchinh);
CREATE INDEX IF NOT EXISTS buoi_hoc_cover ON vuihoc."BUOI_HOC"(magiaoviendaythay,ngayhoc) WHERE magiaoviendaythay IS NOT NULL;
CREATE INDEX IF NOT EXISTS su_co_buoi ON vuihoc."SU_CO_BUOI_HOC"(mabuoi);
CREATE INDEX IF NOT EXISTS cong_day_ky_gv ON vuihoc."CONG_DAY_BUOI_HOC"(kycong,magiaovien);

CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_ngay_lich_ranh()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE dau date;
BEGIN
 SELECT ngaydautuan INTO dau FROM vuihoc."LICH_RANH_TUAN" WHERE madinhdanh=NEW.malichtuan FOR SHARE;
 IF dau IS NULL OR NEW.ngay NOT BETWEEN dau AND dau+6 THEN
  RAISE EXCEPTION 'Ngày lịch rảnh phải nằm trong tuần đã đăng ký';
 END IF;
 RETURN NEW;
END; $fn$;
CREATE OR REPLACE FUNCTION vuihoc.khoa_dinh_danh_lich_tuan()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
BEGIN
 IF NEW.ngaydautuan<>OLD.ngaydautuan OR NEW.magiaovien<>OLD.magiaovien THEN
  RAISE EXCEPTION 'Tạo lịch tuần mới thay vì chuyển lịch cũ sang tuần/giáo viên khác';
 END IF;
 RETURN NEW;
END; $fn$;
DROP TRIGGER IF EXISTS kiem_tra_ngay ON vuihoc."CHI_TIET_LICH_RANH";
CREATE TRIGGER kiem_tra_ngay BEFORE INSERT OR UPDATE ON vuihoc."CHI_TIET_LICH_RANH" FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_ngay_lich_ranh();
DROP TRIGGER IF EXISTS khoa_dinh_danh ON vuihoc."LICH_RANH_TUAN";
CREATE TRIGGER khoa_dinh_danh BEFORE UPDATE ON vuihoc."LICH_RANH_TUAN" FOR EACH ROW EXECUTE FUNCTION vuihoc.khoa_dinh_danh_lich_tuan();

CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_ky_cong_buoi()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE d date; buoi text; ky text; khoa boolean; gv text; cover text; cong text;
BEGIN
 IF TG_TABLE_NAME='BUOI_HOC' THEN
  IF TG_OP='INSERT' THEN d:=NEW.ngayhoc; ELSE d:=OLD.ngayhoc; END IF;
  buoi:=CASE WHEN TG_OP='DELETE' THEN OLD.madinhdanh ELSE NEW.madinhdanh END;
  IF TG_OP='UPDATE' AND EXISTS (SELECT 1 FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE mabuoi=OLD.madinhdanh)
    AND (NEW.ngayhoc,NEW.malop,NEW.makhunggio,NEW.magiaovienchinh,NEW.magiaoviendaythay,NEW.trangthai)
      IS DISTINCT FROM (OLD.ngayhoc,OLD.malop,OLD.makhunggio,OLD.magiaovienchinh,OLD.magiaoviendaythay,OLD.trangthai) THEN
   RAISE EXCEPTION 'Ca đã phát sinh công: không đổi định danh/người dạy/trạng thái; cần quy trình hiệu chỉnh công';
  END IF;
 ELSE
  IF TG_TABLE_NAME='GIAI_TRINH_CONG_DAY' THEN
   cong:=CASE WHEN TG_OP='DELETE' THEN OLD.macong ELSE NEW.macong END;
   SELECT mabuoi INTO buoi FROM vuihoc."CONG_DAY_BUOI_HOC" WHERE madinhdanh=cong;
   IF TG_OP='UPDATE' AND NEW.macong<>OLD.macong THEN RAISE EXCEPTION 'Không chuyển giải trình sang bản công khác'; END IF;
  ELSE
   buoi:=CASE WHEN TG_OP='DELETE' THEN OLD.mabuoi ELSE NEW.mabuoi END;
   IF TG_OP='UPDATE' AND NEW.mabuoi<>OLD.mabuoi THEN RAISE EXCEPTION 'Không chuyển bản ghi sang ca khác'; END IF;
  END IF;
  SELECT ngayhoc,magiaovienchinh,magiaoviendaythay INTO d,gv,cover FROM vuihoc."BUOI_HOC" WHERE madinhdanh=buoi FOR SHARE;
 END IF;
 ky:=to_char(d,'YYYY-MM');
 -- Cùng thứ tự khóa với thao tác chốt kỳ; tránh ghi công đồng thời với khóa tháng.
 PERFORM pg_advisory_xact_lock(hashtextextended('vuihoc-ky-'||ky,0));
 SELECT dakhoa INTO khoa FROM vuihoc."BANG_CONG_THANG" WHERE kycong=ky FOR UPDATE;
 IF khoa THEN RAISE EXCEPTION 'Kỳ công % đã khóa',ky; END IF;
 IF TG_TABLE_NAME='CONG_DAY_BUOI_HOC' AND TG_OP<>'DELETE' THEN
  IF NEW.kycong<>ky THEN RAISE EXCEPTION 'Kỳ công phải lấy từ ngày của ca học (%)',ky; END IF;
  IF NEW.magiaovien IS DISTINCT FROM coalesce(cover,gv) OR NEW.vaitro<>(CASE WHEN cover IS NULL THEN 'CHINH' ELSE 'DAY_THAY' END) THEN
   RAISE EXCEPTION 'Công phải thuộc giáo viên thực dạy của ca';
  END IF;
  IF TG_OP='UPDATE' AND NEW.hesocong<>OLD.hesocong AND btrim(NEW.ghichu)='' THEN RAISE EXCEPTION 'Điều chỉnh hệ số công cần lý do'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $fn$;

CREATE OR REPLACE FUNCTION vuihoc.sinh_cong_khi_hoan_tat()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE ky text:=to_char(NEW.ngayhoc,'YYYY-MM');
BEGIN
 IF NEW.trangthai='HOAN_THANH' THEN
  INSERT INTO vuihoc."BANG_CONG_THANG"(kycong,dakhoa,daguithongbao) VALUES(ky,false,false) ON CONFLICT(kycong) DO NOTHING;
  INSERT INTO vuihoc."CONG_DAY_BUOI_HOC"(mabuoi,magiaovien,kycong,vaitro)
  VALUES(NEW.madinhdanh,coalesce(NEW.magiaoviendaythay,NEW.magiaovienchinh),ky,CASE WHEN NEW.magiaoviendaythay IS NULL THEN 'CHINH' ELSE 'DAY_THAY' END)
  ON CONFLICT(mabuoi) DO NOTHING;
 END IF;
 RETURN NEW;
END; $fn$;
DROP TRIGGER IF EXISTS sinh_cong ON vuihoc."BUOI_HOC";
CREATE TRIGGER sinh_cong AFTER INSERT OR UPDATE ON vuihoc."BUOI_HOC" FOR EACH ROW EXECUTE FUNCTION vuihoc.sinh_cong_khi_hoan_tat();

CREATE OR REPLACE VIEW vuihoc."V_CONG_DAY_THEO_CA" WITH (security_invoker=true) AS
 SELECT c.*, b.ngayhoc,b.malop,b.makhunggio,b.batdau,b.ketthuc,b.vaolopluc,b.ketthucluc,
 b.trangthai AS trangthaibuoi, b.magiaovienchinh,b.magiaoviendaythay,
 EXISTS(SELECT 1 FROM vuihoc."NHAN_XET_BUOI_HOC" n WHERE n.mabuoi=b.madinhdanh AND btrim(n.noidung)<>'') AS conhanxet,
 EXISTS(SELECT 1 FROM vuihoc."SU_CO_BUOI_HOC" s WHERE s.mabuoi=b.madinhdanh) AS cosuco
 FROM vuihoc."CONG_DAY_BUOI_HOC" c JOIN vuihoc."BUOI_HOC" b ON b.madinhdanh=c.mabuoi;

DO $security$
DECLARE t text; keys text;
BEGIN
 FOREACH t IN ARRAY ARRAY['LICH_RANH_TUAN','CHI_TIET_LICH_RANH','BUOI_HOC','DIEM_DANH_BUOI_HOC','NHAN_XET_BUOI_HOC','SU_CO_BUOI_HOC','CONG_DAY_BUOI_HOC','GIAI_TRINH_CONG_DAY'] LOOP
  EXECUTE format('ALTER TABLE vuihoc.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON vuihoc.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('GRANT ALL ON vuihoc.%I TO service_role',t);
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=format('vuihoc.%I',t)::regclass AND tgname='set_updated_at') THEN
   EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON vuihoc.%I FOR EACH ROW EXECUTE FUNCTION vuihoc.set_updated_at()',t);
  END IF;
  SELECT string_agg(quote_literal(a.attname),',' ORDER BY a.attnum) INTO keys
  FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey)
  WHERE i.indrelid=format('vuihoc.%I',t)::regclass AND i.indisprimary;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=format('vuihoc.%I',t)::regclass AND tgname='audit_business_change') THEN
   EXECUTE format('CREATE TRIGGER audit_business_change AFTER INSERT OR UPDATE OR DELETE ON vuihoc.%I FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_nhat_ky_nghiep_vu(%s)',t,keys);
  END IF;
 END LOOP;
 FOREACH t IN ARRAY ARRAY['BUOI_HOC','DIEM_DANH_BUOI_HOC','NHAN_XET_BUOI_HOC','SU_CO_BUOI_HOC','CONG_DAY_BUOI_HOC','GIAI_TRINH_CONG_DAY'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS kiem_tra_ky_cong ON vuihoc.%I',t);
  EXECUTE format('CREATE TRIGGER kiem_tra_ky_cong BEFORE INSERT OR UPDATE OR DELETE ON vuihoc.%I FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_ky_cong_buoi()',t);
 END LOOP;
END; $security$;
REVOKE ALL ON vuihoc."V_CONG_DAY_THEO_CA" FROM PUBLIC,anon,authenticated;
GRANT SELECT ON vuihoc."V_CONG_DAY_THEO_CA" TO service_role;
REVOKE ALL ON FUNCTION vuihoc.kiem_tra_ngay_lich_ranh(),vuihoc.khoa_dinh_danh_lich_tuan(),vuihoc.kiem_tra_ky_cong_buoi(),vuihoc.sinh_cong_khi_hoan_tat() FROM PUBLIC,anon,authenticated;


-- Biên bản dự giờ: mã giáo viên bắt buộc, không chỉ nằm trong JSONB.
-- Chạy sau schema.sql phiên bản 31 bảng, hoặc sau migration timed_workflow.
CREATE TABLE IF NOT EXISTS vuihoc."BIEN_BAN_DU_GIO" (
 madinhdanh text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 magiaovien text NOT NULL REFERENCES vuihoc."GIAO_VIEN"(madinhdanh) ON DELETE RESTRICT,
 mabienban text NOT NULL UNIQUE,
 mabuoi text REFERENCES vuihoc."BUOI_HOC"(madinhdanh) ON DELETE RESTRICT,
 malophoc text NOT NULL REFERENCES vuihoc."LOP_HOC"(malophoc) ON UPDATE CASCADE ON DELETE RESTRICT,
 manguoinhan text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 manguoidanhgia text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL,
 ngaydanhgia date NOT NULL,
 ngaycahoc date,
 macahoc text,
 guiluc timestamptz,
 hotennguoidanhgia text NOT NULL,
 vaitronguoidanhgia text NOT NULL,
 tenlophoc text NOT NULL,
 sobuoi integer NOT NULL CHECK (sobuoi>0),
 tenbuoihoc text NOT NULL,
 khunggio text NOT NULL,
 mohinh text NOT NULL,
 diemtong numeric(4,2) NOT NULL CHECK (diemtong BETWEEN 0 AND 10),
 xeploai text NOT NULL CHECK (xeploai IN ('Xuất sắc','Tốt','Khá','Cần bồi dưỡng')),
 diemtieuchi jsonb NOT NULL CHECK (
  jsonb_typeof(diemtieuchi)='object'
  AND diemtieuchi ?& ARRAY['tc1','tc2','tc3']
  AND jsonb_typeof(diemtieuchi->'tc1')='number'
  AND jsonb_typeof(diemtieuchi->'tc2')='number'
  AND jsonb_typeof(diemtieuchi->'tc3')='number'
  AND (diemtieuchi->>'tc1')::numeric BETWEEN 0 AND 10
  AND (diemtieuchi->>'tc2')::numeric BETWEEN 0 AND 10
  AND (diemtieuchi->>'tc3')::numeric BETWEEN 0 AND 10
 ),
 nhanxetchung text NOT NULL DEFAULT '',
 uudiem text NOT NULL DEFAULT '',
 cancaithien text NOT NULL DEFAULT '',
 khuyennghi text NOT NULL DEFAULT '',
 trangthai text NOT NULL CHECK (trangthai IN ('DA_DUYET','CHO_GOP_Y')),
 lienketphonghoc text,
 lienketbanghi text,
 ngaytao timestamptz NOT NULL DEFAULT now(),
 ngaycapnhat timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bien_ban_gv_ngay ON vuihoc."BIEN_BAN_DU_GIO"(magiaovien,ngaydanhgia DESC);
CREATE INDEX IF NOT EXISTS bien_ban_buoi ON vuihoc."BIEN_BAN_DU_GIO"(mabuoi) WHERE mabuoi IS NOT NULL;
CREATE OR REPLACE FUNCTION vuihoc.kiem_tra_giao_vien_du_gio()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $fn$
DECLARE b record; u text;
BEGIN
 IF NEW.mabuoi IS NOT NULL THEN
  SELECT bh.*,lh.malophoc AS malopgoc INTO b
  FROM vuihoc."BUOI_HOC" bh JOIN vuihoc."LOP_HOC" lh ON lh.madinhdanh=bh.malop
  WHERE bh.madinhdanh=NEW.mabuoi FOR SHARE OF bh;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ca dự giờ không tồn tại'; END IF;
  IF NEW.magiaovien IS DISTINCT FROM coalesce(b.magiaoviendaythay,b.magiaovienchinh) THEN
   RAISE EXCEPTION 'Giáo viên dự giờ phải là người thực dạy của ca';
  END IF;
  IF NEW.malophoc<>b.malopgoc THEN RAISE EXCEPTION 'Lớp dự giờ không khớp ca'; END IF;
  IF NEW.ngaycahoc IS NOT NULL AND NEW.ngaycahoc<>b.ngayhoc THEN RAISE EXCEPTION 'Ngày ca dự giờ không khớp'; END IF;
  NEW.ngaycahoc:=b.ngayhoc;
 END IF;
 IF NEW.manguoinhan IS NOT NULL THEN
  SELECT manguoidung INTO u FROM vuihoc."GIAO_VIEN" WHERE madinhdanh=NEW.magiaovien;
  IF u IS DISTINCT FROM NEW.manguoinhan THEN RAISE EXCEPTION 'Tài khoản nhận biên bản không thuộc giáo viên được đánh giá'; END IF;
 END IF;
 RETURN NEW;
END; $fn$;
DROP TRIGGER IF EXISTS kiem_tra_giao_vien ON vuihoc."BIEN_BAN_DU_GIO";
CREATE TRIGGER kiem_tra_giao_vien BEFORE INSERT OR UPDATE ON vuihoc."BIEN_BAN_DU_GIO" FOR EACH ROW EXECUTE FUNCTION vuihoc.kiem_tra_giao_vien_du_gio();
DO $triggers$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='vuihoc."BIEN_BAN_DU_GIO"'::regclass AND tgname='set_updated_at') THEN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON vuihoc."BIEN_BAN_DU_GIO" FOR EACH ROW EXECUTE FUNCTION vuihoc.set_updated_at();
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='vuihoc."BIEN_BAN_DU_GIO"'::regclass AND tgname='audit_business_change') THEN
  CREATE TRIGGER audit_business_change AFTER INSERT OR UPDATE OR DELETE ON vuihoc."BIEN_BAN_DU_GIO" FOR EACH ROW EXECUTE FUNCTION vuihoc.ghi_nhat_ky_nghiep_vu('madinhdanh');
 END IF;
END; $triggers$;
ALTER TABLE vuihoc."BIEN_BAN_DU_GIO" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON vuihoc."BIEN_BAN_DU_GIO" FROM PUBLIC,anon,authenticated;
GRANT ALL ON vuihoc."BIEN_BAN_DU_GIO" TO service_role;
REVOKE ALL ON FUNCTION vuihoc.kiem_tra_giao_vien_du_gio() FROM PUBLIC,anon,authenticated;

-- TÀI KHOẢN NỘI BỘ, KHÔNG DÙNG SUPABASE AUTH.
SET CONSTRAINTS ALL IMMEDIATE;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
ALTER EXTENSION pgcrypto SET SCHEMA extensions;
ALTER TABLE vuihoc."NGUOI_DUNG" ADD COLUMN IF NOT EXISTS matkhau_bam text;
ALTER TABLE vuihoc."NGUOI_DUNG" ADD COLUMN IF NOT EXISTS maphien_bam text;
ALTER TABLE vuihoc."NGUOI_DUNG" ADD COLUMN IF NOT EXISTS phienhethan timestamptz;
ALTER TABLE vuihoc."NGUOI_DUNG" ADD COLUMN IF NOT EXISTS solansai integer NOT NULL DEFAULT 0;
ALTER TABLE vuihoc."NGUOI_DUNG" ADD COLUMN IF NOT EXISTS tamkhoaden timestamptz;
-- Giữ cột maxacthuc cũ để không mất dữ liệu, nhưng bỏ phụ thuộc auth.users.
DO $dropauth$ DECLARE r record; BEGIN
 FOR r IN SELECT conname FROM pg_constraint WHERE conrelid='vuihoc."NGUOI_DUNG"'::regclass AND contype='f' AND confrelid=to_regclass('auth.users') LOOP
 EXECUTE format('ALTER TABLE vuihoc."NGUOI_DUNG" DROP CONSTRAINT %I',r.conname);
 END LOOP;
END; $dropauth$;
ALTER TABLE vuihoc."NGUOI_DUNG" DROP CONSTRAINT IF EXISTS users_role_check;
CREATE UNIQUE INDEX IF NOT EXISTS nguoi_dung_username_normalized ON vuihoc."NGUOI_DUNG" (lower(btrim(tendangnhap)));
UPDATE vuihoc."NGUOI_DUNG" u SET manhomquyen=g.madinhdanh FROM vuihoc."NHOM_QUYEN" g
 WHERE u.manhomquyen IS NULL AND u.vaitro=g.tennhomquyen
 AND (SELECT count(*) FROM vuihoc."NHOM_QUYEN" x WHERE x.tennhomquyen=u.vaitro)=1;
UPDATE vuihoc."NHOM_QUYEN" SET congtruycap=CASE WHEN phanloai='GIẢNG DẠY' THEN 'TEACHER' ELSE 'ADMIN' END WHERE congtruycap IS NULL;
ALTER TABLE vuihoc."NHAT_KY_NGHIEP_VU" ADD COLUMN IF NOT EXISTS manguoithuchien text REFERENCES vuihoc."NGUOI_DUNG"(madinhdanh) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION vuihoc.ghi_nhat_ky_nghiep_vu()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $audit$
DECLARE truoc jsonb; sau jsonb; fields text[]; keydata jsonb:='{}'; col text;
 secret text[]:=ARRAY['matkhau_mahoa','khoamatkhau','matkhau_bam','maphien_bam','phienhethan','solansai','tamkhoaden','ngaycapnhat'];
BEGIN
 IF TG_OP<>'INSERT' THEN truoc:=to_jsonb(OLD)-secret; END IF;
 IF TG_OP<>'DELETE' THEN sau:=to_jsonb(NEW)-secret; END IF;
 IF TG_OP='UPDATE' AND truoc IS NOT DISTINCT FROM sau AND NOT (TG_TABLE_NAME='NGUOI_DUNG' AND (to_jsonb(OLD)->'matkhau_bam') IS DISTINCT FROM (to_jsonb(NEW)->'matkhau_bam')) THEN RETURN NEW; END IF;
 SELECT coalesce(array_agg(k ORDER BY k),ARRAY[]::text[]) INTO fields FROM
 (SELECT jsonb_object_keys(coalesce(truoc,'{}')||coalesce(sau,'{}')) k) keys WHERE (truoc->k) IS DISTINCT FROM (sau->k);
 -- Ghi nhận đổi mật khẩu mà không lưu hash/mật khẩu trong nhật ký.
 IF TG_OP='UPDATE' AND TG_TABLE_NAME='NGUOI_DUNG' AND (to_jsonb(OLD)->'matkhau_bam') IS DISTINCT FROM (to_jsonb(NEW)->'matkhau_bam') THEN fields:=array_append(fields,'matkhau'); END IF;
 FOREACH col IN ARRAY TG_ARGV LOOP keydata:=keydata||jsonb_build_object(col,coalesce(sau,truoc)->col); END LOOP;
 INSERT INTO vuihoc."NHAT_KY_NGHIEP_VU"(manguoithuchien,tenbang,khoabanghi,thaotac,truongthaydoi,dulieutruoc,dulieusau)
 VALUES(nullif(current_setting('vuihoc.actor',true),''),TG_TABLE_NAME,keydata,TG_OP,fields,truoc,sau);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $audit$;

CREATE OR REPLACE FUNCTION vuihoc.tai_khoan_cong_khai(u vuihoc."NGUOI_DUNG") RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 SELECT to_jsonb(u)-ARRAY['matkhau_mahoa','khoamatkhau','matkhau_bam','maphien_bam','phienhethan','solansai','tamkhoaden','maxacthuc','ngaytao','ngaycapnhat'] $$;
CREATE OR REPLACE FUNCTION vuihoc.nguoi_dung_phien(p_token text) RETURNS vuihoc."NGUOI_DUNG"
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $$
 DECLARE u vuihoc."NGUOI_DUNG";
 BEGIN
 IF p_token IS NULL OR length(p_token)<>64 THEN RAISE EXCEPTION 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.'; END IF;
 SELECT * INTO u FROM vuihoc."NGUOI_DUNG" WHERE maphien_bam=encode(digest(p_token,'sha256'),'hex') AND phienhethan>now() AND trangthai='active';
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" WHERE madinhdanh=u.manhomquyen) THEN RAISE EXCEPTION 'Phiên đã hết hạn hoặc tài khoản chưa được gán nhóm quyền.'; END IF;
 PERFORM set_config('vuihoc.actor',u.madinhdanh,true);
 RETURN u;
 END $$;
CREATE OR REPLACE FUNCTION vuihoc.co_quyen(p_user text,p_feature text) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT coalesce(bool_or(g.congtruycap='ADMIN' AND (g.danhsachquyen && ARRAY['ALL','PH1_ALL',p_feature])),false)
 FROM vuihoc."NGUOI_DUNG" u JOIN vuihoc."NHOM_QUYEN" g ON g.madinhdanh=u.manhomquyen WHERE u.madinhdanh=p_user AND u.trangthai='active' $$;
CREATE OR REPLACE FUNCTION public.vuihoc_session(p_token text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
 DECLARE u vuihoc."NGUOI_DUNG"; allusers boolean; allgroups boolean;
 BEGIN
 u:=vuihoc.nguoi_dung_phien(p_token);
 allusers:=vuihoc.co_quyen(u.madinhdanh,'Xem danh sách tài khoản và nhóm quyền');
 allgroups:=allusers OR vuihoc.co_quyen(u.madinhdanh,'Tạo, sửa, xóa & Gán Nhóm quyền');
 RETURN jsonb_build_object('actor',vuihoc.tai_khoan_cong_khai(u),
 'users',(SELECT coalesce(jsonb_agg(vuihoc.tai_khoan_cong_khai(x)),'[]') FROM vuihoc."NGUOI_DUNG" x WHERE allusers OR x.madinhdanh=u.madinhdanh),
 'role_groups',(SELECT coalesce(jsonb_agg(to_jsonb(g)),'[]') FROM vuihoc."NHOM_QUYEN" g WHERE allgroups OR g.madinhdanh=u.manhomquyen));
 END $$;
CREATE OR REPLACE FUNCTION public.vuihoc_login(p_username text,p_password text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $$
 DECLARE u vuihoc."NGUOI_DUNG"; token text;
 BEGIN
 IF length(p_username)>200 OR octet_length(p_password)>72 OR p_password IS NULL THEN RETURN jsonb_build_object('error','Thông tin đăng nhập không hợp lệ.'); END IF;
 SELECT * INTO u FROM vuihoc."NGUOI_DUNG" WHERE lower(btrim(tendangnhap))=lower(btrim(p_username)) FOR UPDATE;
 IF NOT FOUND THEN PERFORM crypt(coalesce(p_password,''),gen_salt('bf',10)); RETURN jsonb_build_object('error','Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản bị khóa.'); END IF;
 IF u.trangthai<>'active' OR u.tamkhoaden>now() THEN RETURN jsonb_build_object('error','Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản bị khóa tạm thời.'); END IF;
 IF u.matkhau_bam IS NULL OR crypt(p_password,u.matkhau_bam)<>u.matkhau_bam THEN
 UPDATE vuihoc."NGUOI_DUNG" SET solansai=CASE WHEN tamkhoaden<=now() THEN 1 ELSE solansai+1 END,
 tamkhoaden=CASE WHEN (CASE WHEN tamkhoaden<=now() THEN 1 ELSE solansai+1 END)>=5 THEN now()+interval '15 minutes' ELSE NULL END WHERE madinhdanh=u.madinhdanh;
 RETURN jsonb_build_object('error','Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản bị khóa.');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" WHERE madinhdanh=u.manhomquyen) THEN RETURN jsonb_build_object('error','Tài khoản chưa được gán nhóm quyền.'); END IF;
 token:=encode(gen_random_bytes(32),'hex');
 UPDATE vuihoc."NGUOI_DUNG" SET maphien_bam=encode(digest(token,'sha256'),'hex'),phienhethan=now()+interval '12 hours',solansai=0,tamkhoaden=NULL WHERE madinhdanh=u.madinhdanh;
 RETURN public.vuihoc_session(token)||jsonb_build_object('token',token);
 END $$;
CREATE OR REPLACE FUNCTION public.vuihoc_logout(p_token text) RETURNS void
 LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $$
 UPDATE vuihoc."NGUOI_DUNG" SET maphien_bam=NULL,phienhethan=NULL WHERE maphien_bam=encode(digest(p_token,'sha256'),'hex') $$;

-- Cấp/sửa tài khoản và nhóm quyền; kiểm tra quyền tại database, không chỉ ở UI.
CREATE OR REPLACE FUNCTION public.vuihoc_save_accounts(p_token text,p_changes jsonb) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $save$
 DECLARE actor vuihoc."NGUOI_DUNG"; c jsonb; b jsonb; v jsonb; oldrow jsonb; k text; feature text; tab text; id text; pass text;
 ur vuihoc."NGUOI_DUNG"; gr vuihoc."NHOM_QUYEN";
 BEGIN
 -- Tuần tự hóa thay đổi phân quyền và tránh hai phiên đồng thời xóa quản trị cuối.
 LOCK TABLE vuihoc."NHOM_QUYEN",vuihoc."NGUOI_DUNG" IN SHARE ROW EXCLUSIVE MODE;
 actor:=vuihoc.nguoi_dung_phien(p_token);
 IF jsonb_typeof(p_changes)<>'array' OR jsonb_array_length(p_changes)>100 THEN RAISE EXCEPTION 'Yêu cầu lưu không hợp lệ.'; END IF;
 FOR c IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
 b:=c->'before'; v:=c->'after'; tab:=c->>'dataset'; id:=coalesce(v->>'madinhdanh',b->>'madinhdanh'); pass:=c->>'password';
 IF tab NOT IN ('users','role_groups') OR id IS NULL THEN RAISE EXCEPTION 'Bảng hoặc mã bản ghi không hợp lệ.'; END IF;
 IF tab='users' THEN
 SELECT vuihoc.tai_khoan_cong_khai(u) INTO oldrow FROM vuihoc."NGUOI_DUNG" u WHERE madinhdanh=id;
 IF v IS NULL OR v='null'::jsonb THEN RAISE EXCEPTION 'Hãy khóa tài khoản thay vì xóa.'; END IF;
 IF oldrow IS NULL THEN
 IF NOT vuihoc.co_quyen(actor.madinhdanh,'Cấp tài khoản & Mật khẩu người dùng') THEN RAISE EXCEPTION 'Không có quyền cấp tài khoản.'; END IF;
 IF NOT vuihoc.co_quyen(actor.madinhdanh,'Tạo, sửa, xóa & Gán Nhóm quyền') THEN RAISE EXCEPTION 'Không có quyền gán nhóm quyền.'; END IF;
 IF pass IS NULL OR octet_length(pass)<8 OR octet_length(pass)>72 THEN RAISE EXCEPTION 'Mật khẩu cần từ 8 đến 72 byte.'; END IF;
 ELSE
 FOR k IN SELECT jsonb_object_keys(v||coalesce(b,'{}')) LOOP
 IF (v->k) IS DISTINCT FROM (b->k) THEN
 feature:=CASE WHEN k IN ('manhomquyen','vaitro') THEN 'Tạo, sửa, xóa & Gán Nhóm quyền' WHEN k='trangthai' THEN 'Khóa / Mở khóa tài khoản nhân sự' ELSE 'Chỉnh sửa thông tin tài khoản & Mật khẩu' END;
 IF NOT vuihoc.co_quyen(actor.madinhdanh,feature) THEN RAISE EXCEPTION 'Không có quyền %',feature; END IF;
 END IF;
 END LOOP;
 IF coalesce(pass,'')<>'' AND NOT vuihoc.co_quyen(actor.madinhdanh,'Chỉnh sửa thông tin tài khoản & Mật khẩu') THEN RAISE EXCEPTION 'Không có quyền đổi mật khẩu.'; END IF;
 END IF;
 ELSE
 IF NOT vuihoc.co_quyen(actor.madinhdanh,'Tạo, sửa, xóa & Gán Nhóm quyền') THEN RAISE EXCEPTION 'Không có quyền sửa nhóm quyền.'; END IF;
 SELECT to_jsonb(g)-ARRAY['ngaytao','ngaycapnhat'] INTO oldrow FROM vuihoc."NHOM_QUYEN" g WHERE madinhdanh=id;
 END IF;
 IF oldrow IS NULL AND b IS NOT NULL AND b<>'null'::jsonb THEN RAISE EXCEPTION 'Bản ghi đã bị xóa. Hãy tải lại.'; END IF;
 IF oldrow IS NOT NULL THEN
 IF b IS NULL OR b='null'::jsonb THEN RAISE EXCEPTION 'Mã đã tồn tại. Hãy tải lại.'; END IF;
 FOR k IN SELECT jsonb_object_keys(b) LOOP
 IF (oldrow->k) IS DISTINCT FROM (b->k) THEN RAISE EXCEPTION 'Dữ liệu đã thay đổi ở phiên khác. Hãy tải lại trước khi sửa.'; END IF;
 END LOOP;
 END IF;
 IF tab='role_groups' THEN
 IF v IS NULL OR v='null'::jsonb THEN
 IF EXISTS(SELECT 1 FROM vuihoc."NGUOI_DUNG" WHERE manhomquyen=id) THEN RAISE EXCEPTION 'Nhóm quyền đang được tài khoản sử dụng.'; END IF;
 DELETE FROM vuihoc."NHOM_QUYEN" WHERE madinhdanh=id;
 ELSE
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(v) x WHERE x NOT IN ('madinhdanh','tennhomquyen','phanloai','mota','soluongnguoidung','danhsachquyen','macdinh','congtruycap')) THEN RAISE EXCEPTION 'Trường nhóm quyền không hợp lệ.'; END IF;
 gr:=jsonb_populate_record(NULL::vuihoc."NHOM_QUYEN",v);
 IF gr.congtruycap IS NULL THEN RAISE EXCEPTION 'Hãy chọn cổng cho nhóm quyền.'; END IF;
 INSERT INTO vuihoc."NHOM_QUYEN"(madinhdanh,tennhomquyen,phanloai,mota,soluongnguoidung,danhsachquyen,macdinh,congtruycap)
 VALUES(gr.madinhdanh,gr.tennhomquyen,gr.phanloai,gr.mota,coalesce(gr.soluongnguoidung,0),gr.danhsachquyen,gr.macdinh,gr.congtruycap)
 ON CONFLICT(madinhdanh) DO UPDATE SET tennhomquyen=excluded.tennhomquyen,phanloai=excluded.phanloai,mota=excluded.mota,danhsachquyen=excluded.danhsachquyen,macdinh=excluded.macdinh,congtruycap=excluded.congtruycap;
 END IF;
 ELSE
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(v) x WHERE x NOT IN ('madinhdanh','hoten','tendangnhap','thudientu','sodienthoai','vaitro','mamonhoc','trangthai','chucaiavatar','manhomquyen')) THEN RAISE EXCEPTION 'Trường tài khoản không hợp lệ.'; END IF;
 ur:=jsonb_populate_record(NULL::vuihoc."NGUOI_DUNG",v);
 IF btrim(ur.tendangnhap)='' OR length(ur.tendangnhap)>200 THEN RAISE EXCEPTION 'Tên đăng nhập không hợp lệ.'; END IF;
 IF ur.manhomquyen IS NULL OR NOT EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" WHERE madinhdanh=ur.manhomquyen) THEN RAISE EXCEPTION 'Nhóm quyền không tồn tại.'; END IF;
 IF coalesce(pass,'')<>'' AND (octet_length(pass)<8 OR octet_length(pass)>72) THEN RAISE EXCEPTION 'Mật khẩu cần từ 8 đến 72 byte.'; END IF;
 INSERT INTO vuihoc."NGUOI_DUNG"(madinhdanh,hoten,tendangnhap,thudientu,sodienthoai,vaitro,mamonhoc,trangthai,chucaiavatar,manhomquyen,matkhau_bam)
 VALUES(ur.madinhdanh,ur.hoten,btrim(ur.tendangnhap),ur.thudientu,ur.sodienthoai,ur.vaitro,ur.mamonhoc,ur.trangthai,ur.chucaiavatar,ur.manhomquyen,CASE WHEN coalesce(pass,'')<>'' THEN crypt(pass,gen_salt('bf',10)) END)
 ON CONFLICT(madinhdanh) DO UPDATE SET hoten=excluded.hoten,tendangnhap=excluded.tendangnhap,thudientu=excluded.thudientu,sodienthoai=excluded.sodienthoai,vaitro=excluded.vaitro,mamonhoc=excluded.mamonhoc,trangthai=excluded.trangthai,chucaiavatar=excluded.chucaiavatar,manhomquyen=excluded.manhomquyen,
 matkhau_bam=coalesce(excluded.matkhau_bam,vuihoc."NGUOI_DUNG".matkhau_bam);
 IF coalesce(pass,'')<>'' OR oldrow->>'trangthai' IS DISTINCT FROM v->>'trangthai' OR oldrow->>'manhomquyen' IS DISTINCT FROM v->>'manhomquyen' THEN
 UPDATE vuihoc."NGUOI_DUNG" SET maphien_bam=NULL,phienhethan=NULL,solansai=0,tamkhoaden=NULL WHERE madinhdanh=id;
 END IF;
 END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."NGUOI_DUNG" u WHERE u.trangthai='active' AND u.matkhau_bam IS NOT NULL AND vuihoc.co_quyen(u.madinhdanh,'Tạo, sửa, xóa & Gán Nhóm quyền')) THEN RAISE EXCEPTION 'Phải giữ ít nhất một tài khoản hoạt động có quyền quản lý nhóm quyền.'; END IF;
 RETURN jsonb_build_object('saved',true);
 END $save$;
REVOKE ALL ON FUNCTION vuihoc.tai_khoan_cong_khai(vuihoc."NGUOI_DUNG"),vuihoc.nguoi_dung_phien(text),vuihoc.co_quyen(text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.vuihoc_login(text,text),public.vuihoc_session(text),public.vuihoc_logout(text),public.vuihoc_save_accounts(text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vuihoc_login(text,text),public.vuihoc_session(text),public.vuihoc_logout(text),public.vuihoc_save_accounts(text,jsonb) TO anon,authenticated;
-- Các bảng vẫn đóng với anon; client chỉ gọi những RPC kiểm tra phiên và quyền ở trên.
CREATE OR REPLACE FUNCTION public.vuihoc_status() RETURNS jsonb LANGUAGE sql SET search_path=pg_catalog AS 'SELECT jsonb_build_object(''ready'',true,''accounts'',''internal'')';
REVOKE ALL ON FUNCTION public.vuihoc_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vuihoc_status() TO anon,authenticated;
NOTIFY pgrst,'reload schema';


-- MẬT KHẨU MÃ HÓA CÓ THỂ XEM LẠI.
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE vuihoc."NGUOI_DUNG" ADD COLUMN IF NOT EXISTS matkhau_mahoa bytea;
ALTER TABLE vuihoc."CAU_HINH_HE_THONG" ADD COLUMN IF NOT EXISTS khoamatkhau text;

CREATE OR REPLACE FUNCTION vuihoc.ghi_nhat_ky_nghiep_vu()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $audit$
DECLARE truoc jsonb; sau jsonb; fields text[]; keydata jsonb:='{}'; col text;
 secret text[]:=ARRAY['matkhau_mahoa','khoamatkhau','matkhau_bam','maphien_bam','phienhethan','solansai','tamkhoaden','ngaycapnhat'];
BEGIN
 IF TG_OP<>'INSERT' THEN truoc:=to_jsonb(OLD)-secret; END IF;
 IF TG_OP<>'DELETE' THEN sau:=to_jsonb(NEW)-secret; END IF;
 IF TG_OP='UPDATE' AND truoc IS NOT DISTINCT FROM sau AND NOT (TG_TABLE_NAME='NGUOI_DUNG' AND ((to_jsonb(OLD)->'matkhau_bam') IS DISTINCT FROM (to_jsonb(NEW)->'matkhau_bam') OR (to_jsonb(OLD)->'matkhau_mahoa') IS DISTINCT FROM (to_jsonb(NEW)->'matkhau_mahoa'))) THEN RETURN NEW; END IF;
 SELECT coalesce(array_agg(k ORDER BY k),ARRAY[]::text[]) INTO fields FROM
 (SELECT jsonb_object_keys(coalesce(truoc,'{}')||coalesce(sau,'{}')) k) keys WHERE (truoc->k) IS DISTINCT FROM (sau->k);
 -- Ghi nhận đổi mật khẩu mà không lưu hash/mật khẩu trong nhật ký.
 IF TG_OP='UPDATE' AND TG_TABLE_NAME='NGUOI_DUNG' AND ((to_jsonb(OLD)->'matkhau_bam') IS DISTINCT FROM (to_jsonb(NEW)->'matkhau_bam') OR (to_jsonb(OLD)->'matkhau_mahoa') IS DISTINCT FROM (to_jsonb(NEW)->'matkhau_mahoa')) THEN fields:=array_append(fields,'matkhau'); END IF;
 FOREACH col IN ARRAY TG_ARGV LOOP keydata:=keydata||jsonb_build_object(col,coalesce(sau,truoc)->col); END LOOP;
 INSERT INTO vuihoc."NHAT_KY_NGHIEP_VU"(manguoithuchien,tenbang,khoabanghi,thaotac,truongthaydoi,dulieutruoc,dulieusau)
 VALUES(nullif(current_setting('vuihoc.actor',true),''),TG_TABLE_NAME,keydata,TG_OP,fields,truoc,sau);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $audit$;

-- Chỉ sinh khóa một lần; chạy lại không thay khóa, không làm mất khả năng giải mã.
INSERT INTO vuihoc."CAU_HINH_HE_THONG"(madinhdanh) VALUES('global') ON CONFLICT DO NOTHING;
UPDATE vuihoc."CAU_HINH_HE_THONG" SET khoamatkhau=encode(extensions.gen_random_bytes(32),'hex') WHERE madinhdanh='global' AND khoamatkhau IS NULL;

CREATE OR REPLACE FUNCTION vuihoc.ma_hoa_mat_khau(p_password text) RETURNS bytea
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $encrypt$
 DECLARE secret text;
 BEGIN
 SELECT khoamatkhau INTO secret FROM vuihoc."CAU_HINH_HE_THONG" WHERE madinhdanh='global';
 IF secret IS NULL THEN RAISE EXCEPTION 'Chưa có khóa mã hóa mật khẩu. Hãy chạy migration encrypted_passwords.'; END IF;
 RETURN extensions.pgp_sym_encrypt(p_password,secret,'cipher-algo=aes256,compress-algo=0');
 END $encrypt$;
CREATE OR REPLACE FUNCTION vuihoc.giai_ma_mat_khau(p_cipher bytea) RETURNS text
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $decrypt$
 DECLARE secret text;
 BEGIN
 SELECT khoamatkhau INTO secret FROM vuihoc."CAU_HINH_HE_THONG" WHERE madinhdanh='global';
 IF secret IS NULL THEN RAISE EXCEPTION 'Không tìm thấy khóa mã hóa mật khẩu.'; END IF;
 RETURN extensions.pgp_sym_decrypt(p_cipher,secret);
 END $decrypt$;

CREATE OR REPLACE FUNCTION vuihoc.tai_khoan_cong_khai(u vuihoc."NGUOI_DUNG") RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $profile$
 SELECT to_jsonb(u)-ARRAY['matkhau_mahoa','matkhau_bam','maphien_bam','phienhethan','solansai','tamkhoaden','maxacthuc','ngaytao','ngaycapnhat'] $profile$;

CREATE OR REPLACE FUNCTION public.vuihoc_login(p_username text,p_password text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $$
 DECLARE u vuihoc."NGUOI_DUNG"; token text;
 BEGIN
 IF length(p_username)>200 OR octet_length(p_password)>72 OR p_password IS NULL THEN RETURN jsonb_build_object('error','Thông tin đăng nhập không hợp lệ.'); END IF;
 SELECT * INTO u FROM vuihoc."NGUOI_DUNG" WHERE lower(btrim(tendangnhap))=lower(btrim(p_username)) FOR UPDATE;
 IF NOT FOUND THEN PERFORM crypt(coalesce(p_password,''),gen_salt('bf',10)); RETURN jsonb_build_object('error','Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản bị khóa.'); END IF;
 IF u.trangthai<>'active' OR u.tamkhoaden>now() THEN RETURN jsonb_build_object('error','Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản bị khóa tạm thời.'); END IF;
 IF (u.matkhau_mahoa IS NOT NULL AND vuihoc.giai_ma_mat_khau(u.matkhau_mahoa) IS DISTINCT FROM p_password)
 OR (u.matkhau_mahoa IS NULL AND (u.matkhau_bam IS NULL OR crypt(p_password,u.matkhau_bam)<>u.matkhau_bam)) THEN
 UPDATE vuihoc."NGUOI_DUNG" SET solansai=CASE WHEN tamkhoaden<=now() THEN 1 ELSE solansai+1 END,
 tamkhoaden=CASE WHEN (CASE WHEN tamkhoaden<=now() THEN 1 ELSE solansai+1 END)>=5 THEN now()+interval '15 minutes' ELSE NULL END WHERE madinhdanh=u.madinhdanh;
 RETURN jsonb_build_object('error','Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản bị khóa.');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" WHERE madinhdanh=u.manhomquyen) THEN RETURN jsonb_build_object('error','Tài khoản chưa được gán nhóm quyền.'); END IF;
 -- Mật khẩu băm cũ được chuyển sau khi người dùng nhập đúng; không đảo ngược hash.
 IF u.matkhau_mahoa IS NULL THEN
 UPDATE vuihoc."NGUOI_DUNG" SET matkhau_mahoa=vuihoc.ma_hoa_mat_khau(p_password),matkhau_bam=NULL WHERE madinhdanh=u.madinhdanh;
 END IF;
 token:=encode(gen_random_bytes(32),'hex');
 UPDATE vuihoc."NGUOI_DUNG" SET maphien_bam=encode(digest(token,'sha256'),'hex'),phienhethan=now()+interval '12 hours',solansai=0,tamkhoaden=NULL WHERE madinhdanh=u.madinhdanh;
 RETURN public.vuihoc_session(token)||jsonb_build_object('token',token);
 END $$;
CREATE OR REPLACE FUNCTION public.vuihoc_save_accounts(p_token text,p_changes jsonb) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,extensions AS $save$
 DECLARE actor vuihoc."NGUOI_DUNG"; c jsonb; b jsonb; v jsonb; oldrow jsonb; k text; feature text; tab text; id text; pass text;
 ur vuihoc."NGUOI_DUNG"; gr vuihoc."NHOM_QUYEN";
 BEGIN
 -- Tuần tự hóa thay đổi phân quyền và tránh hai phiên đồng thời xóa quản trị cuối.
 LOCK TABLE vuihoc."NHOM_QUYEN",vuihoc."NGUOI_DUNG" IN SHARE ROW EXCLUSIVE MODE;
 actor:=vuihoc.nguoi_dung_phien(p_token);
 IF jsonb_typeof(p_changes)<>'array' OR jsonb_array_length(p_changes)>100 THEN RAISE EXCEPTION 'Yêu cầu lưu không hợp lệ.'; END IF;
 FOR c IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
 b:=c->'before'; v:=c->'after'; tab:=c->>'dataset'; id:=coalesce(v->>'madinhdanh',b->>'madinhdanh'); pass:=c->>'password';
 IF tab NOT IN ('users','role_groups') OR id IS NULL THEN RAISE EXCEPTION 'Bảng hoặc mã bản ghi không hợp lệ.'; END IF;
 IF tab='users' THEN
 SELECT vuihoc.tai_khoan_cong_khai(u) INTO oldrow FROM vuihoc."NGUOI_DUNG" u WHERE madinhdanh=id;
 IF v IS NULL OR v='null'::jsonb THEN RAISE EXCEPTION 'Hãy khóa tài khoản thay vì xóa.'; END IF;
 IF oldrow IS NULL THEN
 IF NOT vuihoc.co_quyen(actor.madinhdanh,'Cấp tài khoản & Mật khẩu người dùng') THEN RAISE EXCEPTION 'Không có quyền cấp tài khoản.'; END IF;
 IF NOT vuihoc.co_quyen(actor.madinhdanh,'Tạo, sửa, xóa & Gán Nhóm quyền') THEN RAISE EXCEPTION 'Không có quyền gán nhóm quyền.'; END IF;
 IF pass IS NULL OR octet_length(pass)<8 OR octet_length(pass)>72 THEN RAISE EXCEPTION 'Mật khẩu cần từ 8 đến 72 byte.'; END IF;
 ELSE
 FOR k IN SELECT jsonb_object_keys(v||coalesce(b,'{}')) LOOP
 IF (v->k) IS DISTINCT FROM (b->k) THEN
 feature:=CASE WHEN k IN ('manhomquyen','vaitro') THEN 'Tạo, sửa, xóa & Gán Nhóm quyền' WHEN k='trangthai' THEN 'Khóa / Mở khóa tài khoản nhân sự' ELSE 'Chỉnh sửa thông tin tài khoản & Mật khẩu' END;
 IF NOT vuihoc.co_quyen(actor.madinhdanh,feature) THEN RAISE EXCEPTION 'Không có quyền %',feature; END IF;
 END IF;
 END LOOP;
 IF coalesce(pass,'')<>'' AND NOT vuihoc.co_quyen(actor.madinhdanh,'Chỉnh sửa thông tin tài khoản & Mật khẩu') THEN RAISE EXCEPTION 'Không có quyền đổi mật khẩu.'; END IF;
 END IF;
 ELSE
 IF NOT vuihoc.co_quyen(actor.madinhdanh,'Tạo, sửa, xóa & Gán Nhóm quyền') THEN RAISE EXCEPTION 'Không có quyền sửa nhóm quyền.'; END IF;
 SELECT to_jsonb(g)-ARRAY['ngaytao','ngaycapnhat'] INTO oldrow FROM vuihoc."NHOM_QUYEN" g WHERE madinhdanh=id;
 END IF;
 IF oldrow IS NULL AND b IS NOT NULL AND b<>'null'::jsonb THEN RAISE EXCEPTION 'Bản ghi đã bị xóa. Hãy tải lại.'; END IF;
 IF oldrow IS NOT NULL THEN
 IF b IS NULL OR b='null'::jsonb THEN RAISE EXCEPTION 'Mã đã tồn tại. Hãy tải lại.'; END IF;
 FOR k IN SELECT jsonb_object_keys(b) LOOP
 IF (oldrow->k) IS DISTINCT FROM (b->k) THEN RAISE EXCEPTION 'Dữ liệu đã thay đổi ở phiên khác. Hãy tải lại trước khi sửa.'; END IF;
 END LOOP;
 END IF;
 IF tab='role_groups' THEN
 IF v IS NULL OR v='null'::jsonb THEN
 IF EXISTS(SELECT 1 FROM vuihoc."NGUOI_DUNG" WHERE manhomquyen=id) THEN RAISE EXCEPTION 'Nhóm quyền đang được tài khoản sử dụng.'; END IF;
 DELETE FROM vuihoc."NHOM_QUYEN" WHERE madinhdanh=id;
 ELSE
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(v) x WHERE x NOT IN ('madinhdanh','tennhomquyen','phanloai','mota','soluongnguoidung','danhsachquyen','macdinh','congtruycap')) THEN RAISE EXCEPTION 'Trường nhóm quyền không hợp lệ.'; END IF;
 gr:=jsonb_populate_record(NULL::vuihoc."NHOM_QUYEN",v);
 IF gr.congtruycap IS NULL THEN RAISE EXCEPTION 'Hãy chọn cổng cho nhóm quyền.'; END IF;
 INSERT INTO vuihoc."NHOM_QUYEN"(madinhdanh,tennhomquyen,phanloai,mota,soluongnguoidung,danhsachquyen,macdinh,congtruycap)
 VALUES(gr.madinhdanh,gr.tennhomquyen,gr.phanloai,gr.mota,coalesce(gr.soluongnguoidung,0),gr.danhsachquyen,gr.macdinh,gr.congtruycap)
 ON CONFLICT(madinhdanh) DO UPDATE SET tennhomquyen=excluded.tennhomquyen,phanloai=excluded.phanloai,mota=excluded.mota,danhsachquyen=excluded.danhsachquyen,macdinh=excluded.macdinh,congtruycap=excluded.congtruycap;
 END IF;
 ELSE
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(v) x WHERE x NOT IN ('madinhdanh','hoten','tendangnhap','thudientu','sodienthoai','vaitro','mamonhoc','trangthai','chucaiavatar','manhomquyen')) THEN RAISE EXCEPTION 'Trường tài khoản không hợp lệ.'; END IF;
 ur:=jsonb_populate_record(NULL::vuihoc."NGUOI_DUNG",v);
 IF btrim(ur.tendangnhap)='' OR length(ur.tendangnhap)>200 THEN RAISE EXCEPTION 'Tên đăng nhập không hợp lệ.'; END IF;
 IF ur.manhomquyen IS NULL OR NOT EXISTS(SELECT 1 FROM vuihoc."NHOM_QUYEN" WHERE madinhdanh=ur.manhomquyen) THEN RAISE EXCEPTION 'Nhóm quyền không tồn tại.'; END IF;
 IF coalesce(pass,'')<>'' AND (octet_length(pass)<8 OR octet_length(pass)>72) THEN RAISE EXCEPTION 'Mật khẩu cần từ 8 đến 72 byte.'; END IF;
 INSERT INTO vuihoc."NGUOI_DUNG"(madinhdanh,hoten,tendangnhap,thudientu,sodienthoai,vaitro,mamonhoc,trangthai,chucaiavatar,manhomquyen,matkhau_mahoa)
 VALUES(ur.madinhdanh,ur.hoten,btrim(ur.tendangnhap),ur.thudientu,ur.sodienthoai,ur.vaitro,ur.mamonhoc,ur.trangthai,ur.chucaiavatar,ur.manhomquyen,CASE WHEN coalesce(pass,'')<>'' THEN vuihoc.ma_hoa_mat_khau(pass) END)
 ON CONFLICT(madinhdanh) DO UPDATE SET hoten=excluded.hoten,tendangnhap=excluded.tendangnhap,thudientu=excluded.thudientu,sodienthoai=excluded.sodienthoai,vaitro=excluded.vaitro,mamonhoc=excluded.mamonhoc,trangthai=excluded.trangthai,chucaiavatar=excluded.chucaiavatar,manhomquyen=excluded.manhomquyen,
 matkhau_mahoa=coalesce(excluded.matkhau_mahoa,vuihoc."NGUOI_DUNG".matkhau_mahoa),
 matkhau_bam=CASE WHEN excluded.matkhau_mahoa IS NOT NULL THEN NULL ELSE vuihoc."NGUOI_DUNG".matkhau_bam END;
 IF coalesce(pass,'')<>'' OR oldrow->>'trangthai' IS DISTINCT FROM v->>'trangthai' OR oldrow->>'manhomquyen' IS DISTINCT FROM v->>'manhomquyen' THEN
 UPDATE vuihoc."NGUOI_DUNG" SET maphien_bam=NULL,phienhethan=NULL,solansai=0,tamkhoaden=NULL WHERE madinhdanh=id;
 END IF;
 END IF;
 END LOOP;
 IF NOT EXISTS(SELECT 1 FROM vuihoc."NGUOI_DUNG" u WHERE u.trangthai='active' AND (u.matkhau_mahoa IS NOT NULL OR u.matkhau_bam IS NOT NULL) AND vuihoc.co_quyen(u.madinhdanh,'Tạo, sửa, xóa & Gán Nhóm quyền')) THEN RAISE EXCEPTION 'Phải giữ ít nhất một tài khoản hoạt động có quyền quản lý nhóm quyền.'; END IF;
 RETURN jsonb_build_object('saved',true);
 END $save$;
CREATE OR REPLACE FUNCTION public.vuihoc_reveal_password(p_token text,p_user_id text) RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $reveal$
 DECLARE actor vuihoc."NGUOI_DUNG"; cipher bytea;
 BEGIN
 actor:=vuihoc.nguoi_dung_phien(p_token);
 IF NOT vuihoc.co_quyen(actor.madinhdanh,'Xem danh sách tài khoản và nhóm quyền')
 OR NOT vuihoc.co_quyen(actor.madinhdanh,'Chỉnh sửa thông tin tài khoản & Mật khẩu') THEN RAISE EXCEPTION 'Bạn không có quyền xem mật khẩu tài khoản.'; END IF;
 SELECT matkhau_mahoa INTO cipher FROM vuihoc."NGUOI_DUNG" WHERE madinhdanh=p_user_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy tài khoản.'; END IF;
 IF cipher IS NULL THEN RETURN jsonb_build_object('error','Mật khẩu cũ còn ở dạng băm. Hãy đăng nhập tài khoản đó một lần hoặc đặt mật khẩu mới để xem lại được.'); END IF;
 RETURN jsonb_build_object('password',vuihoc.giai_ma_mat_khau(cipher));
 END $reveal$;
-- Nếu dùng lại bản setup_admin cũ, hash mới phải vô hiệu hóa bản mã cũ.
CREATE OR REPLACE FUNCTION vuihoc.dong_bo_mat_khau_cu() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $legacy$
 BEGIN
 IF NEW.matkhau_bam IS NOT NULL AND NEW.matkhau_bam IS DISTINCT FROM OLD.matkhau_bam AND NEW.matkhau_mahoa IS NOT DISTINCT FROM OLD.matkhau_mahoa THEN NEW.matkhau_mahoa:=NULL; END IF;
 RETURN NEW;
 END $legacy$;
DROP TRIGGER IF EXISTS sync_legacy_password ON vuihoc."NGUOI_DUNG";
CREATE TRIGGER sync_legacy_password BEFORE UPDATE ON vuihoc."NGUOI_DUNG" FOR EACH ROW EXECUTE FUNCTION vuihoc.dong_bo_mat_khau_cu();
REVOKE ALL ON FUNCTION vuihoc.ma_hoa_mat_khau(text),vuihoc.giai_ma_mat_khau(bytea),vuihoc.dong_bo_mat_khau_cu() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.vuihoc_reveal_password(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vuihoc_reveal_password(text,text) TO anon,authenticated;
NOTIFY pgrst,'reload schema';

COMMIT;
