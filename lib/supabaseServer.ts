import { createClient, SupabaseClient } from '@supabase/supabase-js';

// TODO: replace `any` with the generated Database type from Supabase later.
type Database = any;

// Wrap env lookups in a helper so we fail fast with a useful message.
function getEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    // crash early since we are in development mode
    throw new Error(`[supabaseServer] Missing required env var: ${name}`);
  }

  return value;
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

// Create a single shared client instance.
let supabaseSingleton: SupabaseClient<Database> | null = null;

export function getSupabaseServer(): SupabaseClient<Database> {
  if (!supabaseSingleton) {
    supabaseSingleton = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        // We handle auth manually (via headers / cookies), so no persisted session here.
        persistSession: false,
      },
    });
  }

  return supabaseSingleton;
}

export const supabaseServer = getSupabaseServer();