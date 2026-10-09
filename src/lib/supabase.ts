/**
 * CỔNG KẾT NỐI DỮ LIỆU SUPABASE - VUIHOC TUTOR
 * File quản lý kết nối Supabase Client, kiểm tra kết nối, truy vấn và đồng bộ dữ liệu.
 * Đọc cấu hình từ biến môi trường:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';

// Cấu hình kết nối từ biến môi trường Vite hoặc fallback
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here';

/**
 * Khởi tạo Supabase Client duy nhất cho toàn hệ thống
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Kiểm tra trạng thái kết nối tới Supabase
 * @returns {Promise<{ success: boolean; message: string; latencyMs?: number }>}
 */
export async function checkSupabaseConnection(): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  const start = performance.now();
  try {
    if (!supabaseUrl || supabaseUrl.includes('your-project-id')) {
      return {
        success: false,
        message: 'Chưa cấu hình VITE_SUPABASE_URL trong tệp môi trường (.env)',
      };
    }

    const { error } = await supabase.from('users').select('id').limit(1);
    const latency = Math.round(performance.now() - start);

    if (error) {
      // Nếu bảng chưa được tạo bằng schema.sql
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Kết nối thành công nhưng chưa nạp bảng. Hãy chạy file supabase/schema.sql trên Supabase SQL Editor.',
          latencyMs: latency,
        };
      }
      return {
        success: false,
        message: `Lỗi kết nối Supabase: ${error.message}`,
        latencyMs: latency,
      };
    }

    return {
      success: true,
      message: 'Kết nối Supabase thành công và sẵn sàng đồng bộ dữ liệu!',
      latencyMs: latency,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Không thể kết nối máy chủ Supabase: ${err?.message || err}`,
    };
  }
}

/**
 * Các hàm API truy vấn dữ liệu từ Supabase theo nghiệp vụ hệ thống
 */

// 1. Quản trị Tài khoản & Người dùng
export async function fetchUsersFromSupabase() {
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertUserToSupabase(userData: any) {
  const { data, error } = await supabase.from('users').upsert(userData).select();
  if (error) throw error;
  return data;
}

// 2. Danh mục Dùng chung (Môn học, Khung giờ, Gói học, Mô hình lớp)
export async function fetchMasterDataFromSupabase() {
  const [subjects, timeSlots, packages, classModels, incidents] = await Promise.all([
    supabase.from('subjects').select('*').order('code'),
    supabase.from('time_slots').select('*').order('slot_number'),
    supabase.from('course_packages').select('*').order('months'),
    supabase.from('class_models').select('*').order('code'),
    supabase.from('incident_categories').select('*').order('code'),
  ]);

  return {
    subjects: subjects.data || [],
    timeSlots: timeSlots.data || [],
    packages: packages.data || [],
    classModels: classModels.data || [],
    incidents: incidents.data || [],
  };
}

// 3. Học sinh & Lớp học
export async function fetchStudentsFromSupabase() {
  const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchClassesFromSupabase() {
  const { data, error } = await supabase.from('classes').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function upsertStudentToSupabase(studentData: any) {
  const { data, error } = await supabase.from('students').upsert(studentData).select();
  if (error) throw error;
  return data;
}

export async function upsertClassToSupabase(classData: any) {
  const { data, error } = await supabase.from('classes').upsert(classData).select();
  if (error) throw error;
  return data;
}

// 4. Ca học & Giám sát ca dạy
export async function fetchSessionsFromSupabase(filterMonth?: string) {
  let query = supabase.from('teaching_sessions').select('*');
  if (filterMonth) {
    query = query.gte('date', `${filterMonth}-01`).lte('date', `${filterMonth}-31`);
  }
  const { data, error } = await query.order('date', { ascending: true });
  if (error) throw error;
  return data;
}

export async function updateSessionStatusOnSupabase(sessionId: string, status: string, incidentNote?: string) {
  const { data, error } = await supabase
    .from('teaching_sessions')
    .update({ status, incident_note: incidentNote, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
    .select();
  if (error) throw error;
  return data;
}

// 5. Chốt công & Khiếu nại đối soát
export async function fetchPayrollRecordsFromSupabase(periodMonth: string) {
  const { data, error } = await supabase
    .from('payroll_records')
    .select('*')
    .eq('period_month', periodMonth);
  if (error) throw error;
  return data;
}

export async function fetchDisputesFromSupabase(periodMonth?: string) {
  let query = supabase.from('disputes').select('*');
  if (periodMonth) {
    query = query.eq('period_month', periodMonth);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function submitDisputeToSupabase(disputeData: any) {
  const { data, error } = await supabase.from('disputes').insert(disputeData).select();
  if (error) throw error;
  return data;
}

export async function reviewDisputeOnSupabase(disputeId: string, status: 'APPROVED' | 'REJECTED', note: string, adminName: string) {
  const { data, error } = await supabase
    .from('disputes')
    .update({
      status,
      resolution_note: note,
      resolved_by: adminName,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', disputeId)
    .select();
  if (error) throw error;
  return data;
}

export default supabase;
