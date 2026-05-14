import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Crown, UserPlus, UserMinus, Search, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

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
    </div>
  );
}
