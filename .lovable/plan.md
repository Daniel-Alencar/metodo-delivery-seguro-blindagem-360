# Plano de implementação

Vou agrupar em 6 frentes. Tudo é feito agora; o Stripe automático para liberar acompanhamento fica preparado mas em modo TESTE (igual hoje).

---

## 1) Acompanhamento como sistema de chamados (substitui "Incidentes")

**Banco**
- Nova tabela `support_tickets` com: `user_id` (cliente), `enrollment_id`, `mentor_id` (responsável — herdado da matrícula), `title`, `body`, `status` (`open`, `answered`, `closed`), `opened_at`, `answered_at`, `closed_at`, `closed_by`. **Nada é deletado** — só transições de status com timestamp.
- Nova tabela `support_ticket_messages` para cada resposta (cliente ↔ mentor ↔ admin), também append-only.
- RLS: cliente vê só os seus; mentor vê os que estão vinculados a ele + os sem mentor; admin vê tudo.
- Migrar `incidents` (categoria `consultation`) existentes para `support_tickets` para não perder histórico.

**E-mail**
- Ao abrir um chamado, dispara e-mail para o mentor vinculado (e cópia para admin) com: cliente, empresa, e a cópia integral da mensagem. Usa a infraestrutura de e-mails da Lovable Cloud (template `support-ticket-opened`).
- Quando o mentor responde, dispara e-mail para o cliente avisando que há resposta.

**UI cliente (`/acompanhamento`)**
- Continua liberado em modo TESTE (flag `FOLLOWUP_TEST_MODE = true`).
- Bloqueio de cópia: `user-select: none`, desabilita menu de contexto e Ctrl+C nos modelos/documentos exibidos aqui.
- Lista de chamados do próprio cliente, com status e datas (abertura, resposta, encerramento).

**UI mentor/admin**
- **Badge de número em destaque** no topo da navegação, ao lado de "Acompanhamento", com a contagem de chamados `open`. Clicar no badge abre uma lista de clientes com chamados pendentes. Clicar no cliente abre a aba de Acompanhamento já no chamado dele.
- Botão **"Encerrar atendimento"** (só mentor responsável ou admin). Marca `closed_at` + `closed_by`. Tudo fica gravado.
- Admin enxerga tudo (fator de segurança caso mentor não atenda).

**Remoção**
- Item "Incidentes" sai da navegação. Rota `/incidentes` redireciona para `/acompanhamento`.

---

## 2) Vínculo mentor ↔ matrícula + encerramento de aula

**Banco**
- Adicionar `assigned_mentor_id` (uuid) em `enrollments`. Regra: preenchido automaticamente no **primeiro** registro de aula/aprovação por um mentor. Mentores diferentes podem dar aula avulsa sem alterar o vínculo, mas cada aula registra `taught_by` em `mentor_audit_log` (já existe a ação `class_attended`).
- Nova função `close_week_class(enrollment_id, week_id, notes)` que: registra a presença/encerramento em `mentor_audit_log` com ação `class_closed`, marca `week_progress.status = 'approved'` quando aplicável, e vincula o mentor à matrícula se ainda não houver vínculo.

**UI**
- Aba **"Matrículas"** liberada para **mentores** também (hoje é só admin). Nova coluna: **Mentor responsável** (nome + e-mail).
- Em cada semana/aula (na visão do mentor), botão **"Encerrar aula"** que chama `close_week_class`. Fica registrado data + mentor que encerrou.

---

## 3) Modal de Documento/Aula (overflow)

- Ajustar `documentos.tsx`: o modal usa `max-h-[90vh]` mas o conteúdo interno estoura. Trocar para layout flex coluna com `<ScrollArea>` no corpo, header e footer fixos. Largura `max-w-3xl`, altura `max-h-[85vh]`, body com `flex-1 overflow-auto`. Isso resolve o "abre maior que a tela e não rola direito".

---

## 4) Captação de leads das verticais (Estética, HOF, Moda)

**Banco**
- Nova tabela `vertical_leads`: `vertical` (`estetica` | `hof` | `moda` | `food_service`), `name`, `email`, `phone`, `created_at`. RLS: insert público (anon), select só admin.

**UI público**
- Botão "Avise-me" em `estetica.tsx`, `hof.tsx`, `moda.tsx` abre um modal com nome, e-mail e telefone. Submit grava em `vertical_leads`.

**UI admin**
- Nova aba **"Leads"** (só super admin) listando todos os interessados, filtrável por vertical, com export.

---

## 5) Imagem da Food Service

- Gerar imagem (cozinha profissional / delivery / food service brasileiro) com `imagegen` e usar como hero na página `food-service.tsx`. Mesma altura/tratamento das outras verticais.

---

## 6) Preparação Stripe (sem ativar)

- Estrutura no admin para um botão "Liberar acompanhamento" continua existindo (`admin_extend_followup` já está pronto).
- Deixo um TODO claro no código de onde plugar o webhook do Stripe quando você decidir ativar. Por enquanto, `FOLLOWUP_TEST_MODE = true` mantém tudo liberado para testes — basta trocar para `false` depois.

---

## Ordem de execução

1. Migration: `support_tickets`, `support_ticket_messages`, `vertical_leads`, `enrollments.assigned_mentor_id`, função `close_week_class`, migração de `incidents` consultation.
2. Setup de e-mails (Lovable Cloud Email) + template `support-ticket-opened`.
3. UI cliente: chamados + bloqueio de cópia + lista.
4. UI mentor/admin: badge contador, lista clicável, botão encerrar, aba Matrículas para mentores com coluna mentor, botão "Encerrar aula".
5. Modal de Documento/Aula: corrigir overflow.
6. Leads: modal nos teasers + aba admin.
7. Imagem Food Service.
8. Remover item "Incidentes" do menu (rota redireciona).

---

## Observações para você decidir antes de eu começar

- **E-mails**: para os e-mails realmente saírem é preciso configurar um domínio de envio (subdomínio tipo `notify.seudominio.com`). Posso fazer agora a estrutura e te abrir o setup do domínio em seguida — os e-mails ficam enfileirados e começam a sair assim que o DNS verificar. Tudo bem?
- **"Avise-me" — confirmação por e-mail para o lead?** Quer que o interessado também receba um e-mail "recebemos seu contato" ou só registramos para você ver no admin?
- **Bloqueio de cópia** é uma camada de UI (não impede print/devtools). Tudo bem como dissuasor?

Confirme e eu sigo na ordem acima.