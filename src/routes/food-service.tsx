import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  ArrowLeft,
  Calendar,
  FileText,
  MessageSquare,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/food-service")({
  head: () => ({
    meta: [
      { title: "Food Service — Método Delivery Seguro™ | Blindagem 360º" },
      {
        name: "description",
        content:
          "Plataforma premium de blindagem jurídica e operacional para delivery, pizzarias, lanchonetes e restaurantes. Jornada guiada de 4 meses com governança aplicada.",
      },
      { property: "og:title", content: "Food Service — Método Delivery Seguro™" },
      {
        property: "og:description",
        content:
          "Centro operacional de proteção empresarial para food service: documentos vivos, central de incidentes e Hardware de Prova.",
      },
    ],
  }),
  component: FoodServicePage,
});

const journey = [
  {
    month: "Mês 1",
    title: "Fundação Jurídica",
    desc: "Base societária, ativos e estrutura formal de proteção.",
  },
  {
    month: "Mês 2",
    title: "Operação Crítica",
    desc: "Delivery, contratos, logística e primeiros documentos operacionais.",
  },
  {
    month: "Mês 3",
    title: "Equipe & Prova Interna",
    desc: "Jornada, benefícios, sigilo, treinamento e disciplina.",
  },
  {
    month: "Mês 4",
    title: "Defesa Externa",
    desc: "Consumo, notificações, fiscalização e consolidação da blindagem.",
  },
];

const pillars = [
  {
    icon: FileText,
    title: "Documentos Vivos",
    desc: "Templates versionados, contextualizados por módulo — não arquivos soltos.",
  },
  {
    icon: AlertTriangle,
    title: "Central de Incidentes",
    desc: "Protocolos para chargeback, Procon, sanitária, redes sociais e mais.",
  },
  {
    icon: Camera,
    title: "Hardware de Prova",
    desc: "Câmeras de expedição, lacres, evidências digitais e logs operacionais.",
  },
  {
    icon: MessageSquare,
    title: "Mensagens Estratégicas",
    desc: "Biblioteca de respostas prontas: clientes, equipe, marketplace, crise.",
  },
];

const levels = [
  { name: "Vulnerável", tone: "text-red-300 border-red-500/30 bg-red-500/10" },
  { name: "Estrutura Inicial", tone: "text-amber-300 border-amber-500/30 bg-amber-500/10" },
  { name: "Operação Protegida", tone: "text-yellow-200 border-yellow-500/30 bg-yellow-500/10" },
  { name: "Blindagem Ativa", tone: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
  { name: "Delivery Seguro Certificado", tone: "text-cyan-200 border-cyan-500/30 bg-cyan-500/10" },
];

function FoodServicePage() {
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

      {/* HERO */}
      <section className="relative mx-auto max-w-7xl px-6 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs text-orange-200">
          <Sparkles className="h-3 w-3" />
          Método Delivery Seguro™
        </div>
        <h1 className="mt-5 max-w-4xl text-balance text-4xl font-semibold tracking-tight text-gradient md:text-6xl">
          A central operacional de blindagem para o food service.
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
          Não é um repositório de PDFs. É um sistema vivo de implementação jurídica e operacional —
          jornada guiada de 4 meses, documentos contextualizados, central de incidentes e governança
          aplicada à realidade do delivery.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02]"
          >
            Ativar minha blindagem
            <ShieldCheck className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-card backdrop-blur"
          >
            Conhecer o método
          </button>
        </div>
      </section>

      {/* PILLARS */}
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

      {/* JOURNEY */}
      <section className="relative mx-auto max-w-7xl px-6 pb-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Jornada Guiada</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
              Implantação em 4 meses, com dupla trava: tempo + aprovação.
            </h2>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {journey.map((m, i) => (
            <div
              key={m.month}
              className="relative rounded-xl border border-border bg-card/60 p-6 backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {m.month}
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold">
                  {i + 1}
                </span>
              </div>
              <div className="mt-6 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold tracking-tight">{m.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
              <div className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
                {i === 0 ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Liberado no início
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" /> Destrava após 30 dias + aprovação
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* LEVELS */}
      <section className="relative mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-2xl border border-border bg-card/40 p-8 backdrop-blur md:p-12">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Nível de Blindagem
          </p>
          <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">
            Sua operação evolui em níveis claros — do vulnerável ao certificado.
          </h2>
          <div className="mt-8 flex flex-wrap gap-2">
            {levels.map((l) => (
              <span
                key={l.name}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${l.tone}`}
              >
                {l.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-7xl px-6 pb-28">
        <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-orange-500/10 via-card to-card p-10 md:p-14">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Pronto para blindar sua operação?
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Acesso liberado após validação. Você recebe trilha guiada, documentos vivos e canal direto
            com o consultor.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02]"
            >
              Quero contratar
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-card"
            >
              Já sou cliente · Entrar
            </button>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} Blindagem 360º — Food Service</p>
          <p>Método Delivery Seguro™ · Governança aplicada</p>
        </div>
      </footer>
    </div>
  );
}
