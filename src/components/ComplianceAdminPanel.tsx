import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveVertical, VERTICAL_META } from "@/hooks/use-active-vertical";
import { Loader2, Plus, Save, Trash2, ShieldCheck, Trophy } from "lucide-react";

type Overview = {
  enrollment_id: string; user_id: string; full_name: string; email: string;
  vertical: string; status: string;
  total_weight: number; done_weight: number; na_weight: number; pending_weight: number;
  score_percent: number; level: string;
};

type Item = {
  id: string; vertical: string; week_id: string | null;
  week_index: number | null; week_title: string | null;
  title: string; description: string | null;
  weight: number; order_index: number; required: boolean; active: boolean;
};

type WeekOpt = { id: string; week_index: number; title: string };

const LEVEL_COLOR: Record<string, string> = {
  "Iniciante": "bg-zinc-500/15 text-zinc-200 border-zinc-500/30",
  "Em Construção": "bg-amber-500/15 text-amber-200 border-amber-500/30",
  "Protegido": "bg-cyan-500/15 text-cyan-200 border-cyan-500/30",
  "Blindado": "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
  "Blindado Ouro": "bg-yellow-400/20 text-amber-100 border-yellow-400/40",
};

export function ComplianceAdminPanel({ isAdmin }: { isAdmin: boolean }) {
  const { vertical } = useActiveVertical();
  const [tab, setTab] = useState<"overview" | "items">("overview");
  const [overview, setOverview] = useState<Overview[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [weeks, setWeeks] = useState<WeekOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Form for create
  const [form, setForm] = useState<Partial<Item>>({
    vertical: vertical ?? "food-service", title: "", description: "",
    weight: 1, order_index: 0, required: true, active: true, week_id: null,
  });

  async function load() {
    setLoading(true);
    const [{ data: ov }, { data: its }, { data: ws }] = await Promise.all([
      supabase.rpc("admin_compliance_overview", { _vertical: vertical ?? undefined }),
      supabase.rpc("admin_list_compliance_items", { _vertical: vertical ?? undefined }),
      supabase.from("weeks").select("id, week_index, title").order("week_index"),
    ]);
    setOverview((ov ?? []) as Overview[]);
    setItems((its ?? []) as Item[]);
    setWeeks((ws ?? []) as WeekOpt[]);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [vertical]);

  async function upsert(it: Partial<Item>) {
    setBusy(true); setMsg(null);
    const { error } = await supabase.rpc("admin_upsert_compliance_item", {
      _id: it.id ?? undefined,
      _vertical: it.vertical ?? vertical ?? "food-service",
      _week_id: it.week_id ?? undefined,
      _title: it.title ?? "",
      _description: it.description ?? undefined,
      _weight: it.weight ?? 1,
      _order_index: it.order_index ?? 0,
      _required: it.required ?? true,
      _active: it.active ?? true,
    });

    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setMsg("Salvo.");
    setForm({ vertical: vertical ?? "food-service", title: "", description: "", weight: 1, order_index: 0, required: true, active: true, week_id: null });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Remover este item de compliance?")) return;
    const { error } = await supabase.rpc("admin_delete_compliance_item", { _id: id });
    if (error) { alert(error.message); return; }
    await load();
  }

  const verticalLabel = vertical ? VERTICAL_META[vertical].short : "Todas as áreas";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex gap-1 rounded-xl border border-border bg-card/40 p-1">
          <button
            onClick={() => setTab("overview")}
            className={`rounded-lg px-3 py-1.5 text-xs uppercase tracking-wider ${tab === "overview" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          ><Trophy className="mr-1 inline h-3.5 w-3.5" /> Pontuação dos alunos</button>
          <button
            onClick={() => setTab("items")}
            className={`rounded-lg px-3 py-1.5 text-xs uppercase tracking-wider ${tab === "items" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          ><ShieldCheck className="mr-1 inline h-3.5 w-3.5" /> Itens do checklist</button>
        </div>
        <span className="text-xs text-muted-foreground">Área ativa: <span className="text-foreground">{verticalLabel}</span></span>
      </div>

      {loading && (
        <div className="rounded-xl border border-border bg-card/30 p-6 text-sm text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Carregando…
        </div>
      )}

      {!loading && tab === "overview" && (
        <div className="overflow-hidden rounded-xl border border-border bg-card/30">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Aluno</th>
                <th className="px-3 py-2 text-left">E-mail</th>
                <th className="px-3 py-2 text-left">Área</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Score</th>
                <th className="px-3 py-2 text-left">Nível</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {overview.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Nenhuma matrícula ainda.</td></tr>
              )}
              {overview.map((r) => {
                const meta = VERTICAL_META[r.vertical as "food-service" | "pet-shop"];
                return (
                  <tr key={r.enrollment_id} className={meta?.rowClass ?? ""}>
                    <td className="px-3 py-2">{r.full_name || "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                    <td className="px-3 py-2">
                      {meta ? (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${meta.badgeClass}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} /> {meta.short}
                        </span>
                      ) : r.vertical}
                    </td>
                    <td className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">{r.status}</td>
                    <td className="px-3 py-2 text-right font-semibold">{r.score_percent}%</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${LEVEL_COLOR[r.level] ?? LEVEL_COLOR["Iniciante"]}`}>
                        <Trophy className="h-3 w-3" /> {r.level}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === "items" && (
        <div className="space-y-6">
          {isAdmin && (
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <h3 className="text-sm font-semibold">Novo item</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs">Área
                  <select value={form.vertical ?? "food-service"} onChange={(e) => setForm((f) => ({ ...f, vertical: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-sm">
                    <option value="food-service">Método Delivery Seguro</option>
                    <option value="pet-shop">Método Pet Shop Seguro — MPS</option>
                  </select>
                </label>
                <label className="text-xs">Semana (opcional)
                  <select value={form.week_id ?? ""} onChange={(e) => setForm((f) => ({ ...f, week_id: e.target.value || null }))}
                    className="mt-1 w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-sm">
                    <option value="">Geral (sem semana)</option>
                    {weeks.map((w) => <option key={w.id} value={w.id}>Sem {w.week_index} · {w.title}</option>)}
                  </select>
                </label>
                <label className="text-xs md:col-span-2">Título
                  <input value={form.title ?? ""} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-sm" />
                </label>
                <label className="text-xs md:col-span-2">Descrição
                  <textarea value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2} className="mt-1 w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-sm" />
                </label>
                <label className="text-xs">Peso (1–10)
                  <input type="number" min={1} max={10} value={form.weight ?? 1}
                    onChange={(e) => setForm((f) => ({ ...f, weight: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-sm" />
                </label>
                <label className="text-xs">Ordem
                  <input type="number" value={form.order_index ?? 0}
                    onChange={(e) => setForm((f) => ({ ...f, order_index: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-md border border-border bg-card/60 px-2 py-1.5 text-sm" />
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={form.required ?? true} onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))} />
                  Obrigatório
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={form.active ?? true} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
                  Ativo
                </label>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <button disabled={busy || !form.title} onClick={() => upsert(form)}
                  className="inline-flex items-center gap-2 rounded-md bg-foreground px-3 py-1.5 text-xs uppercase tracking-wider text-background disabled:opacity-50">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Criar item
                </button>
                {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-border bg-card/30">
            <table className="w-full text-sm">
              <thead className="bg-card/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Área</th>
                  <th className="px-3 py-2 text-left">Semana</th>
                  <th className="px-3 py-2 text-left">Título</th>
                  <th className="px-3 py-2 text-center">Peso</th>
                  <th className="px-3 py-2 text-center">Obr.</th>
                  <th className="px-3 py-2 text-center">Ativo</th>
                  {isAdmin && <th className="px-3 py-2"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.length === 0 && (
                  <tr><td colSpan={isAdmin ? 7 : 6} className="px-3 py-6 text-center text-muted-foreground">Nenhum item cadastrado.</td></tr>
                )}
                {items.map((it) => {
                  const meta = VERTICAL_META[it.vertical as "food-service" | "pet-shop"];
                  return (
                    <EditableRow key={it.id} it={it} meta={meta} weeks={weeks} isAdmin={isAdmin}
                      onSave={(patch) => upsert({ ...it, ...patch })}
                      onDelete={() => remove(it.id)} />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EditableRow({
  it, meta, weeks, isAdmin, onSave, onDelete,
}: {
  it: Item; meta: ReturnType<typeof VERTICAL_META.__proto__.constructor> extends never ? never : (typeof VERTICAL_META)["food-service"] | undefined;
  weeks: WeekOpt[]; isAdmin: boolean;
  onSave: (patch: Partial<Item>) => void; onDelete: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<Item>(it);
  useEffect(() => { setDraft(it); }, [it]);

  if (!edit) {
    return (
      <tr className={meta?.rowClass}>
        <td className="px-3 py-2">
          {meta ? (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${meta.badgeClass}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} /> {meta.short}
            </span>
          ) : it.vertical}
        </td>
        <td className="px-3 py-2 text-xs text-muted-foreground">{it.week_index !== null ? `Sem ${it.week_index}` : "Geral"}</td>
        <td className="px-3 py-2">
          <div className="font-medium">{it.title}</div>
          {it.description && <div className="text-xs text-muted-foreground">{it.description}</div>}
        </td>
        <td className="px-3 py-2 text-center">{it.weight}</td>
        <td className="px-3 py-2 text-center">{it.required ? "sim" : "não"}</td>
        <td className="px-3 py-2 text-center">{it.active ? "sim" : "não"}</td>
        {isAdmin && (
          <td className="px-3 py-2 text-right">
            <button onClick={() => setEdit(true)} className="rounded-md border border-border bg-card/60 px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground">Editar</button>
            <button onClick={onDelete} className="ml-1 rounded-md border border-border bg-card/60 px-2 py-1 text-[11px] uppercase tracking-wider text-rose-300 hover:text-rose-200">
              <Trash2 className="h-3 w-3" />
            </button>
          </td>
        )}
      </tr>
    );
  }

  return (
    <tr className={meta?.rowClass}>
      <td className="px-3 py-2">
        <select value={draft.vertical} onChange={(e) => setDraft({ ...draft, vertical: e.target.value })}
          className="w-full rounded-md border border-border bg-card/60 px-2 py-1 text-xs">
          <option value="food-service">Delivery Seguro</option>
          <option value="pet-shop">Pet Shop · MPS</option>
        </select>
      </td>
      <td className="px-3 py-2">
        <select value={draft.week_id ?? ""} onChange={(e) => setDraft({ ...draft, week_id: e.target.value || null })}
          className="w-full rounded-md border border-border bg-card/60 px-2 py-1 text-xs">
          <option value="">Geral</option>
          {weeks.map((w) => <option key={w.id} value={w.id}>Sem {w.week_index}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          className="w-full rounded-md border border-border bg-card/60 px-2 py-1 text-sm" />
        <textarea value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          rows={2} className="mt-1 w-full rounded-md border border-border bg-card/60 px-2 py-1 text-xs" />
      </td>
      <td className="px-3 py-2">
        <input type="number" min={1} max={10} value={draft.weight}
          onChange={(e) => setDraft({ ...draft, weight: Number(e.target.value) })}
          className="w-16 rounded-md border border-border bg-card/60 px-2 py-1 text-center text-xs" />
      </td>
      <td className="px-3 py-2 text-center">
        <input type="checkbox" checked={draft.required} onChange={(e) => setDraft({ ...draft, required: e.target.checked })} />
      </td>
      <td className="px-3 py-2 text-center">
        <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
      </td>
      <td className="px-3 py-2 text-right">
        <button onClick={() => { onSave(draft); setEdit(false); }}
          className="inline-flex items-center gap-1 rounded-md bg-foreground px-2 py-1 text-[11px] uppercase tracking-wider text-background">
          <Save className="h-3 w-3" /> Salvar
        </button>
        <button onClick={() => setEdit(false)} className="ml-1 rounded-md border border-border bg-card/60 px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">Cancelar</button>
      </td>
    </tr>
  );
}
