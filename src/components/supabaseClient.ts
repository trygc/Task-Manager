import { createClient } from '@supabase/supabase-js';
import { validateEnvVars } from '@/lib/validation';

// Validate environment variables at startup
validateEnvVars();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
