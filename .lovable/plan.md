## Objetivo

Popular a vertical `pet-shop` com toda a estrutura curricular do **Método Pet Shop Seguro — MPS**, deixando títulos, resumos e documentos sugeridos prontos para o mentor preencher o conteúdo pelo painel já existente (`CurriculumManager`).

**Sem alterações de estrutura, sem novos componentes, sem novo código.** Apenas dados.

## Escopo

### 1. Módulos (4 registros em `modules`, `vertical = 'pet-shop'`)

| Mês | Título |
|---|---|
| 1 | Direito Societário e Organização Patrimonial |
| 2 | Compliance Trabalhista e Operacional |
| 3 | Proteção do Consumidor e Responsabilidade Civil Veterinária |
| 4 | Gestão de Crises, Reputação Digital e Defesa Estratégica |

Cada módulo recebe descrição curta (1–2 linhas) com o foco do mês.

### 2. Encontros (16 registros em `weeks`, 4 por módulo)

Cada `week` é criada com:
- `week_index` (1–4 dentro do módulo)
- `title` (título do encontro conforme briefing do usuário)
- `summary` (1 linha de resumo já sugerida)
- `agenda` e `homework` ficam **em branco** para o mentor preencher
- `is_checkpoint = true` no encontro 4 de cada módulo (fechamento de mês)

Títulos seguem exatamente o briefing fornecido (ex: "Escolha do tipo societário ideal", "Blindagem patrimonial do sócio veterinário", "Consultas, vacinas e exames", "Reclamações no ReclameAqui e redes sociais", etc.).

### 3. Documentos sugeridos (~28 registros em `documents`)

Cada documento é criado como **placeholder vinculado ao `week_id` correto**, com:
- `title` (nome do modelo conforme briefing — ex: "Contrato Social MPS", "Acordo de Sócios Veterinários", "Termo de Consentimento Cirúrgico", "Modelo de Contranotificação Extrajudicial para Tutores")
- `description` (1 linha explicando o uso)
- `body = NULL` (mentor preenche depois pelo editor existente)
- `version = 'v1'`

### 4. Itens de compliance (opcional, ~8–12 registros em `compliance_items`)

Itens essenciais derivados dos encontros-chave (ex: "Contrato Social registrado", "Acordo de Sócios assinado", "POPs sanitários implementados", "Política de Privacidade publicada", "Termos de consentimento em uso"), com pesos 1–10 e `vertical = 'pet-shop'`. Cada item linkado à `week_id` correspondente.

## Como será entregue

Uma única migration SQL com `INSERT` em cascata usando CTEs para resolver os IDs dos módulos → encontros → documentos → compliance items, em uma transação só. Idempotente via `ON CONFLICT DO NOTHING` quando aplicável.

## O que NÃO está incluído (fica para depois, conforme acordado)

- Corpo (`body`) dos documentos — modelos jurídicos completos. Será o **item 3** quando você aprovar, em ondas (Módulo 1 primeiro como amostra).
- Conteúdo das agendas e tarefas dos encontros — mentor preenche pelo painel ou geramos depois em onda separada.

## Resultado prático após a migration

- Mentor abre `/admin` → aba currículo → seleciona "Pet Shop" → vê os 4 módulos com 16 encontros titulados e ~28 modelos de documento listados.
- Aluno matriculado em `pet-shop` vê a trilha completa no dashboard, com os encontros corretamente nomeados.
- Compliance Card do aluno já mostra os itens MPS desde o dia 1.

## Detalhes técnicos

- Tabelas afetadas: `modules`, `weeks`, `documents`, `compliance_items` — todas já existem.
- Nenhuma alteração de schema, RLS, função ou trigger.
- Nenhum arquivo `.tsx` modificado.
- O `CurriculumManager.tsx` já trata `vertical = 'pet-shop'` (seletor existente).
