
-- 1. Tabela de overrides de tarefa por matrícula/semana
CREATE TABLE public.week_task_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL,
  week_id uuid NOT NULL,
  body text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, week_id)
);

ALTER TABLE public.week_task_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY wto_select_own_or_staff ON public.week_task_overrides FOR SELECT
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR private.has_role(auth.uid(), 'mentor'::app_role)
  OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid())
);

CREATE POLICY wto_staff_write ON public.week_task_overrides FOR ALL
USING (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'mentor'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'mentor'::app_role));

CREATE TRIGGER wto_set_updated_at BEFORE UPDATE ON public.week_task_overrides
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Permitir que mentores também atualizem campos de resumo/tarefa da semana padrão
DROP POLICY IF EXISTS weeks_admin_write ON public.weeks;
CREATE POLICY weeks_admin_write ON public.weeks FOR ALL
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY weeks_mentor_update ON public.weeks FOR UPDATE
USING (private.has_role(auth.uid(), 'mentor'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'mentor'::app_role));
