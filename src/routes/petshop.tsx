import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  ArrowLeft,
  Calendar,
  FileText,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Sparkles,
  PawPrint,
} from "lucide-react";
import petHero from "@/assets/petshop-hero.jpg";

export const Route = createFileRoute("/petshop")({
  head: () => ({
    meta: [
      { title: "Pet Shop — Blindagem 360º para pet shops, banho & tosa e clínicas veterinárias" },
      {
        name: "description",
        content:
          "Plataforma premium de blindagem jurídica e operacional para pet shops, banho & tosa, hospedagem e clínicas veterinárias. 4 meses · 16 encontros · documentos vivos.",
      },
      { property: "og:title", content: "Pet Shop — Blindagem 360º" },
      {
        property: "og:description",
        content:
          "Societária, trabalhista, consumerista e vigilância sanitária aplicadas ao universo pet — com documentos vivos e governança contínua.",
      },
    ],
  }),
  component: PetShopPage,
});

const journey = [
  {
    month: "Mês 1",
    title: "Blindagem Societária",
    desc: "Estrutura societária, contrato social, sócios e proteção patrimonial.",
    weeks: [
      "Encontro 1 — Diagnóstico societário e estrutura ideal",
      "Encontro 2 — Contrato social e acordo de sócios",
      "Encontro 3 — Proteção patrimonial dos sócios",
      "Encontro 4 — Checkpoint societário",
    ],
  },
  {
    month: "Mês 2",
    title: "Blindagem Trabalhista",
    desc: "Tosadores, banhistas, veterinários, EPIs e prevenção de passivos.",
    weeks: [
      "Encontro 5 — Contratação segura: cargos e jornada",
      "Encontro 6 — EPIs, NR e segurança do trabalho",
      "Encontro 7 — Veterinário responsável técnico e CRMV",
      "Encontro 8 — Checkpoint trabalhista",
    ],
  },
  {
    month: "Mês 3",
    title: "Blindagem Consumerista",
    desc: "Relação com tutores, danos ao animal, garantias e marketplace pet.",
    weeks: [
      "Encontro 9 — Termo de serviço com o tutor",
      "Encontro 10 — Responsabilidade por danos ao animal",
      "Encontro 11 — Vendas, garantias e marketplace pet",
      "Encontro 12 — Checkpoint consumerista",
    ],
  },
  {
    month: "Mês 4",
    title: "Vigilância & Conformidade",
    desc: "Licenças, CRMV, medicamentos, biossegurança e LGPD aplicada.",
    weeks: [
      "Encontro 13 — Licenças e alvarás",
      "Encontro 14 — Medicamentos veterinários e biossegurança",
      "Encontro 15 — LGPD aplicada a pet shops",
      "Encontro 16 — Checkpoint final & plano de melhoria",
    ],
  },
];

const pillars = [
  { icon: FileText, title: "Documentos Vivos", desc: "Termos de serviço, prontuários e contratos versionados por encontro." },
  { icon: AlertTriangle, title: "Central de Incidentes", desc: "Protocolos para danos ao animal, Procon, vigilância e redes sociais." },
  { icon: PawPrint, title: "Conformidade Pet", desc: "CRMV, vigilância sanitária, medicamentos e biossegurança aplicadas." },
  { icon: MessageSquare, title: "Mensagens Estratégicas", desc: "Respostas prontas para tutores, equipe, marketplace e crise." },
];

const levels = [
  { name: "Vulnerável", tone: "text-red-300 border-red-500/30 bg-red-500/10" },
  { name: "Estrutura Inicial", tone: "text-amber-300 border-amber-500/30 bg-amber-500/10" },
  { name: "Operação Protegida", tone: "text-yellow-200 border-yellow-500/30 bg-yellow-500/10" },
  { name: "Blindagem Ativa", tone: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
  { name: "Pet Shop Seguro Certificado", tone: "text-cyan-200 border-cyan-500/30 bg-cyan-500/10" },
];

function PetShopPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar às áreas
        </Link>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ShieldCheck className="h-4 w-4" />
          Blindagem 360º
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl gap-10 px-6 pt-12 pb-16 md:grid-cols-[1.1fr_1fr] md:items-center md:pt-20 md:pb-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
            <Sparkles className="h-3 w-3" />
            Método Pet Shop Seguro — MPS
          </div>
          <h1 className="mt-5 max-w-2xl text-balance text-4xl font-semibold tracking-tight text-gradient md:text-6xl">
            A central operacional de blindagem para o universo pet.
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
            Pet shops, banho & tosa, hospedagem, day care e clínicas veterinárias.
            Jornada guiada de 4 meses com 16 encontros: societária, trabalhista,
            consumerista e vigilância sanitária aplicadas à realidade pet.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/signup"
              search={{ vertical: "pet-shop" }}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02]"
            >
              Ativar minha blindagem
              <ShieldCheck className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-card backdrop-blur"
            >
              Já sou cliente · Entrar
            </Link>
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-2xl border border-border"
          style={{ boxShadow: "0 30px 80px -30px oklch(0.7 0.15 200 / 0.6)" }}
        >
          <img
            src={petHero}
            alt="Pet shop premium: groomer atendendo filhote em mesa de tosa profissional"
            width={1536}
            height={1024}
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-cyan-500/15 via-emerald-500/5 to-transparent" />
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="group rounded-xl border border-border bg-card/60 p-6 transition-all hover:-translate-y-1 hover:border-foreground/30 hover:bg-card backdrop-blur"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background/60">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="mt-5 text-base font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-6 pb-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Jornada Guiada</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              4 meses · 16 encontros · documentos vivos.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Cada mês com 4 encontros e checkpoint final. Sua operação evolui em níveis claros até a certificação.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {journey.map((m, i) => (
            <div key={m.month} className="relative rounded-xl border border-border bg-card/60 p-6 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{m.month}</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold">
                  {i + 1}
                </span>
              </div>
              <div className="mt-6 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold tracking-tight">{m.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
              <ul className="mt-5 space-y-2 border-t border-border/60 pt-4">
                {m.weeks.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground">
                {i === 0 ? (
                  <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Liberado no início</>
                ) : (
                  <><Lock className="h-3.5 w-3.5" /> Destrava após checkpoint anterior</>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-2xl border border-border bg-card/40 p-8 backdrop-blur md:p-12">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Nível de Blindagem</p>
          <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
            Sua operação evolui em níveis claros — do vulnerável ao certificado.
          </h2>
          <div className="mt-8 flex flex-wrap gap-2">
            {levels.map((l) => (
              <span key={l.name} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${l.tone}`}>
                {l.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Blindagem 360º — Pet Shop</p>
          <p>Método Pet Shop Seguro™ · Governança aplicada</p>
        </div>
      </footer>
    </div>
  );
}
