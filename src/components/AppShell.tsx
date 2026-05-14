import { Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, LayoutDashboard, FileText, AlertTriangle, Crown, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { signOut, user, isStaff } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <header className="relative border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <ShieldCheck className="h-4 w-4" /> Blindagem 360º
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <NavItem to="/dashboard" icon={LayoutDashboard} label="Trilha" />
            <NavItem to="/documentos" icon={FileText} label="Documentos" />
            <NavItem to="/incidentes" icon={AlertTriangle} label="Incidentes" />
            {isStaff && <NavItem to="/admin" icon={Crown} label="Admin" />}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted-foreground md:inline">{user?.email}</span>
            <button
              onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
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
