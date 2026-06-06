import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, CheckCircle2, ArrowLeft, Loader2, CreditCard, RefreshCw, Star, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { createMpCheckout } from "@/lib/mp-checkout.functions";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Escolher plano — Blindagem 360°" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const doCheckout = useServerFn(createMpCheckout);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<"plano-a" | "plano-b" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate({ to: "/login" });
        return;
      }
      setUser(data.user);
      setLoading(false);
    });
  }, [navigate]);

  async function handlePay(planCode: "plano-a" | "plano-b") {
    setError(null);
    setPaying(planCode);
    try {
      const vertical = (user?.user_metadata?.vertical as string | undefined) ?? "food-service";
      const result = await doCheckout({ data: { planCode, vertical } });
      window.location.href = result.checkoutUrl;
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : (e as { message?: string })?.message ?? "Erro ao criar pagamento. Tente novamente.";
      setError(msg);
      setPaying(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ShieldCheck className="h-4 w-4" /> Blindagem 360°
        </div>
        <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
      </header>

      <main className="relative mx-auto max-w-4xl px-6 pt-8 pb-20">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ative seu acesso</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl text-gradient">
          Escolha seu plano
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Pagamento 100% seguro via Mercado Pago. PIX, cartão de crédito e boleto disponíveis.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* Plano A */}
          <div className="relative flex flex-col rounded-2xl border border-border bg-card/60 p-6">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Plano Consultoria</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold tracking-tight">R$ 497</span>
              <span className="mb-1 text-sm text-muted-foreground">pagamento único</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Parcelável em até 12× no cartão</p>

            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {[
                "Acesso completo às 16 aulas",
                "Documentos e modelos de cada encontro",
                "4 meses de consultoria estruturada",
                "Acompanhamento de implementação semanal",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePay("plano-a")}
              disabled={paying !== null}
              className="mt-6 w-full rounded-full bg-foreground py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {paying === "plano-a" ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Redirecionando...
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <CreditCard className="h-4 w-4" /> Assinar Plano A — R$ 497
                </span>
              )}
            </button>
          </div>

          {/* Plano B */}
          <div className="relative flex flex-col rounded-2xl border border-cyan-500/40 bg-cyan-500/5 p-6">
            <div className="absolute -top-3 right-5 rounded-full border border-cyan-500/40 bg-cyan-500/20 px-3 py-0.5 text-[10px] uppercase tracking-wider text-cyan-300">
              Mais completo
            </div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Plano Acompanhamento</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold tracking-tight">R$ 97</span>
              <span className="mb-1 text-sm text-muted-foreground">/mês</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Assinatura mensal · cancele quando quiser</p>

            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {[
                "Tudo do Plano Consultoria",
                "Acompanhamento constante e personalizado",
                "Canal direto com a mentoria",
                "Orientações e dúvidas sem limite",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-muted-foreground">
                  <Star className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                  {item}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handlePay("plano-b")}
              disabled={paying !== null}
              className="mt-6 w-full rounded-full bg-cyan-500 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
            >
              {paying === "plano-b" ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Redirecionando...
                </span>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  <RefreshCw className="h-4 w-4" /> Assinar Plano B — R$ 97/mês
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          Pagamento processado com segurança pelo Mercado Pago. Seus dados financeiros são criptografados e nunca passam pelo nosso servidor.
        </div>
      </main>
    </div>
  );
}
