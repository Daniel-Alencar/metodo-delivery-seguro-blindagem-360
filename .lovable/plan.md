Plano imediato de correção:

1. Corrigir o fluxo de cadastro
- Garantir que novos cadastros não entrem automaticamente logados nem sejam tratados como confirmados.
- Depois do cadastro, mostrar uma mensagem clara dizendo que o aluno precisa confirmar o e-mail.
- Manter o aluno bloqueado até confirmar o e-mail e até a aprovação/liberação normal no painel.

2. Restaurar o envio de e-mail de confirmação
- A configuração atual ainda está criando usuários com e-mail confirmado automaticamente, por isso nenhum e-mail de confirmação é enviado.
- Vou desativar novamente esse comportamento de teste e deixar a confirmação real obrigatória.
- Também vou preparar o fluxo para disparar/repetir o e-mail de confirmação pelo próprio app.

3. Adicionar botão de reenvio no cadastro
- Após criar a conta, exibir um botão “Reenviar e-mail de confirmação”.
- O botão usará o e-mail digitado no cadastro e informará quando o reenvio for solicitado.

4. Adicionar reenvio na página de login
- Quando o login falhar por e-mail não confirmado, mostrar uma mensagem em português.
- Exibir um campo/botão para reenviar o e-mail de confirmação.
- Também permitir reenviar informando o e-mail digitado no login.

5. Corrigir o e-mail administrativo digitado sem ponto
- Tratar `glaubertgia@gmailcom` como erro de digitação e normalizar para `glaubertgia@gmail.com` no login/cadastro.
- Garantir que `glaubertgia@gmail.com` continue sendo reconhecido como admin/mentor no backend.

6. Verificar o backend do cadastro
- Revisar se o cadastro está criando `profile`, papel do usuário e matrícula corretamente.
- Corrigir a função de criação de usuário se necessário para evitar falhas silenciosas no cadastro.

Detalhes técnicos:
- Usarei a API padrão de autenticação para reenviar confirmação por e-mail.
- Se for necessário ajuste no backend, farei via migração segura, preservando os papéis existentes.
- Não implementarei pagamento nesta etapa.