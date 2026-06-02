import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "mentor" | "cliente";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: Role[];
  rolesLoaded: boolean;
  isStaff: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const authEventRef = useRef(0);
  const rolesRequestRef = useRef(0);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      authEventRef.current += 1;
      // TOKEN_REFRESHED / USER_UPDATED keep the same user — only update
      // the session reference. Re-fetching roles on every refresh causes
      // rolesLoaded to flap and bounces escolher-perfil/area to /login.
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        setSession(s);
        return;
      }
      setSession(s);
      if (s?.user) {
        const requestId = ++rolesRequestRef.current;
        setRolesLoaded(false);
        setRoles([]);
        setTimeout(() => loadRoles(s.user.id, requestId), 0);
      } else {
        ++rolesRequestRef.current;
        setRoles([]);
        setRolesLoaded(true);
      }
      setLoading(false);
    });
    const initialAuthEventId = authEventRef.current;
    supabase.auth.getSession().then(({ data }) => {
      if (authEventRef.current !== initialAuthEventId) {
        setLoading(false);
        return;
      }
      const requestId = ++rolesRequestRef.current;
      setSession(data.session);
      if (data.session?.user) {
        setRolesLoaded(false);
        loadRoles(data.session.user.id, requestId);
      } else {
        setRolesLoaded(true);
      }
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadRoles(userId: string, requestId = ++rolesRequestRef.current) {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (rolesRequestRef.current !== requestId) return;
    if (error) {
      console.error("Erro ao carregar permissões do usuário", error);
      setRoles([]);
    } else {
      setRoles((data ?? []).map((r) => r.role as Role));
    }
    setRolesLoaded(true);
  }

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    loading,
    roles,
    rolesLoaded,
    isStaff: roles.includes("admin") || roles.includes("mentor"),
    signOut: async () => {
      ++rolesRequestRef.current;
      setRoles([]);
      setRolesLoaded(true);
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
