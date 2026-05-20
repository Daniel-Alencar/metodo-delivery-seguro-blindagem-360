import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type DocsSearch = { week?: string; enrollment?: string };

export const Route = createFileRoute("/_authenticated/documentos")({
  head: () => ({ meta: [{ title: "Documentos Vivos — Blindagem 360º" }] }),
  validateSearch: (s: Record<string, unknown>): DocsSearch => ({
    week: typeof s.week === "string" ? s.week : undefined,
    enrollment: typeof s.enrollment === "string" ? s.enrollment : undefined,
  }),
  component: DocumentosPage,
});

type Doc = { id: string; title: string; description: string | null; body: string | null; version: string; module_id: string | null; week_id: string | null };
type Module = { id: string; month_index: number; title: string };
type Week = { id: string; week_index: number; title: string; summary: string | null };
type OpenView = { doc: Doc; mode: "choose" | "aula" | "doc" };
type Progress = { id: string; enrollment_id: string; week_id: string; status: string; approved_at: string | null };
type MeetingNote = { id: string; enrollment_id: string; week_id: string; body: string; updated_at: string };
type EnrollmentLite = { id: string; user_id: string; full_name?: string | null; company_name?: string | null };


function DocumentosPage() {
  const { isStaff, user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const weekFilter = search.week;
  const enrollmentParam = search.enrollment;

  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [open, setOpen] = useState<OpenView | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", body: "", module_id: "" });

  // Meeting state (per week)
  const [myEnrollmentId, setMyEnrollmentId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [privateNote, setPrivateNote] = useState<MeetingNote | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [staffEnrollments, setStaffEnrollments] = useState<EnrollmentLite[]>([]);
  const [savingMeeting, setSavingMeeting] = useState(false);

  const activeEnrollmentId = enrollmentParam ?? myEnrollmentId;

  async function load() {
    setLoading(true);
    const [{ data: d }, { data: m }, { data: w }] = await Promise.all([
      supabase.from("documents").select("*").order("created_at", { ascending: false }),
      supabase.from("modules").select("id, month_index, title").eq("vertical", "food-service").order("month_index"),
      supabase.from("weeks").select("id, week_index, title, summary").order("week_index"),
    ]);
    setDocs((d ?? []) as Doc[]);
    setModules((m ?? []) as Module[]);
    setWeeks((w ?? []) as Week[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Resolve client's own enrollment id (for concluded badge)
  useEffect(() => {
    if (!user || isStaff) return;
    supabase.from("enrollments").select("id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setMyEnrollmentId((data as { id: string } | null)?.id ?? null));
  }, [user, isStaff]);

  // Staff: load enrollments list (for picker when no ?enrollment=)
  useEffect(() => {
    if (!isStaff || !weekFilter || enrollmentParam) return;
    (async () => {
      const { data: es } = await supabase.from("enrollments")
        .select("id, user_id").order("created_at", { ascending: false });
      const list = (es ?? []) as { id: string; user_id: string }[];
      const ids = list.map((e) => e.user_id);
      const { data: ps } = ids.length
        ? await supabase.from("profiles").select("id, full_name, company_name").in("id", ids)
        : { data: [] as { id: string; full_name: string | null; company_name: string | null }[] };
      const byId = new Map((ps ?? []).map((p) => [p.id, p]));
      setStaffEnrollments(list.map((e) => ({
        ...e,
        full_name: byId.get(e.user_id)?.full_name ?? null,
        company_name: byId.get(e.user_id)?.company_name ?? null,
      })));
    })();
  }, [isStaff, weekFilter, enrollmentParam]);

  // Load progress + private notes for the selected (week, enrollment)
  useEffect(() => {
    if (!weekFilter || !activeEnrollmentId) { setProgress(null); setPrivateNote(null); setNoteDraft(""); return; }
    (async () => {
      const { data: p } = await supabase.from("week_progress")
        .select("id, enrollment_id, week_id, status, approved_at")
        .eq("enrollment_id", activeEnrollmentId).eq("week_id", weekFilter).maybeSingle();
      setProgress(p as Progress | null);
      if (isStaff) {
        const { data: n } = await supabase.from("class_meeting_notes")
          .select("id, enrollment_id, week_id, body, updated_at")
          .eq("enrollment_id", activeEnrollmentId).eq("week_id", weekFilter).maybeSingle();
        setPrivateNote(n as MeetingNote | null);
        setNoteDraft((n as MeetingNote | null)?.body ?? "");
      }
    })();
  }, [weekFilter, activeEnrollmentId, isStaff]);

  async function finishMeeting() {
    if (!weekFilter || !activeEnrollmentId) return;
    setSavingMeeting(true);
    const { error } = await supabase.rpc("staff_finish_meeting", {
      _enrollment_id: activeEnrollmentId, _week_id: weekFilter, _private_notes: noteDraft || undefined,
    });
    setSavingMeeting(false);
    if (error) { alert("Erro ao finalizar encontro: " + error.message); return; }
    // refresh
    const { data: p } = await supabase.from("week_progress")
      .select("id, enrollment_id, week_id, status, approved_at")
      .eq("enrollment_id", activeEnrollmentId).eq("week_id", weekFilter).maybeSingle();
    setProgress(p as Progress | null);
  }

  async function saveNoteOnly() {
    if (!weekFilter || !activeEnrollmentId) return;
    setSavingMeeting(true);
    const { error } = await supabase.from("class_meeting_notes").upsert({
      enrollment_id: activeEnrollmentId, week_id: weekFilter, body: noteDraft, author_id: user?.id ?? null,
    }, { onConflict: "enrollment_id,week_id" });
    setSavingMeeting(false);
    if (error) alert("Erro ao salvar observação: " + error.message);
    else setPrivateNote({ id: "", enrollment_id: activeEnrollmentId, week_id: weekFilter, body: noteDraft, updated_at: new Date().toISOString() });
  }

  const filteredDocs = useMemo(
    () => weekFilter ? docs.filter((d) => d.week_id === weekFilter) : docs,
    [docs, weekFilter]
  );
  const selectedWeek = weekFilter ? weeks.find((w) => w.id === weekFilter) ?? null : null;



  async function addDoc() {
    if (!form.title) return;
    await supabase.from("documents").insert({
      title: form.title, description: form.description, body: form.body,
      module_id: form.module_id || null,
    });
    setAdding(false);
    setForm({ title: "", description: "", body: "", module_id: "" });
    await load();
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...</div>;
  }

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Biblioteca</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Documento / Aula</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Modelos de documentos vinculados às aulas. Clique em um modelo para ver o resumo da aula e o conteúdo completo.
          </p>
        </div>
        {isStaff && (
          <button
            onClick={() => setAdding(true)}
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            + Novo documento
          </button>
        )}
      </div>

      {docs.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Nenhum documento publicado ainda.{isStaff && " Use o botão acima para adicionar o primeiro."}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {docs.map((d) => (
            <button
              key={d.id}
              onClick={() => setOpen({ doc: d, mode: d.week_id ? "choose" : "doc" })}
              className="group text-left rounded-xl border border-border bg-card/60 p-6 transition-all hover:-translate-y-0.5 hover:border-foreground/30"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="mt-4 text-base font-semibold tracking-tight">{d.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{d.description}</p>
              <p className="mt-4 text-[11px] uppercase tracking-wider text-muted-foreground">{d.version}</p>
            </button>
          ))}
        </div>
      )}

      {open && (() => {
        const d = open.doc;
        const wk = d.week_id ? weeks.find((x) => x.id === d.week_id) : null;

        if (open.mode === "choose") {
          return (
            <Modal onClose={() => setOpen(null)} title={d.title}>
              <p className="shrink-0 text-sm text-muted-foreground">
                O que você quer abrir agora?
              </p>
              <div className="mt-6 grid flex-1 gap-4 sm:grid-cols-2">
                <button
                  onClick={() => setOpen({ doc: d, mode: "aula" })}
                  disabled={!wk}
                  className="group flex flex-col rounded-xl border border-border bg-background/60 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-cyan-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-[10px] uppercase tracking-wider text-cyan-200">Aula</span>
                  <span className="mt-2 text-base font-semibold">Ver resumo da aula</span>
                  <span className="mt-2 text-xs text-muted-foreground">
                    {wk ? `Semana ${wk.week_index} · ${wk.title}` : "Este documento não está vinculado a uma aula."}
                  </span>
                </button>
                <button
                  onClick={() => setOpen({ doc: d, mode: "doc" })}
                  className="group flex flex-col rounded-xl border border-border bg-background/60 p-6 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/40"
                >
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Documento</span>
                  <span className="mt-2 text-base font-semibold">Ver documento completo</span>
                  <span className="mt-2 text-xs text-muted-foreground">
                    Modelo na íntegra para leitura.
                  </span>
                </button>
              </div>
            </Modal>
          );
        }

        if (open.mode === "aula" && wk) {
          return (
            <Modal onClose={() => setOpen(null)} title={`Semana ${wk.week_index} · ${wk.title}`}>
              {d.week_id && (
                <button
                  onClick={() => setOpen({ doc: d, mode: "choose" })}
                  className="mb-3 shrink-0 self-start text-xs text-muted-foreground hover:text-foreground"
                >
                  ← Voltar
                </button>
              )}
              <div className="flex-1 overflow-auto rounded-md border border-cyan-500/30 bg-cyan-500/5 p-5">
                <p className="text-[10px] uppercase tracking-wider text-cyan-200">Resumo da aula</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                  {wk.summary || "(aula sem resumo cadastrado)"}
                </p>
              </div>
            </Modal>
          );
        }

        // mode === "doc"
        return (
          <Modal onClose={() => setOpen(null)} title={d.title}>
            {d.week_id && (
              <button
                onClick={() => setOpen({ doc: d, mode: "choose" })}
                className="mb-3 shrink-0 self-start text-xs text-muted-foreground hover:text-foreground"
              >
                ← Voltar
              </button>
            )}
            {d.description && <p className="shrink-0 text-sm text-muted-foreground">{d.description}</p>}
            <div className="mt-4 flex-1 overflow-auto rounded-md border border-border bg-background/60 p-4">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                {d.body || "(documento sem corpo)"}
              </pre>
            </div>
          </Modal>
        );
      })()}

      {adding && (
        <Modal onClose={() => setAdding(false)} title="Novo documento">
          <div className="flex-1 space-y-3 overflow-auto pr-1">
            <Input label="Título" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            <Input label="Descrição" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Módulo</label>
              <select
                value={form.module_id}
                onChange={(e) => setForm({ ...form, module_id: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm"
              >
                <option value="">— sem módulo —</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>Mês {m.month_index} · {m.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Conteúdo</label>
              <textarea
                rows={10} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="mt-1 w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm font-mono"
              />
            </div>
            <button onClick={addDoc} className="w-full rounded-full bg-foreground py-2.5 text-sm font-medium text-background">
              Publicar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm"
      />
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" onClick={onClose}>
      <div
        className="flex w-full max-w-3xl flex-col rounded-2xl border border-border bg-card p-6"
        style={{ maxHeight: "min(85vh, 800px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Fechar</button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
