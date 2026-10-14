# VUIHOC TUTOR - Hệ thống Quản lý Vận hành Đào tạo Trực tuyến Tập trung

Hệ thống được phát triển bằng **React 19**, **Vite**, **TypeScript**, **Tailwind CSS**, sử dụng duy nhất font chữ **Inter** theo đúng yêu cầu. Dữ liệu giữa các chức năng được quản lý tập trung và liên thông logic chặt chẽ (Centralized App Store & Supabase Relational Database).

---

## 📌 Kiến Trúc Chức Năng Hệ Thống

### A. KHÔNG GIAN QUẢN TRỊ VIÊN (ADMIN / VẬN HÀNH / CHUYÊN MÔN)
1. **Quản trị Tài khoản & Phân quyền (RBAC)**
   - Quản lý tài khoản người dùng, cấp mới tài khoản, xem/sao chép mật khẩu, khóa/mở khóa tài khoản.
   - Nhóm quyền hệ thống: Quản trị Toàn quyền, Quản lý Chuyên môn, Nhân viên Vận hành, Giáo viên Giảng dạy.

2. **Danh mục Dùng chung (Master Data)**
   - Môn học (`SUB-MATH`, `SUB-ENG`), Khung trình độ (`LVL-F1`, `LVL-F2`, `LVL-STD`, `LVL-ADV`).
   - Khung giờ ca dạy chuẩn (`Time Slots`), Mô hình lớp & Sĩ số trần (`1-1`, `1-3`, `1-5`).
   - Cây phân loại sự cố 2 cấp (Sự cố báo trước >12h, Sự cố khẩn cấp <2h).

3. **Hồ sơ Giáo viên & Đánh giá Dự giờ**
   - Quản lý hồ sơ giáo viên, lọc theo môn học, cấp học & khối lớp.
   - Quy trình chấm điểm dự giờ sư phạm 3 tiêu chí theo thang điểm 10.

4. **Quản lý Học sinh & Điều phối Lớp học**
   - Tiếp nhận hồ sơ học sinh Tiểu học (Lớp 1-5), lưu số điện thoại phụ huynh, ca rảnh mong muốn.
   - Khởi tạo lớp học với mã tự sinh chuẩn Master Data: `[Môn]_[Khối]_[TrìnhĐộ]_[MôHình]_[STT]`.
   - Ghép học sinh từ danh sách "Chờ xếp lớp" (tự động chặn vượt trần sĩ số mô hình `1-1`, `1-3`, `1-5`), gán link phòng Zoom/ClassIn.
   - Phân công giáo viên đứng lớp và phân phối học liệu theo tuần.

5. **Lịch dạy & Giám sát Ca học**
   - Theo dõi thời khóa biểu toàn hệ thống, giám sát check-in của giáo viên.
   - **Xử lý sự cố:** Ghi nhận sự cố trực tiếp vào ca học, lập biên bản sự cố và theo dõi tỷ lệ vận hành.
   - **Điều phối Cover:** Phân công giáo viên dạy thay trực tiếp từ danh sách giáo viên có lịch rảnh.

6. **Trợ lý AI Giảng dạy & SOP Vận hành**
   - Cấu hình cây tiêu chí nhận xét 3 cấp (Toán & Tiếng Anh).
   - Quản lý tài liệu tri thức quy chế SOP nội bộ và cấu hình trợ lý AI.

7. **Trung tâm Báo cáo & Thống kê**
   - Dashboard tỷ lệ vận hành, ma trận ca dạy 2 chiều theo môn và khối lớp, báo cáo dự giờ.
   - Trình tạo báo cáo tùy biến (Cross-Module Builder) chọn trường dữ liệu, vẽ biểu đồ linh động và xuất file Excel CSV tải về máy.

---

### B. CỔNG GIÁO VIÊN (TEACHER PORTAL)
1. **Lịch dạy & Phòng học của tôi:**
   - Xem lịch giảng dạy trong tuần, nút **VÀO LỚP** Zoom/ClassIn, tài liệu bài giảng.
   - Điểm danh học sinh trong lớp, tạo nhận xét AI tự động, xác nhận hoàn tất ca dạy.
   - Nút **Báo sự cố ca học / Xin vắng** gửi ngay tín hiệu cho bộ phận Vận hành.
2. **Hồ sơ chuyên môn & Đánh giá dự giờ của tôi:**
   - Xem xếp hạng Sư phạm (Hạng A/B), điểm chi tiết 3 tiêu chí và nhận xét từ Ban chuyên môn.
3. **Đăng ký lịch rảnh (Availability) trong tuần:**
   - Ma trận chọn ca rảnh tối (T2 - CN) theo khung giờ chuẩn để bộ phận Vận hành xếp lớp.

---

## 🔌 Cấu trúc Supabase

[supabase/schema.sql](supabase/schema.sql) tạo 32 bảng trong schema vuihoc và dữ liệu mẫu. Chạy toàn bộ file trong Supabase SQL Editor.

Xem [hướng dẫn chọn file SQL](supabase/README.md), [bảng đối chiếu UI → database](supabase/DATA_DICTIONARY.md) và [SQL kiểm tra](supabase/verify_schema.sql).

Đợt cập nhật danh mục, giáo viên, tiêu chí nhận xét, mẫu báo cáo và ngày/giờ: chạy một file [apply_relational_update.sql](supabase/apply_relational_update.sql). File gộp cả các sửa đổi chưa chạy trước đó; xem [chi tiết chuyển đổi](docs/relational-catalogs-dates.md). Chạy file gộp cuối cùng, không chạy lại schema hoặc migration cũ sau đó.

Đăng nhập và đọc/lưu tài khoản, nhóm quyền đã nối Supabase bằng SQL RPC, không dùng Supabase Auth. Xem [hướng dẫn áp dụng](supabase/SIMPLE_ACCOUNTS.md). Các màn nghiệp vụ khác vẫn giữ dữ liệu trong bộ nhớ, chưa tự lưu vào Supabase; cần tích hợp CRUD theo mapper và kiểm tra quyền tại database.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Trên VS Code

1. **Cài đặt thư viện:**
   ```bash
   npm install
   ```

2. **Cấu hình biến môi trường (`.env`):**
   Tạo file `.env` từ file `.env.example`:
   ```env
   VITE_SUPABASE_URL="https://your-project-id.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```

3. **Chạy ứng dụng chế độ phát triển (Development):**
   ```bash
   npm run dev
   ```
   Ứng dụng sẽ chạy tại địa chỉ: `http://localhost:3000`.

4. **Kiểm tra linter & biên dịch (Build):**
   ```bash
   npm run lint
   npm run build
   ```

---

## 🌐 Triển Khai Lên Vercel

Dự án đã có sẵn cấu hình `vercel.json` tối ưu cho Vite Single Page Application:
1. Đẩy code lên GitHub repository.
2. Kết nối dự án trên Vercel Dashboard.
3. Trong mục **Environment Variables** trên Vercel, thêm 2 biến:
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
4. Bấm **Deploy**.


Đã bổ sung 8 bảng nghiệp vụ theo tuần/ngày và luồng sinh công. Xem [thiết kế theo thời gian](supabase/TIMED_WORKFLOW.md) để chạy schema mới hoặc migration nâng cấp. Giao diện chưa chuyển sang bảng mới.


Bổ sung bảng thứ 32: BIEN_BAN_DU_GIO có FK bắt buộc tới mã giáo viên. Xem [hướng dẫn](supabase/TEACHER_EVALUATIONS.md).
