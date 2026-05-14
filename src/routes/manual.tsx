import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, BookOpen, GraduationCap, UserCog, Code2, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/manual")({
  head: () => ({
    meta: [
      { title: "Manual da plataforma — Blindagem 360º" },
      { name: "description", content: "Manual de uso da plataforma Blindagem 360º conforme o seu perfil." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: ManualPage,
});

type Tab = "aluno" | "mentor" | "admin" | "dev";

const ALL_TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "aluno", label: "Aluno", icon: GraduationCap },
  { id: "mentor", label: "Mentor", icon: BookOpen },
  { id: "admin", label: "Administrador", icon: UserCog },
  { id: "dev", label: "Desenvolvedor", icon: Code2 },
];

function ManualPage() {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("aluno");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const { data: r } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      setRoles((r ?? []).map((x: { role: string }) => x.role));
      setLoading(false);
    })();
  }, []);

  const visibleTabs = useMemo(() => {
    const isAdmin = roles.includes("admin");
    const isMentor = roles.includes("mentor");
    return ALL_TABS.filter((t) => {
      if (t.id === "aluno") return true; // todo logado tem acesso
      if (t.id === "mentor") return isMentor || isAdmin;
      if (t.id === "admin" || t.id === "dev") return isAdmin;
      return false;
    });
  }, [roles]);

  // Garante aba válida para o perfil
  useEffect(() => {
    if (visibleTabs.length && !visibleTabs.some((t) => t.id === tab)) {
      const priority: Tab[] = ["dev", "admin", "mentor", "aluno"];
      const next = priority.find((p) => visibleTabs.some((t) => t.id === p)) ?? "aluno";
      setTab(next);
    }
  }, [visibleTabs, tab]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando manual...
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ShieldCheck className="h-4 w-4" /> Blindagem 360º
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-16">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Manual da plataforma</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Você está vendo apenas as seções correspondentes ao seu perfil
          {roles.length > 0 && (<> · <span className="text-foreground">{roles.join(" + ")}</span></>)}.
        </p>

        <div className="mt-8 flex flex-wrap gap-2 border-b border-border">
          {visibleTabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 rounded-t-md px-4 py-2.5 text-sm transition-colors ${
                  active
                    ? "border-b-2 border-foreground bg-card font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </div>

        <article className="mt-8 space-y-8 text-sm leading-relaxed text-muted-foreground">
          {tab === "aluno" && visibleTabs.some((t) => t.id === "aluno") && <AlunoSection />}
          {tab === "mentor" && visibleTabs.some((t) => t.id === "mentor") && <MentorSection />}
          {tab === "admin" && visibleTabs.some((t) => t.id === "admin") && <AdminSection />}
          {tab === "dev" && visibleTabs.some((t) => t.id === "dev") && <DevSection />}
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 border-b border-border pb-2 text-xl font-semibold text-foreground">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-base font-semibold text-foreground">{children}</h3>;
}

function AlunoSection() {
  return (
    <>
      <H2>1. Criando sua conta</H2>
      <p>
        Acesse <b>/signup</b>, preencha nome completo, CPF, e-mail, telefone e empresa. Marque o aceite dos
        Termos de Uso e da Política LGPD. Após cadastro, sua conta fica <b>pendente</b> até um mentor
        aprovar a ativação.
      </p>

      <H2>2. Login e dashboard</H2>
      <p>
        Entre em <b>/login</b> com seu e-mail e senha. Você cai direto na sua trilha em <b>/dashboard</b>:
      </p>
      <ul className="ml-5 mt-2 list-disc space-y-1">
        <li><b>Encontros</b>: 12 semanas com aulas, modelos e checkpoints.</li>
        <li><b>Status</b>: cada semana mostra se está bloqueada, liberada ou aprovada (com nome do mentor).</li>
        <li><b>Progresso</b>: barra mostra quanto da jornada já foi concluído.</li>
      </ul>

      <H2>3. Como avançar nas semanas</H2>
      <ol className="ml-5 mt-2 list-decimal space-y-1">
        <li>Assista à aula da semana (ao vivo ou gravada).</li>
        <li>Aplique o checklist da semana (formulários e tarefas).</li>
        <li>Solicite a aprovação ao mentor — ele valida e libera a próxima.</li>
      </ol>

      <H2>4. Documentos e modelos</H2>
      <p>
        Em <b>/documentos</b> você acessa os 40 modelos do Método Delivery Seguro™ (contratos, políticas,
        termos). Cada modelo é editável dentro da plataforma.
      </p>

      <H2>5. Acompanhamento (pós-trilha)</H2>
      <p>
        Em <b>/acompanhamento</b> você vê o status do seu ciclo de mentoria mensal. Ciclos de 30 dias são
        liberados manualmente. <b>Após o término, você tem 7 dias de carência</b> para exportar o PDF com
        os 40 modelos antes do arquivamento.
      </p>

      <H2>6. Incidentes</H2>
      <p>
        Aconteceu algo na sua operação? Em <b>/incidentes</b> você registra o evento, anexa documentos e o
        mentor recebe alerta para orientar a resposta.
      </p>

      <H2>7. Exportar PDF</H2>
      <p>
        Em <b>/manual-impressao</b> gere o manual com os 40 modelos. O PDF traz seu CPF como <b>marca
        d'água</b> e nota de uso exclusivo. <b>Não distribua</b> — sob pena de responsabilização civil e
        criminal.
      </p>
    </>
  );
}

function MentorSection() {
  return (
    <>
      <H2>1. Como você é promovido a mentor</H2>
      <p>
        Apenas o super admin promove mentores via <b>/admin → Mentores</b>. Após a promoção, no próximo
        login você é direcionado direto à área de mentoria.
      </p>

      <H2>2. Tela "Aprovações" no admin</H2>
      <p>Aqui você vê todos os checkpoints pendentes dos seus mentorados:</p>
      <ul className="ml-5 mt-2 list-disc space-y-1">
        <li><b>Liberar semana</b>: destrava a próxima semana para o aluno.</li>
        <li><b>Aprovar semana</b>: confirma que o aluno cumpriu os requisitos.</li>
        <li><b>Registrar atendimento de aula</b>: marca que conduziu a aula da semana (com observações).</li>
      </ul>
      <p className="mt-2">Toda ação é registrada no <b>histórico de ações</b> para auditoria.</p>

      <H2>3. Histórico de ações</H2>
      <p>
        No final de <b>/admin</b> existe um painel de auditoria filtrável por tipo de ação (liberou,
        aprovou, conduziu aula, liberou acompanhamento, etc.) com data, mentor, aluno e observações.
      </p>

      <H2>4. Relatório mensal</H2>
      <p>
        Painel "Relatório por mentor" mostra suas estatísticas do mês: aulas conduzidas, semanas
        aprovadas, liberações, alunos atendidos. Exportável em CSV.
      </p>

      <H2>5. Boas práticas</H2>
      <ul className="ml-5 mt-2 list-disc space-y-1">
        <li>Aprove apenas após ver evidência da execução pelo aluno.</li>
        <li>Use o campo "observações" no atendimento para deixar contexto ao próximo mentor.</li>
        <li>Não exclua nem edite registros de auditoria — o sistema impede.</li>
      </ul>
    </>
  );
}

function AdminSection() {
  return (
    <>
      <H2>1. Como acessar como super admin</H2>
      <p>
        Apenas o e-mail <code>glaubertgia@gmail.com</code> tem o duplo perfil. Ao logar, o sistema
        pergunta se quer entrar como <b>Mentor</b> ou <b>Super Admin</b> em <b>/escolher-perfil</b>.
      </p>

      <H2>2. Gestão de mentores</H2>
      <p>Em <b>/admin → aba Mentores</b>:</p>
      <ul className="ml-5 mt-2 list-disc space-y-1">
        <li>Buscar usuário por e-mail/nome;</li>
        <li>Promover a mentor (1 clique);</li>
        <li>Revogar mentoria.</li>
      </ul>
      <p className="mt-2">Toda promoção/revogação é auditada.</p>

      <H2>3. Aprovação de cadastros</H2>
      <p>
        Novos cadastros entram com status <b>pendente</b>. Em <b>/admin → Aprovações de matrícula</b>
        você ativa a trilha do aluno.
      </p>

      <H2>4. Liberação de acompanhamento (pós-trilha)</H2>
      <p>
        Pagamento manual: o aluno paga (Stripe ou PIX externo). Você confirma e clica em
        <b> "Liberar 30 dias"</b> em <b>/admin → Acompanhamento</b>. O ciclo dispara automaticamente o
        cron de carência (7 dias) e o arquivamento.
      </p>

      <H2>5. Curriculum (módulos / semanas / modelos)</H2>
      <p>
        Em <b>/admin → Curriculum</b> você cria módulos, semanas e modelos. Os 40 modelos do PDF saem
        daí. Cada modelo aceita texto formatado (Markdown).
      </p>

      <H2>6. Histórico de ações</H2>
      <p>
        Painel de auditoria com filtros: liberações, aprovações, aulas, acompanhamento, promoções.
        Exportável em CSV.
      </p>

      <H2>7. Relatório por mentor</H2>
      <p>
        Selecione o mês e veja ranking de mentores: aulas conduzidas, aprovações, liberações,
        acompanhamentos liberados, alunos distintos. Exportável em CSV para folha de pagamento.
      </p>

      <H2>8. Cron jobs ativos</H2>
      <ul className="ml-5 mt-2 list-disc space-y-1">
        <li><code>cron-archive</code>: roda diariamente, arquiva contas com carência expirada.</li>
      </ul>
    </>
  );
}

function DevSection() {
  return (
    <>
      <H2>Stack</H2>
      <ul className="ml-5 list-disc space-y-1">
        <li>Front: <b>TanStack Start v1</b> + React 19 + Vite 7 + Tailwind v4.</li>
        <li>Back: <b>Server functions</b> (`createServerFn`) + server routes (`/api/public/*`).</li>
        <li>DB / Auth / Storage: <b>Supabase</b> (Postgres + RLS + Auth).</li>
        <li>Deploy: <b>Cloudflare Workers</b> via Lovable Cloud.</li>
      </ul>

      <H2>1. Migrar o banco para outra hospedagem</H2>
      <ol className="ml-5 list-decimal space-y-2">
        <li>
          Criar projeto Postgres no destino (Supabase self-hosted, Neon, RDS, etc.).
        </li>
        <li>
          Exportar schema + dados do projeto atual:
          <pre className="mt-1 overflow-x-auto rounded bg-card p-3 text-xs text-foreground">
{`pg_dump --schema=public --no-owner --no-acl \\
  -h db.<projeto>.supabase.co -U postgres -d postgres \\
  -F c -f blindagem.dump`}
          </pre>
        </li>
        <li>
          Restaurar no destino:
          <pre className="mt-1 overflow-x-auto rounded bg-card p-3 text-xs text-foreground">
{`pg_restore --no-owner --no-acl -d <conn-destino> blindagem.dump`}
          </pre>
        </li>
        <li>
          Aplicar todas as migrations em <code>supabase/migrations/</code> em ordem cronológica.
        </li>
        <li>
          Migrar usuários do <code>auth.users</code> via Supabase Admin API ou Auth Hook (atenção aos
          hashes bcrypt — preserve).
        </li>
        <li>
          Atualizar variáveis no destino:
          <pre className="mt-1 overflow-x-auto rounded bg-card p-3 text-xs text-foreground">
{`VITE_SUPABASE_URL=https://<novo-host>
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role>
SUPABASE_URL=https://<novo-host>
SUPABASE_PUBLISHABLE_KEY=<anon-key>`}
          </pre>
        </li>
        <li>Reativar Storage buckets e cron jobs (pg_cron) com URLs do novo domínio.</li>
      </ol>

      <H2>2. Integração Stripe (pagamento do acompanhamento)</H2>
      <ol className="ml-5 list-decimal space-y-2">
        <li>Criar produto recorrente "Acompanhamento mensal" no Stripe.</li>
        <li>
          Server function <code>createCheckoutSession</code> em <code>src/lib/billing.functions.ts</code>:
          <pre className="mt-1 overflow-x-auto rounded bg-card p-3 text-xs text-foreground">
{`const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
  success_url: \`\${origin}/acompanhamento?ok=1\`,
  cancel_url:  \`\${origin}/acompanhamento?cancel=1\`,
  customer_email: userEmail,
  metadata: { user_id: userId },
});`}
          </pre>
        </li>
        <li>
          Webhook em <code>src/routes/api/public/stripe-webhook.ts</code> verificando assinatura HMAC e
          chamando <code>admin_extend_followup(user_id, 30)</code> no evento <code>invoice.paid</code>.
        </li>
        <li>
          Secrets necessários: <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code>,
          <code> STRIPE_PRICE_ID</code>.
        </li>
      </ol>

      <H2>3. E-mail transacional (Resend)</H2>
      <ol className="ml-5 list-decimal space-y-2">
        <li>Conectar domínio em Resend e validar SPF/DKIM/DMARC.</li>
        <li>Adicionar secret <code>RESEND_API_KEY</code>.</li>
        <li>
          Server function <code>sendTransactional</code>:
          <pre className="mt-1 overflow-x-auto rounded bg-card p-3 text-xs text-foreground">
{`await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${process.env.RESEND_API_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'Blindagem 360 <no-reply@seudominio.com>',
    to, subject, html,
  }),
});`}
          </pre>
        </li>
        <li>Disparar nos eventos: cadastro aprovado, semana aprovada, fim do ciclo, carência.</li>
      </ol>

      <H2>4. WhatsApp (Twilio ou Cloud API Meta)</H2>
      <ol className="ml-5 list-decimal space-y-2">
        <li>Criar app no <b>Meta WhatsApp Business Cloud API</b> ou conta Twilio.</li>
        <li>
          Secrets: <code>WHATSAPP_TOKEN</code>, <code>WHATSAPP_PHONE_ID</code> (ou
          <code> TWILIO_SID</code> / <code>TWILIO_TOKEN</code>).
        </li>
        <li>
          Endpoint server-side disparando templates pré-aprovados (HSM):
          <pre className="mt-1 overflow-x-auto rounded bg-card p-3 text-xs text-foreground">
{`POST https://graph.facebook.com/v20.0/<PHONE_ID>/messages
Authorization: Bearer <TOKEN>
{ "to": "55119...", "type":"template",
  "template": { "name":"semana_aprovada", "language":{"code":"pt_BR"} } }`}
          </pre>
        </li>
        <li>
          Webhook em <code>/api/public/whatsapp-webhook</code> para receber respostas (opcional, para
          atendimento em duas vias).
        </li>
      </ol>

      <H2>5. Cron jobs</H2>
      <p>
        Já configurado: <code>cron-archive</code> em <code>/api/public/cron-archive</code>. Agendar via
        pg_cron ou serviço externo (cron-job.org) com header de assinatura HMAC.
      </p>

      <H2>6. Backup</H2>
      <p>
        Habilitar PITR no Postgres + dump diário automatizado em S3 (com lifecycle de 30 dias). Storage
        de PDFs gerados: bucket privado com URLs assinadas (expiração 5 min).
      </p>

      <H2>7. Variáveis de ambiente — checklist completo</H2>
      <pre className="overflow-x-auto rounded bg-card p-3 text-xs text-foreground">
{`# Front + Back
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Pagamento
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=

# E-mail
RESEND_API_KEY=

# WhatsApp
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=

# Cron
CRON_WEBHOOK_SECRET=`}
      </pre>
    </>
  );
}
