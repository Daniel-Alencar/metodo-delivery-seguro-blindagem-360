import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";
import { normalizeEmail } from "@/lib/email-utils";
import { getSignupEmailStatus } from "@/lib/signup-status.functions";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — Blindagem 360º" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const checkEmailStatus = useServerFn(getSignupEmailStatus);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResendMsg(null);
    setNeedsConfirm(false);
    const normalized = normalizeEmail(email);
    if (normalized !== email) setEmail(normalized);
    const { data: signIn, error } = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (error) {
      setLoading(false);
      const msg = error.message.toLowerCase();
      if (msg.includes("not confirmed") || msg.includes("email not confirmed")) {
        setNeedsConfirm(true);
        setError("Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou reenvie o e-mail abaixo.");
      } else if (error.message === "Invalid login credentials") {
        setError("E-mail ou senha incorretos.");
      } else {
        setError(error.message);
      }
      return;
    }
    const userId = signIn.user!.id;
    const { data: roleRows } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roles = (roleRows ?? []).map((r) => r.role as string);
    const isAdmin = roles.includes("admin");
    const isMentor = roles.includes("mentor");
    sessionStorage.removeItem("viewAs");
    setLoading(false);
    if (isAdmin && isMentor) navigate({ to: "/escolher-perfil" });
    else if (isAdmin || isMentor) navigate({ to: "/admin" });
    else navigate({ to: "/dashboard" });
  }

  async function handleResend() {
    setResendMsg(null);
    const normalized = normalizeEmail(email);
    if (!normalized || !normalized.includes("@")) {
      setResendMsg("Informe seu e-mail acima para reenviar a confirmação.");
      return;
    }
    setResending(true);
    const status = await checkEmailStatus({ data: { email: normalized } });
    if (!status.exists) {
      setResending(false);
      setResendMsg("Não encontrei cadastro pendente para este e-mail. Crie a conta primeiro.");
      return;
    }
    if (status.confirmed) {
      setResending(false);
      setNeedsConfirm(false);
      setResendMsg("Este e-mail já está confirmado. Se não conseguir entrar, confira a senha ou use “Esqueci minha senha”.");
      return;
    }
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalized,
      options: { emailRedirectTo: `${window.location.origin}/email-confirmado` },
    });
    setResending(false);
    if (error) {
      setResendMsg(`Não foi possível reenviar: ${error.message}`);
    } else {
      setResendMsg("E-mail de confirmação reenviado. Verifique sua caixa de entrada e o spam.");
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
        <p className="mt-2 text-sm text-muted-foreground">Acesse sua trilha do Método Blindagem360 - MB360º.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</label>
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={(e) => setEmail(normalizeEmail(e.target.value))}
              className="mt-1 w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-foreground/40"
              autoComplete="email"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Senha</label>
              <Link to="/esqueci-senha" className="text-xs text-muted-foreground hover:text-foreground">Esqueci minha senha</Link>
            </div>
            <div className="mt-1">
              <PasswordInput value={password} onChange={setPassword} required autoComplete="current-password" />
            </div>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full rounded-full bg-foreground py-3 text-sm font-medium text-background disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 rounded-md border border-border bg-card/40 p-4 text-sm">
          <p className="text-muted-foreground">
            {needsConfirm
              ? "Reenvie agora o e-mail de confirmação para ativar seu acesso."
              : "Não recebeu o e-mail de confirmação?"}
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="mt-3 inline-flex items-center justify-center rounded-full border border-border bg-card px-4 py-2 text-xs font-medium hover:bg-card/70 disabled:opacity-50"
          >
            {resending ? "Reenviando..." : "Reenviar e-mail de confirmação"}
          </button>
          {resendMsg && <p className="mt-2 text-xs text-muted-foreground">{resendMsg}</p>}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link to="/signup" className="text-foreground hover:underline">Criar acesso</Link>
        </p>
      </main>
    </div>
  );
}
