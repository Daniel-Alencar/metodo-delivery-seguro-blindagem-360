-- Audit log table
CREATE TYPE public.mentor_action AS ENUM (
  'week_released',
  'week_approved',
  'class_attended',
  'followup_extended',
  'mentor_granted',
  'mentor_revoked',
  'archive_requested',
  'archive_cancelled'
);

CREATE TABLE public.mentor_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  student_id uuid,
  action mentor_action NOT NULL,
  week_id uuid,
  enrollment_id uuid,
  notes text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_mentor ON public.mentor_audit_log(mentor_id, created_at DESC);
CREATE INDEX idx_audit_student ON public.mentor_audit_log(student_id, created_at DESC);
CREATE INDEX idx_audit_action ON public.mentor_audit_log(action, created_at DESC);

ALTER TABLE public.mentor_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_select_staff ON public.mentor_audit_log
FOR SELECT USING (
  private.has_role(auth.uid(), 'admin'::app_role)
  OR private.has_role(auth.uid(), 'mentor'::app_role)
  OR auth.uid() = student_id
);

CREATE POLICY audit_insert_staff ON public.mentor_audit_log
FOR INSERT WITH CHECK (
  (private.has_role(auth.uid(), 'admin'::app_role)
   OR private.has_role(auth.uid(), 'mentor'::app_role))
  AND mentor_id = auth.uid()
);

-- Trigger: auto-log week status changes by staff
CREATE OR REPLACE FUNCTION public.trg_log_week_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _student uuid;
  _is_staff boolean;
BEGIN
  _is_staff := private.has_role(auth.uid(), 'admin'::app_role)
            OR private.has_role(auth.uid(), 'mentor'::app_role);
  IF NOT _is_staff THEN RETURN NEW; END IF;

  SELECT user_id INTO _student FROM public.enrollments WHERE id = NEW.enrollment_id;

  IF NEW.status = 'in_progress' AND (OLD.status IS DISTINCT FROM 'in_progress') THEN
    INSERT INTO public.mentor_audit_log (mentor_id, student_id, action, week_id, enrollment_id, notes)
    VALUES (auth.uid(), _student, 'week_released', NEW.week_id, NEW.enrollment_id, NEW.notes);
  ELSIF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.mentor_audit_log (mentor_id, student_id, action, week_id, enrollment_id, notes)
    VALUES (auth.uid(), _student, 'week_approved', NEW.week_id, NEW.enrollment_id, NEW.notes);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS week_progress_audit ON public.week_progress;
CREATE TRIGGER week_progress_audit
AFTER UPDATE ON public.week_progress
FOR EACH ROW EXECUTE FUNCTION public.trg_log_week_progress();

DROP TRIGGER IF EXISTS week_progress_audit_insert ON public.week_progress;
CREATE TRIGGER week_progress_audit_insert
AFTER INSERT ON public.week_progress
FOR EACH ROW EXECUTE FUNCTION public.trg_log_week_progress();

-- Function: mentor logs that they conducted a class
CREATE OR REPLACE FUNCTION public.log_class_attendance(
  _enrollment_id uuid,
  _week_id uuid,
  _notes text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _student uuid;
  _id uuid;
BEGIN
  IF NOT (private.has_role(auth.uid(), 'admin'::app_role)
       OR private.has_role(auth.uid(), 'mentor'::app_role)) THEN
    RAISE EXCEPTION 'Apenas mentores podem registrar atendimento de aula';
  END IF;
  SELECT user_id INTO _student FROM public.enrollments WHERE id = _enrollment_id;
  INSERT INTO public.mentor_audit_log (mentor_id, student_id, action, week_id, enrollment_id, notes)
  VALUES (auth.uid(), _student, 'class_attended', _week_id, _enrollment_id, _notes)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Update admin_extend_followup to also log
CREATE OR REPLACE FUNCTION public.admin_extend_followup(_user_id uuid, _days integer DEFAULT 30)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  UPDATE public.enrollments
     SET status = 'graduated', archive_at = NULL
   WHERE user_id = _user_id AND status IN ('archiving', 'archived');

  INSERT INTO public.mentor_audit_log (mentor_id, student_id, action, notes, metadata)
  VALUES (auth.uid(), _user_id, 'followup_extended',
          format('+%s dias', _days),
          jsonb_build_object('days', _days, 'paid_until', _new_until));

  RETURN _new_until;
END;
$$;

-- Listing function for admin panel
CREATE OR REPLACE FUNCTION public.admin_audit_list(
  _limit int DEFAULT 100,
  _action mentor_action DEFAULT NULL,
  _student uuid DEFAULT NULL,
  _mentor uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  action mentor_action,
  mentor_id uuid,
  mentor_name text,
  mentor_email text,
  student_id uuid,
  student_name text,
  student_email text,
  week_index int,
  week_title text,
  notes text,
  metadata jsonb
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (private.has_role(auth.uid(), 'admin'::app_role)
       OR private.has_role(auth.uid(), 'mentor'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT
    a.id, a.created_at, a.action,
    a.mentor_id, COALESCE(pm.full_name,'')::text, um.email::text,
    a.student_id, COALESCE(ps.full_name,'')::text, us.email::text,
    w.week_index, w.title,
    a.notes, a.metadata
  FROM public.mentor_audit_log a
  LEFT JOIN auth.users um ON um.id = a.mentor_id
  LEFT JOIN public.profiles pm ON pm.id = a.mentor_id
  LEFT JOIN auth.users us ON us.id = a.student_id
  LEFT JOIN public.profiles ps ON ps.id = a.student_id
  LEFT JOIN public.weeks w ON w.id = a.week_id
  WHERE (_action IS NULL OR a.action = _action)
    AND (_student IS NULL OR a.student_id = _student)
    AND (_mentor IS NULL OR a.mentor_id = _mentor)
  ORDER BY a.created_at DESC
  LIMIT _limit;
END;
$$;