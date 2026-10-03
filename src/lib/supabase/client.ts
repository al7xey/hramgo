import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) throw new Error("Сервис аккаунтов временно недоступен. Попробуйте позже.");
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(15000) }) },
    });
  }
  return client;
}
export function safeReturnPath(value: string | null | undefined, fallback = "/profile/") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return fallback;
  return value;
}
