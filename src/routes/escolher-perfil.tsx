import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Crown, GraduationCap, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { setViewMode } from "@/hooks/use-view-mode";

export const Route = createFileRoute("/escolher-perfil")({
  head: () => ({ meta: [{ title: "Escolher perfil — Blindagem 360º" }] }),
  component: ChoosePage,
});

function ChoosePage() {
  const { user, loading, roles, rolesLoaded } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin");
  const isMentor = roles.includes("mentor");

  useEffect(() => {
    if (loading || !rolesLoaded) return;
    if (!user) { navigate({ to: "/login" }); return; }
    // Only super-admin (admin + mentor) sees this page. Others get redirected.
    if (!(isAdmin && isMentor)) {
      navigate({ to: isAdmin || isMentor ? "/admin" : "/dashboard" });
    }
  }, [loading, rolesLoaded, user, isAdmin, isMentor, navigate]);

  function pick(mode: "admin" | "mentor") {
    setViewMode(mode);
    navigate({ to: "/escolher-area" });
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ShieldCheck className="h-4 w-4" /> Blindagem 360º
        </div>
        <span className="text-xs text-muted-foreground">{user.email}</span>
      </header>
      <main className="relative mx-auto max-w-3xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Acesso</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Como você quer entrar?</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Você é Super Admin desta plataforma e também atua como Mentor. Escolha o perfil para esta sessão.
          Você pode trocar a qualquer momento pelo menu superior.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <button
            onClick={() => pick("admin")}
            className="group rounded-2xl border border-border bg-card/60 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-amber-500/40"
          >
            <Crown className="h-6 w-6 text-amber-300" />
            <h2 className="mt-4 text-lg font-semibold tracking-tight">Entrar como Super Admin</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Acesso completo: nomear mentores, editar currículo dos 16 encontros, cadastrar modelos,
              liberar acompanhamento pré-pago e gerenciar planos.
            </p>
          </button>
          <button
            onClick={() => pick("mentor")}
            className="group rounded-2xl border border-border bg-card/60 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-cyan-500/40"
          >
            <GraduationCap className="h-6 w-6 text-cyan-300" />
            <h2 className="mt-4 text-lg font-semibold tracking-tight">Entrar como Mentor</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Painel da turma: aprovar checkpoints, acompanhar mentorados e responder dúvidas.
              Áreas administrativas ficam ocultas.
            </p>
          </button>
        </div>
      </main>
    </div>
  );
}
