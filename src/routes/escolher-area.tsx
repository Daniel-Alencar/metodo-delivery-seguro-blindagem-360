import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShieldCheck, Loader2, Lock, UtensilsCrossed, PawPrint, Repeat } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { setActiveVertical, VERTICAL_META, type Vertical } from "@/hooks/use-active-vertical";
import { useViewMode } from "@/hooks/use-view-mode";

export const Route = createFileRoute("/escolher-area")({
  head: () => ({ meta: [{ title: "Escolher área — Blindagem 360º" }] }),
  component: ChooseAreaPage,
});

const FUTURE = [
  { code: "estetica", label: "Estética" },
  { code: "hof", label: "HOF" },
  { code: "atacado", label: "Atacado" },
] as const;

function ChooseAreaPage() {
  const { user, loading, isStaff, rolesLoaded } = useAuth();
  const { needsChoice: needsRole } = useViewMode();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !rolesLoaded) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (!isStaff) { navigate({ to: "/dashboard" }); return; }
    if (needsRole) { navigate({ to: "/escolher-perfil" }); return; }
  }, [loading, rolesLoaded, user, isStaff, needsRole, navigate]);

  function pick(v: Vertical) {
    setActiveVertical(v);
    navigate({ to: "/admin" });
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }

  const cards: { v: Vertical; icon: typeof UtensilsCrossed; desc: string }[] = [
    { v: "food-service", icon: UtensilsCrossed, desc: "Mentoria, encontros e currículo do Mercado Gastronômico (Food Service / Delivery)." },
    { v: "pet-shop", icon: PawPrint, desc: "Mentoria, encontros e currículo do universo pet (MPS)." },
  ];

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ShieldCheck className="h-4 w-4" /> Blindagem 360º
        </div>
        <span className="text-xs text-muted-foreground">{user.email}</span>
      </header>
      <main className="relative mx-auto max-w-4xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Acesso do mentor</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Qual área você quer atender agora?</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Você atua em múltiplas áreas. Escolha qual setor vai conduzir nesta sessão — você pode trocar
          a qualquer momento pelo menu superior. As matrículas de todas as áreas continuam visíveis.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {cards.map(({ v, icon: Icon, desc }) => {
            const meta = VERTICAL_META[v];
            return (
              <button
                key={v}
                onClick={() => pick(v)}
                className={`group rounded-2xl border bg-card/60 p-6 text-left transition-all hover:-translate-y-0.5 ${meta.badgeClass} hover:ring-2 hover:${meta.ringClass}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${meta.dotClass}`} />
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-semibold tracking-tight">{meta.label}</h2>
                <p className="mt-2 text-xs opacity-80">{desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider opacity-80">
                  <Repeat className="h-3 w-3" /> Entrar nesta área
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-10">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Em breve</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {FUTURE.map((f) => (
              <span key={f.code} className="inline-flex items-center gap-1 rounded-full border border-border bg-card/40 px-3 py-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> {f.label}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
