
-- 1. Add lesson plan fields to weeks
ALTER TABLE public.weeks
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS agenda text,
  ADD COLUMN IF NOT EXISTS homework text;

-- 2. Reseed food-service curriculum (6 modules → 16 weeks)
-- Safe because no real mentorados/progress exist yet.
DELETE FROM public.week_progress
 WHERE week_id IN (SELECT w.id FROM public.weeks w
                   JOIN public.modules m ON m.id=w.module_id
                   WHERE m.vertical='food-service');
DELETE FROM public.documents
 WHERE module_id IN (SELECT id FROM public.modules WHERE vertical='food-service')
    OR week_id IN (SELECT w.id FROM public.weeks w
                   JOIN public.modules m ON m.id=w.module_id
                   WHERE m.vertical='food-service');
DELETE FROM public.weeks
 WHERE module_id IN (SELECT id FROM public.modules WHERE vertical='food-service');
DELETE FROM public.modules WHERE vertical='food-service';

-- Modules
WITH new_modules AS (
  INSERT INTO public.modules (vertical, month_index, title, description) VALUES
    ('food-service',1,'Alicerces do negócio','Patrimônio, marca, sociedade e regras de saída.'),
    ('food-service',2,'Delivery, logística e canal digital','Motoboy, bag, taxas, chargeback, site próprio e dados.'),
    ('food-service',3,'Equipe, escala e jornada','Intermitente, freelancer, ponto, adicionais e prova.'),
    ('food-service',4,'Documentos que protegem o caixa','Imagem, experiência, gorjeta, vale, benefícios e recibos.'),
    ('food-service',5,'Regras da casa e defesa da operação','Conduta, sigilo, uniforme, advertência, fiscalização e locação.'),
    ('food-service',6,'Cliente, reputação e reação rápida','Procon, preposição, reputação, notificação e encerramento.')
  RETURNING id, month_index
)
-- Weeks
INSERT INTO public.weeks (module_id, week_index, title, summary, agenda, homework, is_checkpoint)
SELECT m.id, v.week_index, v.title, v.summary, v.agenda, v.homework, v.is_checkpoint
FROM (VALUES
  (1, 1,'Sociedade, holding e acordo de sócios',
       'Separar o que é risco do que é patrimônio. Holding patrimonial como empresa-cofre e cláusulas de saída.',
       '1) Diagnóstico societário atual. 2) Holding x operacional. 3) Acordo de sócios: saída, preferência, não-concorrência. 4) Cronograma de adequação.',
       'Mapear bens do CPF e do CNPJ; rascunhar minuta de acordo de sócios com base no modelo.', false),
  (1, 2,'Marca, ativos intangíveis e licenciamento',
       'Marca como ativo. Titularidade na holding/CPF, licenciamento para a operacional, classes 30/35/43.',
       '1) Pesquisa prévia. 2) Depósito multi-classe. 3) Trava de domínio e redes. 4) Licenciamento e NDA.',
       'Listar ativos intangíveis; abrir pedido de pesquisa de marca; assinar NDA com fornecedores estratégicos.', true),

  (2, 3,'Motoboy, autonomia e contrato civil',
       'Diferenciar entrega autônoma de subordinação disfarçada. Contrato civil com espaço real para autonomia.',
       '1) Mapa de risco do entregador. 2) Cláusulas de autonomia. 3) Pagamento por entrega x mensal. 4) Prova documental.',
       'Aplicar o Contrato de Prestação de Serviços (Motoboy) com cada parceiro ativo.', false),
  (2, 4,'Bag, equipamentos e chargeback',
       'Locação de espaço publicitário na bag (verba civil), termo de responsabilidade por equipamentos e defesa de chargeback.',
       '1) Recibo de locação de bag. 2) Termo de cessão de uso. 3) Marco de entrega. 4) Script de resposta a chargeback.',
       'Adesivar bags, emitir recibos do mês e implantar conferência semanal de chargebacks.', false),
  (2, 5,'Site próprio, termos de uso e LGPD',
       'Canal próprio como base blindada: termos, política de privacidade, marco de entrega e finalidade dos dados.',
       '1) Cardápio digital x balcão. 2) Termos de uso. 3) Política de privacidade. 4) Gateway de pagamento.',
       'Publicar Termos e Política revisados; revisar fluxo de checkout e coleta de dados.', true),

  (3, 6,'Intermitente, extra e freelancer',
       'Quando cada figura cabe. Risco do freelancer fantasma. Documentação mínima de cada vínculo.',
       '1) Mapeamento da escala. 2) Convocação do intermitente. 3) Limites do extra. 4) Critérios de autonomia.',
       'Migrar plantonistas reincidentes para intermitente CLT; arquivar prova de convocação e aceite.', false),
  (3, 7,'Jornada, banco de horas e controles',
       'Ponto britânico, intervalo intrajornada, banco de horas, papeleta de jornada externa.',
       '1) Auditoria de ponto. 2) Acordo de banco de horas. 3) Intervalo intrajornada. 4) Desconexão digital.',
       'Implantar checklist mensal de auditoria de jornada e termo de desconexão pós-expediente.', false),
  (3, 8,'Adicionais legais e documentação defensiva',
       'Adicional noturno, periculosidade do motoboy, insalubridade, EPI e treinamento com prova.',
       '1) Mapa de adicionais. 2) Entrega e uso de EPI. 3) Certificados de treinamento. 4) Lastro técnico.',
       'Renovar fichas de EPI; emitir certificados de treinamento dos últimos 12 meses.', true),

  (4, 9,'Imagem, experiência e estágio',
       'Autorização de imagem para marketing, contrato de experiência e termo de blindagem para estágio/aprendizagem.',
       '1) Uso de imagem da equipe. 2) Contrato de experiência sem virar efetivo automático. 3) Estágio e aprendizagem.',
       'Coletar autorizações de imagem; revisar contratos de experiência ativos.', false),
  (4,10,'Vale-transporte, gorjeta e veículo',
       'Termo de opção e trajeto do VT, instituição formal do sistema de gorjetas e responsabilidade por veículo de entrega.',
       '1) Opção de VT por escrito. 2) Ata de assembleia de gorjetas. 3) Termo de uso de veículo.',
       'Atualizar termos de VT; convocar assembleia de gorjetas; emitir termos de veículo aos entregadores próprios.', false),
  (4,11,'Benefícios, descontos e recibos',
       'Adiantamento salarial, desconto por danos/avarias e recibo de benefício alimentação.',
       '1) Política de vale/adiantamento. 2) Critério de desconto por avaria. 3) Recibo de benefício.',
       'Implantar fluxo de vales com recibo assinado; padronizar autorização de desconto por danos.', true),

  (5,12,'Regulamento interno e conduta antiassédio',
       'Regulamento interno, código de ética/antiassédio e política de uso de celular e internet.',
       '1) Texto do regulamento. 2) Antiassédio na prática. 3) Uso de celular e redes. 4) Recebimento contra recibo.',
       'Distribuir regulamento e código de ética; coletar recibos assinados de toda a equipe.', false),
  (5,13,'Advertência, suspensão e uniforme',
       'Disciplina escrita: advertência, suspensão, uniforme e checklist de auditoria de jornada.',
       '1) Modelos disciplinares. 2) Procedimento de notificação. 3) Recebimento de uniforme. 4) Auditoria mensal.',
       'Aplicar modelos disciplinares pendentes; emitir termos de uniforme; rodar primeira auditoria mensal.', false),
  (5,14,'Locação comercial e ciência sanitária',
       'Contrato de locação blindado para o ponto comercial e termo de ciência sanitária e segurança.',
       '1) Cláusulas críticas da locação. 2) Sanitária e vigilância. 3) Plano de continuidade.',
       'Revisar contrato de locação atual; assinar termo de ciência sanitária com a equipe.', true),

  (6,15,'Procon, preposição e direito do consumidor',
       'Resposta técnica ao Procon, carta de preposição e política de delivery aderente ao CDC.',
       '1) Marco de entrega. 2) Modelo de defesa Procon. 3) Carta de preposição. 4) Seguro de responsabilidade.',
       'Pré-cadastrar preposto; salvar modelo de defesa Procon na pasta operacional.', false),
  (6,16,'Notificação extrajudicial e encerramento',
       'Notificação extrajudicial como comando de interrupção de conflitos e fechamento do sistema de blindagem.',
       '1) Quando notificar. 2) Estrutura da notificação. 3) Reputação digital. 4) Revisão geral da blindagem.',
       'Enviar notificações pendentes; rodar checklist final de blindagem 360º.', true)
) AS v(month_index, week_index, title, summary, agenda, homework, is_checkpoint)
JOIN new_modules m ON m.month_index = v.month_index;

-- 3. Seed instruments as empty documents bound to weeks
INSERT INTO public.documents (title, description, body, version, week_id, module_id)
SELECT v.title, v.description, '', 'v1', w.id, w.module_id
FROM (VALUES
  (1,'Cláusulas de Saída — Contrato Social / Acordo de Sócios','Cláusulas para apuração de haveres, preferência e não-concorrência.'),
  (2,'Contrato de Licenciamento de Marca','Licenciamento da marca da holding para a operacional.'),
  (2,'Termo de Confidencialidade e Sigilo Profissional (NDA)','NDA padrão para fornecedores e equipe estratégica.'),
  (3,'Contrato de Prestação de Serviços (Motoboy)','Contrato civil com cláusulas reais de autonomia.'),
  (4,'Recibo de Locação de Espaço Publicitário em Bag','Verba civil e indenizatória pela locação da face externa da bag.'),
  (4,'Termo de Responsabilidade e Cessão de Uso de Equipamentos','Bag, maquininha, celular e demais bens em guarda temporária.'),
  (4,'Script de Resposta Jurídica (Chargeback)','Resposta técnica usando marco de entrega e prova material.'),
  (5,'Termos de Uso do Site Próprio','Cancelamento, janela de entrega, limite geográfico e marco de entrega.'),
  (5,'Política de Privacidade — LGPD','Finalidade, retenção, exclusão e gateway de pagamento.'),
  (6,'Contrato Individual de Trabalho Intermitente','Modelo CLT do intermitente com convocação e pagamento discriminado.'),
  (6,'Modelo de Mensagem de Convocação','Mensagem padrão para convocar o intermitente com prova de aceite.'),
  (6,'Recibo de Pagamento Intermitente','Recibo discriminado das verbas do intermitente.'),
  (6,'Contrato de Prestação de Serviços (Freelancer)','Instrumento civil de freelancer com prova de autonomia.'),
  (7,'Acordo Individual para Compensação de Horas (Banco de Horas)','Acordo individual nos limites legais e da convenção coletiva.'),
  (7,'Termo de Opção e Compromisso de Intervalo Intrajornada','Formaliza a opção e a fruição do intervalo intrajornada.'),
  (7,'Termo de Desconexão Digital (Pós-Jornada)','Política e termo de desconexão fora do expediente.'),
  (7,'Ficha de Controle de Jornada Externa','Papeleta de jornada externa para entregadores fixos.'),
  (8,'Ficha de Entrega e Responsabilidade de EPI','Prova de entrega, uso e orientação de EPI.'),
  (8,'Certificado de Treinamento e Capacitação Operacional','Certificado padrão dos treinamentos de máquina e segurança.'),
  (9,'Autorização de Uso de Imagem e Voz (Marketing)','Autorização para uso da imagem da equipe em campanhas.'),
  (9,'Contrato Individual de Trabalho por Prazo Determinado (Experiência)','Contrato de experiência com cláusulas defensivas.'),
  (9,'Termo de Complementação e Blindagem de Estágio/Aprendizagem','Termo complementar para estagiários e aprendizes.'),
  (10,'Termo de Responsabilidade e Uso de Veículo (Entregas)','Responsabilidade por uso de veículo em entregas.'),
  (10,'Termo de Opção e Declaração de Trajeto (Vale-Transporte)','Declaração de opção e trajeto para o VT.'),
  (10,'Ata de Assembleia para Instituição do Sistema de Gorjetas','Instituição formal do rateio de gorjetas.'),
  (11,'Recibo de Adiantamento Salarial (Vale)','Recibo padrão de adiantamento salarial.'),
  (11,'Termo de Autorização de Desconto por Danos e Avarias','Autorização específica e individualizada por evento.'),
  (11,'Termo de Recebimento e Ciência de Benefício (Alimentação)','Recebimento e ciência das regras do benefício alimentação.'),
  (12,'Regulamento Interno de Trabalho','Regulamento interno completo do estabelecimento.'),
  (12,'Código de Ética e Conduta Antiassédio','Código de conduta com canal e procedimento antiassédio.'),
  (12,'Termo de Política de Uso de Celular e Internet','Política de uso de celular, internet e redes da empresa.'),
  (13,'Comunicação de Advertência Disciplinar','Modelo de advertência por escrito com recibo do colaborador.'),
  (13,'Comunicação de Suspensão Disciplinar','Modelo de suspensão disciplinar com fundamentação.'),
  (13,'Termo de Recebimento e Responsabilidade de Uniforme','Recebimento e responsabilidade pelo uniforme entregue.'),
  (13,'Checklist Mensal de Auditoria de Jornada (Controle Interno)','Checklist mensal de auditoria de ponto e jornada.'),
  (14,'Contrato de Locação Comercial Blindado','Locação comercial com cláusulas de continuidade e revisão.'),
  (14,'Termo de Ciência Sanitária e Segurança','Termo de ciência sanitária assinado pela equipe.'),
  (15,'Modelo de Defesa para Procon','Estrutura padrão de defesa administrativa em Procon.'),
  (15,'Carta de Preposição','Carta de preposição para audiências e atendimentos.'),
  (16,'Notificação Extrajudicial','Notificação extrajudicial como comando de interrupção de conflitos.')
) AS v(week_index, title, description)
JOIN public.weeks w ON w.week_index = v.week_index
JOIN public.modules m ON m.id = w.module_id AND m.vertical='food-service';

-- 4. Update RLS on documents: clientes only see docs whose week is unlocked for them
DROP POLICY IF EXISTS documents_select_active ON public.documents;
CREATE POLICY documents_select_active ON public.documents
FOR SELECT USING (
  private.has_role(auth.uid(),'admin'::app_role)
  OR private.has_role(auth.uid(),'mentor'::app_role)
  OR (
    week_id IS NULL
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = auth.uid() AND e.status = 'active'::enrollment_status
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.week_progress wp
    JOIN public.enrollments e ON e.id = wp.enrollment_id
    WHERE wp.week_id = documents.week_id
      AND e.user_id = auth.uid()
      AND wp.status IN ('in_progress','submitted','approved')
  )
);
