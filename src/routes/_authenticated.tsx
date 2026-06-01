import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, RotateCcw, ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useViewMode } from "@/hooks/use-view-mode";
import { useActiveVertical } from "@/hooks/use-active-vertical";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

type Enrollment = { id: string; status: string; completed_at: string | null; archive_at: string | null };

function AuthenticatedLayout() {
  const { user, loading, roles, signOut } = useAuth();
  const { needsChoice } = useViewMode();
  const { needsChoice: needsArea } = useActiveVertical();
  const isStaff = roles.includes("admin") || roles.includes("mentor");
  const navigate = useNavigate();
  const location = useLocation();
  const isClient = !roles.includes("admin") && !roles.includes("mentor");
  const [checking, setChecking] = useState(true);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user || !isClient) { setChecking(false); return; }
    (async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("id, status, completed_at, archive_at")
        .eq("user_id", user.id)
        .maybeSingle();
      setEnrollment(data as Enrollment | null);
      setChecking(false);
    })();
  }, [user, isClient]);

  // Super-admin must pick a profile before entering /admin
  useEffect(() => {
    if (!loading && needsChoice && !location.pathname.startsWith("/escolher-perfil")) {
      navigate({ to: "/escolher-perfil" });
    }
  }, [loading, needsChoice, location.pathname, navigate]);

  // Staff (admin/mentor) must pick an area (vertical) before entering /admin
  useEffect(() => {
    if (loading || needsChoice) return;
    if (!isStaff) return;
    if (!needsArea) return;
    if (location.pathname.startsWith("/escolher-area") || location.pathname.startsWith("/escolher-perfil")) return;
    navigate({ to: "/escolher-area" });
  }, [loading, needsChoice, needsArea, isStaff, location.pathname, navigate]);


  if (loading || !user || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }

  // Re-entry: archived ex-mentorado lands on welcome-back
  if (isClient && enrollment?.status === "archived") {
    return (
      <div className="dark min-h-screen bg-background text-foreground">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <ShieldCheck className="h-4 w-4" /> Blindagem 360º
          </div>
          <button
            onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </header>
        <main className="relative mx-auto max-w-2xl px-6 py-16 text-center">
          <RotateCcw className="mx-auto h-10 w-10 text-cyan-300" />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight md:text-4xl">Bem-vindo de volta</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            Você concluiu a implementação do Método Blindagem360 - MB360º
            {enrollment.completed_at && (
              <> em <span className="text-foreground">{new Date(enrollment.completed_at).toLocaleDateString("pt-BR")}</span></>
            )}.
            Para retomar o acesso e voltar a usar o suporte da mentoria, ative o plano de Acompanhamento.
          </p>
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-border bg-card/60 p-6 text-left">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Plano de Acompanhamento</p>
            <p className="mt-2 text-2xl font-semibold">30 dias</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pré-pago. Acesso a todos os 40 modelos, histórico das aulas e canal direto com a mentoria.
            </p>
            <p className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
              Pagamento manual nesta versão. Combine com a mentoria por WhatsApp e o admin libera os 30 dias na hora.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
