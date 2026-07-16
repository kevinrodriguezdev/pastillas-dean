import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // No rompemos la app: las funciones que usen supabase fallarán de forma
  // visible al usuario. La config real se hace en Vercel.
  console.warn('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(url || '', anonKey || '', {
  auth: { persistSession: false, autoRefreshToken: false }
});
