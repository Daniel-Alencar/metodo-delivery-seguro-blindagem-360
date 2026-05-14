
-- Columns
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS archive_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_step_chosen_at timestamptz;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS followup_paid_until timestamptz;

-- Followup plan (only one per vertical)
INSERT INTO public.plans (code, name, description, vertical, billing_interval, amount_cents, currency, active)
VALUES ('food_followup', 'Acompanhamento Mensal — Food Service',
        'Plano pós-implementação. Acesso a todos os 40 modelos, histórico das 16 aulas e canal de dúvidas. Pré-pago, 30 dias por ciclo.',
        'food-service', 'monthly', 0, 'BRL', true)
ON CONFLICT (code) DO NOTHING;

-- Auto-graduation trigger
CREATE OR REPLACE FUNCTION public.maybe_graduate_enrollment(_enrollment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_weeks int;
  approved_weeks int;
BEGIN
  SELECT COUNT(*) INTO total_weeks FROM public.weeks;
  SELECT COUNT(*) INTO approved_weeks
    FROM public.week_progress
    WHERE enrollment_id = _enrollment_id AND status = 'approved';

  IF total_weeks > 0 AND approved_weeks >= total_weeks THEN
    UPDATE public.enrollments
       SET status = 'graduated',
           completed_at = COALESCE(completed_at, now())
     WHERE id = _enrollment_id
       AND status NOT IN ('graduated', 'archiving', 'archived');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_week_progress_graduate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    PERFORM public.maybe_graduate_enrollment(NEW.enrollment_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS week_progress_graduate ON public.week_progress;
CREATE TRIGGER week_progress_graduate
AFTER INSERT OR UPDATE ON public.week_progress
FOR EACH ROW EXECUTE FUNCTION public.trg_week_progress_graduate();

-- Admin functions
CREATE OR REPLACE FUNCTION public.admin_extend_followup(_user_id uuid, _days int DEFAULT 30)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan uuid;
  _sub_id uuid;
  _new_until timestamptz;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem liberar acompanhamento';
  END IF;

  SELECT id INTO _plan FROM public.plans WHERE code = 'food_followup' LIMIT 1;

  SELECT id, GREATEST(COALESCE(followup_paid_until, now()), now()) + make_interval(days => _days)
    INTO _sub_id, _new_until
    FROM public.subscriptions
    WHERE user_id = _user_id AND plan_id = _plan
    ORDER BY created_at DESC LIMIT 1;

  IF _sub_id IS NULL THEN
    INSERT INTO public.subscriptions (user_id, plan_id, status, followup_paid_until, current_month)
    VALUES (_user_id, _plan, 'active', now() + make_interval(days => _days), 0)
    RETURNING followup_paid_until INTO _new_until;
  ELSE
    UPDATE public.subscriptions
       SET followup_paid_until = _new_until, status = 'active', updated_at = now()
     WHERE id = _sub_id;
  END IF;

  -- If user was archived/archiving, restore to graduated
  UPDATE public.enrollments
     SET status = 'graduated', archive_at = NULL
   WHERE user_id = _user_id
     AND status IN ('archiving', 'archived');

  RETURN _new_until;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_archive(_enrollment_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _archive_at timestamptz;
  _owner uuid;
BEGIN
  SELECT user_id INTO _owner FROM public.enrollments WHERE id = _enrollment_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'Matrícula não encontrada'; END IF;
  IF _owner <> auth.uid() AND NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  _archive_at := now() + interval '7 days';
  UPDATE public.enrollments
     SET status = 'archiving',
         archive_at = _archive_at,
         next_step_chosen_at = now()
   WHERE id = _enrollment_id
     AND status IN ('graduated', 'active');

  RETURN _archive_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_archive(_enrollment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
BEGIN
  SELECT user_id INTO _owner FROM public.enrollments WHERE id = _enrollment_id;
  IF _owner <> auth.uid() AND NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  UPDATE public.enrollments
     SET status = 'graduated', archive_at = NULL
   WHERE id = _enrollment_id AND status = 'archiving';
END;
$$;

CREATE OR REPLACE FUNCTION public.daily_archive_expired()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n int;
BEGIN
  WITH upd AS (
    UPDATE public.enrollments
       SET status = 'archived'
     WHERE status = 'archiving' AND archive_at IS NOT NULL AND archive_at <= now()
     RETURNING id
  )
  SELECT count(*) INTO n FROM upd;
  RETURN n;
END;
$$;

-- Lock down admin function from anon
REVOKE EXECUTE ON FUNCTION public.admin_extend_followup(uuid, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.daily_archive_expired() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.maybe_graduate_enrollment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_extend_followup(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_archive(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_archive(uuid) TO authenticated;

-- Update documents RLS to also unlock everything for graduated+followup-active users
DROP POLICY IF EXISTS documents_select_active ON public.documents;
CREATE POLICY documents_select_active ON public.documents
FOR SELECT
USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR private.has_role(auth.uid(), 'mentor'::app_role)
  -- general library docs (no week_id) for active enrollments
  OR ((week_id IS NULL) AND EXISTS (
        SELECT 1 FROM public.enrollments e
         WHERE e.user_id = auth.uid()
           AND e.status IN ('active', 'graduated', 'archiving')))
  -- per-week docs unlocked by progress
  OR EXISTS (
        SELECT 1 FROM public.week_progress wp
        JOIN public.enrollments e ON e.id = wp.enrollment_id
        WHERE wp.week_id = documents.week_id
          AND e.user_id = auth.uid()
          AND wp.status IN ('in_progress', 'submitted', 'approved'))
  -- everything unlocked when graduated and followup paid
  OR EXISTS (
        SELECT 1 FROM public.enrollments e
        JOIN public.subscriptions s ON s.user_id = e.user_id
        JOIN public.plans p ON p.id = s.plan_id AND p.code = 'food_followup'
        WHERE e.user_id = auth.uid()
          AND e.status IN ('graduated', 'archiving')
          AND s.followup_paid_until IS NOT NULL
          AND s.followup_paid_until > now())
);
