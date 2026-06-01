import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/email-confirmado")({
  head: () => ({
    meta: [
      { title: "E-mail confirmado — Blindagem 360º" },
      { name: "description", content: "Seu e-mail foi confirmado com sucesso. Faça login para acessar sua trilha." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmailConfirmadoPage,
});

function EmailConfirmadoPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ShieldCheck className="h-4 w-4" /> Blindagem 360º
        </Link>
      </header>

      <main className="relative mx-auto flex max-w-md flex-col items-center px-6 pt-16 pb-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10">
          <CheckCircle2 className="h-7 w-7 text-emerald-300" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-gradient">
          E-mail confirmado!
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Seu cadastro foi validado com sucesso. Agora você já pode entrar na plataforma
          Blindagem 360º e começar sua trilha.
        </p>

        <Link
          to="/login"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-transform hover:scale-[1.02]"
        >
          Fazer login
        </Link>

        <p className="mt-6 text-xs text-muted-foreground">
          Problemas para entrar?{" "}
          <Link to="/esqueci-senha" className="text-foreground hover:underline">
            Recuperar senha
          </Link>
        </p>
      </main>
    </div>
  );
}
