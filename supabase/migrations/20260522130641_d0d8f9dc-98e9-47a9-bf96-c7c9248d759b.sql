CREATE OR REPLACE FUNCTION public.admin_list_user_emails(_ids uuid[])
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.email::text
  FROM auth.users u
  WHERE u.id = ANY(_ids)
    AND (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'mentor'::app_role));
$$;

REVOKE ALL ON FUNCTION public.admin_list_user_emails(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_user_emails(uuid[]) TO authenticated;