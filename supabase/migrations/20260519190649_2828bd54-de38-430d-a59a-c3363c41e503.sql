CREATE OR REPLACE FUNCTION public.staff_unlock_week(_enrollment_id uuid, _week_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF NOT (private.has_role(uid, 'admin'::app_role) OR private.has_role(uid, 'mentor'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.week_progress (enrollment_id, week_id, status)
  VALUES (_enrollment_id, _week_id, 'in_progress'::week_status)
  ON CONFLICT (enrollment_id, week_id) DO UPDATE
    SET status = CASE
      WHEN public.week_progress.status = 'locked'::week_status THEN 'in_progress'::week_status
      ELSE public.week_progress.status
    END,
    updated_at = now();

  INSERT INTO public.mentor_audit_log (mentor_id, enrollment_id, week_id, action, notes)
  VALUES (uid, _enrollment_id, _week_id, 'week_released'::mentor_action, 'Liberação antecipada');
END;
$function$;