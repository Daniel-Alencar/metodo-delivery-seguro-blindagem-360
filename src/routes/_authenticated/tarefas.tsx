import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Pencil, Save, X, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({ meta: [{ title: "Tarefa da semana — Blindagem 360º" }] }),
  component: TarefasPage,
});

type Week = {
  id: string; week_index: number; title: string; summary: string | null;
  homework: string | null; module_id: string;
};
type Module = { id: string; month_index: number; title: string };
type Enrollment = { id: string; user_id: string; status: string };
type Progress = { week_id: string; status: string };
type Override = { id: string; week_id: string; enrollment_id: string; body: string };
type StudentOption = { enrollment_id: string; user_id: string; name: string; email: string };

function TarefasPage() {
  const { user, isStaff } = useAuth();
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>("");
  const [editing, setEditing] = useState<string | null>(null); // week_id
  const [draft, setDraft] = useState("");

  async function load() {
    setLoading(true);
    const [{ data: m }, { data: w }] = await Promise.all([
      supabase.from("modules").select("id, month_index, title").eq("vertical", "food-service").order("month_index"),
      supabase.from("weeks").select("id, week_index, title, summary, homework, module_id").order("week_index"),
    ]);
    setModules((m ?? []) as Module[]);
    setWeeks((w ?? []) as Week[]);

    if (isStaff) {
      const { data: enrolls } = await supabase
        .from("enrollments").select("id, user_id, status")
        .in("status", ["active", "graduated", "archiving"]);
      const ids = (enrolls ?? []).map((e) => e.user_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as { id: string; full_name: string | null }[] };
      const opts: StudentOption[] = (enrolls ?? []).map((e) => {
        const p = profs?.find((x) => x.id === e.user_id);
        return { enrollment_id: e.id, user_id: e.user_id, name: p?.full_name ?? "(sem nome)", email: "" };
      });
      setStudents(opts);
      const initial = selectedEnrollmentId || opts[0]?.enrollment_id || "";
      setSelectedEnrollmentId(initial);
      if (initial) await loadEnrollmentData(initial);
    } else {
      const { data: e } = await supabase.from("enrollments").select("id, user_id, status")
        .eq("user_id", user!.id).maybeSingle();
      setEnrollment((e ?? null) as Enrollment | null);
      if (e) await loadEnrollmentData(e.id);
    }
    setLoading(false);
  }

  async function loadEnrollmentData(enrollmentId: string) {
    const [{ data: p }, { data: o }] = await Promise.all([
      supabase.from("week_progress").select("week_id, status").eq("enrollment_id", enrollmentId),
      supabase.from("week_task_overrides").select("*").eq("enrollment_id", enrollmentId),
    ]);
    setProgress((p ?? []) as Progress[]);
    setOverrides((o ?? []) as Override[]);
  }

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  useEffect(() => {
    if (isStaff && selectedEnrollmentId) loadEnrollmentData(selectedEnrollmentId);
    // eslint-disable-next-line
  }, [selectedEnrollmentId]);

  const activeEnrollmentId = isStaff ? selectedEnrollmentId : enrollment?.id ?? "";

  const visibleWeeks = useMemo(() => {
    if (isStaff) return weeks;
    // Aluno: vê semanas com progresso (in_progress, submitted, approved)
    const allowed = new Set(progress.filter((p) => ["in_progress", "submitted", "approved"].includes(p.status)).map((p) => p.week_id));
    return weeks.filter((w) => allowed.has(w.id));
  }, [weeks, progress, isStaff]);

  function getOverride(weekId: string) {
    return overrides.find((o) => o.week_id === weekId);
  }

  async function saveOverride(weekId: string) {
    if (!activeEnrollmentId) return;
    const existing = getOverride(weekId);
    if (existing) {
      await supabase.from("week_task_overrides").update({ body: draft }).eq("id", existing.id);
    } else {
      await supabase.from("week_task_overrides").insert({
        enrollment_id: activeEnrollmentId, week_id: weekId, body: draft, created_by: user!.id,
      });
    }
    setEditing(null);
    await loadEnrollmentData(activeEnrollmentId);
  }

  async function clearOverride(weekId: string) {
    const existing = getOverride(weekId);
    if (!existing) return;
    if (!confirm("Remover a tarefa personalizada e voltar à tarefa padrão?")) return;
    await supabase.from("week_task_overrides").delete().eq("id", existing.id);
    await loadEnrollmentData(activeEnrollmentId);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando tarefas...</div>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Plano de ação</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Tarefa da semana</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {isStaff
              ? "Personalize a tarefa do aluno conforme o caso. Cada situação pede uma abordagem diferente."
              : "Aqui ficam as tarefas da semana liberadas para você. Tarefas personalizadas pelo seu mentor aparecem destacadas."}
          </p>
        </div>
        {isStaff && students.length > 0 && (
          <select
            value={selectedEnrollmentId}
            onChange={(e) => setSelectedEnrollmentId(e.target.value)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            {students.map((s) => (
              <option key={s.enrollment_id} value={s.enrollment_id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {visibleWeeks.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          {isStaff ? "Nenhum aluno com matrícula ativa." : "Nenhuma semana liberada ainda. Inicie a próxima semana na sua trilha."}
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {modules.map((mod) => {
            const ws = visibleWeeks.filter((w) => w.module_id === mod.id);
            if (ws.length === 0) return null;
            return (
              <section key={mod.id}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Mês {mod.month_index} · {mod.title}
                </h2>
                <div className="space-y-4">
                  {ws.map((w) => {
                    const ov = getOverride(w.id);
                    const isEditing = editing === w.id;
                    const taskBody = ov?.body || w.homework || "";
                    return (
                      <article key={w.id} className="rounded-xl border border-border bg-card/60 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Semana {w.week_index}</p>
                            <h3 className="mt-1 text-base font-semibold">{w.title}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            {ov && (
                              <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-cyan-200">
                                Personalizada
                              </span>
                            )}
                            {isStaff && !isEditing && (
                              <button
                                onClick={() => { setEditing(w.id); setDraft(taskBody); }}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-3 py-1 text-xs hover:bg-background"
                              >
                                <Pencil className="h-3 w-3" /> {ov ? "Editar" : "Personalizar"}
                              </button>
                            )}
                            {isStaff && ov && !isEditing && (
                              <button
                                onClick={() => clearOverride(w.id)}
                                className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs text-red-200 hover:bg-red-500/20"
                              >
                                <X className="h-3 w-3" /> Padrão
                              </button>
                            )}
                          </div>
                        </div>

                        {w.summary && (
                          <div className="mt-3 rounded-md border border-border bg-background/40 p-3 text-xs text-muted-foreground">
                            <p className="mb-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-foreground/70">
                              <BookOpen className="h-3 w-3" /> Resumo da aula
                            </p>
                            {w.summary}
                          </div>
                        )}

                        <div className="mt-4">
                          <p className="mb-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-foreground/70">
                            <ClipboardList className="h-3 w-3" /> Tarefa
                          </p>
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                rows={5} value={draft} onChange={(e) => setDraft(e.target.value)}
                                className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm"
                                placeholder="Descreva a tarefa para este aluno nesta semana..."
                              />
                              <div className="flex gap-2">
                                <button onClick={() => saveOverride(w.id)} className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background">
                                  <Save className="h-3 w-3" /> Salvar
                                </button>
                                <button onClick={() => setEditing(null)} className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs">
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : taskBody ? (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{taskBody}</p>
                          ) : (
                            <p className="text-xs italic text-muted-foreground">Nenhuma tarefa registrada para esta semana.</p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
