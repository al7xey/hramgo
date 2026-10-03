"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

type SessionView = { user: { id: string; email?: string; name?: string; image?: string; role?: string } };
type AuthContext = {
  data: SessionView | null;
  status: "loading" | "authenticated" | "unauthenticated";
  update: () => Promise<void>;
  error: string | null;
};
const Context = createContext<AuthContext>({ data: null, status: "loading", update: async () => {}, error: null });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SessionView | null>(null);
  const [status, setStatus] = useState<AuthContext["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured()) { setStatus("unauthenticated"); return; }
    let active = true;
    const client = getSupabase();
    async function apply(session: Session | null) {
      if (!active) return;
      if (!session) { setData(null); setStatus("unauthenticated"); return; }
      setData({ user: { id: session.user.id, email: session.user.email, name: session.user.user_metadata.name } });
      setStatus("authenticated");
      const [profile, role] = await Promise.all([
        client.from("profiles").select("display_name,avatar_url").eq("id", session.user.id).maybeSingle(),
        client.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle(),
      ]);
      if (!active) return;
      const current = (await client.auth.getSession()).data.session;
      if (current?.user.id !== session.user.id) return;
      setData({ user: { id: session.user.id, email: session.user.email, name: profile.data?.display_name ?? session.user.user_metadata.name, image: profile.data?.avatar_url, role: role.data?.role ?? "USER" } });
    }
    void client.auth.getSession().then(({ data: result, error: err }) => {
      if (err) throw err;
      return apply(result.session);
    }).catch(() => { if (active) { setStatus("unauthenticated"); setError("Не удалось проверить вход. Перезагрузите страницу."); } });
    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => { void apply(session).catch(() => { if(active) setError("Не удалось загрузить профиль."); }); });
    });
    return () => { active = false; subscription.subscription.unsubscribe(); };
  }, []);
  async function update() {
    const { data: result } = await getSupabase().auth.getSession();
    if (!result.session) return;
    const { data: profile } = await getSupabase().from("profiles").select("display_name,avatar_url").eq("id",result.session.user.id).single();
    setData(current => current ? { user: { ...current.user, name: profile?.display_name, image: profile?.avatar_url } } : null);
  }
  return <Context.Provider value={{ data, status, error, update }}>{children}</Context.Provider>;
}
export const useSession = () => useContext(Context);
export async function signOut() { const {error}=await getSupabase().auth.signOut(); if(error) throw error; }
