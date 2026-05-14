import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Blindagem 360º" },
      { name: "description", content: "Termos de uso da plataforma Blindagem 360º — Método Delivery Seguro™." },
    ],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Início
        </Link>
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <ShieldCheck className="h-4 w-4" /> Blindagem 360º
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16">
        <h1 className="text-3xl font-semibold tracking-tight">Termos de Uso</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: 14/05/2026</p>

        <article className="prose prose-invert mt-8 max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground">1. Objeto</h2>
            <p>
              A plataforma <b>Blindagem 360º — Método Delivery Seguro™</b> ("Plataforma") é um sistema
              proprietário de mentoria, governança e proteção jurídica aplicada, desenvolvido pelo
              <b> Dr. Glauber Tiago Giachetta</b>. O acesso é pessoal, intransferível e condicionado à
              aprovação de um mentor.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">2. Conta e elegibilidade</h2>
            <p>
              O usuário declara ter mais de 18 anos, fornecer dados verídicos (incluindo CPF), e ser o
              único responsável pelo sigilo da senha. Compartilhar acesso resulta em bloqueio imediato.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">3. Propriedade intelectual</h2>
            <p>
              Todo o conteúdo — textos, modelos, contratos, vídeos, marcas, layout e código — pertence
              ao titular do método. <b>É expressamente proibida a reprodução, cópia, redistribuição,
              comercialização, engenharia reversa ou qualquer uso não autorizado</b>, sob pena de
              responsabilização <b>civil e criminal</b> nos termos da Lei nº 9.610/98 (Direitos Autorais)
              e arts. 184 e seguintes do Código Penal.
            </p>
            <p>
              Os PDFs gerados contêm marca d'água com o CPF do aluno para fins de rastreabilidade. O uso
              é estritamente pessoal.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">4. Pagamento e acompanhamento</h2>
            <p>
              O acesso à trilha principal é vitalício após aprovação. O acompanhamento mentoral é
              opcional, com ciclos de <b>30 dias</b> liberados manualmente pelo administrador. Há
              <b> 7 dias de carência</b> após o término do ciclo para exportar o PDF com os 40 modelos
              antes do arquivamento da conta.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">5. Comportamento do usuário</h2>
            <p>
              É vedado: (i) tentar invadir, sobrecarregar ou explorar vulnerabilidades; (ii) usar o
              conteúdo para concorrência direta ou criação de produto similar; (iii) divulgar prints,
              vídeos ou trechos do material em redes sociais ou cursos próprios.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">6. Limitação de responsabilidade</h2>
            <p>
              O método oferece direcionamentos e modelos. A aplicação prática em cada empresa requer
              análise por advogado/contador habilitado. A Plataforma não substitui consultoria jurídica
              individualizada e não se responsabiliza por decisões tomadas pelo usuário.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">7. Suspensão e encerramento</h2>
            <p>
              A Plataforma pode suspender ou encerrar o acesso em caso de violação destes termos, com
              notificação prévia quando possível. O usuário pode encerrar sua conta a qualquer momento.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">8. Foro</h2>
            <p>
              Fica eleito o foro da comarca do titular do método para dirimir quaisquer controvérsias,
              com renúncia a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
