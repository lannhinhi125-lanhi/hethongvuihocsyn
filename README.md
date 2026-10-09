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

## 🔌 Cổng Kết Nối Dữ Liệu Supabase (Code File & SQL Schema)

Hệ thống kết nối trực tiếp với Supabase thông qua file cấu hình mã nguồn chuyên dụng:

* **File client Supabase:** `src/lib/supabaseClient.ts`
  * Khởi tạo client chính thức từ `@supabase/supabase-js`.
  * Đọc biến môi trường `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`.
  * Cung cấp các hàm API: `fetchStudentsFromSupabase`, `fetchClassesFromSupabase`, `fetchDisputesFromSupabase`, `submitDisputeToSupabase`, `reviewDisputeOnSupabase`.
* **File DDL SQL tạo bảng Supabase:** `supabase/schema.sql`
  * Tạo toàn bộ bảng PostgreSQL cho 8 phân hệ (`users`, `subjects`, `teachers`, `students`, `classes`, `teaching_sessions`, `dispute_requests`,...).
  * Bao gồm sẵn toàn bộ dữ liệu mẫu khởi tạo (Seed Data) chuẩn xác, liên thông 100%.
  * **Cách sử dụng:** Mở **Supabase Dashboard** ➔ vào tab **SQL Editor** ➔ dán toàn bộ nội dung file `supabase/schema.sql` ➔ bấm **RUN**.

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
