
REVOKE EXECUTE ON FUNCTION public.admin_find_user_by_email(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_list_mentors() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_grant_mentor(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_mentor(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_find_user_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_mentors() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_mentor(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_mentor(uuid) TO authenticated;
