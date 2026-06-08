import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import { normalizeEmail } from "@/lib/email-utils";
import { adminResetPassword } from "@/lib/admin-reset-password.functions";

export const Route = createFileRoute("/esqueci-senha")({
  head: () => ({ meta: [{ title: "Recuperar senha — Blindagem 360º" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const doReset = useServerFn(adminResetPassword);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setInfo(null);
    const normalized = normalizeEmail(email);
    if (normalized !== email) setEmail(normalized);
    try {
      await doReset({ data: { email: normalized, newPassword } });
      setInfo("Se este e-mail estiver cadastrado, a senha foi redefinida com sucesso. Volte ao login para entrar.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir senha.");
    }
    setLoading(false);
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ShieldCheck className="h-4 w-4" /> Blindagem 360º
        </div>
      </header>
      <main className="relative mx-auto flex max-w-md flex-col px-6 pt-10 pb-20">
        <h1 className="text-3xl font-semibold tracking-tight text-gradient">Recuperar senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">Informe seu e-mail e escolha uma nova senha.</p>
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
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Nova senha (mín. 6 caracteres)</label>
            <div className="mt-1">
              <PasswordInput value={newPassword} onChange={setNewPassword} required autoComplete="new-password" />
            </div>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          {info && <p className="text-sm text-emerald-300">{info}</p>}
          <button type="submit" disabled={loading}
            className="w-full rounded-full bg-foreground py-3 text-sm font-medium text-background disabled:opacity-50">
            {loading ? "Redefinindo..." : "Redefinir senha"}
          </button>
        </form>
      </main>
    </div>
  );
}
