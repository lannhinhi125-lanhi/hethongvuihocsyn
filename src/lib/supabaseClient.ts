import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * CỔNG KẾT NỐI SUPABASE CHUẨN (SUPABASE CLIENT CONNECTOR)
 * File cấu hình kết nối duy nhất của toàn bộ hệ thống VUIHOC TUTOR.
 * Đọc trực tiếp từ biến môi trường Vite (.env hoặc môi trường deploy Vercel).
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo-placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-anon-key-placeholder';

// Khởi tạo Supabase client chính thức
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

/**
 * Kiểm tra xem ứng dụng đã được cấu hình Supabase hợp lệ hay chưa
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    !import.meta.env.VITE_SUPABASE_URL.includes('your-project-id') &&
    !import.meta.env.VITE_SUPABASE_URL.includes('demo-placeholder')
  );
};

/**
 * Các hàm API liên thông dữ liệu chuẩn giữa các phân hệ:
 */

// 1. Tải toàn bộ danh sách Học sinh
export async function fetchStudentsFromSupabase() {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase] Lỗi tải học sinh:', error.message);
    return null;
  }
  return data;
}

// 2. Tải toàn bộ danh sách Lớp học
export async function fetchClassesFromSupabase() {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.from('classes').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase] Lỗi tải lớp học:', error.message);
    return null;
  }
  return data;
}

// 3. Tải và đồng bộ Đơn giải trình sự cố (Từ Giáo viên lên Quản trị)
export async function fetchDisputesFromSupabase(monthPeriod: string) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('dispute_requests')
    .select('*')
    .eq('month_period', monthPeriod)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[Supabase] Lỗi tải đơn khiếu nại:', error.message);
    return null;
  }
  return data;
}

// 4. Giáo viên gửi khiếu nại giải trình đối soát lên Supabase
export async function submitDisputeToSupabase(payload: {
  dispute_code: string;
  session_code: string;
  teacher_code: string;
  month_period: string;
  incident_type: string;
  content: string;
  attachment_name?: string;
}) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.from('dispute_requests').insert([{
    ...payload,
    status: 'CHO_DUYET'
  }]).select();
  if (error) {
    console.error('[Supabase] Lỗi gửi khiếu nại:', error.message);
    return null;
  }
  return data?.[0];
}

// 5. Quản trị viên duyệt giải trình đối soát trên Supabase
export async function reviewDisputeOnSupabase(disputeCode: string, status: 'DA_DUYET' | 'TU_CHOI', adminNote: string) {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('dispute_requests')
    .update({
      status,
      admin_note: adminNote,
      reviewed_at: new Date().toISOString()
    })
    .eq('dispute_code', disputeCode)
    .select();
  if (error) {
    console.error('[Supabase] Lỗi cập nhật duyệt giải trình:', error.message);
    return null;
  }
  return data?.[0];
}
