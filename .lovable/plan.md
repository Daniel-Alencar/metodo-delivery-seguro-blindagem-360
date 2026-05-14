
## Decisões confirmadas

- Pagamento do acompanhamento: **manual** por enquanto (admin libera 30 dias com 1 clique).
- Ciclo: **30 dias** por pagamento.
- Saída com PDF: **7 dias de carência** depois do download.
- PDF: **só os 40 modelos** (capa + sumário + corpo de cada modelo agrupado por encontro).
- Novidade: ao logar com `glaubertgia@gmail.com`, perguntar se quer entrar como **mentor** ou como **super admin**. Outros mentores vão direto para `/admin`.

## O que vai ser implementado

### 1. Seletor de papel no login (super admin)

- Após login, se o usuário é admin **e** mentor (caso seu), abre uma tela `/escolher-perfil` com dois botões:
  - **Entrar como Super Admin** → vai para `/admin` em "modo admin completo" (gerencia mentores, currículo, planos, libera acompanhamento).
  - **Entrar como Mentor** → vai para `/admin` em "modo mentor" (só vê pendências de aprovação e turma; esconde gestão de mentores e currículo).
- O modo escolhido fica salvo em `sessionStorage` (`viewAs: 'admin' | 'mentor'`) e tem botão **"Trocar perfil"** no header para alternar sem precisar deslogar.
- Mentores comuns (sem papel admin) vão direto para `/admin` e nem veem essa tela.
- Mentorados (cliente) continuam indo para `/dashboard`.

### 2. Conclusão da implementação ("graduado")

- Novos valores no enum `enrollment_status`: `graduated`, `archived`.
- Função `maybe_graduate_enrollment(_enrollment_id)`: chamada toda vez que uma `week_progress` é aprovada; se as 16 semanas estão `approved`, marca `enrollments.status = 'graduated'`, `completed_at = now()`.
- Quando o mentorado entra em `/dashboard` e está `graduated` sem ter escolhido próximo passo, abre tela **"Você concluiu a implementação"** com 2 cards:
  - **Continuar com Acompanhamento** (pré-pago, 30 dias).
  - **Baixar manual completo e encerrar** (PDF + 7 dias de carência).

### 3. Plano de Acompanhamento (pré-pago manual)

- Novo registro em `plans`: `food_followup`, mensal, R$ a definir (campo já editável).
- Nova coluna `subscriptions.followup_paid_until timestamptz`.
- Função `admin_extend_followup(_user_id, _days)` (admin only) — adiciona dias a partir do maior entre `now()` e `followup_paid_until`.
- Nova rota `/_authenticated/acompanhamento`: ativa quando `followup_paid_until > now()`. Mostra:
  - Todos os 40 modelos liberados (sem trava por encontro).
  - Histórico das 16 aulas (read-only).
  - Canal de dúvidas (reaproveita `incidents` com nova categoria `consultation`).
  - Contador "Acompanhamento ativo até DD/MM/AAAA".
- RLS de `documents`: além das regras atuais, libera **todos** os modelos quando `enrollment.status='graduated'` E `followup_paid_until > now()`.
- Quando expira, a rota mostra "Renovar acompanhamento" e bloqueia o conteúdo (histórico fica preservado).

### 4. Exportação PDF dos 40 modelos

- Server function `POST /api/export-manual` (TanStack server route, edge-compatible) que monta HTML dos modelos e gera PDF via `@react-pdf/renderer` (compatível com Workers).
- Conteúdo: capa com nome do mentorado e data + sumário dos 16 encontros + corpo de cada modelo agrupado por encontro.
- Botão disponível em 3 lugares: tela "Próximo passo", `/acompanhamento` (a qualquer momento) e na tela de saída.

### 5. Saída com 7 dias de carência

- Quando o mentorado clica "Baixar manual e encerrar":
  - Gera o PDF.
  - Marca `enrollments.status = 'archiving'` e `enrollments.archive_at = now() + interval '7 days'`.
  - Por 7 dias o acesso continua normal com aviso vermelho "Sua conta será encerrada em DD/MM".
  - Botão "Cancelar encerramento" reverte para `graduated`.
  - Após 7 dias (cron diário em `/api/public/cron-archive`), status vira `archived` e o acesso é cortado.

### 6. Re-entrada do mentorado arquivado

- Login normal funciona. Se `status='archived'` e `completed_at IS NOT NULL`, cai em tela **"Bem-vindo de volta, {nome}"**:
  - Mostra resumo: "Você concluiu a implementação em DD/MM/AAAA".
  - Único botão: **Reativar acompanhamento (R$ X / 30 dias)**.
  - Ao confirmar (manual no admin por enquanto), volta para `graduated` + `followup_paid_until = now() + 30 dias`.
- Admin enxerga essas contas em `/admin` numa nova aba **Ex-mentorados** com botão "Reativar 30 dias".

### 7. Painel admin — novas seções

- Aba **Acompanhamento**: lista mentorados graduados, com `followup_paid_until`, botão "+30 dias", "Ver dúvidas".
- Aba **Encerramentos**: lista contas em carência (`archiving`) e arquivadas, botão "Reativar".
- Filtros visíveis só no modo "Super Admin".

## Mudanças técnicas (resumo)

```text
DB
├─ enum enrollment_status: + 'graduated', 'archiving', 'archived'
├─ enrollments: + archive_at timestamptz
├─ subscriptions: + followup_paid_until timestamptz
├─ plans: insert food_followup
├─ incident category: + 'consultation'
├─ trigger ou função pós-aprovação: maybe_graduate_enrollment
├─ admin_extend_followup(_user_id, _days)
├─ admin_request_archive(_user_id) / admin_cancel_archive(_user_id)
├─ daily_archive_expired() chamada por cron público
└─ RLS documents: liberação total quando graduated + followup ativo

UI
├─ /escolher-perfil (novo) — só para usuários admin+mentor
├─ AppShell: botão "Trocar perfil" + indicador de modo atual
├─ /dashboard: tela "Próximo passo" quando graduated
├─ /acompanhamento (novo): área pós-graduação
├─ /admin: novas abas Acompanhamento / Encerramentos / Ex-mentorados
└─ Modo "mentor view": esconde gestão de currículo e mentores

Server
├─ POST /api/export-manual — gera PDF (react-pdf, edge-compatible)
└─ POST /api/public/cron-archive — arquiva contas com archive_at < now()

Pacotes
└─ bun add @react-pdf/renderer
```

Tudo aprovado — ao iniciar a build vou criar a migration primeiro, depois o seletor de perfil, fluxo de graduação, área de acompanhamento, exportação PDF e cron de arquivamento, nessa ordem.
