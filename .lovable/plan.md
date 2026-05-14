
## Onde estamos hoje

- Você (`glaubertgia@gmail.com`) já é **super admin**. Pode nomear mentores na seção **Equipe de mentores** dentro de `/admin`.
- Já existem **4 módulos × 4 semanas = 16 encontros** no banco, mas com títulos genéricos (Fundação Jurídica, Operação Crítica, etc.), sem plano de aula e sem nenhum modelo cadastrado.
- A página `/documentos` permite ao admin/mentor publicar documentos e vinculá-los a um módulo, mas **mostra tudo para todo mentorado ativo** — não há trava por encontro. O campo `week_id` existe na tabela `documents` mas não é usado pela UI.
- As semanas hoje só guardam `title` e `is_checkpoint`. Não há campo para “assuntos da aula”, agenda do mentor, leituras, ou checklist de implementação da semana.

## O que falta para atender seu pedido

1. **Reorganizar os 16 encontros conforme o sumário do manual** (6 módulos → 16 encontros).
2. **Plano de aula por encontro** — campos novos em `weeks`: `summary` (resumo da aula), `agenda` (tópicos guiados que o mentor cobre), `homework` (o que o mentorado implementa na semana).
3. **Modelos travados por encontro** — `documents.week_id` passa a ser obrigatório para modelos didáticos; o mentorado só enxerga um documento depois que a semana correspondente foi iniciada (status `in_progress`, `submitted` ou `approved`). Documentos sem `week_id` continuam como “biblioteca geral” se você quiser, ou os removemos — sua escolha.
4. **Painel do super admin para alimentar tudo num só lugar** — nova aba **Encontros & Modelos** em `/admin`, com:
   - Lista dos 16 encontros agrupados por módulo.
   - Edição inline do plano de aula (resumo, agenda, tarefa da semana).
   - Sub-lista de **modelos do encontro** (contratos, termos, notificações, mensagens) com botão **+ Adicionar modelo** já pré-vinculado àquela semana — corpo do documento em texto/markdown, com versão.
5. **Mentorado vê “Material liberado”** — no card de cada semana no `/dashboard` aparece o número de modelos disponíveis daquele encontro com link para abrir, copiar e colar. Tudo que estiver em encontros futuros fica oculto até liberar.
6. **Mentor acompanha a turma** — `/admin` já mostra as semanas “submitted” aguardando aprovação; vou adicionar o nome do mentorado e o título do encontro para você conseguir ver de relance “Fulano terminou a Semana 5 — Delivery”.

## Mapeamento proposto: 6 módulos do sumário → 16 encontros

```
Módulo 1 — Alicerces (sociedade, marca, patrimônio)        → 2 encontros
Módulo 2 — Delivery, logística e canal digital             → 3 encontros
Módulo 3 — Equipe, escala e jornada                        → 3 encontros
Módulo 4 — Documentos que protegem o caixa                 → 3 encontros
Módulo 5 — Regras da casa, disciplina e fiscalização       → 3 encontros
Módulo 6 — Cliente, Procon, reputação e encerramento       → 2 encontros
                                                  Total → 16 encontros
```

Cada encontro nasce já com a lista dos **instrumentos do sumário** (Contrato de Motoboy, Recibo de Bag, NDA, Notificação Extrajudicial, etc.) cadastrados como documentos vazios — você só preenche o corpo de cada modelo quando quiser.

## Perguntas rápidas antes de implementar

1. **Confirma a distribuição 2-3-3-3-3-2 acima?** (Posso ajustar para qualquer outra divisão; só precisa somar 16.)
2. **Documentos sem encontro** (a “biblioteca geral”) — manter como hoje (visíveis para todo mentorado ativo) ou desativar e tudo passa a ser por encontro?
3. **Quem aprova checkpoint** — só admin, ou qualquer mentor? (Hoje qualquer mentor aprova.)

## Detalhes técnicos (para minha referência)

- Migration: `ALTER TABLE weeks ADD COLUMN summary text, ADD COLUMN agenda text, ADD COLUMN homework text;` + reescrever os 16 títulos/módulos.
- Migration: política RLS em `documents` adicionando uma cláusula que restringe o `SELECT` do `cliente` a documentos cujo `week_id` esteja entre as semanas com `week_progress.status IN ('in_progress','submitted','approved')` para a `enrollment` daquele usuário. Admin/mentor continuam vendo tudo.
- Migration: função `admin_seed_food_service_curriculum()` (rodar uma vez) que recria módulos/semanas conforme sumário e insere os instrumentos como `documents` vazios já vinculados ao `week_id` correto.
- UI: nova rota `/admin` ganha uma seção “Encontros & Modelos” com editor por semana. Página `/documentos` filtra por trava no lado do cliente também (defesa em profundidade).
- Stripe: nada toca aqui — segue desligado conforme combinado.
