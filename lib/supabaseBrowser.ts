import { createClient, SupabaseClient } from '@supabase/supabase-js';

// TODO: replace `any` with the generated Database type from Supabase later.
type Database = any;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`[supabaseServer] Missing required env var: ${name}`);
  }
  return value;
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

export const supabaseServer: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false, 
    },
  }
);