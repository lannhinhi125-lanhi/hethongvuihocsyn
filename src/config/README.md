# Kết nối Supabase

Mở supabase.ts và thay URL/key mẫu trong supabaseConfig bằng Project URL và anon/public key. Có thể nhập trực tiếp tại đây, hoặc dùng VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY; biến môi trường được ưu tiên.

Client dùng schema vuihoc và được hai file src/lib/supabase.ts, src/lib/supabaseClient.ts dùng chung. Import trong code: import { supabase } from '../config/supabase'. Ví dụ đọc bảng: supabase.from('LOP_HOC').select('*').

Đây là cấu hình kết nối. Các hàm nghiệp vụ cũ vẫn cần chuyển tên bảng/cột, ánh xạ dữ liệu và nối AppContext. Quyền truy cập schema vuihoc cũng cần cấu hình trước khi đọc bằng anon key.
