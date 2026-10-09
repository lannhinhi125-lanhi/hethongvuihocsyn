-- ==============================================================================
-- VUIHOC TUTOR - SUPABASE RELATIONAL DATABASE SCHEMA (POSTGRESQL DDL & SEED DATA)
-- Hệ thống Quản lý Vận hành Đào tạo Trực tuyến Liên thông Toàn diện
-- HƯỚNG DẪN: Sao chép toàn bộ nội dung file này và dán vào tab "SQL Editor"
-- trên Supabase Dashboard, sau đó bấm nút "RUN".
-- ==============================================================================

-- Bật extension tạo UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. BẢNG NGƯỜI DÙNG & PHÂN QUYỀN TRUY CẬP (PHÂN HỆ 1 - RBAC)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_code VARCHAR(30) UNIQUE NOT NULL, -- USR-01, GV-001,...
    name VARCHAR(120) NOT NULL,
    username VARCHAR(60) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(25),
    role VARCHAR(60) NOT NULL CHECK (role IN (
        'Quản trị Toàn quyền', 
        'Quản lý Chuyên môn', 
        'Nhân viên Vận hành Lớp', 
        'Giáo viên Giảng dạy'
    )),
    subject_code VARCHAR(30), -- Môn giảng dạy chính nếu là Giáo viên
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'locked')),
    avatar_initials VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nhóm quyền hệ thống
CREATE TABLE IF NOT EXISTS role_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. BẢNG DANH MỤC DÙNG CHUNG MASTER DATA (PHÂN HỆ 2)
-- ------------------------------------------------------------------------------
-- 2.1 Môn học
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL, -- SUB-MATH, SUB-ENG
    abbr VARCHAR(20) NOT NULL,        -- TOAN, ENG
    name VARCHAR(120) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 Khung trình độ
CREATE TABLE IF NOT EXISTS levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL, -- LVL-F1, LVL-F2, LVL-STD, LVL-ADV
    abbr VARCHAR(20) NOT NULL,        -- NT1, NT2, TC, NC
    name VARCHAR(120) NOT NULL,
    target_student TEXT,
    objective TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.3 Khung giờ học chuẩn (Time Slots)
CREATE TABLE IF NOT EXISTS time_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL, -- SLOT-E1, SLOT-E2
    name VARCHAR(120) NOT NULL,
    time_range VARCHAR(60) NOT NULL, -- 18:00 - 19:30
    duration_minutes INTEGER DEFAULT 90,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.4 Mô hình lớp & Sĩ số trần
CREATE TABLE IF NOT EXISTS class_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL, -- 1-1, 1-3, 1-5
    name VARCHAR(120) NOT NULL,
    max_students INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.5 Cây phân loại sự cố
CREATE TABLE IF NOT EXISTS incident_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(40) UNIQUE NOT NULL,
    parent_code VARCHAR(40),
    name VARCHAR(200) NOT NULL,
    target_party VARCHAR(40) CHECK (target_party IN ('Giáo viên', 'Học sinh', 'Khách quan')),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. HỒ SƠ GIÁO VIÊN & ĐÁNH GIÁ DỰ GIỜ SƯ PHẠM (PHÂN HỆ 3)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_code VARCHAR(30) UNIQUE NOT NULL, -- GV-001, GV-002
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(120) NOT NULL,
    subject_code VARCHAR(30) REFERENCES subjects(code),
    level_scope VARCHAR(30) DEFAULT 'CAP-TH', -- CAP-TH (Tiểu học)
    grades TEXT[] NOT NULL DEFAULT ARRAY['Lớp 3', 'Lớp 4'],
    phone VARCHAR(25),
    email VARCHAR(120),
    degree TEXT,
    status VARCHAR(30) DEFAULT 'DANG_DAY' CHECK (status IN ('DANG_DAY', 'CHO_LOP', 'TAM_NGUNG')),
    inspection_rank VARCHAR(20) DEFAULT 'Hạng A', -- Hạng A, B, C, D
    inspection_score NUMERIC(4, 2) DEFAULT 9.00,
    inspection_comment TEXT,
    criteria_score_pedagogy NUMERIC(4, 2) DEFAULT 9.0,
    criteria_score_interaction NUMERIC(4, 2) DEFAULT 9.0,
    criteria_score_tech NUMERIC(4, 2) DEFAULT 9.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lịch rảnh đăng ký trong tuần của giáo viên
CREATE TABLE IF NOT EXISTS teacher_availabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_code VARCHAR(30) NOT NULL REFERENCES teachers(teacher_code) ON DELETE CASCADE,
    day_of_week VARCHAR(10) NOT NULL, -- T2, T3, T4, T5, T6, T7, CN
    time_slot_code VARCHAR(30) NOT NULL REFERENCES time_slots(code),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_code, day_of_week, time_slot_code)
);

-- ------------------------------------------------------------------------------
-- 4. BẢNG HỌC SINH & ĐIỀU PHỐI LỚP HỌC (PHÂN HỆ 4 QUẢN TRỊ)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_code VARCHAR(30) UNIQUE NOT NULL, -- HS-2026-001
    name VARCHAR(120) NOT NULL,
    grade VARCHAR(20) NOT NULL,
    subject_code VARCHAR(30) REFERENCES subjects(code),
    model_code VARCHAR(20) REFERENCES class_models(code),
    level_code VARCHAR(30) REFERENCES levels(code),
    father_name VARCHAR(120),
    father_phone VARCHAR(25),
    mother_name VARCHAR(120),
    mother_phone VARCHAR(25),
    schedule_slots TEXT[] DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(40) DEFAULT 'Chờ xếp lớp' CHECK (status IN ('Chờ xếp lớp', 'Đang học', 'Bảo lưu', 'Đã thôi học')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_code VARCHAR(60) UNIQUE NOT NULL, -- TOAN_K03_NT2_13_01
    name VARCHAR(180) NOT NULL,
    grade VARCHAR(20) NOT NULL,
    subject_code VARCHAR(30) REFERENCES subjects(code),
    level_code VARCHAR(30) REFERENCES levels(code),
    model_code VARCHAR(20) REFERENCES class_models(code),
    max_students INTEGER DEFAULT 3,
    schedule VARCHAR(180) NOT NULL,
    room_link TEXT, -- Link Zoom / ClassIn
    teacher_code VARCHAR(30) REFERENCES teachers(teacher_code) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'PENDING')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Học sinh trong lớp học
CREATE TABLE IF NOT EXISTS class_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_code VARCHAR(60) REFERENCES classes(class_code) ON DELETE CASCADE,
    student_code VARCHAR(30) REFERENCES students(student_code) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_code, student_code)
);

-- Phân phối học liệu lớp học theo tuần
CREATE TABLE IF NOT EXISTS class_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_code VARCHAR(60) REFERENCES classes(class_code) ON DELETE CASCADE,
    month_period VARCHAR(20) NOT NULL, -- 10/2026
    week_title VARCHAR(120) NOT NULL,
    session_num INTEGER NOT NULL CHECK (session_num IN (1, 2)),
    lesson_title TEXT NOT NULL,
    slide_url TEXT NOT NULL,
    lms_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. CA DẠY VẬN HÀNH & GIÁM SÁT THỜI GIAN THỰC (PHÂN HỆ 5 & ĐẦU VÀO PHÂN HỆ 7)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teaching_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_code VARCHAR(30) UNIQUE NOT NULL, -- S-0901, S-0925
    month_period VARCHAR(20) NOT NULL,        -- 2026-09
    session_date DATE NOT NULL,
    day_of_week VARCHAR(25) NOT NULL,
    time_range VARCHAR(60) NOT NULL,
    class_code VARCHAR(60) REFERENCES classes(class_code) ON DELETE CASCADE,
    teacher_code VARCHAR(30) REFERENCES teachers(teacher_code) ON DELETE CASCADE,
    type VARCHAR(40) DEFAULT 'STANDARD' CHECK (type IN (
        'STANDARD', 
        'COVER', 
        'STUDENT_CANCELED', 
        'LATE', 
        'EMERGENCY', 
        'APPROVED_EXPLANATION'
    )),
    status_text VARCHAR(120) DEFAULT 'Dạy chuẩn',
    checkin_time VARCHAR(60),
    checkout_time VARCHAR(60),
    credit_coefficient NUMERIC(3, 2) DEFAULT 1.00,
    has_ai_review BOOLEAN DEFAULT FALSE,
    ai_feedback_content TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. BIÊN BẢN SỰ CỐ & GIẢI TRÌNH CA DẠY (GIÁO VIÊN & VẬN HÀNH)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dispute_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispute_code VARCHAR(30) UNIQUE NOT NULL, -- DSP-0901
    session_code VARCHAR(30) REFERENCES teaching_sessions(session_code) ON DELETE CASCADE,
    teacher_code VARCHAR(30) REFERENCES teachers(teacher_code) ON DELETE CASCADE,
    month_period VARCHAR(20) NOT NULL,
    incident_type VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    attachment_name VARCHAR(255),
    attachment_url TEXT,
    status VARCHAR(30) DEFAULT 'CHO_DUYET' CHECK (status IN ('CHO_DUYET', 'DA_DUYET', 'TU_CHOI')),
    admin_note TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_payroll_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    month_period VARCHAR(20) UNIQUE NOT NULL, -- 2026-09
    is_locked BOOLEAN DEFAULT FALSE,
    locked_at TIMESTAMP WITH TIME ZONE,
    unlock_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. TRI THỨC SOP & TRỢ LÝ AI (PHÂN HỆ 6)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sop_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(80) NOT NULL,
    summary TEXT,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- DỮ LIỆU KHỞI TẠO MẪU XUYÊN SUỐT LIÊN THÔNG (INITIAL STANDARD SEED DATA)
-- ==============================================================================

-- 1. Seed Users
INSERT INTO users (user_code, name, username, password_hash, email, phone, role, subject_code, status, avatar_initials) VALUES
('USR-01', 'Trần Quản Trị', 'admin.tong', 'AdminPass@2026', 'admin.tong@vuihoc.vn', '0987.654.321', 'Quản trị Toàn quyền', NULL, 'active', 'AD'),
('USR-02', 'Nguyễn Mai Hoa', 'hoa.academic', 'HoaVuihoc@123', 'maihoa.academic@vuihoc.vn', '0912.333.444', 'Quản lý Chuyên môn', NULL, 'active', 'MH'),
('USR-03', 'Lê Tuấn Quang', 'quang.ops', 'QuangOps#2026', 'tuanquang.ops@vuihoc.vn', '0978.111.222', 'Nhân viên Vận hành Lớp', NULL, 'active', 'TQ'),
('USR-04', 'Thầy Trần Anh Tuấn', 'tuan.anhtuan', 'AnhTuan@123', 'anhtuan.math@vuihoc.vn', '0982.555.666', 'Giáo viên Giảng dạy', 'SUB-MATH', 'active', 'AT'),
('USR-05', 'Cô Nguyễn Thị Mai Hoa', 'maihoa.eng', 'MaiHoa@123', 'maihoa.eng@vuihoc.vn', '0912.999.888', 'Giáo viên Giảng dạy', 'SUB-ENG', 'active', 'MH')
ON CONFLICT (user_code) DO NOTHING;

-- 2. Seed Master Data
INSERT INTO subjects (code, abbr, name, description) VALUES
('SUB-MATH', 'TOAN', 'Môn Toán', 'Toán tư duy và Toán tiểu học bám sát khung Bộ Giáo Dục'),
('SUB-ENG', 'ENG', 'Môn Tiếng Anh', 'Tiếng Anh giao tiếp và chương trình chuẩn Cambridge')
ON CONFLICT (code) DO NOTHING;

INSERT INTO levels (code, abbr, name, target_student, objective) VALUES
('LVL-F1', 'NT1', 'Nền tảng 1', 'Học sinh yếu mất gốc kiến thức', 'Lấy lại kiến thức cơ bản'),
('LVL-F2', 'NT2', 'Nền tảng 2', 'Học sinh củng cố kiến thức cơ bản', 'Thành thạo phép tính căn bản'),
('LVL-STD', 'TC', 'Tiêu chuẩn', 'Học sinh nắm vững chương trình SGK', 'Tự tin giải quyết bài học theo khung chuẩn'),
('LVL-ADV', 'NC', 'Nâng cao', 'Học sinh khá giỏi, tư duy mở rộng', 'Phát triển tư duy logic mở rộng')
ON CONFLICT (code) DO NOTHING;

INSERT INTO time_slots (code, name, time_range, duration_minutes) VALUES
('SLOT-E1', 'Ca Tối 1 (Giờ vàng)', '18:00 - 19:30', 90),
('SLOT-E2', 'Ca Tối 2', '19:45 - 21:15', 90)
ON CONFLICT (code) DO NOTHING;

INSERT INTO class_models (code, name, max_students) VALUES
('1-1', 'Mô hình 1 kèm 1 (VIP)', 1),
('1-3', 'Mô hình nhóm nhỏ 1 kèm 3', 3),
('1-5', 'Mô hình nhóm vừa 1 kèm 5', 5)
ON CONFLICT (code) DO NOTHING;

-- 3. Seed Teachers
INSERT INTO teachers (teacher_code, name, subject_code, level_scope, grades, phone, email, degree, status, inspection_rank, inspection_score) VALUES
('GV-001', 'Thầy Trần Anh Tuấn', 'SUB-MATH', 'CAP-TH', ARRAY['Lớp 3', 'Lớp 4'], '0982.555.666', 'anhtuan.math@vuihoc.vn', 'ĐH Sư phạm Hà Nội - Toán Tin', 'DANG_DAY', 'Hạng A', 9.20),
('GV-002', 'Cô Nguyễn Thị Mai Hoa', 'SUB-ENG', 'CAP-TH', ARRAY['Lớp 4', 'Lớp 5'], '0912.999.888', 'maihoa.eng@vuihoc.vn', 'ĐH Ngoại ngữ - IELTS 8.0', 'DANG_DAY', 'Hạng A', 9.10)
ON CONFLICT (teacher_code) DO NOTHING;

-- 4. Seed Students
INSERT INTO students (student_code, name, grade, subject_code, model_code, level_code, father_name, father_phone, mother_name, mother_phone, schedule_slots, status) VALUES
('HS-2026-001', 'Trần Gia Bảo', 'Lớp 3', 'SUB-MATH', '1-3', 'LVL-F2', 'Trần Mạnh Hùng (Bố)', '0912.888.999', 'Nguyễn Thị Thùy (Mẹ)', '0912.777.666', ARRAY['T3 (18:00 - 19:30)', 'T5 (18:00 - 19:30)'], 'Đang học'),
('HS-2026-002', 'Lê Quỳnh Anh', 'Lớp 4', 'SUB-ENG', '1-1', 'LVL-ADV', 'Lê Quang Minh (Bố)', '0987.111.222', 'Nguyễn Mai Lan (Mẹ)', '0987.222.111', ARRAY['T2 (19:45 - 21:15)', 'T6 (19:45 - 21:15)'], 'Đang học'),
('HS-2026-003', 'Đặng Tuấn Kiệt', 'Lớp 3', 'SUB-MATH', '1-3', 'LVL-STD', 'Đặng Quốc Tuấn (Bố)', '0934.777.666', 'Phạm Hải Yến (Mẹ)', '0934.888.999', ARRAY['T3 (18:00 - 19:30)', 'T5 (18:00 - 19:30)'], 'Chờ xếp lớp')
ON CONFLICT (student_code) DO NOTHING;

-- 5. Seed Classes
INSERT INTO classes (class_code, name, grade, subject_code, level_code, model_code, max_students, schedule, room_link, teacher_code) VALUES
('TOAN_K03_NT2_13_01', 'Toán Nền Tảng 2 - Lớp 3 (T3/T5)', 'Lớp 3', 'SUB-MATH', 'LVL-F2', '1-3', 3, 'T3 (18:00 - 19:30), T5 (18:00 - 19:30)', 'https://vuihoc.zoom.us/j/988776655', 'GV-001'),
('ENG_K04_NC_11_01', 'Tiếng Anh Nâng Cao - Lớp 4 (T2/T6)', 'Lớp 4', 'SUB-ENG', 'LVL-ADV', '1-1', 1, 'T2 (19:45 - 21:15), T6 (19:45 - 21:15)', 'https://classin.com/room/918237192', 'GV-002')
ON CONFLICT (class_code) DO NOTHING;

-- Ghép học sinh vào lớp
INSERT INTO class_students (class_code, student_code) VALUES
('TOAN_K03_NT2_13_01', 'HS-2026-001'),
('ENG_K04_NC_11_01', 'HS-2026-002')
ON CONFLICT (class_code, student_code) DO NOTHING;

-- 6. Seed Teaching Sessions & Payroll tháng 09/2026
INSERT INTO teaching_sessions (session_code, month_period, session_date, day_of_week, time_range, class_code, teacher_code, type, status_text, checkin_time, checkout_time, credit_coefficient, has_ai_review) VALUES
('S-0901', '2026-09', '2026-09-02', 'Thứ 4', '18:00 - 19:30', 'TOAN_K03_NT2_13_01', 'GV-001', 'STANDARD', 'Dạy chuẩn', '17:56', '19:32', 1.00, TRUE),
('S-0904', '2026-09', '2026-09-05', 'Thứ 7', '18:00 - 19:30', 'TOAN_K03_NT2_13_01', 'GV-001', 'LATE', 'Đi muộn 15 phút', '18:15', '19:45', 1.00, TRUE),
('S-0912', '2026-09', '2026-09-12', 'Thứ 7', '18:00 - 19:30', 'TOAN_K03_NT2_13_01', 'GV-001', 'COVER', 'Dạy thay đồng nghiệp', '17:58', '19:30', 1.00, TRUE),
('S-0925', '2026-09', '2026-09-26', 'Thứ 7', '18:00 - 19:30', 'TOAN_K03_NT2_13_01', 'GV-001', 'STUDENT_CANCELED', 'HS xin nghỉ gấp sát giờ', '17:55', '18:30', 0.50, FALSE)
ON CONFLICT (session_code) DO NOTHING;

-- Seed Đơn khiếu nại đối soát mẫu (Thầy Tuấn khiếu nại ca S-0925)
INSERT INTO dispute_requests (dispute_code, session_code, teacher_code, month_period, incident_type, content, attachment_name, status) VALUES
('DSP-0901', 'S-0925', 'GV-001', '2026-09', 'Học sinh xin nghỉ sát giờ nhưng hệ thống ghi nhận nhầm GV vắng', 'Học sinh xin nghỉ sát giờ trước 30 phút, tôi đã vào trực phòng và đợi đến 18:30 theo quy chế vận hành. Kính đề nghị bảo lưu 1.0 công thay vì 0.5 công.', 'Anh_chup_man_hinh_doi_lop.png', 'CHO_DUYET')
ON CONFLICT (dispute_code) DO NOTHING;
