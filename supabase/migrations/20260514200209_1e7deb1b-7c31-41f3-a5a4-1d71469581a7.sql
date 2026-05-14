
-- ===== ENUMS =====
create type public.app_role as enum ('admin', 'mentor', 'cliente');
create type public.enrollment_status as enum ('pending', 'active', 'paused', 'completed', 'cancelled');
create type public.week_status as enum ('locked', 'in_progress', 'submitted', 'approved');
create type public.incident_category as enum ('procon', 'chargeback', 'sanitaria', 'trabalhista', 'midia_social', 'outros');
create type public.incident_status as enum ('open', 'in_progress', 'resolved', 'closed');

-- ===== PROFILES =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- ===== USER ROLES =====
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "user_roles_select_own" on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "user_roles_admin_all" on public.user_roles for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ===== AUTO PROFILE + ROLE ON SIGNUP =====
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, company_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'company_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  );
  insert into public.user_roles (user_id, role) values (new.id, 'cliente');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== UPDATED_AT HELPER =====
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- ===== MODULES (months) =====
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  vertical text not null default 'food-service',
  month_index int not null,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  unique (vertical, month_index)
);
alter table public.modules enable row level security;
create policy "modules_read_all" on public.modules for select using (true);
create policy "modules_admin_write" on public.modules for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ===== WEEKS =====
create table public.weeks (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  week_index int not null,
  title text not null,
  description text,
  is_checkpoint boolean not null default false,
  created_at timestamptz not null default now(),
  unique (module_id, week_index)
);
alter table public.weeks enable row level security;
create policy "weeks_read_all" on public.weeks for select using (true);
create policy "weeks_admin_write" on public.weeks for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ===== ENROLLMENTS =====
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vertical text not null default 'food-service',
  status public.enrollment_status not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, vertical)
);
alter table public.enrollments enable row level security;
create trigger enrollments_updated before update on public.enrollments for each row execute function public.set_updated_at();

create policy "enrollments_select_own_or_admin" on public.enrollments for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'mentor'));
create policy "enrollments_insert_own" on public.enrollments for insert with check (auth.uid() = user_id);
create policy "enrollments_admin_update" on public.enrollments for update
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'mentor'));

-- ===== WEEK PROGRESS =====
create table public.week_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  week_id uuid not null references public.weeks(id) on delete cascade,
  status public.week_status not null default 'locked',
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, week_id)
);
alter table public.week_progress enable row level security;
create trigger week_progress_updated before update on public.week_progress for each row execute function public.set_updated_at();

create policy "wp_select_own_or_staff" on public.week_progress for select
  using (
    exists (select 1 from public.enrollments e where e.id = enrollment_id and e.user_id = auth.uid())
    or public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'mentor')
  );
create policy "wp_insert_own" on public.week_progress for insert with check (
  exists (select 1 from public.enrollments e where e.id = enrollment_id and e.user_id = auth.uid())
);
create policy "wp_update_own_or_staff" on public.week_progress for update using (
  exists (select 1 from public.enrollments e where e.id = enrollment_id and e.user_id = auth.uid())
  or public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'mentor')
);

-- ===== DOCUMENTS =====
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references public.modules(id) on delete set null,
  week_id uuid references public.weeks(id) on delete set null,
  title text not null,
  description text,
  body text,
  version text not null default 'v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.documents enable row level security;
create trigger documents_updated before update on public.documents for each row execute function public.set_updated_at();

create policy "documents_select_active" on public.documents for select using (
  public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'mentor')
  or exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.status = 'active')
);
create policy "documents_admin_write" on public.documents for all using (
  public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'mentor')
) with check (
  public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'mentor')
);

-- ===== INCIDENTS =====
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category public.incident_category not null,
  title text not null,
  description text not null,
  status public.incident_status not null default 'open',
  assigned_to uuid references auth.users(id),
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.incidents enable row level security;
create trigger incidents_updated before update on public.incidents for each row execute function public.set_updated_at();

create policy "incidents_select_own_or_staff" on public.incidents for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'mentor'));
create policy "incidents_insert_own" on public.incidents for insert with check (auth.uid() = user_id);
create policy "incidents_update_staff" on public.incidents for update
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'mentor'));

-- ===== STRATEGIC MESSAGES =====
create table public.strategic_messages (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.strategic_messages enable row level security;
create trigger sm_updated before update on public.strategic_messages for each row execute function public.set_updated_at();

create policy "sm_select_active" on public.strategic_messages for select using (
  public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'mentor')
  or exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.status = 'active')
);
create policy "sm_admin_write" on public.strategic_messages for all using (
  public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'mentor')
) with check (
  public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'mentor')
);

-- ===== SEED FOOD SERVICE =====
with m as (
  insert into public.modules (vertical, month_index, title, description) values
    ('food-service', 1, 'Fundação Jurídica', 'Base societária, ativos e estrutura formal de proteção.'),
    ('food-service', 2, 'Operação Crítica', 'Delivery, contratos, logística e primeiros documentos operacionais.'),
    ('food-service', 3, 'Equipe & Prova Interna', 'Jornada, benefícios, sigilo, treinamento e disciplina.'),
    ('food-service', 4, 'Defesa Externa', 'Consumo, notificações, fiscalização e consolidação da blindagem.')
  returning id, month_index
)
insert into public.weeks (module_id, week_index, title, is_checkpoint)
select m.id, w.week_index, w.title, w.week_index = 4
from m
join (values
  (1, 1, 'Diagnóstico societário e mapeamento de ativos'),
  (1, 2, 'Estrutura jurídica e separação patrimonial'),
  (1, 3, 'Documentos fundadores e governança inicial'),
  (1, 4, 'Validação da fundação + checkpoint com mentor'),
  (2, 1, 'Contratos com motoboys e parceiros logísticos'),
  (2, 2, 'Termos de marketplace e plataformas de delivery'),
  (2, 3, 'Protocolos de expedição, lacre e rastreabilidade'),
  (2, 4, 'Auditoria operacional + checkpoint com mentor'),
  (3, 1, 'Jornada, ponto e política de benefícios'),
  (3, 2, 'Acordos de sigilo, código de conduta e disciplina'),
  (3, 3, 'Treinamento operacional e trilhas de evidência'),
  (3, 4, 'Simulação de incidente interno + checkpoint'),
  (4, 1, 'Atendimento ao consumidor e Procon'),
  (4, 2, 'Resposta a notificações e órgãos fiscalizadores'),
  (4, 3, 'Crise digital, redes sociais e reputação'),
  (4, 4, 'Certificação Delivery Seguro + plano de monitoramento')
) as w(month_index, week_index, title) on w.month_index = m.month_index;
