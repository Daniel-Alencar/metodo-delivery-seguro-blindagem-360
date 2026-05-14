CREATE OR REPLACE FUNCTION public.admin_mentor_monthly_report(_month date DEFAULT date_trunc('month', now())::date)
RETURNS TABLE (
  mentor_id uuid,
  mentor_name text,
  mentor_email text,
  is_admin boolean,
  classes_attended bigint,
  weeks_approved bigint,
  weeks_released bigint,
  followups_extended bigint,
  distinct_students bigint,
  total_actions bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _start timestamptz := date_trunc('month', _month)::timestamptz;
  _end   timestamptz := (date_trunc('month', _month) + interval '1 month')::timestamptz;
BEGIN
  IF NOT (private.has_role(auth.uid(), 'admin'::app_role)
       OR private.has_role(auth.uid(), 'mentor'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    ur.user_id,
    COALESCE(p.full_name, '')::text,
    u.email::text,
    private.has_role(ur.user_id, 'admin'::app_role),
    COUNT(*) FILTER (WHERE a.action = 'class_attended'),
    COUNT(*) FILTER (WHERE a.action = 'week_approved'),
    COUNT(*) FILTER (WHERE a.action = 'week_released'),
    COUNT(*) FILTER (WHERE a.action = 'followup_extended'),
    COUNT(DISTINCT a.student_id) FILTER (WHERE a.student_id IS NOT NULL),
    COUNT(a.id)
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  LEFT JOIN public.mentor_audit_log a
    ON a.mentor_id = ur.user_id
   AND a.created_at >= _start
   AND a.created_at <  _end
  WHERE ur.role = 'mentor'::app_role
  GROUP BY ur.user_id, p.full_name, u.email
  ORDER BY COUNT(a.id) DESC, p.full_name NULLS LAST;
END;
$$;