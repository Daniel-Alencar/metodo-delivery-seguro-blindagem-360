import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ShieldCheck, CheckCircle2, Circle, MinusCircle, Trophy, Loader2, ChevronDown, ChevronRight } from "lucide-react";

type Item = {
  item_id: string;
  week_id: string | null;
  week_index: number | null;
  week_title: string | null;
  title: string;
  description: string | null;
  weight: number;
  order_index: number;
  required: boolean;
  status: "pending" | "done" | "na";
  evidence: string | null;
  completed_at: string | null;
};

type Score = {
  total_weight: number;
  done_weight: number;
  na_weight: number;
  pending_weight: number;
  score_percent: number;
  level: string;
};

const LEVEL_COLOR: Record<string, string> = {
  "Iniciante": "from-zinc-500/30 to-zinc-700/30 text-zinc-200 border-zinc-500/30",
  "Em Construção": "from-amber-500/20 to-amber-700/20 text-amber-200 border-amber-500/30",
  "Protegido": "from-cyan-500/20 to-cyan-700/20 text-cyan-200 border-cyan-500/30",
  "Blindado": "from-emerald-500/20 to-emerald-700/20 text-emerald-200 border-emerald-500/30",
  "Blindado Ouro": "from-yellow-400/30 to-amber-600/30 text-amber-100 border-yellow-400/40",
};

export function ComplianceCard({ enrollmentId }: { enrollmentId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [score, setScore] = useState<Score | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [evidenceDraft, setEvidenceDraft] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const [{ data: rows }, { data: sc }] = await Promise.all([
      supabase.rpc("get_compliance_for_enrollment", { _enrollment_id: enrollmentId }),
      supabase.rpc("compliance_score_for_enrollment", { _enrollment_id: enrollmentId }),
    ]);
    setItems((rows ?? []) as Item[]);
    setScore(((sc ?? [])[0] ?? null) as Score | null);
    setLoading(false);
  }

  useEffect(() => { if (user && enrollmentId) load(); /* eslint-disable-next-line */ }, [user, enrollmentId]);

  async function setStatus(item: Item, status: "pending" | "done" | "na") {
    setBusyId(item.item_id);
    const evidence = evidenceDraft[item.item_id] ?? item.evidence ?? null;
    const { error } = await supabase.rpc("set_compliance_status", {
      _enrollment_id: enrollmentId, _item_id: item.item_id, _status: status, _evidence: evidence,
    });
    setBusyId(null);
    if (error) { alert(error.message); return; }
    await load();
  }

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const it of items) {
      const k = it.week_index !== null ? `Semana ${it.week_index} · ${it.week_title}` : "Geral";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return Array.from(map.entries());
  }, [items]);

  const pct = score?.score_percent ?? 0;
  const level = score?.level ?? "Iniciante";
  const levelClass = LEVEL_COLOR[level] ?? LEVEL_COLOR["Iniciante"];

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/30 p-6 text-sm text-muted-foreground">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Carregando checklist de compliance…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/30 p-6">
      <button onClick={() => setOpen(!open)} className="flex w-full items-start justify-between gap-4 text-left">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-foreground/10 p-2 text-foreground"><ShieldCheck className="h-5 w-5" /></span>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              Compliance &amp; Blindagem
              {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Marque cada item conforme você adequa seu negócio. Sua pontuação atualiza em tempo real.
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-3 rounded-2xl border bg-gradient-to-br ${levelClass} px-4 py-2`}>
          <Trophy className="h-5 w-5" />
          <div className="text-right">
            <div className="text-2xl font-semibold leading-none">{pct}%</div>
            <div className="text-[10px] uppercase tracking-wider opacity-80">{level}</div>
          </div>
        </div>
      </button>

      {/* progress bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {score && (
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>✔ Concluído: <span className="text-emerald-300">{score.done_weight}</span></span>
          <span>○ Pendente: <span className="text-amber-300">{score.pending_weight}</span></span>
          <span>— N/A: <span className="text-zinc-300">{score.na_weight}</span></span>
          <span>Total ponderado: {score.total_weight}</span>
        </div>
      )}

      {open && (
        <div className="mt-6 space-y-6">
          {groups.length === 0 && (
            <p className="rounded-xl border border-dashed border-border bg-card/30 p-4 text-sm text-muted-foreground">
              Nenhum item de compliance cadastrado para sua área ainda.
            </p>
          )}
          {groups.map(([groupTitle, list]) => (
            <div key={groupTitle}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{groupTitle}</h3>
              <ul className="mt-2 space-y-2">
                {list.map((it) => {
                  const isBusy = busyId === it.item_id;
                  const evDraft = evidenceDraft[it.item_id] ?? it.evidence ?? "";
                  return (
                    <li key={it.item_id} className="rounded-xl border border-border bg-card/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {it.status === "done" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                            {it.status === "pending" && <Circle className="h-4 w-4 text-amber-400" />}
                            {it.status === "na" && <MinusCircle className="h-4 w-4 text-zinc-400" />}
                            <span className="text-sm font-medium">{it.title}</span>
                            <span className="rounded-full border border-border bg-card/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                              peso {it.weight}
                            </span>
                            {!it.required && (
                              <span className="rounded-full border border-border bg-card/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">opcional</span>
                            )}
                          </div>
                          {it.description && <p className="mt-1 text-xs text-muted-foreground">{it.description}</p>}
                          <input
                            type="text"
                            placeholder="Evidência (link, número de documento, observação…)"
                            value={evDraft}
                            onChange={(e) => setEvidenceDraft((s) => ({ ...s, [it.item_id]: e.target.value }))}
                            className="mt-2 w-full rounded-md border border-border bg-card/60 px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-foreground/40"
                          />
                          {it.completed_at && (
                            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                              Concluído em {new Date(it.completed_at).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <button disabled={isBusy} onClick={() => setStatus(it, "done")}
                            className={`rounded-md border px-2 py-1 text-[11px] uppercase tracking-wider transition ${it.status === "done" ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"}`}>
                            ✔ Concluído
                          </button>
                          <button disabled={isBusy} onClick={() => setStatus(it, "pending")}
                            className={`rounded-md border px-2 py-1 text-[11px] uppercase tracking-wider transition ${it.status === "pending" ? "border-amber-500/40 bg-amber-500/15 text-amber-200" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"}`}>
                            ○ Pendente
                          </button>
                          <button disabled={isBusy} onClick={() => setStatus(it, "na")}
                            className={`rounded-md border px-2 py-1 text-[11px] uppercase tracking-wider transition ${it.status === "na" ? "border-zinc-500/40 bg-zinc-500/15 text-zinc-200" : "border-border bg-card/60 text-muted-foreground hover:text-foreground"}`}>
                            — N/A
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
