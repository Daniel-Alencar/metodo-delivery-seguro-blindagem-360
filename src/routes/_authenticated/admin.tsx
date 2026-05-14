import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Crown, UserPlus, UserMinus, Search, ShieldCheck, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CurriculumManager } from "@/components/CurriculumManager";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Painel Mentor — Blindagem 360º" }] }),
  component: AdminPage,
});

type EnrollmentRow = { id: string; user_id: string; status: string; vertical: string; created_at: string };
type ProgressRow = {
  id: string; status: string; submitted_at: string | null; week_id: string;
  enrollment_id: string;
};

type Mentor = { user_id: string; email: string; full_name: string; is_admin: boolean; granted_at: string };

function AdminPage() {
  const { isStaff, roles, loading: authLoading } = useAuth();
  const isAdmin = roles.includes("admin");
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [pending, setPending] = useState<ProgressRow[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchResult, setSearchResult] = useState<{ user_id: string; email: string; full_name: string } | null>(null);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [teamBusy, setTeamBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadMentors() {
    const { data } = await supabase.rpc("admin_list_mentors");
    setMentors((data ?? []) as Mentor[]);
  }

  async function load() {
    setLoading(true);
    const [{ data: e }, { data: p }] = await Promise.all([
      supabase.from("enrollments").select("*").order("created_at", { ascending: false }),
      supabase.from("week_progress").select("*").eq("status", "submitted"),
    ]);
    setEnrollments((e ?? []) as EnrollmentRow[]);
    setPending((p ?? []) as ProgressRow[]);
    if (isAdmin) await loadMentors();
    setLoading(false);
  }

  useEffect(() => { if (isStaff) load(); /* eslint-disable-next-line */ }, [isStaff, isAdmin]);

  async function findUser() {
    setSearchMsg(null);
    setSearchResult(null);
    if (!searchEmail.trim()) return;
    const { data, error } = await supabase.rpc("admin_find_user_by_email", { _email: searchEmail.trim() });
    if (error) { setSearchMsg(error.message); return; }
    const row = (data ?? [])[0];
    if (!row) { setSearchMsg("Nenhum usuário encontrado com esse e-mail."); return; }
    setSearchResult(row);
  }

  async function grantMentor(userId: string) {
    setTeamBusy(true);
    const { error } = await supabase.rpc("admin_grant_mentor", { _user_id: userId });
    if (error) setSearchMsg(error.message);
    setSearchResult(null);
    setSearchEmail("");
    await loadMentors();
    setTeamBusy(false);
  }

  async function revokeMentor(userId: string) {
    if (!confirm("Remover o papel de mentor deste usuário?")) return;
    setTeamBusy(true);
    const { error } = await supabase.rpc("admin_revoke_mentor", { _user_id: userId });
    if (error) alert(error.message);
    await loadMentors();
    setTeamBusy(false);
  }

  async function activate(id: string) {
    await supabase.from("enrollments").update({
      status: "active", started_at: new Date().toISOString(),
    }).eq("id", id);
    await load();
  }
  async function pause(id: string) {
    await supabase.from("enrollments").update({ status: "paused" }).eq("id", id);
    await load();
  }
  async function approve(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("week_progress").update({
      status: "approved", approved_at: new Date().toISOString(), approved_by: user?.id,
    }).eq("id", id);
    await load();
  }

  if (authLoading) return <div className="flex items-center text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...</div>;
  if (!isStaff) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-10 text-center">
        <Crown className="mx-auto h-8 w-8 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta área é exclusiva para mentores e administradores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Matrículas</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">Painel do Mentor</h1>

        {loading ? (
          <p className="mt-6 text-muted-foreground">Carregando...</p>
        ) : enrollments.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">Nenhuma matrícula ainda.</p>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Vertical</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Criado</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id} className="border-t border-border bg-card/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{e.user_id.slice(0, 8)}...</td>
                    <td className="px-4 py-3">{e.vertical}</td>
                    <td className="px-4 py-3"><span className="rounded-full border border-border px-2 py-0.5 text-[11px]">{e.status}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(e.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right">
                      {e.status !== "active" && (
                        <button onClick={() => activate(e.id)} className="rounded-full bg-foreground px-3 py-1 text-xs text-background">
                          Ativar
                        </button>
                      )}
                      {e.status === "active" && (
                        <button onClick={() => pause(e.id)} className="rounded-full border border-border px-3 py-1 text-xs">
                          Pausar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold tracking-tight">Aprovações pendentes</h2>
        <p className="mt-1 text-sm text-muted-foreground">Semanas enviadas pelos clientes aguardando seu checkpoint.</p>
        {pending.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">Nada pendente. 🎉</p>
        ) : (
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {pending.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card/60 p-4">
                <p className="text-xs text-muted-foreground">Matrícula <span className="font-mono">{p.enrollment_id.slice(0, 8)}</span></p>
                <p className="mt-1 text-xs text-muted-foreground">Semana <span className="font-mono">{p.week_id.slice(0, 8)}</span></p>
                <p className="mt-2 text-xs">
                  Enviado em {p.submitted_at ? new Date(p.submitted_at).toLocaleString("pt-BR") : "-"}
                </p>
                <button
                  onClick={() => approve(p.id)}
                  className="mt-3 w-full rounded-full bg-foreground py-2 text-xs font-medium text-background"
                >
                  Aprovar checkpoint
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {isAdmin && (
        <section>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold tracking-tight">Equipe de mentores</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Promova outros usuários a mentor. Eles passam a ver o painel admin, aprovar checkpoints e gerenciar incidentes.
          </p>

          <div className="mt-6 rounded-xl border border-border bg-card/40 p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Convidar mentor</p>
            <p className="mt-1 text-xs text-muted-foreground">
              O usuário precisa já ter conta criada. Busque pelo e-mail cadastrado.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="flex-1 rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-foreground/40"
              />
              <button
                onClick={findUser}
                disabled={teamBusy}
                className="inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50"
              >
                <Search className="h-3.5 w-3.5" /> Buscar
              </button>
            </div>
            {searchMsg && <p className="mt-3 text-xs text-amber-300">{searchMsg}</p>}
            {searchResult && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-background/40 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{searchResult.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{searchResult.email}</p>
                </div>
                <button
                  onClick={() => grantMentor(searchResult.user_id)}
                  disabled={teamBusy}
                  className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background disabled:opacity-50"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Promover a mentor
                </button>
              </div>
            )}
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Mentores ativos</p>
            {mentors.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nenhum mentor cadastrado ainda.</p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-card/60 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Nome</th>
                      <th className="px-4 py-3 text-left">E-mail</th>
                      <th className="px-4 py-3 text-left">Desde</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mentors.map((m) => (
                      <tr key={m.user_id} className="border-t border-border bg-card/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {m.full_name || "—"}
                            {m.is_admin && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">
                                <Crown className="h-3 w-3" /> Admin
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(m.granted_at).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => revokeMentor(m.user_id)}
                            disabled={teamBusy}
                            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs hover:bg-card disabled:opacity-50"
                          >
                            <UserMinus className="h-3 w-3" /> Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {isAdmin && (
        <section>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold tracking-tight">Encontros & Modelos</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Edite o plano de aula de cada um dos 16 encontros e cadastre os modelos (contratos, termos, recibos, notificações).
            Cada modelo é liberado para o mentorado somente quando o encontro correspondente é iniciado.
          </p>
          <div className="mt-6">
            <CurriculumManager />
          </div>
        </section>
      )}
    </div>
  );
}
