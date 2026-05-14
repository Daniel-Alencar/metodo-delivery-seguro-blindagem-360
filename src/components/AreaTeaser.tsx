import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Sparkles, BellRing, CheckCircle2 } from "lucide-react";

export type AreaTeaserProps = {
  eyebrow: string;
  title: string;
  tagline: string;
  description: string;
  image: string;
  pillars: { title: string; desc: string }[];
  accent: string; // tailwind gradient classes
  glow: string; // oklch
};

export function AreaTeaser(props: AreaTeaserProps) {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar às áreas
        </Link>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ShieldCheck className="h-4 w-4" /> Blindagem 360º
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl gap-10 px-6 pt-10 pb-16 md:grid-cols-2 md:pt-20 md:pb-24">
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
            style={{ borderColor: props.glow, color: props.glow }}
          >
            <Sparkles className="h-3 w-3" /> {props.eyebrow}
          </div>
          <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-gradient md:text-6xl">
            {props.title}
          </h1>
          <p className="mt-4 text-lg text-foreground/80">{props.tagline}</p>
          <p className="mt-3 max-w-xl text-pretty text-sm text-muted-foreground md:text-base">
            {props.description}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background"
              disabled
            >
              <BellRing className="h-4 w-4" />
              Em breve · Avise-me
            </button>
            <Link
              to="/food-service"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-card"
            >
              Conhecer Food Service (disponível)
            </Link>
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-2xl border border-border"
          style={{ boxShadow: `0 30px 80px -30px ${props.glow}` }}
        >
          <img
            src={props.image}
            alt={props.title}
            width={1536}
            height={1024}
            className="h-full w-full object-cover"
          />
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-tr ${props.accent}`} />
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-6 pb-24">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">O que estará incluso</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
          Mesmo método. Mesmo rigor. Adaptado à realidade do setor.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {props.pillars.map((p) => (
            <div key={p.title} className="rounded-xl border border-border bg-card/60 p-6 backdrop-blur">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <h3 className="mt-4 text-base font-semibold tracking-tight">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Blindagem 360º — {props.title}</p>
          <p>Em construção · Lista de espera disponível em breve</p>
        </div>
      </footer>
    </div>
  );
}
