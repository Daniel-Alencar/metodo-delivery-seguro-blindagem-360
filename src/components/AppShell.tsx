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
                className="hidden md:inline-flex items-center gap-1 rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs hover:bg-card"
                title="Trocar área"
              >
                <Compass className="h-3 w-3" /> Trocar área
              </button>
            )}
            {canSwitch && (
              <button
                onClick={() => { clearViewMode(); clearActiveVertical(); navigate({ to: "/escolher-perfil" }); }}
                className="hidden md:inline-flex items-center gap-1 rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs hover:bg-card"
                title="Trocar perfil"
              >
                <Repeat className="h-3 w-3" /> Trocar
              </button>
            )}
            <button
              onClick={async () => { clearViewMode(); clearActiveVertical(); await signOut(); router.invalidate(); navigate({ to: "/login" }); }}
              className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs hover:bg-card"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>

            {/* Mobile menu trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card/50 hover:bg-card md:hidden"
                  aria-label="Abrir menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px] bg-background text-foreground border-border">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4" /> Blindagem 360º
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-2 flex flex-col gap-1 text-sm">
                  {user?.email && (
                    <p className="px-2 pb-2 text-xs text-muted-foreground truncate">{user.email}</p>
                  )}
                  {isClient && <MobileNavItem to="/dashboard" icon={LayoutDashboard} label="Trilha" onClick={() => setMobileOpen(false)} />}
                  {isClient && <MobileNavItem to="/tarefas" icon={ClipboardList} label="Resumo / Tarefa da semana" onClick={() => setMobileOpen(false)} />}
                  <MobileNavItem to="/acompanhamento" icon={HeartPulse} label={isClient ? "Acompanhamento" : `Acompanhamento${openTickets > 0 ? ` (${openTickets})` : ""}`} onClick={() => setMobileOpen(false)} />
                  <MobileNavItem to="/documentos" icon={FileText} label={isClient ? "Documento / Aula" : "Documentos"} onClick={() => setMobileOpen(false)} />
                  {isClient && <MobileNavItem to="/perfil" icon={UserCircle} label="Perfil" onClick={() => setMobileOpen(false)} />}
                  {isStaff && <MobileNavItem to="/admin" icon={Crown} label="Admin" onClick={() => setMobileOpen(false)} />}

                  <div className="mt-3 border-t border-border/60 pt-3 flex flex-col gap-1">
                    {isStaff && (
                      <button
                        onClick={() => { setMobileOpen(false); clearActiveVertical(); navigate({ to: "/escolher-area" }); }}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-card hover:text-foreground"
                      >
                        <Compass className="h-4 w-4" /> Trocar área
                      </button>
                    )}
                    {canSwitch && (
                      <button
                        onClick={() => { setMobileOpen(false); clearViewMode(); clearActiveVertical(); navigate({ to: "/escolher-perfil" }); }}
                        className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-card hover:text-foreground"
                      >
                        <Repeat className="h-4 w-4" /> Trocar perfil
                      </button>
                    )}
                    <button
                      onClick={async () => { setMobileOpen(false); clearViewMode(); clearActiveVertical(); await signOut(); router.invalidate(); navigate({ to: "/login" }); }}
                      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-card hover:text-foreground"
                    >
                      <LogOut className="h-4 w-4" /> Sair
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="relative mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}

function MobileNavItem({ to, icon: Icon, label, onClick }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; onClick?: () => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-card hover:text-foreground"
      activeProps={{ className: "bg-card text-foreground font-medium" }}
    >
      <Icon className="h-4 w-4" /> {label}
    </Link>
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
