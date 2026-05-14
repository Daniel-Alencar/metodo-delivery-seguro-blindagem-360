import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Criar acesso — Blindagem 360º" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName, company_name: companyName, phone },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      // create pending enrollment
      await supabase.from("enrollments").insert({
        user_id: data.user!.id,
        vertical: "food-service",
        status: "pending",
      });
      navigate({ to: "/dashboard" });
    } else {
      setInfo("Conta criada. Verifique seu e-mail para confirmar e poder entrar.");
      setLoading(false);
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
        <h1 className="text-3xl font-semibold tracking-tight text-gradient">Criar acesso</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cadastro inicial. Após criar a conta, sua ativação será aprovada para liberar a trilha.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Field label="Nome completo" value={fullName} onChange={setFullName} required />
          <Field label="Empresa / razão social" value={companyName} onChange={setCompanyName} />
          <Field label="Telefone (WhatsApp)" value={phone} onChange={setPhone} />
          <Field label="E-mail" type="email" value={email} onChange={setEmail} required />
          <Field label="Senha (mín. 6 caracteres)" type="password" value={password} onChange={setPassword} required />
          {error && <p className="text-sm text-red-300">{error}</p>}
          {info && <p className="text-sm text-emerald-300">{info}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full rounded-full bg-foreground py-3 text-sm font-medium text-background disabled:opacity-50"
          >
            {loading ? "Criando..." : "Criar minha conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta? <Link to="/login" className="text-foreground hover:underline">Entrar</Link>
        </p>
      </main>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-foreground/40"
      />
    </div>
  );
}
