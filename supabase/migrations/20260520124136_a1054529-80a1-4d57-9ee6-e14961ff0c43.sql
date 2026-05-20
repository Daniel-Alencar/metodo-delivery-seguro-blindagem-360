
-- Private mentor notes per meeting (week + enrollment)
CREATE TABLE IF NOT EXISTS public.class_meeting_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL,
  week_id uuid NOT NULL,
  body text NOT NULL DEFAULT '',
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, week_id)
);

ALTER TABLE public.class_meeting_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY cmn_staff_select ON public.class_meeting_notes
  FOR SELECT USING (
    private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'mentor'::app_role)
  );

CREATE POLICY cmn_staff_write ON public.class_meeting_notes
  FOR ALL USING (
    private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'mentor'::app_role)
  ) WITH CHECK (
    private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'mentor'::app_role)
  );

CREATE TRIGGER cmn_touch BEFORE UPDATE ON public.class_meeting_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Combined RPC: mark meeting finished + save private notes
CREATE OR REPLACE FUNCTION public.staff_finish_meeting(
  _enrollment_id uuid, _week_id uuid, _private_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _student uuid; _current_mentor uuid;
BEGIN
  IF NOT (private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'mentor'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT user_id, assigned_mentor_id INTO _student, _current_mentor
    FROM public.enrollments WHERE id = _enrollment_id;
  IF _student IS NULL THEN RAISE EXCEPTION 'Matrícula não encontrada'; END IF;

  IF _current_mentor IS NULL AND private.has_role(auth.uid(),'mentor'::app_role) THEN
    UPDATE public.enrollments SET assigned_mentor_id = auth.uid() WHERE id = _enrollment_id;
  END IF;

  INSERT INTO public.week_progress (enrollment_id, week_id, status, approved_at, approved_by)
  VALUES (_enrollment_id, _week_id, 'approved'::week_status, now(), auth.uid())
  ON CONFLICT (enrollment_id, week_id) DO UPDATE
    SET status='approved'::week_status,
        approved_at=COALESCE(public.week_progress.approved_at, now()),
        approved_by=COALESCE(public.week_progress.approved_by, auth.uid()),
        updated_at=now();

  IF _private_notes IS NOT NULL THEN
    INSERT INTO public.class_meeting_notes (enrollment_id, week_id, body, author_id)
    VALUES (_enrollment_id, _week_id, _private_notes, auth.uid())
    ON CONFLICT (enrollment_id, week_id) DO UPDATE
      SET body = EXCLUDED.body, author_id = auth.uid(), updated_at = now();
  END IF;

  INSERT INTO public.mentor_audit_log (mentor_id, student_id, action, week_id, enrollment_id, notes)
  VALUES (auth.uid(), _student, 'class_attended', _week_id, _enrollment_id, 'Encontro finalizado');
END;
$$;
