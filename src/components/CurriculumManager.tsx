import { useEffect, useState } from "react";
import { GraduationCap, Plus, Save, Trash2, FileText, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Module = { id: string; month_index: number; title: string; description: string | null };
type Week = {
  id: string; module_id: string; week_index: number; title: string;
  summary: string | null; agenda: string | null; homework: string | null; is_checkpoint: boolean;
};
type Doc = {
  id: string; title: string; description: string | null; body: string | null;
  version: string; week_id: string | null; module_id: string | null;
};

export function CurriculumManager() {
  const [loading, setLoading] = useState(true);
  const [vertical, setVertical] = useState<"food-service" | "pet-shop">("food-service");
  const [modules, setModules] = useState<Module[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [openWeek, setOpenWeek] = useState<string | null>(null);
  const [editDoc, setEditDoc] = useState<Doc | null>(null);
  const [newDocFor, setNewDocFor] = useState<string | null>(null);
  const [newDoc, setNewDoc] = useState({ title: "", description: "", body: "" });
  const [savingWeek, setSavingWeek] = useState<string | null>(null);
  const [savingDoc, setSavingDoc] = useState(false);

  async function load() {
    setLoading(true);
    const { data: m } = await supabase.from("modules").select("*").eq("vertical", vertical).order("month_index");
    const modList = (m ?? []) as Module[];
    const modIds = modList.map((x) => x.id);
    const [{ data: w }, { data: d }] = await Promise.all([
      modIds.length
        ? supabase.from("weeks").select("*").in("module_id", modIds).order("week_index")
        : Promise.resolve({ data: [] }),
      modIds.length
        ? supabase.from("documents").select("*").in("module_id", modIds).order("title")
        : Promise.resolve({ data: [] }),
    ]);
    setModules(modList);
    setWeeks((w ?? []) as Week[]);
    setDocs((d ?? []) as Doc[]);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [vertical]);

  async function saveWeek(w: Week) {
    setSavingWeek(w.id);
    await supabase.from("weeks").update({
      title: w.title, summary: w.summary, agenda: w.agenda, homework: w.homework,
    }).eq("id", w.id);
    setSavingWeek(null);
  }

  async function createDoc(weekId: string, moduleId: string) {
    if (!newDoc.title.trim()) return;
    setSavingDoc(true);
    await supabase.from("documents").insert({
      title: newDoc.title, description: newDoc.description, body: newDoc.body,
      week_id: weekId, module_id: moduleId, version: "v1",
    });
    setNewDoc({ title: "", description: "", body: "" });
    setNewDocFor(null);
    await load();
    setSavingDoc(false);
  }

  async function saveDoc(d: Doc) {
    setSavingDoc(true);
    await supabase.from("documents").update({
      title: d.title, description: d.description, body: d.body, version: d.version,
    }).eq("id", d.id);
    await load();
    setEditDoc(null);
    setSavingDoc(false);
  }

  async function deleteDoc(id: string) {
    if (!confirm("Excluir este modelo? Esta ação não pode ser desfeita.")) return;
    await supabase.from("documents").delete().eq("id", id);
    await load();
  }

  if (loading) return <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando trilha...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card/40 p-3">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Vertical</span>
        <select
          value={vertical}
          onChange={(e) => setVertical(e.target.value as "food-service" | "pet-shop")}
          className="rounded-md border border-border bg-background/60 px-3 py-1.5 text-sm"
        >
          <option value="food-service">Food Service</option>
          <option value="pet-shop">Pet Shop</option>
        </select>
      </div>
      {modules.map((m) => {
        const monthWeeks = weeks.filter((w) => w.module_id === m.id).sort((a, b) => a.week_index - b.week_index);
        return (
          <div key={m.id} className="rounded-xl border border-border bg-card/40 p-5">
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs uppercase tracking-wider">
                Módulo {m.month_index}
              </span>
              <h3 className="text-lg font-semibold">{m.title}</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>

            <div className="mt-5 space-y-3">
              {monthWeeks.map((w) => {
                const isOpen = openWeek === w.id;
                const weekDocs = docs.filter((d) => d.week_id === w.id);
                return (
                  <div key={w.id} className="rounded-lg border border-border bg-background/40">
                    <button
                      onClick={() => setOpenWeek(isOpen ? null : w.id)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-xs uppercase tracking-wider text-muted-foreground">Encontro {w.week_index}</span>
                        <span className="text-sm font-medium">{w.title}</span>
                        {w.is_checkpoint && (
                          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">
                            Checkpoint
                          </span>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <FileText className="h-3 w-3" /> {weekDocs.length} modelo{weekDocs.length === 1 ? "" : "s"}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="space-y-5 border-t border-border px-4 py-4">
                        {/* Lesson plan editor */}
                        <div className="space-y-3">
                          <Field label="Título do encontro" value={w.title}
                            onChange={(v) => setWeeks(weeks.map(x => x.id===w.id ? {...x, title: v} : x))} />
                          <Field label="Resumo da aula" textarea rows={2} value={w.summary ?? ""}
                            onChange={(v) => setWeeks(weeks.map(x => x.id===w.id ? {...x, summary: v} : x))} />
                          <Field label="Agenda do mentor (tópicos guiados)" textarea rows={4} value={w.agenda ?? ""}
                            onChange={(v) => setWeeks(weeks.map(x => x.id===w.id ? {...x, agenda: v} : x))} />
                          <Field label="Tarefa da semana (o que o mentorado implementa)" textarea rows={3} value={w.homework ?? ""}
                            onChange={(v) => setWeeks(weeks.map(x => x.id===w.id ? {...x, homework: v} : x))} />
                          <button
                            onClick={() => saveWeek(w)} disabled={savingWeek === w.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background disabled:opacity-50"
                          >
                            <Save className="h-3.5 w-3.5" /> {savingWeek === w.id ? "Salvando..." : "Salvar plano de aula"}
                          </button>
                        </div>

                        {/* Documents */}
                        <div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">Modelos deste encontro</p>
                            <button
                              onClick={() => { setNewDocFor(w.id); setNewDoc({ title: "", description: "", body: "" }); }}
                              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-[11px] hover:bg-card"
                            >
                              <Plus className="h-3 w-3" /> Adicionar modelo
                            </button>
                          </div>

                          {weekDocs.length === 0 && newDocFor !== w.id && (
                            <p className="mt-3 text-xs text-muted-foreground">Nenhum modelo cadastrado.</p>
                          )}

                          <div className="mt-3 space-y-2">
                            {weekDocs.map((d) => (
                              <div key={d.id} className="rounded-md border border-border bg-card/40 p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{d.title}</p>
                                    {d.description && <p className="mt-0.5 text-xs text-muted-foreground">{d.description}</p>}
                                    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                      {d.version} · {d.body ? `${d.body.length} caracteres` : "sem corpo"}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 gap-1">
                                    <button onClick={() => setEditDoc(d)} className="rounded-full border border-border px-2.5 py-1 text-[11px] hover:bg-card">Editar</button>
                                    <button onClick={() => deleteDoc(d.id)} className="rounded-full border border-destructive/40 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10">
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {newDocFor === w.id && (
                              <div className="space-y-2 rounded-md border border-foreground/30 bg-card/60 p-3">
                                <Field label="Título do modelo" value={newDoc.title} onChange={(v) => setNewDoc({ ...newDoc, title: v })} />
                                <Field label="Descrição" value={newDoc.description} onChange={(v) => setNewDoc({ ...newDoc, description: v })} />
                                <Field label="Corpo (texto / markdown)" textarea rows={6} value={newDoc.body} onChange={(v) => setNewDoc({ ...newDoc, body: v })} />
                                <div className="flex gap-2">
                                  <button onClick={() => createDoc(w.id, w.module_id)} disabled={savingDoc}
                                    className="rounded-full bg-foreground px-3 py-1.5 text-xs text-background disabled:opacity-50">
                                    Publicar modelo
                                  </button>
                                  <button onClick={() => setNewDocFor(null)} className="rounded-full border border-border px-3 py-1.5 text-xs">Cancelar</button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {editDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" onClick={() => setEditDoc(null)}>
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold"><GraduationCap className="h-4 w-4" /> Editar modelo</h2>
              <button onClick={() => setEditDoc(null)} className="text-sm text-muted-foreground hover:text-foreground">Fechar</button>
            </div>
            <div className="space-y-3">
              <Field label="Título" value={editDoc.title} onChange={(v) => setEditDoc({ ...editDoc, title: v })} />
              <Field label="Descrição" value={editDoc.description ?? ""} onChange={(v) => setEditDoc({ ...editDoc, description: v })} />
              <Field label="Versão" value={editDoc.version} onChange={(v) => setEditDoc({ ...editDoc, version: v })} />
              <Field label="Corpo (texto / markdown)" textarea rows={16} value={editDoc.body ?? ""} onChange={(v) => setEditDoc({ ...editDoc, body: v })} />
              <button onClick={() => saveDoc(editDoc)} disabled={savingDoc}
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50">
                <Save className="h-4 w-4" /> Salvar alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, textarea, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; textarea?: boolean; rows?: number;
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</label>
      {textarea ? (
        <textarea
          rows={rows} value={value} onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-foreground/40"
        />
      ) : (
        <input
          value={value} onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-foreground/40"
        />
      )}
    </div>
  );
}
