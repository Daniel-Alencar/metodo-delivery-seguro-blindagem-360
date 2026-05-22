import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, ShieldCheck, GraduationCap, MessageSquare, AlertTriangle, History, FileText, Gift, Mail, Phone, Building2, Hash, CalendarDays, CheckCircle2, Clock, Lock, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { VERTICAL_META } from "@/hooks/use-active-vertical";
import { ComplianceCard } from "@/components/ComplianceCard";

export const Route = createFileRoute("/_authenticated/admin/aluno/$enrollmentId")({
  head: () => ({ meta: [{ title: "Dashboard do Aluno — Mentor" }] }),
  component: StudentDetailPage,
});

type Enrollment = {
  id: string; user_id: string; status: string; vertical: string;
  created_at: string; started_at: string | null; completed_at: string | null;
  assigned_mentor_id: string | null;
};
type Profile = {
  id: string; full_name: string | null; company_name: string | null;
  cnpj: string | null; cpf: string | null; phone: string | null;
};
type WeekRow = { id: string; week_index: number; title: string; module_id: string; is_checkpoint: boolean };
type ModuleRow = { id: string; month_index: number; title: string };
type ProgressRow = { week_id: string; status: string; submitted_at: string | null; approved_at: string | null; notes: string | null };
type AuditRow = { id: string; action: string; created_at: string; notes: string | null; week_id: string | null };
type TicketRow = { id: string; title: string; status: string; created_at: string; last_reply_at: string | null };
type IncidentRow = { id: string; title: string; category: string; status: string; created_at: string };
type ReferralRow = { id: string; code: string; status: string; created_at: string; converted_at: string | null; discount_percent: number | null };

function StudentDetailPage() {
  const { enrollmentId } = Route.useParams();
  const navigate = useNavigate();
  const { isStaff, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [weeks, setWeeks] = useState<WeekRow[]>([]);
  const [progress, setProgress] = useState<Record<string, ProgressRow>>({});
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!isStaff) {
      navigate({ to: "/dashboard" });
      return;
    }
    (async () => {
      setLoading(true);
      const { data: enr } = await supabase.from("enrollments").select("*").eq("id", enrollmentId).maybeSingle();
      if (!enr) { setLoading(false); return; }
      const e = enr as Enrollment;
      setEnrollment(e);

      const [{ data: prof }, { data: emails }, { data: mods }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, company_name, cnpj, cpf, phone").eq("id", e.user_id).maybeSingle(),
        supabase.rpc("admin_list_user_emails", { _ids: [e.user_id] }),
        supabase.from("modules").select("id, month_index, title").eq("vertical", e.vertical).order("month_index"),
      ]);
      setProfile((prof as Profile) ?? null);
      const emailRow = ((emails ?? []) as { user_id: string; email: string }[])[0];
      setEmail(emailRow?.email ?? null);

      const moduleList = (mods ?? []) as ModuleRow[];
      setModules(moduleList);
      const modIds = moduleList.map((m) => m.id);

      const [{ data: ws }, { data: wp }, { data: aud }, { data: tks }, { data: inc }, { data: refs }] = await Promise.all([
        modIds.length
          ? supabase.from("weeks").select("id, week_index, title, module_id, is_checkpoint").in("module_id", modIds).order("week_index")
          : Promise.resolve({ data: [] }),
        supabase.from("week_progress").select("week_id, status, submitted_at, approved_at, notes").eq("enrollment_id", enrollmentId),
        supabase.from("mentor_audit_log").select("id, action, created_at, notes, week_id").eq("enrollment_id", enrollmentId).order("created_at", { ascending: false }).limit(50),
        supabase.from("support_tickets").select("id, title, status, created_at, last_reply_at").eq("user_id", e.user_id).order("created_at", { ascending: false }),
        supabase.from("incidents").select("id, title, category, status, created_at").eq("user_id", e.user_id).order("created_at", { ascending: false }),
        supabase.from("referrals").select("id, code, status, created_at, converted_at, discount_percent").or(`referrer_id.eq.${e.user_id},referred_user_id.eq.${e.user_id}`).order("created_at", { ascending: false }),
      ]);

      setWeeks((ws ?? []) as WeekRow[]);
      const pmap: Record<string, ProgressRow> = {};
      ((wp ?? []) as ProgressRow[]).forEach((p) => { pmap[p.week_id] = p; });
      setProgress(pmap);
      setAudit((aud ?? []) as AuditRow[]);
      setTickets((tks ?? []) as TicketRow[]);
      setIncidents((inc ?? []) as IncidentRow[]);
      setReferrals((refs ?? []) as ReferralRow[]);
      setLoading(false);
    })();
  }, [authLoading, isStaff, enrollmentId, navigate]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando dashboard do aluno…
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-muted-foreground">Matrícula não encontrada.</p>
        <Link to="/admin" className="mt-4 inline-flex items-center gap-2 text-sm text-foreground hover:underline">
          <ArrowLeft className="h-4 w-4" /> Voltar ao painel
        </Link>
      </div>
    );
  }

  const vMeta = VERTICAL_META[(enrollment.vertical as "food-service" | "pet-shop")] ?? VERTICAL_META["food-service"];
  const totalWeeks = weeks.length;
  const approvedCount = weeks.filter((w) => progress[w.id]?.status === "approved").length;
  const inProgressCount = weeks.filter((w) => progress[w.id]?.status === "in_progress").length;
  const submittedCount = weeks.filter((w) => progress[w.id]?.status === "submitted").length;
  const pct = totalWeeks ? Math.round((approvedCount / totalWeeks) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao painel
        </Link>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${vMeta.badgeClass}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${vMeta.dotClass}`} /> {vMeta.short}
        </span>
      </div>

      {/* Identification card */}
      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {profile?.full_name || email || "Aluno"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Matrícula <span className="font-mono">{enrollment.id.slice(0, 8)}</span> · Status{" "}
              <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[11px]">{enrollment.status}</span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold">{pct}%</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">trilha concluída</div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="E-mail" value={email} />
          <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Telefone" value={profile?.phone} />
          <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="Empresa" value={profile?.company_name} />
          <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label="CNPJ" value={profile?.cnpj} mono />
          <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label="CPF" value={profile?.cpf} mono />
          <InfoRow icon={<CalendarDays className="h-3.5 w-3.5" />} label="Iniciou" value={enrollment.started_at ? new Date(enrollment.started_at).toLocaleDateString("pt-BR") : "—"} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <StatPill icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Aprovados" value={approvedCount} tone="emerald" />
          <StatPill icon={<Send className="h-3.5 w-3.5" />} label="Submetidos" value={submittedCount} tone="amber" />
          <StatPill icon={<Clock className="h-3.5 w-3.5" />} label="Em andamento" value={inProgressCount} tone="cyan" />
          <StatPill icon={<Lock className="h-3.5 w-3.5" />} label="Bloqueados" value={totalWeeks - approvedCount - submittedCount - inProgressCount} tone="muted" />
        </div>
      </div>

      {/* Trilha por módulo */}
      <SectionCard title="Trilha do aluno" subtitle="Status de cada encontro. Clique para abrir o encontro como mentor." icon={<GraduationCap className="h-4 w-4" />}>
        <div className="space-y-4">
          {modules.map((m) => {
            const monthWeeks = weeks.filter((w) => w.module_id === m.id);
            return (
              <div key={m.id} className="rounded-xl border border-border bg-background/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full border border-border bg-card/60 px-2 py-0.5 text-[10px] uppercase tracking-wider">Módulo {m.month_index}</span>
                  <span className="text-sm font-medium">{m.title}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {monthWeeks.map((w) => {
                    const st = progress[w.id]?.status ?? "locked";
                    return (
                      <button
                        key={w.id}
                        onClick={() => navigate({ to: "/documentos", search: { week: w.id, enrollment: enrollmentId } })}
                        className="flex items-center justify-between gap-3 rounded-md border border-border bg-card/40 px-3 py-2 text-left text-sm hover:bg-card/70"
                      >
                        <div className="min-w-0">
                          <p className="truncate">
                            <span className="text-[11px] text-muted-foreground">Enc. {w.week_index}</span> · {w.title}
                            {w.is_checkpoint && <span className="ml-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] uppercase text-amber-300">CKP</span>}
                          </p>
                          {progress[w.id]?.submitted_at && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              entregue em {new Date(progress[w.id].submitted_at!).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={st} />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {modules.length === 0 && <p className="text-sm text-muted-foreground">Trilha ainda não cadastrada para esta vertical.</p>}
        </div>
      </SectionCard>

      {/* Compliance (reutiliza o componente do dashboard do aluno) */}
      <SectionCard title="Compliance do aluno" subtitle="Mesma visão que o aluno enxerga, em modo gerencial." icon={<ShieldCheck className="h-4 w-4" />}>
        <ComplianceCard enrollmentId={enrollmentId} />
      </SectionCard>

      {/* Auditoria + Tickets + Incidentes + Indicações */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Histórico de mentoria" subtitle="Últimas 50 ações registradas." icon={<History className="h-4 w-4" />}>
          {audit.length === 0 ? (
            <EmptyHint text="Sem registros de auditoria." />
          ) : (
            <ul className="space-y-2 text-sm">
              {audit.map((a) => (
                <li key={a.id} className="rounded-md border border-border bg-background/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{labelForAction(a.action)}</span>
                    <span className="text-[11px] text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  {a.notes && <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Tickets e suporte" subtitle="Solicitações abertas pelo aluno." icon={<MessageSquare className="h-4 w-4" />}>
          {tickets.length === 0 ? (
            <EmptyHint text="Nenhum ticket aberto." />
          ) : (
            <ul className="space-y-2 text-sm">
              {tickets.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.title}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider">{t.status}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Incidentes" subtitle="Casos críticos reportados pelo aluno." icon={<AlertTriangle className="h-4 w-4" />}>
          {incidents.length === 0 ? (
            <EmptyHint text="Nenhum incidente registrado." />
          ) : (
            <ul className="space-y-2 text-sm">
              {incidents.map((i) => (
                <li key={i.id} className="rounded-md border border-border bg-background/40 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{i.title}</p>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider">{i.status}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{i.category} · {new Date(i.created_at).toLocaleString("pt-BR")}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Indicações" subtitle="Indicações feitas e recebidas." icon={<Gift className="h-4 w-4" />}>
          {referrals.length === 0 ? (
            <EmptyHint text="Sem indicações." />
          ) : (
            <ul className="space-y-2 text-sm">
              {referrals.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/40 px-3 py-2">
                  <div>
                    <p className="font-mono text-xs">{r.code}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider">{r.status}</span>
                    {r.discount_percent != null && (
                      <p className="mt-1 text-[11px] text-muted-foreground">{r.discount_percent}% desc.</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

// ---------- helpers ----------

function SectionCard({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="mb-4">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold">{icon} {title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-background/30 px-3 py-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`truncate text-sm ${mono ? "font-mono" : ""}`}>{value || <span className="text-muted-foreground">—</span>}</p>
      </div>
    </div>
  );
}

function StatPill({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "emerald" | "amber" | "cyan" | "muted" }) {
  const cls = {
    emerald: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    cyan: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200",
    muted: "border-border bg-background/40 text-muted-foreground",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${cls}`}>
      {icon} <span className="font-semibold">{value}</span> <span className="opacity-80">{label}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    locked: { cls: "border-border bg-background/40 text-muted-foreground", label: "Bloqueado" },
    in_progress: { cls: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200", label: "Em andamento" },
    submitted: { cls: "border-amber-500/40 bg-amber-500/10 text-amber-200", label: "Submetido" },
    approved: { cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200", label: "Aprovado" },
  };
  const v = map[status] ?? map.locked;
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${v.cls}`}>{v.label}</span>;
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground">{text}</p>;
}

function labelForAction(action: string): string {
  const map: Record<string, string> = {
    week_unlocked: "Semana liberada",
    week_approved: "Semana aprovada",
    week_rejected: "Semana rejeitada",
    enrollment_activated: "Matrícula ativada",
    enrollment_paused: "Matrícula pausada",
    compliance_marked: "Item de compliance marcado",
    compliance_item_changed: "Item de compliance alterado",
    note_added: "Anotação adicionada",
  };
  return map[action] ?? action;
}
