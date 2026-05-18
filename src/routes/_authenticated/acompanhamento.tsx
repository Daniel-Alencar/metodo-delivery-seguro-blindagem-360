import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MessageSquare, Send, CheckCircle2, Lock, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/acompanhamento")({
  head: () => ({ meta: [{ title: "Acompanhamento — Blindagem 360º" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ ticket: typeof s.ticket === "string" ? s.ticket : undefined }),
  component: AcompanhamentoPage,
});

type Ticket = {
  id: string; user_id: string; mentor_id: string | null; title: string; body: string;
  status: "open" | "answered" | "closed";
  opened_at: string; last_reply_at: string | null; answered_at: string | null;
  closed_at: string | null; closed_by: string | null;
};
type Msg = { id: string; ticket_id: string; author_id: string; author_role: "client" | "mentor" | "admin"; body: string; created_at: string };
type ProfileLite = { id: string; full_name: string | null; company_name: string | null };

// ⚠️ MODO TESTE: liberado para todos. Quando ativar o Stripe, trocar para false
// e o desbloqueio será automático via webhook do Stripe + admin_extend_followup.
const FOLLOWUP_TEST_MODE = true;

function AcompanhamentoPage() {
  const { user, roles, isStaff } = useAuth();
  const isClient = !isStaff;
  const isAdmin = roles.includes("admin");
  const search = useSearch({ from: "/_authenticated/acompanhamento" });
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [selected, setSelected] = useState<string | null>(search.ticket ?? null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function loadTickets() {
    setLoading(true);
    const { data } = await supabase.from("support_tickets").select("*").order("last_reply_at", { ascending: false, nullsFirst: false }).order("opened_at", { ascending: false });
    const ts = (data ?? []) as Ticket[];
    setTickets(ts);
    if (isStaff && ts.length) {
      const ids = Array.from(new Set(ts.map((t) => t.user_id)));
      const { data: p } = await supabase.from("profiles").select("id, full_name, company_name").in("id", ids);
      const map: Record<string, ProfileLite> = {};
      (p ?? []).forEach((x) => { map[(x as ProfileLite).id] = x as ProfileLite; });
      setProfiles(map);
    }
    setLoading(false);
  }
  async function loadMessages(id: string) {
    const { data } = await supabase.from("support_ticket_messages").select("*").eq("ticket_id", id).order("created_at");
    setMsgs((data ?? []) as Msg[]);
  }

  useEffect(() => { if (user) loadTickets(); /* eslint-disable-next-line */ }, [user]);
  useEffect(() => { if (selected) loadMessages(selected); else setMsgs([]); }, [selected]);

  async function openTicket() {
    if (!newTitle.trim() || !newBody.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("open_support_ticket" as never, { _title: newTitle.trim(), _body: newBody.trim() } as never);
    setBusy(false);
    if (error) { alert(error.message); return; }
    setNewTitle(""); setNewBody(""); setShowNew(false);
    await loadTickets();
    if (typeof data === "string") setSelected(data);
  }
  async function sendReply() {
    if (!selected || !reply.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("reply_support_ticket" as never, { _ticket_id: selected, _body: reply.trim() } as never);
    setBusy(false);
    if (error) { alert(error.message); return; }
    setReply("");
    await loadMessages(selected);
    await loadTickets();
  }
  async function closeTicket() {
    if (!selected || !confirm("Encerrar este chamado? O histórico permanecerá registrado.")) return;
    setBusy(true);
    const { error } = await supabase.rpc("close_support_ticket" as never, { _ticket_id: selected } as never);
    setBusy(false);
    if (error) { alert(error.message); return; }
    await loadMessages(selected);
    await loadTickets();
  }

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...</div>;

  if (isClient && !FOLLOWUP_TEST_MODE) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-10 text-center">
        <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Acompanhamento</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Disponível após a conclusão das 4 semanas e ativação do pagamento mensal.
        </p>
      </div>
    );
  }

  const current = tickets.find((t) => t.id === selected) ?? null;
  const open = tickets.filter((t) => t.status !== "closed");
  const closed = tickets.filter((t) => t.status === "closed");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pós-implementação</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Acompanhamento</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {isStaff
              ? "Chamados de acompanhamento dos mentorados. Tudo registrado, nada é apagado."
              : "Abra um chamado para sua dúvida ou caso operacional. O mentor responsável recebe e responde aqui mesmo."}
          </p>
        </div>
        {isClient && (
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            <Plus className="h-3.5 w-3.5" /> Novo chamado
          </button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        {/* LIST */}
        <aside className="space-y-4">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              Em aberto {open.length > 0 && <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{open.length}</span>}
            </p>
            <div className="space-y-2">
              {open.length === 0 && <p className="text-xs text-muted-foreground">Nenhum chamado aberto.</p>}
              {open.map((t) => <TicketRow key={t.id} t={t} active={selected === t.id} onClick={() => setSelected(t.id)} profile={profiles[t.user_id]} showWho={isStaff} />)}
            </div>
          </div>
          {closed.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Encerrados</p>
              <div className="space-y-2">
                {closed.map((t) => <TicketRow key={t.id} t={t} active={selected === t.id} onClick={() => setSelected(t.id)} profile={profiles[t.user_id]} showWho={isStaff} />)}
              </div>
            </div>
          )}
        </aside>

        {/* DETAIL */}
        <section className="rounded-2xl border border-border bg-card/40 p-5">
          {!current ? (
            <div className="flex h-full flex-col items-center justify-center py-20 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8 text-muted-foreground/70" />
              <p className="mt-3">Selecione um chamado para ver a conversa.</p>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
                <div>
                  <h2 className="text-lg font-semibold">{current.title}</h2>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Aberto em {new Date(current.opened_at).toLocaleString("pt-BR")}
                    {current.closed_at && ` · Encerrado em ${new Date(current.closed_at).toLocaleString("pt-BR")}`}
                  </p>
                  {isStaff && profiles[current.user_id] && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Cliente: <span className="text-foreground">{profiles[current.user_id]?.full_name || "—"}</span>
                      {profiles[current.user_id]?.company_name && ` · ${profiles[current.user_id]?.company_name}`}
                    </p>
                  )}
                </div>
                <StatusBadge status={current.status} />
              </div>

              <div
                className={`mt-4 flex-1 space-y-3 overflow-auto pr-1 ${isClient ? "select-none" : ""}`}
                onCopy={isClient ? (e) => e.preventDefault() : undefined}
                onContextMenu={isClient ? (e) => e.preventDefault() : undefined}
              >
                {msgs.map((m) => (
                  <div key={m.id} className={`rounded-lg border p-3 text-sm ${
                    m.author_role === "client"
                      ? "border-border bg-background/40"
                      : m.author_role === "admin"
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-cyan-500/30 bg-cyan-500/5"
                  }`}>
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {m.author_role === "client" ? "Cliente" : m.author_role === "admin" ? "Super admin" : "Mentor"} · {new Date(m.created_at).toLocaleString("pt-BR")}
                    </p>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
              </div>

              {current.status !== "closed" && (
                <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={isStaff ? "Resposta ao mentorado..." : "Escreva sua resposta..."}
                    rows={3}
                    className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-foreground/40"
                  />
                  <div className="flex items-center justify-between gap-2">
                    {(isStaff || isAdmin) && (
                      <button
                        onClick={closeTicket}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-card"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Encerrar atendimento
                      </button>
                    )}
                    <button
                      onClick={sendReply}
                      disabled={busy || !reply.trim()}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-1.5 text-xs font-medium text-background disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" /> Enviar resposta
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" onClick={() => setShowNew(false)}>
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowNew(false)} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            <h3 className="text-lg font-semibold">Novo chamado</h3>
            <p className="mt-1 text-xs text-muted-foreground">O mentor responsável é notificado e responde aqui mesmo.</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Assunto</label>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Descreva o caso</label>
                <textarea rows={5} value={newBody} onChange={(e) => setNewBody(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm" />
              </div>
              <button onClick={openTicket} disabled={busy || !newTitle.trim() || !newBody.trim()} className="w-full rounded-full bg-foreground py-2.5 text-sm font-medium text-background disabled:opacity-50">
                Abrir chamado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketRow({ t, active, onClick, profile, showWho }: { t: Ticket; active: boolean; onClick: () => void; profile?: ProfileLite; showWho: boolean }) {
  return (
    <button onClick={onClick} className={`block w-full rounded-lg border p-3 text-left transition-colors ${active ? "border-foreground/40 bg-card" : "border-border bg-card/30 hover:bg-card/60"}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium line-clamp-1">{t.title}</p>
        <StatusBadge status={t.status} small />
      </div>
      {showWho && (
        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-1">{profile?.full_name || profile?.company_name || "—"}</p>
      )}
      <p className="mt-1 text-[10px] text-muted-foreground">{new Date(t.last_reply_at || t.opened_at).toLocaleDateString("pt-BR")}</p>
    </button>
  );
}

function StatusBadge({ status, small }: { status: Ticket["status"]; small?: boolean }) {
  const map = {
    open: { c: "border-red-500/40 bg-red-500/10 text-red-300", l: "Aberto" },
    answered: { c: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200", l: "Respondido" },
    closed: { c: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300", l: "Encerrado" },
  }[status];
  return <span className={`inline-flex shrink-0 rounded-full border px-2 ${small ? "py-0 text-[9px]" : "py-0.5 text-[10px]"} uppercase tracking-wider ${map.c}`}>{map.l}</span>;
}
