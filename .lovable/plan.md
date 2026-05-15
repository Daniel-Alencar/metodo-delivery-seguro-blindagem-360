## O que encontrei

- Seu e-mail `glaubertgia@gmail.com` está com papel **admin**, mas não está com papel **mentor**. Por isso o sistema não mostra a tela de escolha “Mentor ou Super Admin”; ele entra direto em `/admin`.
- Existem **40 registros de documentos** no banco, mas todos estão com o corpo vazio. Ou seja: os nomes dos modelos foram cadastrados, mas o conteúdo dos contratos/notificações não foi inserido.
- A tela `/admin` hoje mistura mentor e administrador na mesma página, com pouca separação visual; isso explica a confusão.
- O mentor consegue acessar `/documentos`, mas falta uma navegação melhor por módulo/aula e uma forma mais clara de abrir o documento vinculado à aula.

## Plano de correção

1. **Acesso Super Admin claro**
   - Ajustar o usuário `glaubertgia@gmail.com` para ter os papéis **admin + mentor**, permitindo a tela `/escolher-perfil`.
   - Melhorar a entrada: quando tiver os dois papéis, sempre mostrar a escolha “Entrar como Mentor” ou “Entrar como Super Admin” após login.
   - No topo, manter um botão visível de **Trocar perfil**.

2. **Separar visualmente Mentor e Super Admin**
   - Transformar `/admin` em um painel com seções/abas bem definidas:
     - **Matrículas**
     - **Aprovações**
     - **Aulas / documentos da aula**
     - **Relatórios**
     - **Histórico de ações**
     - **Equipe de mentores** somente no Super Admin
     - **Encontros & Modelos** somente no Super Admin
     - **Acompanhamento pré-pago** somente no Super Admin
   - Melhorar contraste, divisões, bordas, cards e títulos para ficar menos “tela escura confusa”.

3. **Documentos dos módulos/aulas para mentor**
   - Criar uma área dentro do painel do mentor para listar **módulo → aula → documentos vinculados**.
   - Ao clicar no documento, abrir em modal/tela de leitura, com título, descrição e conteúdo.
   - O mentor poderá consultar os modelos durante a aula para ensinar as nuances.

4. **Inserção dos modelos em anexo**
   - Como os anexos não aparecem diretamente neste contexto atual, vou preparar o sistema para receber/importar conteúdo de modelos pelo **Super Admin**.
   - Melhorar o gerenciador “Encontros & Modelos” para facilitar colar/editar o texto completo de cada modelo.
   - Se você reenviar os anexos nesta conversa, eu posso ler os arquivos e popular os 40 documentos automaticamente no banco, vinculando cada conteúdo ao modelo correspondente.

5. **Corrigir a explicação dentro do próprio sistema**
   - Adicionar textos curtos de orientação no painel:
     - “Você está no modo Mentor”
     - “Você está no modo Super Admin”
     - “Documentos vazios precisam ser preenchidos em Encontros & Modelos”
   - Evitar que Mentor veja ferramentas de Super Admin.

## Observação importante

Os 40 documentos **existem como títulos**, mas não como conteúdo. Para inserir o conteúdo real dos contratos/notificações, o caminho correto será:

- Pelo **Super Admin**, em **Encontros & Modelos**, editando cada modelo; ou
- Você reenviar os anexos aqui, e eu faço uma importação estruturada para preencher tudo de uma vez.