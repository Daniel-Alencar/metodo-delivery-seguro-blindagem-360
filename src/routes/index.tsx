import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, PawPrint, ArrowUpRight } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blindagem 360º — Plataforma de Proteção Empresarial" },
      {
        name: "description",
        content:
          "Sistema premium de blindagem empresarial para Food Service, Estética, HOF e Moda. Método proprietário com governança, jornada guiada e proteção jurídica aplicada.",
      },
      { property: "og:title", content: "Blindagem 360º — Plataforma de Proteção Empresarial" },
      {
        property: "og:description",
        content:
          "Escolha sua área e ative a Blindagem 360º: jornada guiada, documentos vivos e central de proteção operacional.",
      },
    ],
  }),
  component: HubPage,
});

type Vertical = {
  to: string;
  eyebrow: string;
  title: string;
  description: string;
  status: "available" | "soon";
  icon: React.ComponentType<{ className?: string }>;
  glow: string; // oklch color for the rotating border + orb
  accent: string;
};

const verticals: Vertical[] = [
  {
    to: "/food-service",
    eyebrow: "Método Blindagem360 - MB360º",
    title: "MERCADO GASTRONÔMICO - Food Service",
    description:
      "Delivery, pizzarias, lanchonetes, restaurantes e operações afins. Blindagem 360º jurídica e operacional.",
    status: "available",
    icon: ShieldCheck,
    glow: "oklch(0.78 0.19 35)",
    accent: "from-orange-500/20 via-red-500/10 to-transparent",
  },
  {
    to: "/petshop",
    eyebrow: "Método Pet Shop Seguro™",
    title: "Pet Shop",
    description:
      "Pet shops, banho & tosa, hospedagem e clínicas veterinárias. Societária, trabalhista, consumerista e vigilância aplicadas.",
    status: "available",
    icon: PawPrint,
    glow: "oklch(0.78 0.15 200)",
    accent: "from-cyan-500/20 via-emerald-500/10 to-transparent",
  },
];

function HubPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="relative">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-[600px] bg-gradient-to-b from-primary/[0.04] to-transparent pointer-events-none" />

        <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Blindagem 360º</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#metodo" className="hover:text-foreground transition-colors">Método</a>
            <a href="#areas" className="hover:text-foreground transition-colors">Áreas</a>
            <Link to="/food-service" className="hover:text-foreground transition-colors">
              Acessar
            </Link>
          </nav>
        </header>

        <section className="relative mx-auto max-w-7xl px-6 pt-16 pb-12 text-center md:pt-28 md:pb-20">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Plataforma de Blindagem Empresarial
          </div>
          <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-gradient md:text-6xl">
            Escolha sua área. Ative sua Blindagem 360º.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
            Um sistema operacional de proteção jurídica e governança aplicada — desenhada por
            equipes altamente especializadas para os riscos reais de cada setor.
          </p>
        </section>

        <section id="areas" className="relative mx-auto max-w-7xl px-6 pb-28">
          <div className="grid gap-6 md:grid-cols-2">
            {verticals.map((v) => (
              <VerticalCard key={v.to} vertical={v} />
            ))}
          </div>
        </section>

        <SiteFooter />
      </div>
    </div>
  );
}

function VerticalCard({ vertical }: { vertical: Vertical }) {
  const Icon = vertical.icon;
  const inner = (
    <div
      className="vertical-card group relative flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-8 md:p-10"
      style={{ ["--glow" as string]: vertical.glow }}
    >
      <div
        className="glow-orb"
        style={{ background: vertical.glow, top: "-60px", right: "-60px" }}
      />
      <div className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${vertical.accent} opacity-60`} />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {vertical.eyebrow}
          </span>
          {vertical.status === "soon" ? (
            <span className="rounded-full border border-border bg-background/50 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              Em breve
            </span>
          ) : (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
              Disponível
            </span>
          )}
        </div>

        <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background/60 shadow-sm transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </div>

        <h2 className="mt-6 text-2xl font-semibold tracking-tight md:text-3xl">{vertical.title}</h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
          {vertical.description}
        </p>
      </div>

      <div className="relative mt-10 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground/90">
          {vertical.status === "available" ? "Entrar na plataforma" : "Avise-me quando abrir"}
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/70 transition-all duration-300 group-hover:border-foreground/40 group-hover:bg-foreground group-hover:text-background">
          <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
        </span>
      </div>
    </div>
  );

  return (
    <Link to={vertical.to} className="block h-full">
      {inner}
    </Link>
  );
}
