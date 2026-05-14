
-- Find user by email (admin only)
CREATE OR REPLACE FUNCTION public.admin_find_user_by_email(_email text)
RETURNS TABLE(user_id uuid, email text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem buscar usuários';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, COALESCE(p.full_name, '')::text
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = lower(_email)
  LIMIT 1;
END;
$$;

-- List mentors (admin/mentor)
CREATE OR REPLACE FUNCTION public.admin_list_mentors()
RETURNS TABLE(user_id uuid, email text, full_name text, is_admin boolean, granted_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'mentor'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT
    ur.user_id,
    u.email::text,
    COALESCE(p.full_name, '')::text,
    private.has_role(ur.user_id, 'admin'::app_role) AS is_admin,
    ur.created_at
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'mentor'::app_role
  ORDER BY ur.created_at DESC;
END;
$$;

-- Grant mentor role (admin only)
CREATE OR REPLACE FUNCTION public.admin_grant_mentor(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem promover mentores';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'mentor'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Revoke mentor role (admin only)
CREATE OR REPLACE FUNCTION public.admin_revoke_mentor(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem remover mentores';
  END IF;
  DELETE FROM public.user_roles
  WHERE user_id = _user_id AND role = 'mentor'::app_role;
END;
$$;
