import { createClient } from '@supabase/supabase-js';

/** Dán Project URL và anon/public key của bạn vào hai giá trị bên dưới. */
export const supabaseConfig = {
  url: import.meta.env?.VITE_SUPABASE_URL || 'https://zpmvbrwnltgjzpybvtgg.supabase.co',
  anonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwbXZicndubHRnanpweWJ2dGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MDYxODcsImV4cCI6MjEwNzI4MjE4N30.qUnghjDLD1xrOJKmHYIVc5UIiHcgx6wI9z2_43BR_Po',
  schema: 'vuihoc',
} as const;

export const isSupabaseConfigured = (): boolean => Boolean(
  supabaseConfig.url && supabaseConfig.anonKey &&
  supabaseConfig.url !== 'https://your-project-id.supabase.co' &&
  supabaseConfig.anonKey !== 'your-anon-public-key'
);

// Chỉ dùng anon/public key tại frontend; service_role key thuộc máy chủ.
export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey, {
  db: { schema: supabaseConfig.schema },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
