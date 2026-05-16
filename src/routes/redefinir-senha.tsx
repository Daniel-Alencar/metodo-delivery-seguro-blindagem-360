import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({ meta: [{ title: "Definir nova senha — Blindagem 360º" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setInfo(null);
    if (password.length < 6) { setError("A senha deve ter no mínimo 6 caracteres."); return; }
    if (password !== confirm) { setError("As senhas não coincidem."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setInfo("Senha redefinida com sucesso. Redirecionando...");
    setTimeout(() => navigate({ to: "/dashboard" }), 1200);
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Login
        </Link>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ShieldCheck className="h-4 w-4" /> Blindagem 360º
        </div>
      </header>
      <main className="relative mx-auto flex max-w-md flex-col px-6 pt-10 pb-20">
        <h1 className="text-3xl font-semibold tracking-tight text-gradient">Definir nova senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">Escolha uma nova senha de acesso.</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Nova senha</label>
            <div className="mt-1"><PasswordInput value={password} onChange={setPassword} required autoComplete="new-password" /></div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Confirmar nova senha</label>
            <div className="mt-1"><PasswordInput value={confirm} onChange={setConfirm} required autoComplete="new-password" /></div>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          {info && <p className="text-sm text-emerald-300">{info}</p>}
          <button type="submit" disabled={loading}
            className="w-full rounded-full bg-foreground py-3 text-sm font-medium text-background disabled:opacity-50">
            {loading ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </main>
    </div>
  );
}
