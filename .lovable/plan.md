## Problema

Na aba **Matrículas** (`/admin`), a tabela tem 9 colunas largas (Área, Empresa, CNPJ, Treinando, E-mail, Código, Status, Criado, Ações) e a coluna Ações ainda contém 4 botões + 1 select. O wrapper usa `overflow-hidden`, então o conteúdo que ultrapassa a largura do container simplesmente fica cortado — parte da tabela (geralmente a coluna Ações à direita) sai da tela em telas de ~1000px como a do usuário.

## Solução (apenas UI, sem mudar lógica)

Arquivo: `src/routes/_authenticated/admin.tsx` (linhas 316–398)

1. Trocar o wrapper de `overflow-hidden` para `overflow-x-auto` para permitir rolagem horizontal quando necessário, mantendo o `rounded-xl border`.
2. Definir `min-w-[1100px]` na `<table>` para garantir que as colunas tenham largura adequada e a rolagem seja ativada quando a viewport for menor.
3. Adicionar `whitespace-nowrap` nas células que não devem quebrar (Área, CNPJ, Código, Status, Criado, Ações) para evitar layout esmagado.
4. Garantir que a coluna **Ações** use `flex-nowrap` em vez de `flex-wrap`, mantendo os botões em linha única e empurrando a rolagem horizontal quando preciso (em vez de “explodir” verticalmente).
5. Opcional: aplicar `sticky right-0 bg-card` na célula de Ações para que ela permaneça visível mesmo durante a rolagem horizontal (UX melhor em desktop estreito).

Nenhuma alteração em queries, RLS, rotas ou regras de negócio. Mudança puramente de apresentação.

## Verificação

- Em viewport ~1000px: aparece rolagem horizontal dentro do card, a coluna Ações fica acessível (e fixa, se aplicarmos o sticky).
- Em viewport ≥1280px: tabela cabe inteira sem rolagem.
- Demais abas (Encontros, Documentos, Relatórios, etc.) não são tocadas.
