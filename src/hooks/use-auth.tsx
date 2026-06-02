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
  const rolesRequestRef = useRef(0);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      const requestId = ++rolesRequestRef.current;
      setSession(s);
      if (s?.user) {
        setRolesLoaded(false);
        setRoles([]);
        setTimeout(() => loadRoles(s.user.id, requestId), 0);
      } else {
        setRoles([]);
        setRolesLoaded(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
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
