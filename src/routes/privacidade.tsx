import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade (LGPD) — Blindagem 360º" },
      { name: "description", content: "Política de privacidade e tratamento de dados pessoais conforme a LGPD (Lei nº 13.709/2018)." },
      { property: "og:title", content: "Política de Privacidade (LGPD) — Blindagem 360º" },
      { property: "og:description", content: "Como a Blindagem 360º coleta, usa e protege seus dados pessoais conforme a LGPD." },
      { property: "og:url", content: "https://metodo-delivery-seguro-blindagem-360.lovable.app/privacidade" },
    ],
    links: [
      { rel: "canonical", href: "https://metodo-delivery-seguro-blindagem-360.lovable.app/privacidade" },
    ],
  }),

  component: PrivacidadePage,
});

function PrivacidadePage() {
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
        <h1 className="text-3xl font-semibold tracking-tight">Política de Privacidade — LGPD</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Em conformidade com a Lei nº 13.709/2018 (LGPD). Última atualização: 14/05/2026.
        </p>

        <article className="prose prose-invert mt-8 max-w-none space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-base font-semibold text-foreground">1. Controlador</h2>
            <p>
              <b>Dr. Glauber Tiago Giachetta</b>, titular do método Blindagem 360º, é o controlador dos
              dados pessoais tratados nesta Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">2. Dados coletados</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li><b>Cadastro</b>: nome completo, CPF, e-mail, telefone/WhatsApp, empresa.</li>
              <li><b>Uso</b>: progresso na trilha, datas de aprovação de semanas, registros de mentoria.</li>
              <li><b>Pagamento</b>: status do acompanhamento (não armazenamos dados de cartão — processados por gateway PCI-DSS).</li>
              <li><b>Técnicos</b>: logs de acesso, IP e dispositivo para fins de segurança.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">3. Bases legais (art. 7º LGPD)</h2>
            <ul className="ml-5 list-disc space-y-1">
              <li><b>Execução de contrato</b>: para entregar a mentoria contratada.</li>
              <li><b>Consentimento</b>: para envio de comunicações promocionais.</li>
              <li><b>Obrigação legal</b>: guarda de registros conforme Marco Civil da Internet.</li>
              <li><b>Legítimo interesse</b>: prevenção a fraude e proteção da propriedade intelectual (CPF como marca d'água nos PDFs).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">4. Compartilhamento</h2>
            <p>
              Não vendemos dados. Compartilhamos apenas com operadores essenciais: hospedagem,
              processador de pagamentos (Stripe), e-mail transacional e canal WhatsApp. Cada operador
              opera sob contrato de tratamento de dados.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">5. Marketing e comunicações</h2>
            <p>
              Você poderá receber comunicações <b>exclusivamente sobre o próprio sistema</b> (novas
              turmas, atualizações de método, eventos do método). <b>Não enviamos publicidade de
              terceiros nem cedemos sua base.</b> O consentimento é opcional e revogável a qualquer
              momento na sua área "Conta".
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">6. Seus direitos (art. 18 LGPD)</h2>
            <p>Você pode, a qualquer momento, solicitar:</p>
            <ul className="ml-5 list-disc space-y-1">
              <li>Confirmação e acesso aos seus dados;</li>
              <li>Correção de dados incompletos ou desatualizados;</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
              <li>Portabilidade;</li>
              <li>Revogação do consentimento;</li>
              <li>Informação sobre compartilhamentos.</li>
            </ul>
            <p>
              Para exercer qualquer direito, contate o seu mentor pela plataforma ou solicite via área
              "Conta".
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">7. Retenção</h2>
            <p>
              Dados de cadastro e progresso são mantidos durante a vida útil da conta. Após arquivamento
              (7 dias após término do acompanhamento sem renovação), preservamos apenas o mínimo legal
              por 5 anos (art. 27 CDC) e eliminamos o restante.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">8. Segurança</h2>
            <p>
              Empregamos criptografia em trânsito (TLS), criptografia em repouso, RLS por usuário no
              banco, controle granular de papéis (admin / mentor / aluno) e auditoria de ações dos
              mentores.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">9. Encarregado (DPO)</h2>
            <p>
              Encarregado pelo tratamento de dados: <b>Dr. Glauber Tiago Giachetta</b>. Solicitações
              relacionadas à LGPD devem ser feitas pelos canais oficiais da plataforma.
            </p>
          </section>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
