import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/documentos")({
  head: () => ({ meta: [{ title: "Documentos Vivos — Blindagem 360º" }] }),
  component: DocumentosPage,
});

type Doc = { id: string; title: string; description: string | null; body: string | null; version: string; module_id: string | null; week_id: string | null };
type Module = { id: string; month_index: number; title: string };
type Week = { id: string; week_index: number; title: string; summary: string | null };

function DocumentosPage() {
  const { isStaff } = useAuth();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [open, setOpen] = useState<Doc | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", body: "", module_id: "" });

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
              key={d.id} onClick={() => setOpen(d)}
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

      {open && (
        <Modal onClose={() => setOpen(null)} title={open.title}>
          <p className="text-sm text-muted-foreground">{open.description}</p>
          <pre className="mt-4 max-h-[60vh] whitespace-pre-wrap rounded-md border border-border bg-background/60 p-4 text-sm">
            {open.body || "(documento sem corpo)"}
          </pre>
        </Modal>
      )}

      {adding && (
        <Modal onClose={() => setAdding(false)} title="Novo documento">
          <div className="space-y-3">
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
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Fechar</button>
        </div>
        {children}
      </div>
    </div>
  );
}
