import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pagamento/sucesso")({
  head: () => ({ meta: [{ title: "Pagamento confirmado — Blindagem 360°" }, { name: "robots", content: "noindex" }] }),
  component: PagamentoSucessoPage,
});

function PagamentoSucessoPage() {
  const [checking, setChecking] = useState(true);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 8;

    async function poll() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setChecking(false); return; }

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (sub?.status === "active") {
        setEnrolled(true);
        setChecking(false);
        return;
      }

      attempts += 1;
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
      } else {
        setChecking(false);
      }
    }

    poll();
  }, []);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <header className="relative mx-auto flex max-w-7xl items-center px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ShieldCheck className="h-4 w-4" /> Blindagem 360°
        </Link>
      </header>

      <main className="relative mx-auto flex max-w-md flex-col items-center px-6 pt-16 pb-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10">
          <CheckCircle2 className="h-8 w-8 text-emerald-300" />
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-gradient">
          Pagamento confirmado!
        </h1>

        {checking ? (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Ativando seu acesso, aguarde um momento...
            </p>
            <Loader2 className="mt-4 h-5 w-5 animate-spin text-muted-foreground" />
          </>
        ) : enrolled ? (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Seu acesso foi ativado com sucesso. Bem-vindo à Blindagem 360°!
            </p>
            <Link
              to="/dashboard"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02]"
            >
              Acessar minha trilha
            </Link>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              Seu pagamento foi recebido. A ativação do acesso pode levar alguns minutos.
              Você receberá uma confirmação em breve.
            </p>
            <Link
              to="/dashboard"
              className="mt-8 inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02]"
            >
              Ir para o painel
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
