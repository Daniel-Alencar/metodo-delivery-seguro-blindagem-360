import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Blindagem 360º" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data: signIn, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message);
      return;
    }
    // Pick destination based on roles
    const userId = signIn.user!.id;
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (roleRows ?? []).map((r) => r.role as string);
    const isAdmin = roles.includes("admin");
    const isMentor = roles.includes("mentor");
    sessionStorage.removeItem("viewAs");
    setLoading(false);
    if (isAdmin && isMentor) {
      navigate({ to: "/escolher-perfil" });
    } else if (isAdmin || isMentor) {
      navigate({ to: "/admin" });
    } else {
      navigate({ to: "/dashboard" });
    }
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Início
        </Link>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ShieldCheck className="h-4 w-4" /> Blindagem 360º
        </div>
      </header>

      <main className="relative mx-auto flex max-w-md flex-col px-6 pt-10 pb-20">
        <h1 className="text-3xl font-semibold tracking-tight text-gradient">Entrar na plataforma</h1>
        <p className="mt-2 text-sm text-muted-foreground">Acesse sua trilha do Método Delivery Seguro™.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-foreground/40"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Senha</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-foreground/40"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full rounded-full bg-foreground py-3 text-sm font-medium text-background disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link to="/signup" className="text-foreground hover:underline">Criar acesso</Link>
        </p>
      </main>
    </div>
  );
}
