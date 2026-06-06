import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/pagamento/pendente")({
  head: () => ({ meta: [{ title: "Pagamento pendente — Blindagem 360°" }, { name: "robots", content: "noindex" }] }),
  component: PagamentoPendentePage,
});

function PagamentoPendentePage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <header className="relative mx-auto flex max-w-7xl items-center px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ShieldCheck className="h-4 w-4" /> Blindagem 360°
        </Link>
      </header>

      <main className="relative mx-auto flex max-w-md flex-col items-center px-6 pt-16 pb-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10">
          <Clock className="h-8 w-8 text-amber-300" />
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Pagamento em análise</h1>

        <p className="mt-3 text-sm text-muted-foreground">
          Seu pagamento está sendo processado. Isso pode levar até 2 dias úteis dependendo do método escolhido.
          Assim que for aprovado, seu acesso será ativado automaticamente.
        </p>

        <p className="mt-4 text-xs text-muted-foreground">
          Você receberá um e-mail de confirmação quando o pagamento for aprovado.
        </p>

        <Link
          to="/dashboard"
          className="mt-8 inline-flex items-center justify-center rounded-full border border-border bg-card/60 px-6 py-3 text-sm font-medium transition-transform hover:scale-[1.02]"
        >
          Voltar ao painel
        </Link>
      </main>
    </div>
  );
}
