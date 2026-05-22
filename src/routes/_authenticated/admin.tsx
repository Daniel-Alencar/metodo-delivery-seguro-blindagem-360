import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Crown, UserPlus, UserMinus, Search, ShieldCheck, GraduationCap, HeartPulse, RotateCcw, ClipboardCheck, History, BarChart3, BookOpen, Users, FileText, ChevronDown, ChevronRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useViewMode } from "@/hooks/use-view-mode";
import { useActiveVertical, VERTICAL_META } from "@/hooks/use-active-vertical";
import { CurriculumManager } from "@/components/CurriculumManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Painel Mentor — Blindagem 360º" }] }),
  component: AdminPage,
});

type EnrollmentRow = { id: string; user_id: string; status: string; vertical: string; created_at: string; archive_at: string | null; completed_at: string | null };
type ProgressRow = {
  id: string; status: string; submitted_at: string | null; week_id: string;
  enrollment_id: string;
};
type ProfileLite = { id: string; full_name: string | null; company_name: string | null; cnpj: string | null };

type Mentor = { user_id: string; email: string; full_name: string; is_admin: boolean; granted_at: string };

function AdminPage() {
  const { isStaff, roles, loading: authLoading } = useAuth();
  const { isAdminView, canSwitch } = useViewMode();
  const { vertical: activeVertical, meta: areaMeta } = useActiveVertical();
  // Super admin sections only show when in admin view (or user is pure admin without mentor role)
  const isAdmin = roles.includes("admin") && (!canSwitch || isAdminView);
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [pending, setPending] = useState<ProgressRow[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileLite>>({});
  const [allWeeks, setAllWeeks] = useState<{ id: string; week_index: number; title: string; module_id: string }[]>([]);
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
    const [{ data: e }, { data: p }, { data: ws }] = await Promise.all([
      supabase.from("enrollments").select("*").order("created_at", { ascending: false }),
      supabase.from("week_progress").select("*").eq("status", "submitted"),
      supabase.from("weeks").select("id, week_index, title, module_id").order("week_index"),
    ]);
    const enr = (e ?? []) as EnrollmentRow[];
    setEnrollments(enr);
    setPending((p ?? []) as ProgressRow[]);
    setAllWeeks((ws ?? []) as { id: string; week_index: number; title: string; module_id: string }[]);
    const ids = Array.from(new Set(enr.map((x) => x.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, cnpj")
        .in("id", ids);
      const map: Record<string, ProfileLite> = {};
      (profs ?? []).forEach((pr) => { map[(pr as ProfileLite).id] = pr as ProfileLite; });
      setProfilesById(map);
    } else {
      setProfilesById({});
    }
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
  async function logAttendance(p: ProgressRow) {
    const notes = prompt("Notas da aula (opcional):") ?? "";
    const { error } = await supabase.rpc("log_class_attendance", {
      _enrollment_id: p.enrollment_id, _week_id: p.week_id, _notes: notes || undefined,
    });
    if (error) alert(error.message);
    else alert("Atendimento registrado.");
  }

  async function unlockNextWeek(enrollmentId: string) {
    const [{ data: ws }, { data: ps }] = await Promise.all([
      supabase.from("weeks").select("id, week_index, title, module_id").order("week_index"),
      supabase.from("week_progress").select("week_id, status").eq("enrollment_id", enrollmentId),
    ]);
    const { data: mods } = await supabase.from("modules").select("id, month_index").eq("vertical", "food-service").order("month_index");
    const moduleOrder = new Map((mods ?? []).map((m, i) => [m.id, i]));
    const ordered = (ws ?? []).slice().sort((a, b) => {
      const am = moduleOrder.get(a.module_id) ?? 99;
      const bm = moduleOrder.get(b.module_id) ?? 99;
      return am - bm || a.week_index - b.week_index;
    });
    const doneIds = new Set((ps ?? []).filter((p) => p.status !== "locked").map((p) => p.week_id));
    const next = ordered.find((w) => !doneIds.has(w.id));
    if (!next) { alert("Não há semanas para liberar."); return; }
    if (!confirm(`Liberar a Semana ${next.week_index} — ${next.title} para este aluno agora?`)) return;
    const { error } = await supabase.rpc("staff_unlock_week", {
      _enrollment_id: enrollmentId, _week_id: next.id,
    });
    if (error) alert(error.message);
    else alert(`Semana ${next.week_index} liberada.`);
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
    <div className="space-y-8">
      {/* Header com identificação clara do modo */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/40 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Painel</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            {isAdmin ? "Super Admin" : "Mentor"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Acesso completo: equipe, currículo, acompanhamento e auditoria."
              : "Aprovações de checkpoint, aulas conduzidas e consulta dos documentos do encontro."}
          </p>
        </div>
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs uppercase tracking-wider ${
          isAdmin ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
        }`}>
          {isAdmin ? <Crown className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />}
          Modo: {isAdmin ? "Super Admin" : "Mentor"}
        </span>
      </div>

      <Tabs defaultValue="aprovacoes" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-border bg-card/40 p-1">
          <TabsTrigger value="aprovacoes" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
            <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> Aprovações
          </TabsTrigger>
          <TabsTrigger value="aulas" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
            <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Aulas & Documentos
          </TabsTrigger>
          <TabsTrigger value="matriculas" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
            <Users className="mr-1.5 h-3.5 w-3.5" /> Matrículas
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Relatórios
          </TabsTrigger>
          <TabsTrigger value="historico" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
            <History className="mr-1.5 h-3.5 w-3.5" /> Histórico
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="equipe" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Equipe
            </TabsTrigger>
          )}
          <TabsTrigger value="curriculo" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
            <GraduationCap className="mr-1.5 h-3.5 w-3.5" /> Currículo
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="acompanhamento" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
              <HeartPulse className="mr-1.5 h-3.5 w-3.5" /> Acompanhamento
            </TabsTrigger>
          )}
        </TabsList>

        {/* APROVAÇÕES */}
        <TabsContent value="aprovacoes" className="mt-6">
          <SectionCard
            title="Aprovações pendentes"
            subtitle="Semanas enviadas pelos mentorados aguardando seu checkpoint."
            icon={<ClipboardCheck className="h-4 w-4" />}
          >
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada pendente. 🎉</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {pending.map((p) => (
                  <div key={p.id} className="rounded-xl border border-border bg-background/40 p-4">
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
                    <button
                      onClick={() => logAttendance(p)}
                      className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border py-2 text-xs hover:bg-card"
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" /> Registrar atendimento de aula
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* AULAS & DOCUMENTOS — para mentor consultar durante a aula */}
        <TabsContent value="aulas" className="mt-6">
          <SectionCard
            title="Aulas & Documentos do encontro"
            subtitle="Navegue módulo → encontro → modelos. Clique em um modelo para abrir e consultar durante a aula."
            icon={<BookOpen className="h-4 w-4" />}
          >
            <LessonDocsPanel />
          </SectionCard>
        </TabsContent>

        {/* MATRÍCULAS */}
        <TabsContent value="matriculas" className="mt-6">
          <SectionCard
            title="Matrículas"
            subtitle="Ative ou pause a trilha dos mentorados."
            icon={<Users className="h-4 w-4" />}
          >
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma matrícula ainda.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-card/60 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Empresa</th>
                      <th className="px-4 py-3 text-left">CNPJ</th>
                      <th className="px-4 py-3 text-left">Treinando</th>
                      <th className="px-4 py-3 text-left">Código</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Criado</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((e) => {
                      const pr = profilesById[e.user_id];
                      return (
                        <tr key={e.id} className="border-t border-border bg-background/30">
                          <td className="px-4 py-3">{pr?.company_name || <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-4 py-3 font-mono text-xs">{pr?.cnpj || <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-4 py-3">{pr?.full_name || <span className="text-muted-foreground">—</span>}</td>
                          <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">{e.user_id.slice(0, 8)}</td>
                          <td className="px-4 py-3"><span className="rounded-full border border-border px-2 py-0.5 text-[11px]">{e.status}</span></td>
                          <td className="px-4 py-3 text-muted-foreground">{new Date(e.created_at).toLocaleDateString("pt-BR")}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {e.status !== "active" && (
                                <button onClick={() => activate(e.id)} className="rounded-full bg-foreground px-3 py-1 text-xs text-background">
                                  Ativar
                                </button>
                              )}
                              {e.status === "active" && (
                                <>
                                  <select
                                    defaultValue=""
                                    onChange={(ev) => {
                                      if (ev.target.value) {
                                        navigate({ to: "/documentos", search: { week: ev.target.value, enrollment: e.id } });
                                      }
                                    }}
                                    className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200"
                                    title="Abrir encontro para finalizar / observações"
                                  >
                                    <option value="">Encontros…</option>
                                    {allWeeks.map((w) => (
                                      <option key={w.id} value={w.id}>
                                        Encontro {w.week_index} — {w.title}
                                      </option>
                                    ))}
                                  </select>
                                  <button onClick={() => unlockNextWeek(e.id)} className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20">
                                    Liberar próxima semana
                                  </button>
                                  <button onClick={() => pause(e.id)} className="rounded-full border border-border px-3 py-1 text-xs">
                                    Pausar
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* RELATÓRIOS */}
        <TabsContent value="relatorios" className="mt-6">
          <SectionCard
            title="Relatório mensal por mentor"
            subtitle="Aulas conduzidas, aprovações e liberações por mentor no mês selecionado."
            icon={<BarChart3 className="h-4 w-4" />}
          >
            <MonthlyReportPanel />
          </SectionCard>
        </TabsContent>

        {/* HISTÓRICO */}
        <TabsContent value="historico" className="mt-6">
          <SectionCard
            title="Histórico de ações"
            subtitle="Auditoria completa: liberações, aprovações, aulas, acompanhamento e gestão da equipe."
            icon={<History className="h-4 w-4" />}
          >
            <AuditLogPanel />
          </SectionCard>
        </TabsContent>

        {/* EQUIPE — só admin */}
        {isAdmin && (
          <TabsContent value="equipe" className="mt-6">
            <SectionCard
              title="Equipe de mentores"
              subtitle="Promova outros usuários a mentor ou remova o papel."
              icon={<ShieldCheck className="h-4 w-4" />}
            >
              <div className="rounded-xl border border-border bg-background/40 p-5">
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
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-3">
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
                          <tr key={m.user_id} className="border-t border-border bg-background/30">
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
            </SectionCard>
          </TabsContent>
        )}

        {/* CURRÍCULO — só admin */}
        {isAdmin && (
          <TabsContent value="curriculo" className="mt-6">
            <SectionCard
              title="Encontros & Modelos"
              subtitle="Edite o plano de aula de cada um dos 16 encontros e cadastre os modelos (contratos, termos, recibos, notificações). Os modelos com corpo vazio aparecem para o mentorado, mas precisam do conteúdo aqui."
              icon={<GraduationCap className="h-4 w-4" />}
            >
              <CurriculumManager />
            </SectionCard>
          </TabsContent>
        )}

        {/* ACOMPANHAMENTO — só admin */}
        {isAdmin && (
          <TabsContent value="acompanhamento" className="mt-6">
            <SectionCard
              title="Acompanhamento pré-pago"
              subtitle="Após confirmar o pagamento por fora, libere 30 dias de acompanhamento pelo e-mail do mentorado."
              icon={<HeartPulse className="h-4 w-4" />}
            >
              <FollowupPanel />
            </SectionCard>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/* ===== Helpers de layout ===== */

function SectionCard({ title, subtitle, icon, children }: {
  title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/30 p-6">
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/* ===== Painel de aulas e documentos para o mentor ===== */

type LMod = { id: string; month_index: number; title: string; description: string | null };
type LWeek = { id: string; module_id: string; week_index: number; title: string; summary: string | null; agenda: string | null; homework: string | null };
type LDoc = { id: string; week_id: string | null; module_id: string | null; title: string; description: string | null; body: string | null; version: string };

function LessonDocsPanel() {
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<LMod[]>([]);
  const [weeks, setWeeks] = useState<LWeek[]>([]);
  const [docs, setDocs] = useState<LDoc[]>([]);
  const [openWeek, setOpenWeek] = useState<string | null>(null);
  const [openDoc, setOpenDoc] = useState<LDoc | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: m }, { data: w }, { data: d }] = await Promise.all([
        supabase.from("modules").select("*").eq("vertical", "food-service").order("month_index"),
        supabase.from("weeks").select("*").order("week_index"),
        supabase.from("documents").select("*").order("title"),
      ]);
      setModules((m ?? []) as LMod[]);
      setWeeks((w ?? []) as LWeek[]);
      setDocs((d ?? []) as LDoc[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Carregando aulas...</p>;

  return (
    <>
      <div className="space-y-4">
        {modules.map((m) => {
          const monthWeeks = weeks.filter((w) => w.module_id === m.id).sort((a, b) => a.week_index - b.week_index);
          return (
            <div key={m.id} className="rounded-xl border border-border bg-background/40 p-4">
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs uppercase tracking-wider">Módulo {m.month_index}</span>
                <h3 className="text-base font-semibold">{m.title}</h3>
              </div>
              {m.description && <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>}
              <div className="mt-3 space-y-2">
                {monthWeeks.map((w) => {
                  const isOpen = openWeek === w.id;
                  const weekDocs = docs.filter((d) => d.week_id === w.id);
                  return (
                    <div key={w.id} className="rounded-lg border border-border bg-card/40">
                      <button
                        onClick={() => setOpenWeek(isOpen ? null : w.id)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-card/60"
                      >
                        <div className="flex items-center gap-3">
                          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          <span className="text-xs uppercase tracking-wider text-muted-foreground">Encontro {w.week_index}</span>
                          <span className="text-sm font-medium">{w.title}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <FileText className="h-3 w-3" /> {weekDocs.length} modelo{weekDocs.length === 1 ? "" : "s"}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="space-y-3 border-t border-border px-4 py-4">
                          {w.summary && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Resumo da aula</p>
                              <p className="mt-1 text-sm text-foreground/90">{w.summary}</p>
                            </div>
                          )}
                          {w.agenda && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Agenda do mentor</p>
                              <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{w.agenda}</p>
                            </div>
                          )}
                          {w.homework && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tarefa do mentorado</p>
                              <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{w.homework}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Modelos deste encontro</p>
                            {weekDocs.length === 0 ? (
                              <p className="mt-2 text-xs text-muted-foreground">Nenhum modelo cadastrado.</p>
                            ) : (
                              <div className="mt-2 grid gap-2 md:grid-cols-2">
                                {weekDocs.map((d) => {
                                  const empty = !d.body || d.body.trim().length === 0;
                                  return (
                                    <button
                                      key={d.id}
                                      onClick={() => setOpenDoc(d)}
                                      className="group flex items-start gap-3 rounded-md border border-border bg-background/60 p-3 text-left hover:border-foreground/30"
                                    >
                                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium">{d.title}</p>
                                        {d.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{d.description}</p>}
                                        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                                          {d.version} · {empty ? <span className="text-amber-300">conteúdo pendente</span> : "pronto"}
                                        </p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
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
      </div>

      {openDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" onClick={() => setOpenDoc(null)}>
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Modelo · {openDoc.version}</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight">{openDoc.title}</h3>
                {openDoc.description && <p className="mt-1 text-sm text-muted-foreground">{openDoc.description}</p>}
              </div>
              <button onClick={() => setOpenDoc(null)} className="rounded-full border border-border p-1.5 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              {openDoc.body && openDoc.body.trim().length > 0 ? (
                <pre className="whitespace-pre-wrap rounded-md border border-border bg-background/60 p-4 text-sm leading-relaxed">{openDoc.body}</pre>
              ) : (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-200">
                  Este modelo ainda não tem conteúdo cadastrado. O Super Admin pode preencher em <b>Currículo → Encontros &amp; Modelos</b>.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}



function FollowupPanel() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function extend() {
    setMsg(null); setBusy(true);
    const { data: u, error: e1 } = await supabase.rpc("admin_find_user_by_email", { _email: email.trim() });
    if (e1 || !u || !u[0]) { setMsg("Usuário não encontrado."); setBusy(false); return; }
    const { data, error } = await supabase.rpc("admin_extend_followup", { _user_id: u[0].user_id, _days: 30 });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setMsg(`Acompanhamento liberado até ${new Date(data as string).toLocaleDateString("pt-BR")}.`);
    setEmail("");
  }

  return (
    <section>
      <div className="flex items-center gap-2">
        <HeartPulse className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-2xl font-semibold tracking-tight">Acompanhamento pré-pago</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Após confirmar o pagamento por fora, libere 30 dias de acompanhamento pelo e-mail do mentorado.
        Se a conta estiver arquivada, ela é reativada automaticamente como graduada.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="email@mentorado.com"
          className="flex-1 rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-foreground/40"
        />
        <button
          onClick={extend} disabled={busy || !email.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Liberar +30 dias
        </button>
      </div>
      {msg && <p className="mt-3 text-xs text-amber-300">{msg}</p>}
    </section>
  );
}

type AuditRow = {
  id: string; created_at: string; action: string;
  mentor_id: string; mentor_name: string; mentor_email: string;
  student_id: string | null; student_name: string | null; student_email: string | null;
  week_index: number | null; week_title: string | null;
  notes: string | null;
};

const ACTION_LABEL: Record<string, string> = {
  week_released: "Liberou semana",
  week_approved: "Aprovou semana",
  class_attended: "Conduziu aula",
  followup_extended: "Liberou acompanhamento",
  mentor_granted: "Promoveu mentor",
  mentor_revoked: "Removeu mentor",
  archive_requested: "Solicitou arquivamento",
  archive_cancelled: "Cancelou arquivamento",
};

function AuditLogPanel() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc("admin_audit_list", {
      _limit: 200,
      _action: (filter || null) as never,
    });
    setRows((data ?? []) as AuditRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  return (
    <section>
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-2xl font-semibold tracking-tight">Histórico de ações</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Registro de tudo que cada mentor fez: liberações de semana, aprovações, aulas conduzidas e liberações de acompanhamento.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => setFilter("")} className={`rounded-full border px-3 py-1 text-xs ${!filter ? "bg-foreground text-background" : "border-border"}`}>Todas</button>
        {Object.entries(ACTION_LABEL).map(([k, v]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-full border px-3 py-1 text-xs ${filter === k ? "bg-foreground text-background" : "border-border"}`}>{v}</button>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Nenhum registro.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Quando</th>
                <th className="px-4 py-3 text-left">Mentor</th>
                <th className="px-4 py-3 text-left">Ação</th>
                <th className="px-4 py-3 text-left">Mentorado</th>
                <th className="px-4 py-3 text-left">Encontro</th>
                <th className="px-4 py-3 text-left">Observação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border bg-card/30 align-top">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div>{r.mentor_name || "—"}</div>
                    <div className="text-muted-foreground">{r.mentor_email}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="rounded-full border border-border px-2 py-0.5">
                      {ACTION_LABEL[r.action] ?? r.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.student_email ? (
                      <>
                        <div>{r.student_name || "—"}</div>
                        <div className="text-muted-foreground">{r.student_email}</div>
                      </>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.week_index ? `#${r.week_index} ${r.week_title ?? ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[260px]">{r.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}


type MonthlyRow = {
  mentor_id: string;
  mentor_name: string;
  mentor_email: string;
  is_admin: boolean;
  classes_attended: number;
  weeks_approved: number;
  weeks_released: number;
  followups_extended: number;
  distinct_students: number;
  total_actions: number;
};

function MonthlyReportPanel() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [rows, setRows] = useState<MonthlyRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.rpc("admin_mentor_monthly_report", {
      _month: `${month}-01`,
    });
    setRows((data ?? []) as MonthlyRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [month]);

  function exportCsv() {
    const header = ["Mentor", "E-mail", "Aulas", "Aprovacoes", "Liberacoes", "Acompanhamento", "Mentorados", "Total"];
    const lines = rows.map(r => [
      r.mentor_name || "", r.mentor_email,
      r.classes_attended, r.weeks_approved, r.weeks_released,
      r.followups_extended, r.distinct_students, r.total_actions,
    ].join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio-mentores-${month}.csv`;
    a.click();
  }

  const totals = rows.reduce((acc, r) => ({
    classes: acc.classes + Number(r.classes_attended),
    approvals: acc.approvals + Number(r.weeks_approved),
    releases: acc.releases + Number(r.weeks_released),
    followups: acc.followups + Number(r.followups_extended),
  }), { classes: 0, approvals: 0, releases: 0, followups: 0 });

  return (
    <section>
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-2xl font-semibold tracking-tight">Relatório mensal por mentor</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Aulas conduzidas, aprovações, liberações de semana e de acompanhamento por mentor no mês selecionado.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-foreground/40"
        />
        <button onClick={exportCsv} className="rounded-full border border-border px-3 py-1.5 text-xs">
          Exportar CSV
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {[
          { label: "Aulas conduzidas", value: totals.classes },
          { label: "Aprovações", value: totals.approvals },
          { label: "Liberações de semana", value: totals.releases },
          { label: "Acompanhamento (+30d)", value: totals.followups },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card/40 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold">{k.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-muted-foreground">Carregando...</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Nenhum mentor cadastrado.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Mentor</th>
                <th className="px-4 py-3 text-right">Aulas</th>
                <th className="px-4 py-3 text-right">Aprovações</th>
                <th className="px-4 py-3 text-right">Liberações</th>
                <th className="px-4 py-3 text-right">Acomp.</th>
                <th className="px-4 py-3 text-right">Mentorados</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.mentor_id} className="border-t border-border bg-card/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.mentor_name || "—"}
                      {r.is_admin && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-300">
                          <Crown className="h-3 w-3" /> Admin
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{r.mentor_email}</div>
                  </td>
                  <td className="px-4 py-3 text-right">{r.classes_attended}</td>
                  <td className="px-4 py-3 text-right">{r.weeks_approved}</td>
                  <td className="px-4 py-3 text-right">{r.weeks_released}</td>
                  <td className="px-4 py-3 text-right">{r.followups_extended}</td>
                  <td className="px-4 py-3 text-right">{r.distinct_students}</td>
                  <td className="px-4 py-3 text-right font-semibold">{r.total_actions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
