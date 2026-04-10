import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Cliente solo si hay proyecto Supabase (Realtime/Auth/DB). Sin env, null: la app puede vivir solo con Prisma u otros datos. */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
    supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
