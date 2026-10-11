import { createClient } from '@supabase/supabase-js';

/** Dán Project URL và anon/public key của bạn vào hai giá trị bên dưới. */
export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-public-key',
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
  auth: { persistSession: true, autoRefreshToken: true },
});
