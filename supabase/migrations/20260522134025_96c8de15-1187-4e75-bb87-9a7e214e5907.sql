-- Enum de status do item de compliance
DO $$ BEGIN
  CREATE TYPE public.compliance_status AS ENUM ('pending', 'done', 'na');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Novas ações no enum de auditoria
DO $$ BEGIN
  ALTER TYPE public.mentor_action ADD VALUE IF NOT EXISTS 'compliance_marked';
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.mentor_action ADD VALUE IF NOT EXISTS 'compliance_item_changed';
EXCEPTION WHEN others THEN NULL; END $$;

-- ============= TABELAS =============
CREATE TABLE IF NOT EXISTS public.compliance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text NOT NULL DEFAULT 'food-service',
  week_id uuid NULL,
  title text NOT NULL,
  description text NULL,
  weight integer NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 10),
  order_index integer NOT NULL DEFAULT 0,
  required boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL
);
CREATE INDEX IF NOT EXISTS idx_compliance_items_vertical ON public.compliance_items(vertical, active, order_index);
CREATE INDEX IF NOT EXISTS idx_compliance_items_week ON public.compliance_items(week_id);

CREATE TABLE IF NOT EXISTS public.compliance_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL,
  item_id uuid NOT NULL REFERENCES public.compliance_items(id) ON DELETE CASCADE,
  status public.compliance_status NOT NULL DEFAULT 'pending',
  evidence text NULL,
  completed_at timestamptz NULL,
  completed_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_compliance_resp_enrollment ON public.compliance_responses(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_compliance_resp_item ON public.compliance_responses(item_id);

-- Triggers updated_at
DROP TRIGGER IF EXISTS trg_compliance_items_uat ON public.compliance_items;
CREATE TRIGGER trg_compliance_items_uat BEFORE UPDATE ON public.compliance_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_compliance_resp_uat ON public.compliance_responses;
CREATE TRIGGER trg_compliance_resp_uat BEFORE UPDATE ON public.compliance_responses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= RLS =============
ALTER TABLE public.compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ci_read_all ON public.compliance_items;
CREATE POLICY ci_read_all ON public.compliance_items
  FOR SELECT USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'mentor'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = auth.uid()
        AND e.vertical = public.compliance_items.vertical
        AND e.status IN ('active'::enrollment_status, 'graduated'::enrollment_status, 'archiving'::enrollment_status)
    )
  );

DROP POLICY IF EXISTS ci_admin_write ON public.compliance_items;
CREATE POLICY ci_admin_write ON public.compliance_items
  FOR ALL USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS cr_select_own_or_staff ON public.compliance_responses;
CREATE POLICY cr_select_own_or_staff ON public.compliance_responses
  FOR SELECT USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'mentor'::app_role)
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.id = compliance_responses.enrollment_id AND e.user_id = auth.uid())
  );

DROP POLICY IF EXISTS cr_upsert_own_or_staff ON public.compliance_responses;
CREATE POLICY cr_upsert_own_or_staff ON public.compliance_responses
  FOR ALL USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'mentor'::app_role)
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.id = compliance_responses.enrollment_id AND e.user_id = auth.uid())
  ) WITH CHECK (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'mentor'::app_role)
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.id = compliance_responses.enrollment_id AND e.user_id = auth.uid())
  );

-- ============= FUNCTIONS =============

-- Aluno: lê checklist da sua matrícula (itens + respostas)
CREATE OR REPLACE FUNCTION public.get_compliance_for_enrollment(_enrollment_id uuid)
RETURNS TABLE(
  item_id uuid, week_id uuid, week_index integer, week_title text,
  title text, description text, weight integer, order_index integer,
  required boolean,
  status public.compliance_status, evidence text, completed_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid; _vertical text;
BEGIN
  SELECT user_id, vertical INTO _owner, _vertical FROM public.enrollments WHERE id = _enrollment_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Matrícula não encontrada'; END IF;
  IF _owner <> auth.uid()
     AND NOT private.has_role(auth.uid(),'admin'::app_role)
     AND NOT private.has_role(auth.uid(),'mentor'::app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  RETURN QUERY
  SELECT
    ci.id, ci.week_id, w.week_index, w.title,
    ci.title, ci.description, ci.weight, ci.order_index, ci.required,
    COALESCE(cr.status, 'pending'::public.compliance_status),
    cr.evidence, cr.completed_at
  FROM public.compliance_items ci
  LEFT JOIN public.weeks w ON w.id = ci.week_id
  LEFT JOIN public.compliance_responses cr
    ON cr.item_id = ci.id AND cr.enrollment_id = _enrollment_id
  WHERE ci.active = true
    AND ci.vertical = _vertical
  ORDER BY COALESCE(w.week_index, 9999), ci.order_index, ci.title;
END $$;

-- Aluno/Staff: marcar status
CREATE OR REPLACE FUNCTION public.set_compliance_status(
  _enrollment_id uuid,
  _item_id uuid,
  _status public.compliance_status,
  _evidence text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid;
BEGIN
  SELECT user_id INTO _owner FROM public.enrollments WHERE id = _enrollment_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Matrícula não encontrada'; END IF;
  IF _owner <> auth.uid()
     AND NOT private.has_role(auth.uid(),'admin'::app_role)
     AND NOT private.has_role(auth.uid(),'mentor'::app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  INSERT INTO public.compliance_responses (enrollment_id, item_id, status, evidence, completed_at, completed_by)
  VALUES (_enrollment_id, _item_id, _status, _evidence,
          CASE WHEN _status = 'done' THEN now() ELSE NULL END,
          auth.uid())
  ON CONFLICT (enrollment_id, item_id) DO UPDATE
    SET status = EXCLUDED.status,
        evidence = COALESCE(EXCLUDED.evidence, public.compliance_responses.evidence),
        completed_at = CASE WHEN EXCLUDED.status = 'done' THEN COALESCE(public.compliance_responses.completed_at, now()) ELSE NULL END,
        completed_by = auth.uid(),
        updated_at = now();

  IF private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'mentor'::app_role) THEN
    INSERT INTO public.mentor_audit_log (mentor_id, student_id, action, enrollment_id, notes, metadata)
    VALUES (auth.uid(), _owner, 'compliance_marked', _enrollment_id,
            format('Compliance: status=%s', _status),
            jsonb_build_object('item_id', _item_id, 'status', _status));
  END IF;
END $$;

-- Score do aluno (uma matrícula)
CREATE OR REPLACE FUNCTION public.compliance_score_for_enrollment(_enrollment_id uuid)
RETURNS TABLE(
  total_weight integer,
  done_weight integer,
  na_weight integer,
  pending_weight integer,
  score_percent integer,
  level text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _vertical text; _owner uuid;
        _total int; _done int; _na int; _pending int; _eff int; _pct int; _lvl text;
BEGIN
  SELECT user_id, vertical INTO _owner, _vertical FROM public.enrollments WHERE id = _enrollment_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Matrícula não encontrada'; END IF;
  IF _owner <> auth.uid()
     AND NOT private.has_role(auth.uid(),'admin'::app_role)
     AND NOT private.has_role(auth.uid(),'mentor'::app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  SELECT
    COALESCE(SUM(ci.weight),0),
    COALESCE(SUM(CASE WHEN cr.status='done' THEN ci.weight ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN cr.status='na'   THEN ci.weight ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN COALESCE(cr.status,'pending')='pending' THEN ci.weight ELSE 0 END),0)
  INTO _total, _done, _na, _pending
  FROM public.compliance_items ci
  LEFT JOIN public.compliance_responses cr
    ON cr.item_id = ci.id AND cr.enrollment_id = _enrollment_id
  WHERE ci.active = true AND ci.vertical = _vertical;

  _eff := GREATEST(_total - _na, 0);
  _pct := CASE WHEN _eff = 0 THEN 0 ELSE ROUND( (_done::numeric / _eff::numeric) * 100 )::int END;

  _lvl := CASE
    WHEN _pct >= 100 THEN 'Blindado Ouro'
    WHEN _pct >= 76  THEN 'Blindado'
    WHEN _pct >= 51  THEN 'Protegido'
    WHEN _pct >= 26  THEN 'Em Construção'
    ELSE 'Iniciante'
  END;

  RETURN QUERY SELECT _total, _done, _na, _pending, _pct, _lvl;
END $$;

-- Staff: visão geral
CREATE OR REPLACE FUNCTION public.admin_compliance_overview(_vertical text DEFAULT NULL)
RETURNS TABLE(
  enrollment_id uuid,
  user_id uuid,
  full_name text,
  email text,
  vertical text,
  status text,
  total_weight integer,
  done_weight integer,
  na_weight integer,
  pending_weight integer,
  score_percent integer,
  level text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'mentor'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  WITH agg AS (
    SELECT
      e.id AS enrollment_id, e.user_id, e.vertical, e.status::text,
      COALESCE(SUM(ci.weight),0)::int AS total_weight,
      COALESCE(SUM(CASE WHEN cr.status='done' THEN ci.weight ELSE 0 END),0)::int AS done_weight,
      COALESCE(SUM(CASE WHEN cr.status='na'   THEN ci.weight ELSE 0 END),0)::int AS na_weight,
      COALESCE(SUM(CASE WHEN COALESCE(cr.status,'pending')='pending' THEN ci.weight ELSE 0 END),0)::int AS pending_weight
    FROM public.enrollments e
    LEFT JOIN public.compliance_items ci ON ci.active = true AND ci.vertical = e.vertical
    LEFT JOIN public.compliance_responses cr ON cr.item_id = ci.id AND cr.enrollment_id = e.id
    WHERE (_vertical IS NULL OR e.vertical = _vertical)
    GROUP BY e.id, e.user_id, e.vertical, e.status
  )
  SELECT
    a.enrollment_id, a.user_id,
    COALESCE(p.full_name,'')::text, u.email::text,
    a.vertical, a.status,
    a.total_weight, a.done_weight, a.na_weight, a.pending_weight,
    CASE WHEN GREATEST(a.total_weight - a.na_weight, 0) = 0 THEN 0
         ELSE ROUND( (a.done_weight::numeric / GREATEST(a.total_weight - a.na_weight,0)::numeric) * 100 )::int
    END AS score_percent,
    CASE
      WHEN CASE WHEN GREATEST(a.total_weight - a.na_weight, 0) = 0 THEN 0
                ELSE ROUND( (a.done_weight::numeric / GREATEST(a.total_weight - a.na_weight,0)::numeric) * 100 )::int END >= 100 THEN 'Blindado Ouro'
      WHEN CASE WHEN GREATEST(a.total_weight - a.na_weight, 0) = 0 THEN 0
                ELSE ROUND( (a.done_weight::numeric / GREATEST(a.total_weight - a.na_weight,0)::numeric) * 100 )::int END >= 76  THEN 'Blindado'
      WHEN CASE WHEN GREATEST(a.total_weight - a.na_weight, 0) = 0 THEN 0
                ELSE ROUND( (a.done_weight::numeric / GREATEST(a.total_weight - a.na_weight,0)::numeric) * 100 )::int END >= 51  THEN 'Protegido'
      WHEN CASE WHEN GREATEST(a.total_weight - a.na_weight, 0) = 0 THEN 0
                ELSE ROUND( (a.done_weight::numeric / GREATEST(a.total_weight - a.na_weight,0)::numeric) * 100 )::int END >= 26  THEN 'Em Construção'
      ELSE 'Iniciante'
    END
  FROM agg a
  JOIN auth.users u ON u.id = a.user_id
  LEFT JOIN public.profiles p ON p.id = a.user_id
  ORDER BY score_percent DESC, full_name NULLS LAST;
END $$;

-- Staff: lista de itens (com filtro por vertical)
CREATE OR REPLACE FUNCTION public.admin_list_compliance_items(_vertical text DEFAULT NULL)
RETURNS TABLE(
  id uuid, vertical text, week_id uuid, week_index integer, week_title text,
  title text, description text, weight integer, order_index integer,
  required boolean, active boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'mentor'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT ci.id, ci.vertical, ci.week_id, w.week_index, w.title,
         ci.title, ci.description, ci.weight, ci.order_index, ci.required, ci.active
  FROM public.compliance_items ci
  LEFT JOIN public.weeks w ON w.id = ci.week_id
  WHERE (_vertical IS NULL OR ci.vertical = _vertical)
  ORDER BY ci.vertical, COALESCE(w.week_index, 9999), ci.order_index, ci.title;
END $$;

-- Super admin: upsert de item
CREATE OR REPLACE FUNCTION public.admin_upsert_compliance_item(
  _id uuid,
  _vertical text,
  _week_id uuid,
  _title text,
  _description text,
  _weight integer,
  _order_index integer,
  _required boolean,
  _active boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _out uuid;
BEGIN
  IF NOT private.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas super admin pode editar itens de compliance';
  END IF;
  IF _id IS NULL THEN
    INSERT INTO public.compliance_items (vertical, week_id, title, description, weight, order_index, required, active, created_by)
    VALUES (COALESCE(_vertical,'food-service'), _week_id, _title, _description, COALESCE(_weight,1), COALESCE(_order_index,0), COALESCE(_required,true), COALESCE(_active,true), auth.uid())
    RETURNING id INTO _out;
  ELSE
    UPDATE public.compliance_items
       SET vertical = COALESCE(_vertical, vertical),
           week_id = _week_id,
           title = COALESCE(_title, title),
           description = _description,
           weight = COALESCE(_weight, weight),
           order_index = COALESCE(_order_index, order_index),
           required = COALESCE(_required, required),
           active = COALESCE(_active, active),
           updated_at = now()
     WHERE id = _id
    RETURNING id INTO _out;
  END IF;

  INSERT INTO public.mentor_audit_log (mentor_id, action, notes, metadata)
  VALUES (auth.uid(), 'compliance_item_changed',
          format('Item de compliance %s', CASE WHEN _id IS NULL THEN 'criado' ELSE 'atualizado' END),
          jsonb_build_object('id', _out, 'vertical', _vertical, 'title', _title));
  RETURN _out;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_compliance_item(_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.has_role(auth.uid(),'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas super admin pode remover itens';
  END IF;
  DELETE FROM public.compliance_items WHERE id = _id;
  INSERT INTO public.mentor_audit_log (mentor_id, action, notes, metadata)
  VALUES (auth.uid(), 'compliance_item_changed', 'Item de compliance removido',
          jsonb_build_object('id', _id, 'op','delete'));
END $$;

-- Seeds iniciais (gerais por vertical, sem week_id)
INSERT INTO public.compliance_items (vertical, title, description, weight, order_index, required)
SELECT 'food-service', t.title, t.description, t.weight, t.idx, true
FROM (VALUES
  (1,'Cadastro sanitário em dia','Alvará sanitário válido e exposto no estabelecimento', 3),
  (2,'Tabela nutricional / rotulagem','Cardápio com informações exigidas pelo Procon e Anvisa', 2),
  (3,'Política de troca e devolução publicada','Disponível no app, site e cardápio físico', 2),
  (4,'Termos de uso e LGPD no app/site','Aceite registrado e versão arquivada', 3),
  (5,'Treinamento de equipe documentado','Lista de presença e conteúdo arquivado', 1),
  (6,'Contrato com motoboys / entregadores','Contrato assinado com cláusula de responsabilidade', 3),
  (7,'Seguro de responsabilidade civil','Apólice ativa', 2)
) AS t(idx, title, description, weight)
ON CONFLICT DO NOTHING;

INSERT INTO public.compliance_items (vertical, title, description, weight, order_index, required)
SELECT 'pet-shop', t.title, t.description, t.weight, t.idx, true
FROM (VALUES
  (1,'Licença sanitária do pet shop','Documento ativo e visível ao público', 3),
  (2,'Responsável técnico (veterinário) registrado','CRMV ativo e contrato', 3),
  (3,'Termo de prestação de serviços (banho/tosa)','Modelo atualizado com cláusulas de risco', 3),
  (4,'Política LGPD e termos do site/app','Aceite e versão arquivada', 2),
  (5,'Treinamento de equipe sobre manejo animal','Registro de presença', 1),
  (6,'Contrato com fornecedores de ração/medicamentos','Cláusulas de responsabilidade', 2),
  (7,'Seguro de responsabilidade civil','Apólice ativa', 2)
) AS t(idx, title, description, weight)
ON CONFLICT DO NOTHING;