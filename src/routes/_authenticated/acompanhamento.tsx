import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, Loader2, MessageSquare, FileText, Send, Download, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/acompanhamento")({
  head: () => ({ meta: [{ title: "Acompanhamento — Blindagem 360º" }] }),
  component: AcompanhamentoPage,
});

type Sub = { id: string; followup_paid_until: string | null; status: string };
type Enrollment = { id: string; status: string; completed_at: string | null; archive_at: string | null };
type Incident = { id: string; title: string; description: string; status: string; created_at: string; resolution: string | null };

function AcompanhamentoPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<Sub | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [docCount, setDocCount] = useState(0);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [form, setForm] = useState({ title: "", description: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    const [{ data: e }, { data: s }, { data: docs }, { data: inc }] = await Promise.all([
      supabase.from("enrollments").select("id, status, completed_at, archive_at").eq("user_id", user.id).maybeSingle(),
      supabase.from("subscriptions").select("id, followup_paid_until, status").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("documents").select("id", { count: "exact", head: true }),
      supabase.from("incidents").select("*").eq("user_id", user.id).eq("category", "consultation").order("created_at", { ascending: false }),
    ]);
    setEnrollment(e as Enrollment | null);
    setSub(s as Sub | null);
    setDocCount((docs as unknown as { length: number })?.length ?? 0);
    setIncidents((inc ?? []) as Incident[]);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const activeUntil = sub?.followup_paid_until ? new Date(sub.followup_paid_until) : null;
  const isActive = !!activeUntil && activeUntil > new Date();

  async function ask() {
    if (!user || !form.title.trim()) return;
    setBusy(true);
    await supabase.from("incidents").insert({
      user_id: user.id,
      category: "consultation",
      title: form.title,
      description: form.description,
      status: "open",
    });
    setForm({ title: "", description: "" });
    await load();
    setBusy(false);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...</div>;
  }

  if (!enrollment || !["graduated", "archiving", "archived"].includes(enrollment.status)) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-10 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Acompanhamento</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Esta área fica disponível depois que você concluir os 16 encontros do Método Delivery Seguro™.
        </p>
        <Link to="/dashboard" className="mt-6 inline-flex rounded-full bg-foreground px-4 py-2 text-sm text-background">
          Voltar para a trilha
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pós-implementação</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Acompanhamento</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Você concluiu o método. Aqui ficam todos os {docCount} modelos liberados, o histórico das aulas e o canal direto
          com a mentoria para dúvidas e consultas do dia a dia.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card/60 p-5">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-cyan-300" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {isActive ? "Acompanhamento ativo" : "Acompanhamento expirado"}
              </p>
              <p className="text-xs text-muted-foreground">
                {activeUntil
                  ? `${isActive ? "Vence em" : "Venceu em"} ${activeUntil.toLocaleDateString("pt-BR")}`
                  : "Você ainda não ativou o plano de acompanhamento."}
              </p>
            </div>
            {!isActive && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] uppercase tracking-wider text-amber-300">
                Aguardando pagamento
              </span>
            )}
          </div>
          {!isActive && (
            <p className="mt-4 rounded-md border border-border bg-background/40 p-3 text-xs text-muted-foreground">
              Para ativar ou renovar, faça o pagamento mensal e o admin libera 30 dias na hora.
              Enquanto inativo, os modelos ficam bloqueados — o histórico das aulas continua disponível.
            </p>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Modelos liberados</h2>
            <p className="text-xs text-muted-foreground">
              {isActive ? "Acesso total aos contratos, termos e modelos de mensagem." : "Bloqueado até renovação."}
            </p>
          </div>
          <Link
            to="/documentos"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-4 py-2 text-xs hover:bg-card"
          >
            <FileText className="h-3.5 w-3.5" /> Abrir biblioteca
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Manual completo</h2>
          <a
            href="/manual-impressao"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-4 py-2 text-xs hover:bg-card"
          >
            <Download className="h-3.5 w-3.5" /> Baixar PDF
          </a>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Abre uma versão para impressão com os 40 modelos. Use Ctrl+P → Salvar como PDF.
        </p>
      </section>

      <section>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold tracking-tight">Dúvidas e consultas</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Casos do dia a dia, dúvidas jurídicas operacionais, situações com fornecedor ou cliente.
        </p>

        {isActive ? (
          <div className="mt-4 rounded-xl border border-border bg-card/60 p-4">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Resumo (ex: Cliente pediu reembolso após 30 dias)"
              className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Conte o caso em detalhes…"
              rows={4}
              className="mt-2 w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-foreground/40"
            />
            <button
              onClick={ask}
              disabled={busy || !form.title.trim()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" /> Enviar consulta
            </button>
          </div>
        ) : (
          <p className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
            Renove o acompanhamento para abrir novas consultas. O histórico abaixo continua acessível.
          </p>
        )}

        <div className="mt-6 space-y-3">
          {incidents.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma consulta enviada ainda.</p>
          ) : incidents.map((i) => (
            <div key={i.id} className="rounded-xl border border-border bg-card/40 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{i.title}</p>
                <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider">
                  {i.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(i.created_at).toLocaleDateString("pt-BR")}</p>
              <p className="mt-2 text-sm">{i.description}</p>
              {i.resolution && (
                <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
                  <p className="font-medium text-emerald-300">Resposta da mentoria</p>
                  <p className="mt-1 whitespace-pre-wrap">{i.resolution}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {enrollment.status === "archiving" && enrollment.archive_at && (
        <section className="rounded-2xl border border-red-500/40 bg-red-500/5 p-5">
          <div className="flex items-center gap-2 text-red-300">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-semibold">Encerramento agendado</p>
          </div>
          <p className="mt-2 text-xs text-red-200/80">
            Sua conta será arquivada em {new Date(enrollment.archive_at).toLocaleDateString("pt-BR")}.
            Após essa data o acesso será cortado. Para cancelar, fale com a mentoria.
          </p>
        </section>
      )}
    </div>
  );
}
