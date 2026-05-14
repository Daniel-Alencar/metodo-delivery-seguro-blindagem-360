import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/incidentes")({
  head: () => ({ meta: [{ title: "Central de Incidentes — Blindagem 360º" }] }),
  component: IncidentesPage,
});

type Incident = {
  id: string; user_id: string; category: string; title: string; description: string;
  status: string; resolution: string | null; created_at: string;
};

const CATS = [
  { v: "procon", l: "Procon" },
  { v: "chargeback", l: "Chargeback" },
  { v: "sanitaria", l: "Sanitária" },
  { v: "trabalhista", l: "Trabalhista" },
  { v: "midia_social", l: "Mídia social / crise" },
  { v: "outros", l: "Outros" },
];

function IncidentesPage() {
  const { isStaff } = useAuth();
  const [items, setItems] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ category: "procon", title: "", description: "" });

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("incidents").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Incident[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function open() {
    if (!form.title || !form.description) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("incidents").insert({
      user_id: user.id,
      category: form.category as "procon" | "chargeback" | "sanitaria" | "trabalhista" | "midia_social" | "outros",
      title: form.title,
      description: form.description,
    });
    setForm({ category: "procon", title: "", description: "" });
    setAdding(false);
    await load();
  }

  async function setStatus(id: string, status: string) {
    await supabase.from("incidents").update({ status: status as "open" | "in_progress" | "resolved" | "closed" }).eq("id", id);
    await load();
  }

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Proteção operacional</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Central de Incidentes</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Abra um chamado quando enfrentar Procon, chargeback, sanitária, trabalhista ou crise pública.
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          <Plus className="h-4 w-4" /> Abrir chamado
        </button>
      </div>

      {loading ? (
        <div className="mt-10 flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...</div>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-border bg-card/40 p-10 text-center text-sm text-muted-foreground">
          Nenhum incidente registrado. Esperamos que continue assim.
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {items.map((i) => (
            <div key={i.id} className="rounded-xl border border-border bg-card/60 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-300" />
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {CATS.find((c) => c.v === i.category)?.l ?? i.category}
                  </span>
                </div>
                <StatusPill status={i.status} />
              </div>
              <h3 className="mt-3 text-base font-semibold">{i.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{i.description}</p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Aberto em {new Date(i.created_at).toLocaleString("pt-BR")}
              </p>
              {isStaff && i.status !== "closed" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {i.status === "open" && (
                    <button onClick={() => setStatus(i.id, "in_progress")} className="rounded-full border border-border px-3 py-1 text-xs">Atender</button>
                  )}
                  {i.status === "in_progress" && (
                    <button onClick={() => setStatus(i.id, "resolved")} className="rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 px-3 py-1 text-xs">Resolver</button>
                  )}
                  {i.status === "resolved" && (
                    <button onClick={() => setStatus(i.id, "closed")} className="rounded-full border border-border px-3 py-1 text-xs">Encerrar</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" onClick={() => setAdding(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Abrir chamado</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Categoria</label>
                <select
                  value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm"
                >
                  {CATS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Título</label>
                <input
                  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</label>
                <textarea
                  rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm"
                />
              </div>
              <button onClick={open} className="w-full rounded-full bg-foreground py-2.5 text-sm font-medium text-background">
                Abrir chamado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    in_progress: "bg-cyan-500/10 text-cyan-200 border-cyan-500/30",
    resolved: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    closed: "bg-muted/30 text-muted-foreground border-border",
  };
  const labels: Record<string, string> = { open: "Aberto", in_progress: "Em atendimento", resolved: "Resolvido", closed: "Encerrado" };
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${map[status]}`}>{labels[status] ?? status}</span>;
}
