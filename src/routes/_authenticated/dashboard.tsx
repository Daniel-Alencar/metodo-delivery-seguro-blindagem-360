import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Lock, Loader2, Send, Calendar, FileText, GraduationCap, HeartPulse, Download, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Trilha — Blindagem 360º" }] }),
  component: DashboardPage,
});

type Module = { id: string; month_index: number; title: string; description: string | null };
type Week = { id: string; module_id: string; week_index: number; title: string; is_checkpoint: boolean };
type Enrollment = {
  id: string; status: string; started_at: string | null; user_id: string;
  completed_at: string | null; archive_at: string | null; next_step_chosen_at: string | null;
  vertical: string;
};
type Progress = {
  id: string; week_id: string; status: "locked" | "in_progress" | "submitted" | "approved";
  submitted_at: string | null; approved_at: string | null;
};

const METHOD_BY_VERTICAL: Record<string, string> = {
  "food-service": "Método Delivery Seguro™",
  "pet-shop": "Método Pet Shop Seguro — MPS",
};

const UNLOCK_DAYS = 7;

function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: e } = await supabase
      .from("enrollments").select("*").eq("user_id", user!.id)
      .order("created_at", { ascending: false }).maybeSingle();
    const vertical = (e as { vertical?: string } | null)?.vertical ?? "food-service";
    const [{ data: m }, { data: w }, { data: docs }] = await Promise.all([
      supabase.from("modules").select("*").eq("vertical", vertical).order("month_index"),
      supabase.from("weeks").select("*").order("week_index"),
      supabase.from("documents").select("week_id").not("week_id", "is", null),
    ]);
    setModules(m ?? []);
    setWeeks(w ?? []);
    setEnrollment(e as Enrollment | null);
    const counts: Record<string, number> = {};
    (docs ?? []).forEach((d: { week_id: string | null }) => {
      if (d.week_id) counts[d.week_id] = (counts[d.week_id] ?? 0) + 1;
    });
    setDocCounts(counts);
    if (e) {
      const { data: p } = await supabase.from("week_progress").select("*").eq("enrollment_id", e.id);
      setProgress((p ?? []) as Progress[]);
    }
    setLoading(false);
  }

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  const orderedWeeks = useMemo(() => {
    return modules.flatMap((m) =>
      weeks
        .filter((w) => w.module_id === m.id)
        .sort((a, b) => a.week_index - b.week_index)
        .map((w) => ({ ...w, month_index: m.month_index }))
    );
  }, [modules, weeks]);

  function getProgress(weekId: string) {
    return progress.find((p) => p.week_id === weekId);
  }

  // TEST MODE: all weeks unlocked for active/graduated/archiving enrollments
  // To re-enable the 7-day lock + prior approval gate, restore the commented block below.
  function isUnlocked(_idx: number): boolean {
    if (!enrollment || !["active", "graduated", "archiving"].includes(enrollment.status)) return false;
    return true;
    // const prev = orderedWeeks[_idx - 1];
    // if (_idx === 0) return true;
    // const prevProg = getProgress(prev.id);
    // if (!prevProg || prevProg.status !== "approved" || !prevProg.approved_at) return false;
    // const days = (Date.now() - new Date(prevProg.approved_at).getTime()) / 86_400_000;
    // return days >= UNLOCK_DAYS;
  }

  async function startWeek(weekId: string) {
    if (!enrollment) return;
    setBusy(weekId);
    await supabase.from("week_progress").upsert({
      enrollment_id: enrollment.id, week_id: weekId, status: "in_progress",
    }, { onConflict: "enrollment_id,week_id" });
    await load();
    setBusy(null);
  }

  async function submitWeek(weekId: string) {
    if (!enrollment) return;
    setBusy(weekId);
    const existing = getProgress(weekId);
    if (existing) {
      await supabase.from("week_progress").update({
        status: "submitted", submitted_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await supabase.from("week_progress").insert({
        enrollment_id: enrollment.id, week_id: weekId,
        status: "submitted", submitted_at: new Date().toISOString(),
      });
    }
    await load();
    setBusy(null);
  }

  const navigate = useNavigate();

  async function chooseArchive() {
    if (!enrollment) return;
    if (!confirm("Confirma encerrar sua conta? Você terá 7 dias de carência para baixar o manual e revisar antes do bloqueio.")) return;
    await supabase.rpc("request_archive", { _enrollment_id: enrollment.id });
    await load();
  }

  async function chooseFollowup() {
    if (!enrollment) return;
    await supabase.from("enrollments").update({ next_step_chosen_at: new Date().toISOString() }).eq("id", enrollment.id);
    navigate({ to: "/acompanhamento" });
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando trilha...</div>;
  }

  // Graduated and hasn't picked next step → "Próximo passo" screen
  if (enrollment && enrollment.status === "graduated" && !enrollment.next_step_chosen_at) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-6 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-emerald-300" />
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">Você concluiu a implementação!</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Os 16 encontros foram aprovados. Agora escolha como deseja continuar.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <button
            onClick={chooseFollowup}
            className="group rounded-2xl border border-border bg-card/60 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-cyan-500/40"
          >
            <HeartPulse className="h-6 w-6 text-cyan-300" />
            <h2 className="mt-4 text-lg font-semibold">Continuar com Acompanhamento</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Plano pré-pago de 30 dias. Acesso a todos os 40 modelos, histórico das aulas e canal direto
              com a mentoria para dúvidas e consultas do dia a dia.
            </p>
          </button>
          <button
            onClick={chooseArchive}
            className="group rounded-2xl border border-border bg-card/60 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-red-500/40"
          >
            <Download className="h-6 w-6 text-red-300" />
            <h2 className="mt-4 text-lg font-semibold">Baixar manual e encerrar</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Você baixa o PDF com os 40 modelos, fica 7 dias com acesso para revisar e depois sua conta é arquivada.
              Pode reativar o Acompanhamento a qualquer momento depois.
            </p>
          </button>
        </div>
      </div>
    );
  }

  if (!enrollment || !["active", "graduated", "archiving"].includes(enrollment.status)) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-10 text-center">
        <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Acesso aguardando ativação</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Sua conta foi criada com sucesso. Assim que sua matrícula for ativada por um mentor, sua trilha
          de 4 meses (16 encontros semanais) ficará disponível aqui.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Status atual: <span className="font-medium text-foreground">{enrollment?.status ?? "sem matrícula"}</span>
        </p>
      </div>
    );
  }

  const archivingBanner = enrollment.status === "archiving" && enrollment.archive_at ? (
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm">
      <AlertTriangle className="h-5 w-5 text-red-300" />
      <div className="flex-1">
        <p className="font-medium text-red-200">Encerramento agendado</p>
        <p className="text-xs text-red-200/80">
          Sua conta será arquivada em {new Date(enrollment.archive_at).toLocaleDateString("pt-BR")}.
        </p>
      </div>
      <button
        onClick={async () => { await supabase.rpc("cancel_archive", { _enrollment_id: enrollment.id }); await load(); }}
        className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs hover:bg-red-500/20"
      >
        Cancelar encerramento
      </button>
    </div>
  ) : null;

  return (
    <div>
      {archivingBanner}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sua trilha</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
            {METHOD_BY_VERTICAL[enrollment.vertical] ?? "Método Delivery Seguro™"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            4 meses · 16 encontros semanais · trava de tempo (7 dias) + aprovação do mentor.
          </p>
        </div>
      </div>

      <div className="mt-10 space-y-10">
        {modules.map((m) => {
          const monthWeeks = weeks.filter((w) => w.module_id === m.id).sort((a, b) => a.week_index - b.week_index);
          return (
            <section key={m.id}>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs uppercase tracking-wider">
                  Mês {m.month_index}
                </span>
                <h2 className="text-xl font-semibold tracking-tight">{m.title}</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>

              <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {monthWeeks.map((w) => {
                  const idx = orderedWeeks.findIndex((x) => x.id === w.id);
                  const unlocked = isUnlocked(idx);
                  const prog = getProgress(w.id);
                  const status = prog?.status ?? (unlocked ? "available" : "locked");
                  return (
                    <div
                      key={w.id}
                      className={`relative rounded-xl border p-5 backdrop-blur transition-all ${
                        unlocked || prog ? "border-border bg-card/60" : "border-border/50 bg-card/30 opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          Semana {w.week_index}
                        </span>
                        <StatusBadge status={status} />
                      </div>
                      <h3 className="mt-3 text-sm font-semibold leading-snug">{w.title}</h3>
                      {w.is_checkpoint && (
                        <p className="mt-1 text-[11px] uppercase tracking-wider text-amber-300">
                          Checkpoint do mês
                        </p>
                      )}
                      {(prog || unlocked) && docCounts[w.id] > 0 && (
                        <Link
                          to="/documentos"
                          search={{ week: w.id }}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200"
                        >
                          <FileText className="h-3 w-3" /> {docCounts[w.id]} modelo{docCounts[w.id] === 1 ? "" : "s"} liberado{docCounts[w.id] === 1 ? "" : "s"}
                        </Link>
                      )}

                      <div className="mt-4 text-xs">
                        {!unlocked && !prog && (
                          <p className="inline-flex items-center gap-1 text-muted-foreground">
                            <Lock className="h-3 w-3" />
                            {idx === 0 ? "Aguardando ativação" : "Liberado 7 dias após aprovação anterior"}
                          </p>
                        )}
                        {unlocked && !prog && (
                          <button
                            onClick={() => startWeek(w.id)} disabled={busy === w.id}
                            className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-[11px] font-medium text-background"
                          >
                            <Calendar className="h-3 w-3" /> Iniciar semana
                          </button>
                        )}
                        {prog?.status === "in_progress" && (
                          <button
                            onClick={() => submitWeek(w.id)} disabled={busy === w.id}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-3 py-1 text-[11px]"
                          >
                            <Send className="h-3 w-3" /> Enviar para aprovação
                          </button>
                        )}
                        {prog?.status === "submitted" && (
                          <span className="text-amber-300">Em análise pelo mentor</span>
                        )}
                        {prog?.status === "approved" && prog.approved_at && (
                          <span className="inline-flex items-center gap-1 text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" />
                            Encontro finalizado em {new Date(prog.approved_at).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    submitted: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    in_progress: "bg-cyan-500/10 text-cyan-200 border-cyan-500/30",
    available: "bg-foreground/10 text-foreground border-border",
    locked: "bg-muted/30 text-muted-foreground border-border",
  };
  const labels: Record<string, string> = {
    approved: "Aprovado", submitted: "Enviado", in_progress: "Em curso",
    available: "Disponível", locked: "Travado",
  };
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${map[status] ?? map.locked}`}>
      {labels[status] ?? status}
    </span>
  );
}
