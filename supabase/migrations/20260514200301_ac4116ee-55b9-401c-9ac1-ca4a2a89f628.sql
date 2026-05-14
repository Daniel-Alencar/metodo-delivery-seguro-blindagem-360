
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
revoke execute on function private.has_role(uuid, public.app_role) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.has_role(uuid, public.app_role) to authenticated;

-- Recreate dependent policies using private.has_role, then drop the public one.
-- user_roles
drop policy if exists "user_roles_select_own" on public.user_roles;
drop policy if exists "user_roles_admin_all" on public.user_roles;
create policy "user_roles_select_own" on public.user_roles for select using (auth.uid() = user_id or private.has_role(auth.uid(), 'admin'));
create policy "user_roles_admin_all" on public.user_roles for all using (private.has_role(auth.uid(), 'admin')) with check (private.has_role(auth.uid(), 'admin'));

-- modules
drop policy if exists "modules_admin_write" on public.modules;
create policy "modules_admin_write" on public.modules for all using (private.has_role(auth.uid(), 'admin')) with check (private.has_role(auth.uid(), 'admin'));

-- weeks
drop policy if exists "weeks_admin_write" on public.weeks;
create policy "weeks_admin_write" on public.weeks for all using (private.has_role(auth.uid(), 'admin')) with check (private.has_role(auth.uid(), 'admin'));

-- enrollments
drop policy if exists "enrollments_select_own_or_admin" on public.enrollments;
drop policy if exists "enrollments_admin_update" on public.enrollments;
create policy "enrollments_select_own_or_admin" on public.enrollments for select
  using (auth.uid() = user_id or private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'mentor'));
create policy "enrollments_admin_update" on public.enrollments for update
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'mentor'));

-- week_progress
drop policy if exists "wp_select_own_or_staff" on public.week_progress;
drop policy if exists "wp_update_own_or_staff" on public.week_progress;
create policy "wp_select_own_or_staff" on public.week_progress for select
  using (
    exists (select 1 from public.enrollments e where e.id = enrollment_id and e.user_id = auth.uid())
    or private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'mentor')
  );
create policy "wp_update_own_or_staff" on public.week_progress for update using (
  exists (select 1 from public.enrollments e where e.id = enrollment_id and e.user_id = auth.uid())
  or private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'mentor')
);

-- documents
drop policy if exists "documents_select_active" on public.documents;
drop policy if exists "documents_admin_write" on public.documents;
create policy "documents_select_active" on public.documents for select using (
  private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'mentor')
  or exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.status = 'active')
);
create policy "documents_admin_write" on public.documents for all using (
  private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'mentor')
) with check (
  private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'mentor')
);

-- incidents
drop policy if exists "incidents_select_own_or_staff" on public.incidents;
drop policy if exists "incidents_update_staff" on public.incidents;
create policy "incidents_select_own_or_staff" on public.incidents for select
  using (auth.uid() = user_id or private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'mentor'));
create policy "incidents_update_staff" on public.incidents for update
  using (private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'mentor'));

-- strategic_messages
drop policy if exists "sm_select_active" on public.strategic_messages;
drop policy if exists "sm_admin_write" on public.strategic_messages;
create policy "sm_select_active" on public.strategic_messages for select using (
  private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'mentor')
  or exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.status = 'active')
);
create policy "sm_admin_write" on public.strategic_messages for all using (
  private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'mentor')
) with check (
  private.has_role(auth.uid(), 'admin') or private.has_role(auth.uid(), 'mentor')
);

drop function public.has_role(uuid, public.app_role);
