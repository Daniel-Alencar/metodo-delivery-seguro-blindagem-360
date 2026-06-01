import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ShieldCheck, LayoutDashboard, FileText, Crown, LogOut, GraduationCap, Repeat, HeartPulse, ClipboardList, UserCircle, Compass, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useViewMode, clearViewMode } from "@/hooks/use-view-mode";
import { useActiveVertical, clearActiveVertical } from "@/hooks/use-active-vertical";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut, user, isStaff, roles } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const { mode, canSwitch, isAdminView } = useViewMode();
  const { meta: areaMeta } = useActiveVertical();
  const isClient = !roles.includes("admin") && !roles.includes("mentor");
  const [openTickets, setOpenTickets] = useState<number>(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isStaff) return;
    let stop = false;
    async function load() {
      const { data } = await supabase.rpc("count_open_tickets_for_staff" as never);
      if (!stop) setOpenTickets(typeof data === "number" ? data : 0);
    }
    load();
    const i = setInterval(load, 30000);
    return () => { stop = true; clearInterval(i); };
  }, [isStaff]);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <header className="relative border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to={isStaff ? "/admin" : "/dashboard"} className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <ShieldCheck className="h-4 w-4" /> Blindagem 360º
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            {isClient && <NavItem to="/dashboard" icon={LayoutDashboard} label="Trilha" />}
            {isClient && <NavItem to="/tarefas" icon={ClipboardList} label="Resumo da aula / Tarefa da semana" />}
            <div className="relative">
              {isClient ? (
                <NavItem to="/acompanhamento" icon={HeartPulse} label="Acompanhamento" />
              ) : (
                <Link
                  to="/acompanhamento"
                  className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                  activeProps={{ className: "text-foreground font-medium" }}
                >
                  <HeartPulse className="h-3.5 w-3.5" /> Acompanhamento
                  {openTickets > 0 && (
                    <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white shadow ring-2 ring-background animate-pulse">
                      {openTickets}
                    </span>
                  )}
                </Link>
              )}
            </div>
            <NavItem to="/documentos" icon={FileText} label={isClient ? "Documento / Aula" : "Documentos"} />
            {isClient && <NavItem to="/perfil" icon={UserCircle} label="Perfil" />}
            {isStaff && <NavItem to="/admin" icon={Crown} label="Admin" /> }
          </nav>
          <div className="flex items-center gap-2">
            {mode && (
              <span className={`hidden md:inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${
                isAdminView ? "border-amber-500/40 bg-amber-500/10 text-amber-300" : "border-cyan-500/40 bg-cyan-500/10 text-cyan-200"
              }`}>
                {isAdminView ? <Crown className="h-3 w-3" /> : <GraduationCap className="h-3 w-3" />}
                {isAdminView ? "Super Admin" : "Mentor"}
              </span>
            )}
            {isStaff && areaMeta && (
              <span className={`hidden md:inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${areaMeta.badgeClass}`}>
                <Compass className="h-3 w-3" /> {areaMeta.short}
              </span>
            )}
            <span className="hidden text-xs text-muted-foreground lg:inline">{user?.email}</span>
            {isStaff && (
              <button
                onClick={() => { clearActiveVertical(); navigate({ to: "/escolher-area" }); }}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs hover:bg-card"
                title="Trocar área"
              >
                <Compass className="h-3 w-3" /> Trocar área
              </button>
            )}
            {canSwitch && (
              <button
                onClick={() => { clearViewMode(); clearActiveVertical(); navigate({ to: "/escolher-perfil" }); }}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs hover:bg-card"
                title="Trocar perfil"
              >
                <Repeat className="h-3 w-3" /> Trocar
              </button>
            )}
            <button
              onClick={async () => { clearViewMode(); clearActiveVertical(); await signOut(); router.invalidate(); navigate({ to: "/login" }); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs hover:bg-card"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>
      </header>
      <main className="relative mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
      activeProps={{ className: "text-foreground font-medium" }}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </Link>
  );
}
