import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// クライアント用（ブラウザ・サーバー共通で利用可能な一般権限）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
