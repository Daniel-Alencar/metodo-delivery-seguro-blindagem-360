import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";
import { normalizeEmail } from "@/lib/email-utils";

type SignupSearch = { vertical?: string; ref?: string };
export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Criar acesso — Blindagem 360º" }] }),
  validateSearch: (s: Record<string, unknown>): SignupSearch => ({
    vertical: typeof s.vertical === "string" && (s.vertical === "pet-shop" || s.vertical === "food-service") ? s.vertical : undefined,
    ref: typeof s.ref === "string" ? s.ref.trim().toUpperCase().slice(0, 16) : undefined,
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const chosenVertical = search.vertical ?? "food-service";
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [refCode, setRefCode] = useState(search.ref ?? "");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptLgpd, setAcceptLgpd] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [signedUpEmail, setSignedUpEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!acceptTerms || !acceptLgpd) {
      setError("Você precisa ler e aceitar os Termos de Uso e a Política LGPD.");
      return;
    }
    const cpfDigits = cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      setError("Informe um CPF válido (11 dígitos).");
      return;
    }
    setLoading(true);
    const normalizedEmail = normalizeEmail(email);
    if (normalizedEmail !== email) setEmail(normalizedEmail);
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/email-confirmado`,
        data: { full_name: fullName, company_name: companyName, phone, cpf: cpfDigits },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const userId = data.user?.id;
    if (userId) {
      await supabase.from("profiles").update({
        cpf: cpfDigits,
        cnpj: cnpj.replace(/\D/g, "") || null,
        accepted_terms_at: new Date().toISOString(),
        accepted_lgpd_at: new Date().toISOString(),
        marketing_consent: marketingConsent,
      }).eq("id", userId);
    }
    if (data.session) {
      // Sessão imediata só ocorre quando auto-confirm está ligado. Em produção
      // o usuário precisa confirmar o e-mail antes — tratamos como pendente.
      if (refCode.trim()) {
        try { await supabase.rpc("apply_referral_code", { _code: refCode.trim() }); } catch { /* ignore */ }
      }
      await supabase.from("enrollments").insert({
        user_id: data.user!.id,
        vertical: chosenVertical,
        status: "pending",
      });
      navigate({ to: "/dashboard" });
    } else {
      if (refCode.trim()) {
        try { localStorage.setItem("pendingReferralCode", refCode.trim().toUpperCase()); } catch { /* ignore */ }
      }
      setSignedUpEmail(normalizedEmail);
      setInfo("Conta criada! Enviamos um e-mail de confirmação para " + normalizedEmail + ". Verifique sua caixa de entrada (e a pasta de spam) para ativar seu acesso.");
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendMsg(null);
    const target = normalizeEmail(signedUpEmail ?? email);
    if (!target || !target.includes("@")) {
      setResendMsg("Informe seu e-mail acima para reenviar a confirmação.");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: target,
      options: { emailRedirectTo: `${window.location.origin}/email-confirmado` },
    });
    setResending(false);
    if (error) setResendMsg(`Não foi possível reenviar: ${error.message}`);
    else setResendMsg("E-mail de confirmação reenviado. Verifique sua caixa de entrada e o spam.");
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
          <Field label="Nome completo (quem receberá o treinamento)" value={fullName} onChange={setFullName} required />
          <Field label="CPF (apenas números)" value={cpf} onChange={setCpf} required />
          <Field label="Empresa / razão social" value={companyName} onChange={setCompanyName} />
          <Field label="CNPJ (apenas números)" value={cnpj} onChange={setCnpj} />
          <Field label="Telefone (WhatsApp)" value={phone} onChange={setPhone} />
          <Field label="E-mail" type="email" value={email} onChange={setEmail} required />
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Senha (mín. 6 caracteres)</label>
            <div className="mt-1">
              <PasswordInput value={password} onChange={setPassword} required autoComplete="new-password" />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Código de indicação (opcional)</label>
            <input
              value={refCode}
              onChange={(e) => setRefCode(e.target.value.toUpperCase().slice(0, 16))}
              placeholder="Ex: AB12CD34"
              className="mt-1 w-full rounded-md border border-border bg-card/60 px-3 py-2 text-sm font-mono tracking-widest outline-none focus:border-foreground/40"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Se alguém te indicou, informe o código aqui.</p>
          </div>


          <div className="space-y-3 rounded-md border border-border bg-card/40 p-4 text-xs">
            <Checkbox checked={acceptTerms} onChange={setAcceptTerms}>
              Li e concordo com os{" "}
              <Link to="/termos" target="_blank" className="text-foreground underline">
                Termos de Uso
              </Link>
              .
            </Checkbox>
            <Checkbox checked={acceptLgpd} onChange={setAcceptLgpd}>
              Li e concordo com a{" "}
              <Link to="/privacidade" target="_blank" className="text-foreground underline">
                Política de Privacidade (LGPD)
              </Link>
              .
            </Checkbox>
            <Checkbox checked={marketingConsent} onChange={setMarketingConsent}>
              Autorizo receber comunicações de <b>publicidade e promoções exclusivamente do próprio sistema</b>{" "}
              Blindagem 360º (opcional, revogável a qualquer momento).
            </Checkbox>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}
          {info && <p className="text-sm text-emerald-300">{info}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full rounded-full bg-foreground py-3 text-sm font-medium text-background disabled:opacity-50"
          >
            {loading ? "Criando..." : "Criar minha conta"}
          </button>
        </form>

        {(signedUpEmail || info) && (
          <div className="mt-6 rounded-md border border-border bg-card/40 p-4 text-sm">
            <p className="text-muted-foreground">Não recebeu o e-mail de confirmação?</p>
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
        )}

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

function Checkbox({
  checked, onChange, children,
}: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 leading-relaxed text-muted-foreground">
      <input
        type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border bg-background"
      />
      <span>{children}</span>
    </label>
  );
}
