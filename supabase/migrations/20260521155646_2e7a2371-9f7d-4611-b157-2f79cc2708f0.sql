
-- Add 'content_edited' to mentor_action enum (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'mentor_action' AND e.enumlabel = 'content_edited'
  ) THEN
    ALTER TYPE mentor_action ADD VALUE 'content_edited';
  END IF;
END $$;

-- Seed pet-shop curriculum (4 modules, 16 weeks)
DO $$
DECLARE
  m1 uuid; m2 uuid; m3 uuid; m4 uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.modules WHERE vertical = 'pet-shop') THEN
    INSERT INTO public.modules (vertical, month_index, title, description) VALUES
      ('pet-shop', 1, 'Blindagem Societária Pet Shop', 'Estrutura societária, contratos sociais, sócios e proteção patrimonial para pet shops, clínicas veterinárias e centros de estética animal.')
      RETURNING id INTO m1;
    INSERT INTO public.modules (vertical, month_index, title, description) VALUES
      ('pet-shop', 2, 'Blindagem Trabalhista Pet Shop', 'Contratação de tosadores, banhistas, veterinários, auxiliares e atendentes; jornadas, EPIs, riscos e prevenção de passivos.')
      RETURNING id INTO m2;
    INSERT INTO public.modules (vertical, month_index, title, description) VALUES
      ('pet-shop', 3, 'Blindagem Consumerista Pet Shop', 'Relação com tutores, termos de serviço, responsabilidade por danos ao animal, devoluções, garantias e prevenção de litígios.')
      RETURNING id INTO m3;
    INSERT INTO public.modules (vertical, month_index, title, description) VALUES
      ('pet-shop', 4, 'Vigilância Sanitária & Conformidade', 'Licenças, vigilância sanitária, CRMV, manejo de medicamentos, biossegurança e LGPD aplicada a pet shops.')
      RETURNING id INTO m4;

    -- Mês 1
    INSERT INTO public.weeks (module_id, week_index, title, summary, is_checkpoint) VALUES
      (m1, 1, 'Diagnóstico societário e estrutura ideal', 'Mapeamento do tipo de pet shop, sócios, regime tributário e blindagem patrimonial inicial.', false),
      (m1, 2, 'Contrato social e acordo de sócios', 'Cláusulas essenciais: entrada e saída de sócios, sucessão, distribuição de lucros e prevenção de conflitos.', false),
      (m1, 3, 'Proteção patrimonial dos sócios', 'Separação patrimônio pessoa física × pessoa jurídica; holdings; bens de família.', false),
      (m1, 4, 'Checkpoint societário', 'Revisão dos documentos societários produzidos no módulo 1.', true);

    -- Mês 2
    INSERT INTO public.weeks (module_id, week_index, title, summary, is_checkpoint) VALUES
      (m2, 5, 'Contratação segura: cargos e jornada', 'CLT, PJ, autônomos, tosadores e banhistas; jornadas e escalas comuns no pet shop.', false),
      (m2, 6, 'EPIs, NR e segurança do trabalho', 'Riscos biológicos, mordidas, ergonomia e prevenção de acidentes.', false),
      (m2, 7, 'Veterinário responsável técnico e CRMV', 'Vínculo do RT, atribuições, registros, prontuários e responsabilidade compartilhada.', false),
      (m2, 8, 'Checkpoint trabalhista', 'Validação dos contratos e políticas internas do módulo 2.', true);

    -- Mês 3
    INSERT INTO public.weeks (module_id, week_index, title, summary, is_checkpoint) VALUES
      (m3, 9, 'Termo de serviço com o tutor', 'Banho, tosa, hospedagem, day care, transporte: cláusulas obrigatórias.', false),
      (m3, 10, 'Responsabilidade por danos ao animal', 'Limitação, prova, seguro, conduta diante de acidentes e óbitos.', false),
      (m3, 11, 'Vendas, garantias e marketplace pet', 'Rações, medicamentos, brinquedos: garantia, troca, recall e venda online.', false),
      (m3, 12, 'Checkpoint consumerista', 'Revisão dos termos e fluxos de atendimento ao tutor.', true);

    -- Mês 4
    INSERT INTO public.weeks (module_id, week_index, title, summary, is_checkpoint) VALUES
      (m4, 13, 'Licenças e alvarás', 'Vigilância sanitária municipal, ambiental, CRMV, bombeiros e CMVM.', false),
      (m4, 14, 'Medicamentos veterinários e biossegurança', 'Armazenamento, prescrição, descarte, controle de pragas e zoonoses.', false),
      (m4, 15, 'LGPD aplicada a pet shops', 'Dados do tutor, do animal, vídeo-monitoramento e marketing direto.', false),
      (m4, 16, 'Checkpoint final & plano de melhoria contínua', 'Consolidação da blindagem e roadmap de manutenção.', true);
  END IF;
END $$;

-- Audit trigger: weeks UPDATE
CREATE OR REPLACE FUNCTION public.trg_audit_week_edit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN NEW; END IF;
  IF NOT (private.has_role(_uid,'admin'::app_role) OR private.has_role(_uid,'mentor'::app_role)) THEN
    RETURN NEW;
  END IF;
  -- Skip when the only change is week_progress related (we don't trigger on those)
  INSERT INTO public.mentor_audit_log (mentor_id, action, week_id, notes, metadata)
  VALUES (_uid, 'content_edited'::mentor_action, NEW.id,
          'Editou aula: ' || NEW.title,
          jsonb_build_object('entity','week','week_index',NEW.week_index,
            'changed_title', OLD.title IS DISTINCT FROM NEW.title,
            'changed_summary', OLD.summary IS DISTINCT FROM NEW.summary,
            'changed_agenda', OLD.agenda IS DISTINCT FROM NEW.agenda,
            'changed_homework', OLD.homework IS DISTINCT FROM NEW.homework));
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS audit_weeks_update ON public.weeks;
CREATE TRIGGER audit_weeks_update
AFTER UPDATE ON public.weeks
FOR EACH ROW
WHEN (OLD.title IS DISTINCT FROM NEW.title
   OR OLD.summary IS DISTINCT FROM NEW.summary
   OR OLD.agenda IS DISTINCT FROM NEW.agenda
   OR OLD.homework IS DISTINCT FROM NEW.homework
   OR OLD.description IS DISTINCT FROM NEW.description)
EXECUTE FUNCTION public.trg_audit_week_edit();

-- Audit triggers: documents INSERT/UPDATE/DELETE
CREATE OR REPLACE FUNCTION public.trg_audit_doc_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE _uid uuid := auth.uid(); _wid uuid; _title text; _verb text;
BEGIN
  IF _uid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  IF NOT (private.has_role(_uid,'admin'::app_role) OR private.has_role(_uid,'mentor'::app_role)) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'INSERT' THEN _verb := 'Criou documento'; _wid := NEW.week_id; _title := NEW.title;
  ELSIF TG_OP = 'UPDATE' THEN _verb := 'Editou documento'; _wid := NEW.week_id; _title := NEW.title;
  ELSE _verb := 'Excluiu documento'; _wid := OLD.week_id; _title := OLD.title;
  END IF;
  INSERT INTO public.mentor_audit_log (mentor_id, action, week_id, notes, metadata)
  VALUES (_uid, 'content_edited'::mentor_action, _wid,
          _verb || ': ' || _title,
          jsonb_build_object('entity','document','op',TG_OP,
            'doc_id', COALESCE(NEW.id, OLD.id)));
  RETURN COALESCE(NEW, OLD);
END $fn$;

DROP TRIGGER IF EXISTS audit_documents_change ON public.documents;
CREATE TRIGGER audit_documents_change
AFTER INSERT OR UPDATE OR DELETE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_doc_change();

-- Allow mentors to also DELETE documents (was: only admin/mentor via documents_admin_write ALL policy — confirm)
-- Already covered by existing documents_admin_write (ALL) policy.

-- Allow mentors to update modules (so currículo edit works for vertical too)
DROP POLICY IF EXISTS modules_mentor_write ON public.modules;
CREATE POLICY modules_mentor_write ON public.modules
FOR UPDATE TO public
USING (private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'mentor'::app_role))
WITH CHECK (private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'mentor'::app_role));
