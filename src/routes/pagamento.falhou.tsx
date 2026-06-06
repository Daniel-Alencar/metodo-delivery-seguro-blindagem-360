import { createFileRoute, Link } from "@tanstack/react-router";
import { XCircle, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/pagamento/falhou")({
  head: () => ({ meta: [{ title: "Pagamento não aprovado — Blindagem 360°" }, { name: "robots", content: "noindex" }] }),
  component: PagamentoFalouPage,
});

function PagamentoFalouPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <header className="relative mx-auto flex max-w-7xl items-center px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ShieldCheck className="h-4 w-4" /> Blindagem 360°
        </Link>
      </header>

      <main className="relative mx-auto flex max-w-md flex-col items-center px-6 pt-16 pb-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-500/40 bg-red-500/10">
          <XCircle className="h-8 w-8 text-red-300" />
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Pagamento não aprovado</h1>

        <p className="mt-3 text-sm text-muted-foreground">
          Seu pagamento não foi aprovado. Isso pode acontecer por saldo insuficiente, dados incorretos
          ou bloqueio do cartão. Por favor, tente novamente com outro método de pagamento.
        </p>

        <Link
          to="/checkout"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02]"
        >
          Tentar novamente
        </Link>

        <Link
          to="/dashboard"
          className="mt-3 inline-flex items-center justify-center rounded-full border border-border bg-card/60 px-6 py-3 text-sm font-medium transition-transform hover:scale-[1.02]"
        >
          Voltar ao painel
        </Link>
      </main>
    </div>
  );
}
