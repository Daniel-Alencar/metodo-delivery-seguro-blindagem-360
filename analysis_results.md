# Auditoria — O que falta no Blindagem 360º (omniapp-connect)

## Visão Geral

A plataforma já tem toda a **estrutura de frontend implementada** (rotas, componentes, layout, auth, admin). O que falta são majoritariamente **integrações externas**, **conteúdo real** e **polimentos para produção**.

---

## 1. 🔴 Integrações Críticas (Backend / Serviços Externos)

Estas integrações estão **documentadas no manual do desenvolvedor** ([manual.tsx](file:///media/engenheiro/Arquivos_Linux/Arquivos/Projects/Categorizados/Freela/Instituto%20Venditti/omniapp-connect/src/routes/manual.tsx#L337-L413)) mas **não implementadas**:

| Integração | Status | Descrição |
|---|---|---|
| **Stripe (pagamento)** | ❌ Não implementado | Pagamento de acompanhamento pós-trilha. Checkout, webhook `invoice.paid`, renovação automática de 30 dias. Hoje é **manual** (admin libera via botão). |
| **Resend (e-mail transacional)** | ❌ Não implementado | Notificações por e-mail: cadastro aprovado, semana aprovada, fim do ciclo, carência de arquivamento. |
| **WhatsApp (Meta Cloud API / Twilio)** | ❌ Não implementado | Templates HSM para notificar alunos de aprovações, liberações, etc. |
| **Cron de arquivamento** | ⚠️ Rota existe, sem agendamento | O endpoint `/api/public/cron-archive` existe, mas não há **agendamento real** (pg_cron ou serviço externo). |

> [!IMPORTANT]
> O Stripe é o mais crítico. Sem ele, o fluxo de **acompanhamento pós-trilha** depende 100% de intervenção manual do admin. O `FOLLOWUP_TEST_MODE = true` em [acompanhamento.tsx](file:///media/engenheiro/Arquivos_Linux/Arquivos/Projects/Categorizados/Freela/Instituto%20Venditti/omniapp-connect/src/routes/_authenticated/acompanhamento.tsx#L24) libera tudo para todos sem verificar pagamento.

---

## 2. 📝 Conteúdo Pendente

| Item | Status | Detalhes |
|---|---|---|
| **40 modelos/documentos (Food Service)** | ⚠️ Estrutura criada, corpo vazio | Os documentos estão cadastrados no DB (título + descrição) mas o campo `body` está vazio. O admin precisa preencher em **Admin → Currículo → Encontros & Modelos**. |
| **Modelos do Pet Shop** | ⚠️ Pode estar vazio | Vertical `pet-shop` tem módulos/semanas configuráveis, mas o conteúdo depende do preenchimento pelo admin. |
| **Resumo das aulas (`summary`)** | ⚠️ Parcial | Os campos `summary`, `agenda` e `homework` das semanas são exibidos mas podem estar vazios — preenchimento via admin. |
| **Política de Privacidade** | ✅ Página existe | [privacidade.tsx](file:///media/engenheiro/Arquivos_Linux/Arquivos/Projects/Categorizados/Freela/Instituto%20Venditti/omniapp-connect/src/routes/privacidade.tsx) |
| **Termos de Uso** | ✅ Página existe | [termos.tsx](file:///media/engenheiro/Arquivos_Linux/Arquivos/Projects/Categorizados/Freela/Instituto%20Venditti/omniapp-connect/src/routes/termos.tsx) |

---

## 3. ⚙️ Funcionalidades Incompletas ou em Modo Teste

| Funcionalidade | Localização | Problema |
|---|---|---|
| **Trava de 7 dias desligada** | [dashboard.tsx L98-109](file:///media/engenheiro/Arquivos_Linux/Arquivos/Projects/Categorizados/Freela/Instituto%20Venditti/omniapp-connect/src/routes/_authenticated/dashboard.tsx#L98-L109) | `isUnlocked()` retorna `true` para todos. O código da trava real está **comentado**. Todas as semanas ficam abertas sem aprovação prévia. |
| **Acompanhamento em modo teste** | [acompanhamento.tsx L24](file:///media/engenheiro/Arquivos_Linux/Arquivos/Projects/Categorizados/Freela/Instituto%20Venditti/omniapp-connect/src/routes/_authenticated/acompanhamento.tsx#L24) | `FOLLOWUP_TEST_MODE = true` — qualquer aluno acessa sem verificar se tem ciclo ativo. |
| **Botões "Quero contratar" / "Já sou cliente"** | [food-service.tsx L292-304](file:///media/engenheiro/Arquivos_Linux/Arquivos/Projects/Categorizados/Freela/Instituto%20Venditti/omniapp-connect/src/routes/food-service.tsx#L292-L304) | Os botões do CTA final são `<button>` sem ação — não redirecionam para `/signup` nem `/login`. |
| **Tarefas hardcoded para food-service** | [tarefas.tsx L38](file:///media/engenheiro/Arquivos_Linux/Arquivos/Projects/Categorizados/Freela/Instituto%20Venditti/omniapp-connect/src/routes/_authenticated/tarefas.tsx#L38) | Filtra módulos apenas de `food-service`, ignorando a vertical do aluno. |
| **Manual impressão hardcoded para food-service** | [manual-impressao.tsx L41](file:///media/engenheiro/Arquivos_Linux/Arquivos/Projects/Categorizados/Freela/Instituto%20Venditti/omniapp-connect/src/routes/manual-impressao.tsx#L41) | Busca apenas módulos do `food-service`, independente da vertical do aluno. |
| **Login texto hardcoded** | [login.tsx L60](file:///media/engenheiro/Arquivos_Linux/Arquivos/Projects/Categorizados/Freela/Instituto%20Venditti/omniapp-connect/src/routes/login.tsx#L60) | Diz "Método Delivery Seguro™" mesmo se o aluno é Pet Shop. |
| **Sem menu mobile** | [AppShell.tsx L39](file:///media/engenheiro/Arquivos_Linux/Arquivos/Projects/Categorizados/Freela/Instituto%20Venditti/omniapp-connect/src/components/AppShell.tsx#L39) | Menu `hidden md:flex` — em mobile, não há hamburger nem drawer. Os links de navegação simplesmente desaparecem. |
| **Sem confirmação de e-mail configurada** | - | O Supabase Auth envia e-mail de confirmação, mas o redirect está para `/dashboard`. Não há página de "e-mail confirmado com sucesso". |

---

## 4. 🔮 Verticais Futuras (Placeholder)

Estas rotas existem mas **apenas redirecionam para `/`**:

| Vertical | Rota | Status |
|---|---|---|
| Estética | `/estetica` | `redirect({ to: "/" })` |
| HOF | `/hof` | `redirect({ to: "/" })` |
| Moda | `/moda` | `redirect({ to: "/" })` |

Os hero images já existem em `src/assets/` para essas verticais (`estetica-hero.jpg`, `hof-hero.jpg`, `moda-hero.jpg`), mas as landing pages não foram criadas.

---

## 5. 🏗️ Infraestrutura & Deploy

| Item | Status |
|---|---|
| **Dockerfile (Node.js / EasyPanel)** | ✅ Corrigido nesta conversa |
| **Variáveis de ambiente** | ⚠️ Apenas Supabase configurado. Faltam: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `RESEND_API_KEY`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `CRON_WEBHOOK_SECRET` |
| **Domínio customizado** | ❓ Não verificado |
| **HTTPS / SSL** | Depende do EasyPanel |
| **Backup do Postgres** | ❌ Não configurado (PITR + dump automatizado mencionado no manual, mas não implementado) |
| **Rate limiting** | ❌ Nenhum rate limiting em rotas públicas ou auth |
| **Logs de erro em produção** | ⚠️ `console.error` apenas — sem serviço de monitoramento (Sentry, LogRocket, etc.) |

---

## 6. 📊 Resumo por Prioridade

### 🔴 Alta Prioridade (bloqueia uso real)
1. Preencher o **conteúdo dos 40 modelos/documentos** no admin
2. Reativar a **trava de 7 dias** no dashboard (descomentar o código)
3. Desligar `FOLLOWUP_TEST_MODE` e implementar o **Stripe** (ou manter manual com flag)
4. Consertar botões do **CTA do Food Service** (link para `/signup`)
5. Adicionar **menu mobile** (hamburger/drawer)

### 🟡 Média Prioridade (polimento para produção)
6. Implementar **e-mail transacional** (Resend) para notificações
7. Corrigir filtro hardcoded de `food-service` em tarefas e manual de impressão
8. Configurar o **cron de arquivamento** (pg_cron ou serviço externo)
9. Adicionar **rate limiting** nas rotas públicas
10. Configurar **monitoramento de erros** (Sentry ou similar)

### 🟢 Baixa Prioridade (futuro)
11. Implementar **integração WhatsApp**
12. Criar **landing pages** para Estética, HOF e Moda
13. Configurar **backup automatizado** do Postgres
14. Melhorar texto de login para ser dinâmico por vertical
