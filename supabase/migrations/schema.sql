  -- ============================================================
  -- BLINDAGEM 360 — SCHEMA COMPLETO
  -- Execute uma única vez no SQL Editor de um projeto Supabase novo
  -- ============================================================

  -- ===== SCHEMA PRIVADO =====
  CREATE SCHEMA IF NOT EXISTS private;
  REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
  GRANT USAGE ON SCHEMA private TO authenticated;

  -- ===== ENUMS =====
  CREATE TYPE public.app_role AS ENUM ('admin', 'mentor', 'cliente');
  CREATE TYPE public.enrollment_status AS ENUM (
    'pending', 'active', 'paused', 'completed', 'cancelled',
    'graduated', 'archiving', 'archived'
  );
  CREATE TYPE public.week_status AS ENUM ('locked', 'in_progress', 'submitted', 'approved');
  CREATE TYPE public.incident_category AS ENUM (
    'procon', 'chargeback', 'sanitaria', 'trabalhista',
    'midia_social', 'outros', 'consultation'
  );
  CREATE TYPE public.incident_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
  CREATE TYPE public.mentor_action AS ENUM (
    'week_released', 'week_approved', 'class_attended', 'followup_extended',
    'mentor_granted', 'mentor_revoked', 'archive_requested', 'archive_cancelled',
    'content_edited', 'referral_discount_updated', 'referral_created', 'referral_converted',
    'compliance_marked', 'compliance_item_changed'
  );
  CREATE TYPE public.ticket_status AS ENUM ('open', 'answered', 'closed');
  CREATE TYPE public.referral_status AS ENUM ('pending', 'converted', 'cancelled');
  CREATE TYPE public.compliance_status AS ENUM ('pending', 'done', 'na');

  -- ===== FUNÇÕES UTILITÁRIAS =====
  CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
  BEGIN new.updated_at = now(); RETURN new; END;
  $$;
  REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

  -- ===== TABELAS CORE =====

  CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    phone text,
    company_name text,
    cpf text,
    cnpj text,
    accepted_terms_at timestamptz,
    accepted_lgpd_at timestamptz,
    marketing_consent boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
  );

  -- private.has_role (depende de user_roles existir)
  CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  $$;
  REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
  GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

  CREATE TABLE public.modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical text NOT NULL DEFAULT 'food-service',
    month_index int NOT NULL,
    title text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (vertical, month_index)
  );

  CREATE TABLE public.weeks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
    week_index int NOT NULL,
    title text NOT NULL,
    description text,
    summary text,
    agenda text,
    homework text,
    is_checkpoint boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (module_id, week_index)
  );

  CREATE TABLE public.enrollments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vertical text NOT NULL DEFAULT 'food-service',
    status public.enrollment_status NOT NULL DEFAULT 'pending',
    started_at timestamptz,
    completed_at timestamptz,
    archive_at timestamptz,
    next_step_chosen_at timestamptz,
    assigned_mentor_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, vertical)
  );
  CREATE INDEX idx_enrollments_mentor ON public.enrollments(assigned_mentor_id);

  CREATE TABLE public.week_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
    week_id uuid NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
    status public.week_status NOT NULL DEFAULT 'locked',
    submitted_at timestamptz,
    approved_at timestamptz,
    approved_by uuid REFERENCES auth.users(id),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (enrollment_id, week_id)
  );

  CREATE TABLE public.documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
    week_id uuid REFERENCES public.weeks(id) ON DELETE SET NULL,
    title text NOT NULL,
    description text,
    body text,
    version text NOT NULL DEFAULT 'v1',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE public.incidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category public.incident_category NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    status public.incident_status NOT NULL DEFAULT 'open',
    assigned_to uuid REFERENCES auth.users(id),
    resolution text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE public.strategic_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  -- ===== PAGAMENTOS =====

  CREATE TABLE public.plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text UNIQUE NOT NULL,
    name text NOT NULL,
    description text,
    vertical text NOT NULL DEFAULT 'food-service',
    billing_interval text NOT NULL CHECK (billing_interval IN ('monthly', 'one_time', 'once')),
    amount_cents integer NOT NULL,
    currency text NOT NULL DEFAULT 'BRL',
    discount_percent integer NOT NULL DEFAULT 0,
    stripe_price_id text,
    mp_plan_id text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    plan_id uuid NOT NULL REFERENCES public.plans(id),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','past_due','canceled','completed')),
    current_month integer NOT NULL DEFAULT 0,
    paid_until timestamptz,
    followup_paid_until timestamptz,
    stripe_customer_id text,
    stripe_subscription_id text,
    stripe_payment_intent_id text,
    mp_payment_id text,
    mp_preference_id text,
    mp_preapproval_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  -- ===== AUDITORIA & COLABORAÇÃO =====

  CREATE TABLE public.mentor_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id uuid NOT NULL,
    student_id uuid,
    action public.mentor_action NOT NULL,
    week_id uuid,
    enrollment_id uuid,
    notes text,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_audit_mentor ON public.mentor_audit_log(mentor_id, created_at DESC);
  CREATE INDEX idx_audit_student ON public.mentor_audit_log(student_id, created_at DESC);
  CREATE INDEX idx_audit_action ON public.mentor_audit_log(action, created_at DESC);

  CREATE TABLE public.week_task_overrides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id uuid NOT NULL,
    week_id uuid NOT NULL,
    body text NOT NULL DEFAULT '',
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (enrollment_id, week_id)
  );

  CREATE TABLE public.class_meeting_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id uuid NOT NULL,
    week_id uuid NOT NULL,
    body text NOT NULL DEFAULT '',
    author_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (enrollment_id, week_id)
  );

  CREATE TABLE public.support_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    enrollment_id uuid,
    mentor_id uuid,
    title text NOT NULL,
    body text NOT NULL,
    status public.ticket_status NOT NULL DEFAULT 'open',
    opened_at timestamptz NOT NULL DEFAULT now(),
    last_reply_at timestamptz,
    answered_at timestamptz,
    closed_at timestamptz,
    closed_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_tickets_user ON public.support_tickets(user_id);
  CREATE INDEX idx_tickets_mentor ON public.support_tickets(mentor_id);
  CREATE INDEX idx_tickets_status ON public.support_tickets(status);

  CREATE TABLE public.support_ticket_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE RESTRICT,
    author_id uuid NOT NULL,
    author_role text NOT NULL CHECK (author_role IN ('client','mentor','admin')),
    body text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_ticket_msgs_ticket ON public.support_ticket_messages(ticket_id);

  CREATE TABLE public.vertical_leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical text NOT NULL CHECK (vertical IN ('estetica','hof','moda','food-service','pet-shop')),
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_leads_vertical ON public.vertical_leads(vertical);
  CREATE INDEX idx_leads_created ON public.vertical_leads(created_at DESC);

  -- ===== INDICAÇÕES =====

  CREATE TABLE public.referral_settings (
    id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
    discount_percent integer NOT NULL DEFAULT 10 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    active boolean NOT NULL DEFAULT true,
    updated_by uuid,
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE public.referral_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    code text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE public.referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id uuid NOT NULL,
    referred_user_id uuid NOT NULL UNIQUE,
    code text NOT NULL,
    discount_percent integer NOT NULL,
    status public.referral_status NOT NULL DEFAULT 'pending',
    enrollment_id uuid,
    converted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);

  -- ===== COMPLIANCE =====

  CREATE TABLE public.compliance_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical text NOT NULL DEFAULT 'food-service',
    week_id uuid,
    title text NOT NULL,
    description text,
    weight integer NOT NULL DEFAULT 1 CHECK (weight BETWEEN 1 AND 10),
    order_index integer NOT NULL DEFAULT 0,
    required boolean NOT NULL DEFAULT true,
    active boolean NOT NULL DEFAULT true,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_compliance_items_vertical ON public.compliance_items(vertical, active, order_index);
  CREATE INDEX idx_compliance_items_week ON public.compliance_items(week_id);

  CREATE TABLE public.compliance_responses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id uuid NOT NULL,
    item_id uuid NOT NULL REFERENCES public.compliance_items(id) ON DELETE CASCADE,
    status public.compliance_status NOT NULL DEFAULT 'pending',
    evidence text,
    completed_at timestamptz,
    completed_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (enrollment_id, item_id)
  );
  CREATE INDEX idx_compliance_resp_enrollment ON public.compliance_responses(enrollment_id);
  CREATE INDEX idx_compliance_resp_item ON public.compliance_responses(item_id);

  -- ===== RLS =====
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.week_progress ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.strategic_messages ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.mentor_audit_log ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.week_task_overrides ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.class_meeting_notes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.vertical_leads ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.compliance_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.compliance_responses ENABLE ROW LEVEL SECURITY;

  -- profiles
  CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (auth.uid() = id);
  CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = id);
  CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

  -- user_roles
  CREATE POLICY user_roles_select_own ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));
  CREATE POLICY user_roles_admin_all ON public.user_roles FOR ALL
    USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

  -- modules
  CREATE POLICY modules_read_all ON public.modules FOR SELECT USING (true);
  CREATE POLICY modules_admin_write ON public.modules FOR ALL
    USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
  CREATE POLICY modules_mentor_write ON public.modules FOR UPDATE
    USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'))
    WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));

  -- weeks
  CREATE POLICY weeks_read_all ON public.weeks FOR SELECT USING (true);
  CREATE POLICY weeks_admin_write ON public.weeks FOR ALL
    USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
  CREATE POLICY weeks_mentor_update ON public.weeks FOR UPDATE
    USING (private.has_role(auth.uid(), 'mentor')) WITH CHECK (private.has_role(auth.uid(), 'mentor'));

  -- enrollments
  CREATE POLICY enrollments_select_own_or_admin ON public.enrollments FOR SELECT TO authenticated USING (
    auth.uid() = user_id
    OR private.has_role(auth.uid(), 'admin')
    OR (private.has_role(auth.uid(), 'mentor') AND assigned_mentor_id = auth.uid())
  );
  CREATE POLICY enrollments_insert_own ON public.enrollments FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  CREATE POLICY enrollments_admin_update ON public.enrollments FOR UPDATE TO authenticated
    USING (
      private.has_role(auth.uid(), 'admin')
      OR (private.has_role(auth.uid(), 'mentor') AND assigned_mentor_id = auth.uid())
    )
    WITH CHECK (
      private.has_role(auth.uid(), 'admin')
      OR (private.has_role(auth.uid(), 'mentor') AND assigned_mentor_id = auth.uid())
    );

  -- week_progress
  CREATE POLICY wp_select_own_or_staff ON public.week_progress FOR SELECT TO authenticated USING (
    private.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.id = week_progress.enrollment_id
        AND (e.user_id = auth.uid()
            OR (private.has_role(auth.uid(), 'mentor') AND e.assigned_mentor_id = auth.uid()))
    )
  );
  CREATE POLICY wp_insert_own ON public.week_progress FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid())
  );
  CREATE POLICY wp_update_own_or_staff ON public.week_progress FOR UPDATE TO authenticated
    USING (
      private.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = week_progress.enrollment_id
          AND (e.user_id = auth.uid()
              OR (private.has_role(auth.uid(), 'mentor') AND e.assigned_mentor_id = auth.uid()))
      )
    )
    WITH CHECK (
      private.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = week_progress.enrollment_id
          AND (e.user_id = auth.uid()
              OR (private.has_role(auth.uid(), 'mentor') AND e.assigned_mentor_id = auth.uid()))
      )
    );

  -- documents
  CREATE POLICY documents_select_active ON public.documents FOR SELECT USING (
    private.has_role(auth.uid(), 'admin')
    OR private.has_role(auth.uid(), 'mentor')
    OR (week_id IS NULL AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = auth.uid()
        AND e.status IN ('active','graduated','archiving')
    ))
    OR EXISTS (
      SELECT 1 FROM public.week_progress wp
      JOIN public.enrollments e ON e.id = wp.enrollment_id
      WHERE wp.week_id = documents.week_id
        AND e.user_id = auth.uid()
        AND wp.status IN ('in_progress','submitted','approved')
    )
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.subscriptions s ON s.user_id = e.user_id
      JOIN public.plans p ON p.id = s.plan_id AND p.code = 'food_followup'
      WHERE e.user_id = auth.uid()
        AND e.status IN ('graduated','archiving')
        AND s.followup_paid_until IS NOT NULL
        AND s.followup_paid_until > now()
    )
  );
  CREATE POLICY documents_admin_write ON public.documents FOR ALL
    USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'))
    WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));

  -- incidents
  CREATE POLICY incidents_select_own_or_staff ON public.incidents FOR SELECT
    USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));
  CREATE POLICY incidents_insert_own ON public.incidents FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  CREATE POLICY incidents_update_staff ON public.incidents FOR UPDATE
    USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));

  -- strategic_messages
  CREATE POLICY sm_select_active ON public.strategic_messages FOR SELECT USING (
    private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor')
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.user_id = auth.uid() AND e.status = 'active')
  );
  CREATE POLICY sm_admin_write ON public.strategic_messages FOR ALL
    USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'))
    WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));

  -- plans
  CREATE POLICY plans_read_all ON public.plans FOR SELECT USING (true);
  CREATE POLICY plans_admin_write ON public.plans FOR ALL
    USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

  -- subscriptions
  CREATE POLICY subs_select_own_or_staff ON public.subscriptions FOR SELECT TO authenticated USING (
    auth.uid() = user_id
    OR private.has_role(auth.uid(), 'admin')
    OR (private.has_role(auth.uid(), 'mentor') AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = subscriptions.user_id AND e.assigned_mentor_id = auth.uid()
    ))
  );
  CREATE POLICY subs_admin_write ON public.subscriptions FOR ALL
    USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

  -- mentor_audit_log
  CREATE POLICY audit_select_staff ON public.mentor_audit_log FOR SELECT USING (
    private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor') OR auth.uid() = student_id
  );
  CREATE POLICY audit_insert_staff ON public.mentor_audit_log FOR INSERT WITH CHECK (
    (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'))
    AND mentor_id = auth.uid()
  );

  -- week_task_overrides
  CREATE POLICY wto_select_own_or_staff ON public.week_task_overrides FOR SELECT USING (
    private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor')
    OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.id = enrollment_id AND e.user_id = auth.uid())
  );
  CREATE POLICY wto_staff_write ON public.week_task_overrides FOR ALL
    USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'))
    WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));

  -- class_meeting_notes
  CREATE POLICY cmn_staff_select ON public.class_meeting_notes FOR SELECT
    USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));
  CREATE POLICY cmn_staff_write ON public.class_meeting_notes FOR ALL
    USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'))
    WITH CHECK (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));

  -- support_tickets
  CREATE POLICY tickets_select ON public.support_tickets FOR SELECT TO authenticated USING (
    auth.uid() = user_id
    OR private.has_role(auth.uid(), 'admin')
    OR (private.has_role(auth.uid(), 'mentor') AND mentor_id = auth.uid())
  );
  CREATE POLICY tickets_insert_own ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  CREATE POLICY tickets_update_staff ON public.support_tickets FOR UPDATE TO authenticated
    USING (private.has_role(auth.uid(), 'admin') OR (private.has_role(auth.uid(), 'mentor') AND mentor_id = auth.uid()))
    WITH CHECK (private.has_role(auth.uid(), 'admin') OR (private.has_role(auth.uid(), 'mentor') AND mentor_id = auth.uid()));

  -- support_ticket_messages
  CREATE POLICY msgs_select ON public.support_ticket_messages FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
        AND (auth.uid() = t.user_id
            OR private.has_role(auth.uid(), 'admin')
            OR (private.has_role(auth.uid(), 'mentor') AND t.mentor_id = auth.uid()))
    )
  );
  CREATE POLICY msgs_insert ON public.support_ticket_messages FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
        AND (auth.uid() = t.user_id
            OR private.has_role(auth.uid(), 'admin')
            OR (private.has_role(auth.uid(), 'mentor') AND t.mentor_id = auth.uid()))
    )
  );

  -- vertical_leads
  CREATE POLICY leads_insert_anyone ON public.vertical_leads FOR INSERT WITH CHECK (true);
  CREATE POLICY leads_select_admin ON public.vertical_leads FOR SELECT
    USING (private.has_role(auth.uid(), 'admin'));

  -- referral_settings
  CREATE POLICY rs_select_all ON public.referral_settings FOR SELECT USING (true);
  CREATE POLICY rs_admin_write ON public.referral_settings FOR ALL
    USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

  -- referral_codes
  CREATE POLICY rc_select_own_or_staff ON public.referral_codes FOR SELECT USING (
    auth.uid() = user_id
    OR private.has_role(auth.uid(), 'admin')
    OR private.has_role(auth.uid(), 'mentor')
  );

  -- referrals
  CREATE POLICY ref_select_own_or_staff ON public.referrals FOR SELECT USING (
    auth.uid() = referrer_id OR auth.uid() = referred_user_id
    OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor')
  );

  -- compliance_items
  CREATE POLICY ci_read_all ON public.compliance_items FOR SELECT USING (
    private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor')
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = auth.uid()
        AND e.vertical = public.compliance_items.vertical
        AND e.status IN ('active','graduated','archiving')
    )
  );
  CREATE POLICY ci_admin_write ON public.compliance_items FOR ALL
    USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

  -- compliance_responses
  CREATE POLICY cr_select_own_or_staff ON public.compliance_responses FOR SELECT TO authenticated USING (
    private.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.id = compliance_responses.enrollment_id
        AND (e.user_id = auth.uid()
            OR (private.has_role(auth.uid(), 'mentor') AND e.assigned_mentor_id = auth.uid()))
    )
  );
  CREATE POLICY cr_upsert_own_or_staff ON public.compliance_responses FOR ALL TO authenticated
    USING (
      private.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = compliance_responses.enrollment_id
          AND (e.user_id = auth.uid()
              OR (private.has_role(auth.uid(), 'mentor') AND e.assigned_mentor_id = auth.uid()))
      )
    )
    WITH CHECK (
      private.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.id = compliance_responses.enrollment_id
          AND (e.user_id = auth.uid()
              OR (private.has_role(auth.uid(), 'mentor') AND e.assigned_mentor_id = auth.uid()))
      )
    );

  -- ===== TRIGGERS =====
  CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  CREATE TRIGGER enrollments_updated BEFORE UPDATE ON public.enrollments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  CREATE TRIGGER week_progress_updated BEFORE UPDATE ON public.week_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  CREATE TRIGGER documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  CREATE TRIGGER incidents_updated BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  CREATE TRIGGER sm_updated BEFORE UPDATE ON public.strategic_messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  CREATE TRIGGER plans_set_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  CREATE TRIGGER subs_set_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  CREATE TRIGGER wto_set_updated_at BEFORE UPDATE ON public.week_task_overrides FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  CREATE TRIGGER trg_compliance_items_uat BEFORE UPDATE ON public.compliance_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  CREATE TRIGGER trg_compliance_resp_uat BEFORE UPDATE ON public.compliance_responses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  CREATE TRIGGER cmn_touch BEFORE UPDATE ON public.class_meeting_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

  -- ===== FUNÇÕES COMPLEXAS =====

  -- Auto-graduação ao aprovar todas as semanas
  CREATE OR REPLACE FUNCTION public.maybe_graduate_enrollment(_enrollment_id uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE
    total_weeks int;
    approved_weeks int;
    _vertical text;
  BEGIN
    SELECT e.vertical INTO _vertical FROM public.enrollments e WHERE e.id = _enrollment_id;
    SELECT COUNT(*) INTO total_weeks
      FROM public.weeks w
      JOIN public.modules m ON m.id = w.module_id
      WHERE m.vertical = _vertical;
    SELECT COUNT(*) INTO approved_weeks
      FROM public.week_progress
      WHERE enrollment_id = _enrollment_id AND status = 'approved';
    IF total_weeks > 0 AND approved_weeks >= total_weeks THEN
      UPDATE public.enrollments
        SET status = 'graduated', completed_at = COALESCE(completed_at, now())
      WHERE id = _enrollment_id AND status NOT IN ('graduated','archiving','archived');
    END IF;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.trg_week_progress_graduate()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
      PERFORM public.maybe_graduate_enrollment(NEW.enrollment_id);
    END IF;
    RETURN NEW;
  END;
  $$;

  CREATE TRIGGER week_progress_graduate
  AFTER INSERT OR UPDATE ON public.week_progress
  FOR EACH ROW EXECUTE FUNCTION public.trg_week_progress_graduate();

  -- Log automático de ações de mentor
  CREATE OR REPLACE FUNCTION public.trg_log_week_progress()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE
    _student uuid;
    _is_staff boolean;
  BEGIN
    _is_staff := private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor');
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

  CREATE TRIGGER week_progress_audit AFTER UPDATE ON public.week_progress FOR EACH ROW EXECUTE FUNCTION public.trg_log_week_progress();
  CREATE TRIGGER week_progress_audit_insert AFTER INSERT ON public.week_progress FOR EACH ROW EXECUTE FUNCTION public.trg_log_week_progress();

  -- Trigger de auditoria para edição de semanas
  CREATE OR REPLACE FUNCTION public.trg_audit_week_edit()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE _uid uuid := auth.uid();
  BEGIN
    IF _uid IS NULL THEN RETURN NEW; END IF;
    IF NOT (private.has_role(_uid,'admin') OR private.has_role(_uid,'mentor')) THEN RETURN NEW; END IF;
    INSERT INTO public.mentor_audit_log (mentor_id, action, week_id, notes, metadata)
    VALUES (_uid, 'content_edited', NEW.id, 'Editou aula: ' || NEW.title,
            jsonb_build_object('entity','week','week_index',NEW.week_index,
              'changed_title', OLD.title IS DISTINCT FROM NEW.title,
              'changed_summary', OLD.summary IS DISTINCT FROM NEW.summary,
              'changed_agenda', OLD.agenda IS DISTINCT FROM NEW.agenda,
              'changed_homework', OLD.homework IS DISTINCT FROM NEW.homework));
    RETURN NEW;
  END;
  $$;

  CREATE TRIGGER audit_weeks_update AFTER UPDATE ON public.weeks FOR EACH ROW
  WHEN (OLD.title IS DISTINCT FROM NEW.title OR OLD.summary IS DISTINCT FROM NEW.summary
    OR OLD.agenda IS DISTINCT FROM NEW.agenda OR OLD.homework IS DISTINCT FROM NEW.homework
    OR OLD.description IS DISTINCT FROM NEW.description)
  EXECUTE FUNCTION public.trg_audit_week_edit();

  -- Trigger de auditoria para documentos
  CREATE OR REPLACE FUNCTION public.trg_audit_doc_change()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE _uid uuid := auth.uid(); _wid uuid; _title text; _verb text;
  BEGIN
    IF _uid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
    IF NOT (private.has_role(_uid,'admin') OR private.has_role(_uid,'mentor')) THEN RETURN COALESCE(NEW, OLD); END IF;
    IF TG_OP = 'INSERT' THEN _verb := 'Criou documento'; _wid := NEW.week_id; _title := NEW.title;
    ELSIF TG_OP = 'UPDATE' THEN _verb := 'Editou documento'; _wid := NEW.week_id; _title := NEW.title;
    ELSE _verb := 'Excluiu documento'; _wid := OLD.week_id; _title := OLD.title;
    END IF;
    INSERT INTO public.mentor_audit_log (mentor_id, action, week_id, notes, metadata)
    VALUES (_uid, 'content_edited', _wid, _verb || ': ' || _title,
            jsonb_build_object('entity','document','op',TG_OP,'doc_id', COALESCE(NEW.id, OLD.id)));
    RETURN COALESCE(NEW, OLD);
  END;
  $$;

  CREATE TRIGGER audit_documents_change AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_doc_change();

  -- Trigger: converter indicação quando matrícula fica ativa
  CREATE OR REPLACE FUNCTION public.trg_referral_convert_on_enrollment()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE _ref_id uuid; _referrer uuid;
  BEGIN
    IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
      SELECT id, referrer_id INTO _ref_id, _referrer
        FROM public.referrals
        WHERE referred_user_id = NEW.user_id AND status = 'pending'
        LIMIT 1;
      IF _ref_id IS NOT NULL THEN
        UPDATE public.referrals
          SET status = 'converted', converted_at = now(), enrollment_id = NEW.id
        WHERE id = _ref_id;
        INSERT INTO public.mentor_audit_log (mentor_id, student_id, action, enrollment_id, notes, metadata)
        VALUES (COALESCE(auth.uid(), _referrer), _referrer, 'referral_converted', NEW.id,
                'Indicação convertida em matrícula ativa',
                jsonb_build_object('referral_id', _ref_id, 'referred_user', NEW.user_id));
      END IF;
    END IF;
    RETURN NEW;
  END;
  $$;

  CREATE TRIGGER referral_convert_after_enrollment
  AFTER INSERT OR UPDATE OF status ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.trg_referral_convert_on_enrollment();

  -- handle_new_user (versão final)
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE
    _email text := lower(coalesce(NEW.email, ''));
    _vertical text := coalesce(nullif(NEW.raw_user_meta_data->>'vertical', ''), 'food-service');
  BEGIN
    IF _vertical NOT IN ('food-service', 'pet-shop') THEN
      _vertical := 'food-service';
    END IF;
    INSERT INTO public.profiles (
      id, full_name, company_name, phone, cpf, cnpj,
      accepted_terms_at, accepted_lgpd_at, marketing_consent
    ) VALUES (
      NEW.id,
      coalesce(NEW.raw_user_meta_data->>'full_name', ''),
      coalesce(NEW.raw_user_meta_data->>'company_name', ''),
      coalesce(NEW.raw_user_meta_data->>'phone', ''),
      nullif(regexp_replace(coalesce(NEW.raw_user_meta_data->>'cpf', ''), '\D', '', 'g'), ''),
      nullif(regexp_replace(coalesce(NEW.raw_user_meta_data->>'cnpj', ''), '\D', '', 'g'), ''),
      CASE WHEN lower(coalesce(NEW.raw_user_meta_data->>'accepted_terms', 'false')) = 'true' THEN now() ELSE NULL END,
      CASE WHEN lower(coalesce(NEW.raw_user_meta_data->>'accepted_lgpd', 'false')) = 'true' THEN now() ELSE NULL END,
      lower(coalesce(NEW.raw_user_meta_data->>'marketing_consent', 'false')) = 'true'
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, company_name = EXCLUDED.company_name,
      phone = EXCLUDED.phone, cpf = EXCLUDED.cpf, cnpj = EXCLUDED.cnpj,
      accepted_terms_at = EXCLUDED.accepted_terms_at, accepted_lgpd_at = EXCLUDED.accepted_lgpd_at,
      marketing_consent = EXCLUDED.marketing_consent, updated_at = now();

    IF _email = 'glaubertgia@gmail.com' THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'mentor') ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cliente') ON CONFLICT DO NOTHING;
      INSERT INTO public.enrollments (user_id, vertical, status)
      VALUES (NEW.id, _vertical, 'pending');
    END IF;
    RETURN NEW;
  END;
  $$;
  REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

  -- ===== FUNÇÕES ADMIN =====

  CREATE OR REPLACE FUNCTION public.admin_find_user_by_email(_email text)
  RETURNS TABLE(user_id uuid, email text, full_name text)
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    IF NOT private.has_role(auth.uid(), 'admin') THEN
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

  CREATE OR REPLACE FUNCTION public.admin_list_mentors()
  RETURNS TABLE(user_id uuid, email text, full_name text, is_admin boolean, granted_at timestamptz)
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    IF NOT (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor')) THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;
    RETURN QUERY
    SELECT ur.user_id, u.email::text, COALESCE(p.full_name, '')::text,
          private.has_role(ur.user_id, 'admin'), ur.created_at
    FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    LEFT JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.role = 'mentor'
    ORDER BY ur.created_at DESC;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.admin_grant_mentor(_user_id uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    IF NOT private.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Apenas administradores podem promover mentores';
    END IF;
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'mentor') ON CONFLICT DO NOTHING;
    INSERT INTO public.mentor_audit_log (mentor_id, student_id, action)
    VALUES (auth.uid(), _user_id, 'mentor_granted');
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.admin_revoke_mentor(_user_id uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    IF NOT private.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Apenas administradores podem remover mentores';
    END IF;
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'mentor';
    INSERT INTO public.mentor_audit_log (mentor_id, student_id, action)
    VALUES (auth.uid(), _user_id, 'mentor_revoked');
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.admin_list_user_emails(_ids uuid[])
  RETURNS TABLE(user_id uuid, email text)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT u.id, u.email::text
    FROM auth.users u
    WHERE u.id = ANY(_ids)
      AND (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor'));
  $$;

  CREATE OR REPLACE FUNCTION public.admin_extend_followup(_user_id uuid, _days integer DEFAULT 30)
  RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE _plan uuid; _sub_id uuid; _new_until timestamptz;
  BEGIN
    IF NOT private.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Apenas administradores podem liberar acompanhamento';
    END IF;
    SELECT id INTO _plan FROM public.plans WHERE code = 'food_followup' LIMIT 1;
    SELECT id, GREATEST(COALESCE(followup_paid_until, now()), now()) + make_interval(days => _days)
      INTO _sub_id, _new_until
      FROM public.subscriptions WHERE user_id = _user_id AND plan_id = _plan
      ORDER BY created_at DESC LIMIT 1;
    IF _sub_id IS NULL THEN
      INSERT INTO public.subscriptions (user_id, plan_id, status, followup_paid_until, current_month)
      VALUES (_user_id, _plan, 'active', now() + make_interval(days => _days), 0)
      RETURNING followup_paid_until INTO _new_until;
    ELSE
      UPDATE public.subscriptions SET followup_paid_until = _new_until, status = 'active', updated_at = now()
      WHERE id = _sub_id;
    END IF;
    UPDATE public.enrollments SET status = 'graduated', archive_at = NULL
    WHERE user_id = _user_id AND status IN ('archiving','archived');
    INSERT INTO public.mentor_audit_log (mentor_id, student_id, action, notes, metadata)
    VALUES (auth.uid(), _user_id, 'followup_extended', format('+%s dias', _days),
            jsonb_build_object('days', _days, 'paid_until', _new_until));
    RETURN _new_until;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.request_archive(_enrollment_id uuid)
  RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE _archive_at timestamptz; _owner uuid;
  BEGIN
    SELECT user_id INTO _owner FROM public.enrollments WHERE id = _enrollment_id;
    IF _owner IS NULL THEN RAISE EXCEPTION 'Matrícula não encontrada'; END IF;
    IF _owner <> auth.uid() AND NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
    _archive_at := now() + interval '7 days';
    UPDATE public.enrollments
      SET status = 'archiving', archive_at = _archive_at, next_step_chosen_at = now()
    WHERE id = _enrollment_id AND status IN ('graduated','active');
    RETURN _archive_at;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.cancel_archive(_enrollment_id uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE _owner uuid;
  BEGIN
    SELECT user_id INTO _owner FROM public.enrollments WHERE id = _enrollment_id;
    IF _owner <> auth.uid() AND NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
    UPDATE public.enrollments SET status = 'graduated', archive_at = NULL
    WHERE id = _enrollment_id AND status = 'archiving';
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.daily_archive_expired()
  RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE n int;
  BEGIN
    WITH upd AS (
      UPDATE public.enrollments SET status = 'archived'
      WHERE status = 'archiving' AND archive_at IS NOT NULL AND archive_at <= now()
      RETURNING id
    ) SELECT count(*) INTO n FROM upd;
    RETURN n;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.log_class_attendance(_enrollment_id uuid, _week_id uuid, _notes text DEFAULT NULL)
  RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE _student uuid; _id uuid;
  BEGIN
    IF NOT (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor')) THEN
      RAISE EXCEPTION 'Apenas mentores podem registrar atendimento de aula';
    END IF;
    SELECT user_id INTO _student FROM public.enrollments WHERE id = _enrollment_id;
    INSERT INTO public.mentor_audit_log (mentor_id, student_id, action, week_id, enrollment_id, notes)
    VALUES (auth.uid(), _student, 'class_attended', _week_id, _enrollment_id, _notes)
    RETURNING id INTO _id;
    RETURN _id;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.staff_unlock_week(_enrollment_id uuid, _week_id uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE uid uuid := auth.uid();
  BEGIN
    IF NOT (private.has_role(uid, 'admin') OR private.has_role(uid, 'mentor')) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
    INSERT INTO public.week_progress (enrollment_id, week_id, status)
    VALUES (_enrollment_id, _week_id, 'in_progress')
    ON CONFLICT (enrollment_id, week_id) DO UPDATE
      SET status = CASE
        WHEN public.week_progress.status = 'locked' THEN 'in_progress'::week_status
        ELSE public.week_progress.status END,
      updated_at = now();
    INSERT INTO public.mentor_audit_log (mentor_id, enrollment_id, week_id, action, notes)
    VALUES (uid, _enrollment_id, _week_id, 'week_released', 'Liberação antecipada');
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.staff_finish_meeting(_enrollment_id uuid, _week_id uuid, _private_notes text DEFAULT NULL)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE _student uuid; _current_mentor uuid;
  BEGIN
    IF NOT (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'mentor')) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
    SELECT user_id, assigned_mentor_id INTO _student, _current_mentor
      FROM public.enrollments WHERE id = _enrollment_id;
    IF _student IS NULL THEN RAISE EXCEPTION 'Matrícula não encontrada'; END IF;
    IF _current_mentor IS NULL AND private.has_role(auth.uid(), 'mentor') THEN
      UPDATE public.enrollments SET assigned_mentor_id = auth.uid() WHERE id = _enrollment_id;
    END IF;
    INSERT INTO public.week_progress (enrollment_id, week_id, status, approved_at, approved_by)
    VALUES (_enrollment_id, _week_id, 'approved', now(), auth.uid())
    ON CONFLICT (enrollment_id, week_id) DO UPDATE
      SET status='approved', approved_at=COALESCE(public.week_progress.approved_at, now()),
          approved_by=COALESCE(public.week_progress.approved_by, auth.uid()), updated_at=now();
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

  CREATE OR REPLACE FUNCTION public.close_week_class(_enrollment_id uuid, _week_id uuid, _notes text DEFAULT NULL)
  RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE _student uuid; _log_id uuid; _current_mentor uuid;
  BEGIN
    IF NOT (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'mentor')) THEN
      RAISE EXCEPTION 'Apenas mentores podem encerrar aula';
    END IF;
    SELECT user_id, assigned_mentor_id INTO _student, _current_mentor
      FROM public.enrollments WHERE id = _enrollment_id;
    IF _student IS NULL THEN RAISE EXCEPTION 'Matrícula não encontrada'; END IF;
    IF _current_mentor IS NULL AND private.has_role(auth.uid(),'mentor') THEN
      UPDATE public.enrollments SET assigned_mentor_id = auth.uid() WHERE id = _enrollment_id;
    END IF;
    INSERT INTO public.week_progress (enrollment_id, week_id, status, approved_at, approved_by, notes)
    VALUES (_enrollment_id, _week_id, 'approved', now(), auth.uid(), _notes)
    ON CONFLICT DO NOTHING;
    UPDATE public.week_progress
      SET status='approved', approved_at=COALESCE(approved_at, now()),
          approved_by=COALESCE(approved_by, auth.uid()), notes=COALESCE(_notes, notes)
    WHERE enrollment_id=_enrollment_id AND week_id=_week_id;
    INSERT INTO public.mentor_audit_log (mentor_id, student_id, action, week_id, enrollment_id, notes)
    VALUES (auth.uid(), _student, 'class_attended', _week_id, _enrollment_id, COALESCE(_notes,'Aula encerrada'))
    RETURNING id INTO _log_id;
    RETURN _log_id;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.open_support_ticket(_title text, _body text)
  RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE _enrollment_id uuid; _mentor uuid; _ticket_id uuid;
  BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
    SELECT id, assigned_mentor_id INTO _enrollment_id, _mentor
      FROM public.enrollments WHERE user_id = auth.uid() ORDER BY created_at DESC LIMIT 1;
    INSERT INTO public.support_tickets (user_id, enrollment_id, mentor_id, title, body, last_reply_at)
    VALUES (auth.uid(), _enrollment_id, _mentor, _title, _body, now()) RETURNING id INTO _ticket_id;
    INSERT INTO public.support_ticket_messages (ticket_id, author_id, author_role, body)
    VALUES (_ticket_id, auth.uid(), 'client', _body);
    RETURN _ticket_id;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.reply_support_ticket(_ticket_id uuid, _body text)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE _role text; _t public.support_tickets%ROWTYPE;
  BEGIN
    SELECT * INTO _t FROM public.support_tickets WHERE id = _ticket_id;
    IF _t.id IS NULL THEN RAISE EXCEPTION 'Chamado não encontrado'; END IF;
    IF private.has_role(auth.uid(),'admin') THEN _role := 'admin';
    ELSIF private.has_role(auth.uid(),'mentor') THEN _role := 'mentor';
    ELSIF _t.user_id = auth.uid() THEN _role := 'client';
    ELSE RAISE EXCEPTION 'Sem permissão'; END IF;
    INSERT INTO public.support_ticket_messages (ticket_id, author_id, author_role, body)
    VALUES (_ticket_id, auth.uid(), _role, _body);
    IF _role IN ('mentor','admin') THEN
      UPDATE public.support_tickets
        SET status = CASE WHEN status='closed' THEN 'closed'::ticket_status ELSE 'answered'::ticket_status END,
            answered_at = COALESCE(answered_at, now()), last_reply_at = now(),
            mentor_id = COALESCE(mentor_id, CASE WHEN _role='mentor' THEN auth.uid() ELSE NULL END)
      WHERE id = _ticket_id;
    ELSE
      UPDATE public.support_tickets
        SET status = CASE WHEN status='closed' THEN 'closed'::ticket_status ELSE 'open'::ticket_status END,
            last_reply_at = now()
      WHERE id = _ticket_id;
    END IF;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.close_support_ticket(_ticket_id uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE _t public.support_tickets%ROWTYPE;
  BEGIN
    SELECT * INTO _t FROM public.support_tickets WHERE id = _ticket_id;
    IF _t.id IS NULL THEN RAISE EXCEPTION 'Chamado não encontrado'; END IF;
    IF NOT (private.has_role(auth.uid(),'admin')
        OR (private.has_role(auth.uid(),'mentor') AND _t.mentor_id = auth.uid())) THEN
      RAISE EXCEPTION 'Sem permissão para encerrar';
    END IF;
    UPDATE public.support_tickets SET status='closed', closed_at=now(), closed_by=auth.uid()
    WHERE id = _ticket_id;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.count_open_tickets_for_staff()
  RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
  DECLARE n int;
  BEGIN
    IF private.has_role(auth.uid(),'admin') THEN
      SELECT count(*) INTO n FROM public.support_tickets WHERE status IN ('open','answered');
    ELSIF private.has_role(auth.uid(),'mentor') THEN
      SELECT count(*) INTO n FROM public.support_tickets
        WHERE status IN ('open','answered') AND mentor_id = auth.uid();
    ELSE n := 0; END IF;
    RETURN COALESCE(n,0);
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.admin_audit_list(
    _limit int DEFAULT 100, _action mentor_action DEFAULT NULL,
    _student uuid DEFAULT NULL, _mentor uuid DEFAULT NULL
  )
  RETURNS TABLE (
    id uuid, created_at timestamptz, action mentor_action,
    mentor_id uuid, mentor_name text, mentor_email text,
    student_id uuid, student_name text, student_email text,
    week_index int, week_title text, notes text, metadata jsonb
  )
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    IF NOT (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'mentor')) THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;
    RETURN QUERY
    SELECT a.id, a.created_at, a.action,
          a.mentor_id, COALESCE(pm.full_name,'')::text, um.email::text,
          a.student_id, COALESCE(ps.full_name,'')::text, us.email::text,
          w.week_index, w.title, a.notes, a.metadata
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

  CREATE OR REPLACE FUNCTION public.admin_mentor_monthly_report(_month date DEFAULT date_trunc('month', now())::date)
  RETURNS TABLE (
    mentor_id uuid, mentor_name text, mentor_email text, is_admin boolean,
    classes_attended bigint, weeks_approved bigint, weeks_released bigint,
    followups_extended bigint, distinct_students bigint, total_actions bigint
  )
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE
    _start timestamptz := date_trunc('month', _month)::timestamptz;
    _end   timestamptz := (date_trunc('month', _month) + interval '1 month')::timestamptz;
  BEGIN
    IF NOT (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'mentor')) THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;
    RETURN QUERY
    SELECT ur.user_id, COALESCE(p.full_name,'')::text, u.email::text,
          private.has_role(ur.user_id, 'admin'),
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
      ON a.mentor_id = ur.user_id AND a.created_at >= _start AND a.created_at < _end
    WHERE ur.role = 'mentor'
    GROUP BY ur.user_id, p.full_name, u.email
    ORDER BY COUNT(a.id) DESC, p.full_name NULLS LAST;
  END;
  $$;

  -- Indicações
  CREATE OR REPLACE FUNCTION public.get_referral_settings()
  RETURNS TABLE(discount_percent integer, active boolean)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT discount_percent, active FROM public.referral_settings WHERE id = true;
  $$;

  CREATE OR REPLACE FUNCTION public.get_or_create_my_referral_code()
  RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE _uid uuid := auth.uid(); _code text; _attempt int := 0; _candidate text;
  BEGIN
    IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
    SELECT code INTO _code FROM public.referral_codes WHERE user_id = _uid;
    IF _code IS NOT NULL THEN RETURN _code; END IF;
    LOOP
      _attempt := _attempt + 1;
      _candidate := upper(substr(replace(encode(gen_random_bytes(6), 'base64'), '/', ''), 1, 8));
      _candidate := regexp_replace(_candidate, '[^A-Z0-9]', 'X', 'g');
      BEGIN
        INSERT INTO public.referral_codes (user_id, code) VALUES (_uid, _candidate);
        RETURN _candidate;
      EXCEPTION WHEN unique_violation THEN
        IF _attempt > 10 THEN RAISE EXCEPTION 'Não foi possível gerar código'; END IF;
      END;
    END LOOP;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.apply_referral_code(_code text)
  RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE _uid uuid := auth.uid(); _referrer uuid; _discount integer; _active boolean; _id uuid;
  BEGIN
    IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
    SELECT discount_percent, active INTO _discount, _active FROM public.referral_settings WHERE id = true;
    IF NOT _active THEN RAISE EXCEPTION 'Programa de indicações está inativo'; END IF;
    SELECT user_id INTO _referrer FROM public.referral_codes WHERE code = upper(trim(_code));
    IF _referrer IS NULL THEN RAISE EXCEPTION 'Código não encontrado'; END IF;
    IF _referrer = _uid THEN RAISE EXCEPTION 'Você não pode usar o próprio código'; END IF;
    SELECT id INTO _id FROM public.referrals WHERE referred_user_id = _uid;
    IF _id IS NOT NULL THEN RETURN _id; END IF;
    INSERT INTO public.referrals (referrer_id, referred_user_id, code, discount_percent)
    VALUES (_referrer, _uid, upper(trim(_code)), _discount) RETURNING id INTO _id;
    INSERT INTO public.mentor_audit_log (mentor_id, student_id, action, notes, metadata)
    VALUES (_uid, _referrer, 'referral_created', 'Nova indicação registrada',
            jsonb_build_object('code', upper(trim(_code)), 'discount', _discount));
    RETURN _id;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.admin_set_referral_discount(_percent integer, _active boolean DEFAULT NULL)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    IF NOT private.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Apenas super admin pode alterar o desconto de indicação';
    END IF;
    UPDATE public.referral_settings SET discount_percent = _percent,
          active = COALESCE(_active, active), updated_by = auth.uid(), updated_at = now()
    WHERE id = true;
    INSERT INTO public.mentor_audit_log (mentor_id, action, notes, metadata)
    VALUES (auth.uid(), 'referral_discount_updated',
            format('Desconto de indicação atualizado para %s%%', _percent),
            jsonb_build_object('discount', _percent, 'active', _active));
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.my_referral_summary()
  RETURNS TABLE(code text, discount_percent integer, active boolean,
                total_referrals bigint, converted_referrals bigint, pending_referrals bigint)
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
  DECLARE _uid uuid := auth.uid(); _code text; _d int; _a boolean;
  BEGIN
    IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
    SELECT rc.code INTO _code FROM public.referral_codes rc WHERE rc.user_id = _uid;
    SELECT s.discount_percent, s.active INTO _d, _a FROM public.referral_settings s WHERE s.id = true;
    RETURN QUERY
    SELECT _code, _d, _a,
      COALESCE((SELECT count(*) FROM public.referrals WHERE referrer_id = _uid), 0),
      COALESCE((SELECT count(*) FROM public.referrals WHERE referrer_id = _uid AND status='converted'), 0),
      COALESCE((SELECT count(*) FROM public.referrals WHERE referrer_id = _uid AND status='pending'), 0);
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.admin_referral_report()
  RETURNS TABLE(
    id uuid, created_at timestamptz, status referral_status,
    discount_percent integer, converted_at timestamptz,
    referrer_id uuid, referrer_name text, referrer_email text,
    referred_id uuid, referred_name text, referred_email text,
    enrollment_id uuid, enrollment_status text
  )
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    IF NOT (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'mentor')) THEN
      RAISE EXCEPTION 'Acesso negado';
    END IF;
    RETURN QUERY
    SELECT r.id, r.created_at, r.status, r.discount_percent, r.converted_at,
          r.referrer_id, COALESCE(pr.full_name,'')::text, ur.email::text,
          r.referred_user_id, COALESCE(pd.full_name,'')::text, ud.email::text,
          r.enrollment_id, e.status::text
    FROM public.referrals r
    LEFT JOIN auth.users ur ON ur.id = r.referrer_id LEFT JOIN public.profiles pr ON pr.id = r.referrer_id
    LEFT JOIN auth.users ud ON ud.id = r.referred_user_id LEFT JOIN public.profiles pd ON pd.id = r.referred_user_id
    LEFT JOIN public.enrollments e ON e.id = r.enrollment_id
    ORDER BY r.created_at DESC;
  END;
  $$;

  -- Compliance
  CREATE OR REPLACE FUNCTION public.get_compliance_for_enrollment(_enrollment_id uuid)
  RETURNS TABLE(
    item_id uuid, week_id uuid, week_index integer, week_title text,
    title text, description text, weight integer, order_index integer, required boolean,
    status public.compliance_status, evidence text, completed_at timestamptz
  )
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
  DECLARE _owner uuid; _vertical text;
  BEGIN
    SELECT user_id, vertical INTO _owner, _vertical FROM public.enrollments WHERE id = _enrollment_id;
    IF _owner IS NULL THEN RAISE EXCEPTION 'Matrícula não encontrada'; END IF;
    IF _owner <> auth.uid()
      AND NOT private.has_role(auth.uid(),'admin')
      AND NOT private.has_role(auth.uid(),'mentor') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
    RETURN QUERY
    SELECT ci.id, ci.week_id, w.week_index, w.title,
          ci.title, ci.description, ci.weight, ci.order_index, ci.required,
          COALESCE(cr.status, 'pending'::public.compliance_status), cr.evidence, cr.completed_at
    FROM public.compliance_items ci
    LEFT JOIN public.weeks w ON w.id = ci.week_id
    LEFT JOIN public.compliance_responses cr ON cr.item_id = ci.id AND cr.enrollment_id = _enrollment_id
    WHERE ci.active = true AND ci.vertical = _vertical
    ORDER BY COALESCE(w.week_index, 9999), ci.order_index, ci.title;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.set_compliance_status(
    _enrollment_id uuid, _item_id uuid,
    _status public.compliance_status, _evidence text DEFAULT NULL
  ) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE _owner uuid;
  BEGIN
    SELECT user_id INTO _owner FROM public.enrollments WHERE id = _enrollment_id;
    IF _owner IS NULL THEN RAISE EXCEPTION 'Matrícula não encontrada'; END IF;
    IF _owner <> auth.uid()
      AND NOT private.has_role(auth.uid(),'admin')
      AND NOT private.has_role(auth.uid(),'mentor') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
    INSERT INTO public.compliance_responses (enrollment_id, item_id, status, evidence, completed_at, completed_by)
    VALUES (_enrollment_id, _item_id, _status, _evidence,
            CASE WHEN _status = 'done' THEN now() ELSE NULL END, auth.uid())
    ON CONFLICT (enrollment_id, item_id) DO UPDATE
      SET status = EXCLUDED.status,
          evidence = COALESCE(EXCLUDED.evidence, public.compliance_responses.evidence),
          completed_at = CASE WHEN EXCLUDED.status='done' THEN COALESCE(public.compliance_responses.completed_at, now()) ELSE NULL END,
          completed_by = auth.uid(), updated_at = now();
    IF private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'mentor') THEN
      INSERT INTO public.mentor_audit_log (mentor_id, student_id, action, enrollment_id, notes, metadata)
      VALUES (auth.uid(), _owner, 'compliance_marked', _enrollment_id,
              format('Compliance: status=%s', _status),
              jsonb_build_object('item_id', _item_id, 'status', _status));
    END IF;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.compliance_score_for_enrollment(_enrollment_id uuid)
  RETURNS TABLE(total_weight integer, done_weight integer, na_weight integer,
                pending_weight integer, score_percent integer, level text)
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
  DECLARE _vertical text; _owner uuid;
          _total int; _done int; _na int; _pending int; _eff int; _pct int; _lvl text;
  BEGIN
    SELECT user_id, vertical INTO _owner, _vertical FROM public.enrollments WHERE id = _enrollment_id;
    IF _owner IS NULL THEN RAISE EXCEPTION 'Matrícula não encontrada'; END IF;
    IF _owner <> auth.uid() AND NOT private.has_role(auth.uid(),'admin')
      AND NOT private.has_role(auth.uid(),'mentor') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
    SELECT
      COALESCE(SUM(ci.weight),0),
      COALESCE(SUM(CASE WHEN cr.status='done' THEN ci.weight ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN cr.status='na'   THEN ci.weight ELSE 0 END),0),
      COALESCE(SUM(CASE WHEN COALESCE(cr.status,'pending')='pending' THEN ci.weight ELSE 0 END),0)
    INTO _total, _done, _na, _pending
    FROM public.compliance_items ci
    LEFT JOIN public.compliance_responses cr ON cr.item_id = ci.id AND cr.enrollment_id = _enrollment_id
    WHERE ci.active = true AND ci.vertical = _vertical;
    _eff := GREATEST(_total - _na, 0);
    _pct := CASE WHEN _eff = 0 THEN 0 ELSE ROUND((_done::numeric / _eff::numeric) * 100)::int END;
    _lvl := CASE
      WHEN _pct >= 100 THEN 'Blindado Ouro' WHEN _pct >= 76 THEN 'Blindado'
      WHEN _pct >= 51 THEN 'Protegido' WHEN _pct >= 26 THEN 'Em Construção'
      ELSE 'Iniciante' END;
    RETURN QUERY SELECT _total, _done, _na, _pending, _pct, _lvl;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.admin_upsert_compliance_item(
    _id uuid, _vertical text, _week_id uuid, _title text, _description text,
    _weight integer, _order_index integer, _required boolean, _active boolean
  ) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  DECLARE _out uuid;
  BEGIN
    IF NOT private.has_role(auth.uid(),'admin') THEN
      RAISE EXCEPTION 'Apenas super admin pode editar itens de compliance';
    END IF;
    IF _id IS NULL THEN
      INSERT INTO public.compliance_items (vertical, week_id, title, description, weight, order_index, required, active, created_by)
      VALUES (COALESCE(_vertical,'food-service'), _week_id, _title, _description,
              COALESCE(_weight,1), COALESCE(_order_index,0), COALESCE(_required,true), COALESCE(_active,true), auth.uid())
      RETURNING id INTO _out;
    ELSE
      UPDATE public.compliance_items
        SET vertical=COALESCE(_vertical,vertical), week_id=_week_id,
            title=COALESCE(_title,title), description=_description,
            weight=COALESCE(_weight,weight), order_index=COALESCE(_order_index,order_index),
            required=COALESCE(_required,required), active=COALESCE(_active,active), updated_at=now()
      WHERE id = _id RETURNING id INTO _out;
    END IF;
    INSERT INTO public.mentor_audit_log (mentor_id, action, notes, metadata)
    VALUES (auth.uid(), 'compliance_item_changed',
            format('Item de compliance %s', CASE WHEN _id IS NULL THEN 'criado' ELSE 'atualizado' END),
            jsonb_build_object('id', _out, 'vertical', _vertical, 'title', _title));
    RETURN _out;
  END;
  $$;

  CREATE OR REPLACE FUNCTION public.admin_delete_compliance_item(_id uuid)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
  BEGIN
    IF NOT private.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Apenas super admin pode remover itens'; END IF;
    DELETE FROM public.compliance_items WHERE id = _id;
    INSERT INTO public.mentor_audit_log (mentor_id, action, notes, metadata)
    VALUES (auth.uid(), 'compliance_item_changed', 'Item de compliance removido', jsonb_build_object('id', _id, 'op','delete'));
  END;
  $$;

  -- ===== GRANTS =====
  REVOKE EXECUTE ON FUNCTION public.admin_find_user_by_email(text) FROM anon, PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.admin_list_mentors() FROM anon, PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.admin_grant_mentor(uuid) FROM anon, PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.admin_revoke_mentor(uuid) FROM anon, PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.admin_list_user_emails(uuid[]) FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.admin_extend_followup(uuid, int) FROM PUBLIC, anon;
  REVOKE EXECUTE ON FUNCTION public.daily_archive_expired() FROM PUBLIC, anon;
  REVOKE EXECUTE ON FUNCTION public.maybe_graduate_enrollment(uuid) FROM PUBLIC, anon;

  GRANT EXECUTE ON FUNCTION public.admin_find_user_by_email(text) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.admin_list_mentors() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.admin_grant_mentor(uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.admin_revoke_mentor(uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.admin_list_user_emails(uuid[]) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.admin_extend_followup(uuid, int) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.request_archive(uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.cancel_archive(uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.staff_unlock_week(uuid, uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.get_referral_settings() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.get_or_create_my_referral_code() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.apply_referral_code(text) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.admin_set_referral_discount(integer, boolean) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.my_referral_summary() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.admin_referral_report() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.get_compliance_for_enrollment(uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.set_compliance_status(uuid, uuid, compliance_status, text) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.compliance_score_for_enrollment(uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.admin_upsert_compliance_item(uuid,text,uuid,text,text,int,int,boolean,boolean) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.admin_delete_compliance_item(uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.open_support_ticket(text, text) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.reply_support_ticket(uuid, text) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.close_support_ticket(uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.count_open_tickets_for_staff() TO authenticated;
  GRANT EXECUTE ON FUNCTION public.close_week_class(uuid, uuid, text) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.staff_finish_meeting(uuid, uuid, text) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.log_class_attendance(uuid, uuid, text) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.admin_audit_list(int, mentor_action, uuid, uuid) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.admin_mentor_monthly_report(date) TO authenticated;

  -- ===== SEEDS =====

  -- Planos
  INSERT INTO public.plans (code, name, description, vertical, billing_interval, amount_cents, currency, discount_percent, active)
  VALUES
    ('food_monthly', 'Mensal — Método Delivery Seguro',
    'Assinatura mensal. Cada mês liberado após confirmação do pagamento.',
    'food-service', 'monthly', 149700, 'BRL', 0, true),
    ('food_full', 'À vista — Método Delivery Seguro (10% off)',
    '4 meses pagos de uma vez com 10% de desconto. Libera todos os módulos.',
    'food-service', 'one_time', 538920, 'BRL', 10, true),
    ('food_followup', 'Acompanhamento Mensal — Food Service',
    'Plano pós-implementação. Acesso a todos os modelos, histórico das aulas e canal de dúvidas.',
    'food-service', 'monthly', 0, 'BRL', 0, true),
    ('plano-a', 'Consultoria Blindagem 360°',
    'Acesso completo às 16 aulas, documentos relacionados e consultoria. Pagamento único.',
    'all', 'one_time', 49700, 'BRL', 0, true),
    ('plano-b', 'Acompanhamento Mensal',
    'Acesso às aulas, consultoria e acompanhamento personalizado. Mensalidade.',
    'all', 'monthly', 9700, 'BRL', 0, true)
  ON CONFLICT (code) DO NOTHING;

  -- Currículo Food Service (4 módulos × 4 semanas)
  WITH new_modules AS (
    INSERT INTO public.modules (vertical, month_index, title, description) VALUES
      ('food-service', 1, 'Alicerces do negócio',           'Patrimônio, marca, sociedade e regras de saída.'),
      ('food-service', 2, 'Delivery, logística e canal digital', 'Motoboy, bag, taxas, chargeback, site próprio e dados.'),
      ('food-service', 3, 'Equipe, escala e jornada',        'Intermitente, freelancer, ponto, adicionais e prova.'),
      ('food-service', 4, 'Defesa, cliente e reputação',     'Regulamento, condutas, locação, Procon e encerramento.')
    RETURNING id, month_index
  )
  INSERT INTO public.weeks (module_id, week_index, title, summary, agenda, homework, is_checkpoint)
  SELECT m.id, v.week_index, v.title, v.summary, v.agenda, v.homework, v.is_checkpoint
  FROM (VALUES
    (1, 1, 'Sociedade, holding e acordo de sócios',
    'Separar o que é risco do que é patrimônio. Holding patrimonial e cláusulas de saída.',
    '1) Diagnóstico societário. 2) Holding x operacional. 3) Acordo de sócios: saída, preferência, não-concorrência. 4) Cronograma.',
    'Mapear bens CPF/CNPJ; rascunhar minuta de acordo de sócios.', false),
    (1, 2, 'Marca, ativos intangíveis e licenciamento',
    'Marca como ativo. Titularidade, licenciamento, classes 30/35/43.',
    '1) Pesquisa de marca. 2) Depósito multi-classe. 3) Trava de domínio e redes. 4) Licenciamento e NDA.',
    'Listar ativos intangíveis; abrir pesquisa de marca; assinar NDA com fornecedores.', false),
    (1, 3, 'Motoboy, autonomia e contrato civil',
    'Diferenciar entrega autônoma de subordinação disfarçada. Contrato civil real.',
    '1) Mapa de risco do entregador. 2) Cláusulas de autonomia. 3) Pagamento por entrega. 4) Prova documental.',
    'Aplicar Contrato de Prestação de Serviços (Motoboy) com cada parceiro.', false),
    (1, 4, 'Bag, equipamentos e chargeback',
    'Locação de espaço publicitário na bag, responsabilidade por equipamentos e defesa de chargeback.',
    '1) Recibo de locação de bag. 2) Termo de cessão de equipamentos. 3) Marco de entrega. 4) Script chargeback.',
    'Adesivar bags, emitir recibos e implantar conferência semanal de chargebacks.', true),

    (2, 5, 'Site próprio, termos de uso e LGPD',
    'Canal próprio como base blindada: termos, política de privacidade, marco de entrega e finalidade dos dados.',
    '1) Cardápio digital. 2) Termos de uso. 3) Política de privacidade. 4) Gateway de pagamento.',
    'Publicar Termos e Política revisados; revisar fluxo de checkout.', false),
    (2, 6, 'Intermitente, extra e freelancer',
    'Quando cada figura cabe. Risco do freelancer fantasma. Documentação mínima.',
    '1) Mapeamento de escala. 2) Convocação do intermitente. 3) Limites do extra. 4) Critérios de autonomia.',
    'Migrar plantonistas reincidentes para intermitente CLT; arquivar prova de convocação.', false),
    (2, 7, 'Jornada, banco de horas e controles',
    'Ponto, intervalo intrajornada, banco de horas, papeleta de jornada externa.',
    '1) Auditoria de ponto. 2) Acordo de banco de horas. 3) Intervalo intrajornada. 4) Desconexão digital.',
    'Implantar checklist mensal de auditoria de jornada e termo de desconexão.', false),
    (2, 8, 'Adicionais legais e documentação defensiva',
    'Adicional noturno, periculosidade, insalubridade, EPI e treinamento com prova.',
    '1) Mapa de adicionais. 2) Entrega e uso de EPI. 3) Certificados de treinamento. 4) Lastro técnico.',
    'Renovar fichas de EPI; emitir certificados de treinamento.', true),

    (3, 9, 'Imagem, experiência e estágio',
    'Autorização de imagem para marketing, contrato de experiência e blindagem de estágio.',
    '1) Uso de imagem da equipe. 2) Contrato de experiência. 3) Estágio e aprendizagem.',
    'Coletar autorizações de imagem; revisar contratos de experiência.', false),
    (3, 10, 'Vale-transporte, gorjeta e veículo',
    'Termo de opção e trajeto do VT, instituição formal de gorjetas e responsabilidade por veículo.',
    '1) Opção de VT por escrito. 2) Ata de gorjetas. 3) Termo de uso de veículo.',
    'Atualizar termos de VT; convocar assembleia de gorjetas.', false),
    (3, 11, 'Benefícios, descontos e recibos',
    'Adiantamento salarial, desconto por danos/avarias e recibo de benefício.',
    '1) Política de vale/adiantamento. 2) Critério de desconto por avaria. 3) Recibo de benefício.',
    'Implantar fluxo de vales com recibo assinado; padronizar autorização de desconto.', false),
    (3, 12, 'Regulamento interno e conduta antiassédio',
    'Regulamento interno, código de ética/antiassédio e política de uso de celular.',
    '1) Texto do regulamento. 2) Antiassédio. 3) Uso de celular e redes. 4) Recebimento contra recibo.',
    'Distribuir regulamento e código de ética; coletar recibos.', true),

    (4, 13, 'Advertência, suspensão e uniforme',
    'Disciplina escrita: advertência, suspensão, uniforme e auditoria de jornada.',
    '1) Modelos disciplinares. 2) Procedimento de notificação. 3) Uniforme. 4) Auditoria mensal.',
    'Aplicar modelos disciplinares pendentes; emitir termos de uniforme.', false),
    (4, 14, 'Locação comercial e ciência sanitária',
    'Contrato de locação blindado e termo de ciência sanitária e segurança.',
    '1) Cláusulas críticas da locação. 2) Sanitária e vigilância. 3) Plano de continuidade.',
    'Revisar contrato de locação; assinar termo de ciência sanitária.', false),
    (4, 15, 'Procon, preposição e direito do consumidor',
    'Resposta técnica ao Procon, carta de preposição e política de delivery aderente ao CDC.',
    '1) Marco de entrega. 2) Defesa Procon. 3) Carta de preposição. 4) Seguro de responsabilidade.',
    'Pré-cadastrar preposto; salvar modelo de defesa Procon na pasta operacional.', false),
    (4, 16, 'Notificação extrajudicial e encerramento',
    'Notificação extrajudicial como comando de interrupção de conflitos e fechamento do sistema de blindagem.',
    '1) Quando notificar. 2) Estrutura da notificação. 3) Reputação digital. 4) Revisão geral da blindagem.',
    'Enviar notificações pendentes; rodar checklist final de blindagem 360º.', true)
  ) AS v(month_index, week_index, title, summary, agenda, homework, is_checkpoint)
  JOIN new_modules m ON m.month_index = v.month_index;

  -- Instrumentos jurídicos (documentos vinculados às semanas)
  INSERT INTO public.documents (title, description, body, version, week_id, module_id)
  SELECT v.title, v.description, '', 'v1', w.id, w.module_id
  FROM (VALUES
    (1,  'Cláusulas de Saída — Contrato Social / Acordo de Sócios', 'Cláusulas para apuração de haveres, preferência e não-concorrência.'),
    (2,  'Contrato de Licenciamento de Marca', 'Licenciamento da marca da holding para a operacional.'),
    (2,  'Termo de Confidencialidade e Sigilo Profissional (NDA)', 'NDA padrão para fornecedores e equipe estratégica.'),
    (3,  'Contrato de Prestação de Serviços (Motoboy)', 'Contrato civil com cláusulas reais de autonomia.'),
    (4,  'Recibo de Locação de Espaço Publicitário em Bag', 'Verba civil e indenizatória pela locação da face externa da bag.'),
    (4,  'Termo de Responsabilidade e Cessão de Uso de Equipamentos', 'Bag, maquininha, celular e demais bens em guarda temporária.'),
    (4,  'Script de Resposta Jurídica (Chargeback)', 'Resposta técnica usando marco de entrega e prova material.'),
    (5,  'Termos de Uso do Site Próprio', 'Cancelamento, janela de entrega, limite geográfico e marco de entrega.'),
    (5,  'Política de Privacidade — LGPD', 'Finalidade, retenção, exclusão e gateway de pagamento.'),
    (6,  'Contrato Individual de Trabalho Intermitente', 'Modelo CLT do intermitente com convocação e pagamento discriminado.'),
    (6,  'Modelo de Mensagem de Convocação', 'Mensagem padrão para convocar o intermitente com prova de aceite.'),
    (6,  'Recibo de Pagamento Intermitente', 'Recibo discriminado das verbas do intermitente.'),
    (6,  'Contrato de Prestação de Serviços (Freelancer)', 'Instrumento civil de freelancer com prova de autonomia.'),
    (7,  'Acordo Individual para Compensação de Horas (Banco de Horas)', 'Acordo individual nos limites legais e da convenção coletiva.'),
    (7,  'Termo de Opção e Compromisso de Intervalo Intrajornada', 'Formaliza a opção e a fruição do intervalo intrajornada.'),
    (7,  'Termo de Desconexão Digital (Pós-Jornada)', 'Política e termo de desconexão fora do expediente.'),
    (7,  'Ficha de Controle de Jornada Externa', 'Papeleta de jornada externa para entregadores fixos.'),
    (8,  'Ficha de Entrega e Responsabilidade de EPI', 'Prova de entrega, uso e orientação de EPI.'),
    (8,  'Certificado de Treinamento e Capacitação Operacional', 'Certificado padrão dos treinamentos de máquina e segurança.'),
    (9,  'Autorização de Uso de Imagem e Voz (Marketing)', 'Autorização para uso da imagem da equipe em campanhas.'),
    (9,  'Contrato Individual de Trabalho por Prazo Determinado (Experiência)', 'Contrato de experiência com cláusulas defensivas.'),
    (9,  'Termo de Complementação e Blindagem de Estágio/Aprendizagem', 'Termo complementar para estagiários e aprendizes.'),
    (10, 'Termo de Responsabilidade e Uso de Veículo (Entregas)', 'Responsabilidade por uso de veículo em entregas.'),
    (10, 'Termo de Opção e Declaração de Trajeto (Vale-Transporte)', 'Declaração de opção e trajeto para o VT.'),
    (10, 'Ata de Assembleia para Instituição do Sistema de Gorjetas', 'Instituição formal do rateio de gorjetas.'),
    (11, 'Recibo de Adiantamento Salarial (Vale)', 'Recibo padrão de adiantamento salarial.'),
    (11, 'Termo de Autorização de Desconto por Danos e Avarias', 'Autorização específica e individualizada por evento.'),
    (11, 'Termo de Recebimento e Ciência de Benefício (Alimentação)', 'Recebimento e ciência das regras do benefício alimentação.'),
    (12, 'Regulamento Interno de Trabalho', 'Regulamento interno completo do estabelecimento.'),
    (12, 'Código de Ética e Conduta Antiassédio', 'Código de conduta com canal e procedimento antiassédio.'),
    (12, 'Termo de Política de Uso de Celular e Internet', 'Política de uso de celular, internet e redes da empresa.'),
    (13, 'Comunicação de Advertência Disciplinar', 'Modelo de advertência por escrito com recibo do colaborador.'),
    (13, 'Comunicação de Suspensão Disciplinar', 'Modelo de suspensão disciplinar com fundamentação.'),
    (13, 'Termo de Recebimento e Responsabilidade de Uniforme', 'Recebimento e responsabilidade pelo uniforme entregue.'),
    (13, 'Checklist Mensal de Auditoria de Jornada (Controle Interno)', 'Checklist mensal de auditoria de ponto e jornada.'),
    (14, 'Contrato de Locação Comercial Blindado', 'Locação comercial com cláusulas de continuidade e revisão.'),
    (14, 'Termo de Ciência Sanitária e Segurança', 'Termo de ciência sanitária assinado pela equipe.'),
    (15, 'Modelo de Defesa para Procon', 'Estrutura padrão de defesa administrativa em Procon.'),
    (15, 'Carta de Preposição', 'Carta de preposição para audiências e atendimentos.'),
    (16, 'Notificação Extrajudicial', 'Notificação extrajudicial como comando de interrupção de conflitos.')
  ) AS v(week_index, title, description)
  JOIN public.weeks w ON w.week_index = v.week_index
  JOIN public.modules m ON m.id = w.module_id AND m.vertical = 'food-service';

  -- Currículo Pet Shop (4 módulos × 4 semanas)
  DO $$
  DECLARE m1 uuid; m2 uuid; m3 uuid; m4 uuid;
  BEGIN
    INSERT INTO public.modules (vertical, month_index, title, description) VALUES
      ('pet-shop', 1, 'Blindagem Societária Pet Shop', 'Estrutura societária, contratos sociais, sócios e proteção patrimonial.')
      RETURNING id INTO m1;
    INSERT INTO public.modules (vertical, month_index, title, description) VALUES
      ('pet-shop', 2, 'Blindagem Trabalhista Pet Shop', 'Tosadores, banhistas, veterinários, auxiliares; jornadas, EPIs e riscos.')
      RETURNING id INTO m2;
    INSERT INTO public.modules (vertical, month_index, title, description) VALUES
      ('pet-shop', 3, 'Blindagem Consumerista Pet Shop', 'Relação com tutores, termos, responsabilidade por danos e prevenção de litígios.')
      RETURNING id INTO m3;
    INSERT INTO public.modules (vertical, month_index, title, description) VALUES
      ('pet-shop', 4, 'Vigilância Sanitária & Conformidade', 'Licenças, CRMV, medicamentos, biossegurança e LGPD.')
      RETURNING id INTO m4;

    INSERT INTO public.weeks (module_id, week_index, title, summary, is_checkpoint) VALUES
      (m1, 1, 'Diagnóstico societário e estrutura ideal', 'Tipo de pet shop, sócios, regime tributário e blindagem patrimonial.', false),
      (m1, 2, 'Contrato social e acordo de sócios', 'Cláusulas essenciais: saída, sucessão, distribuição de lucros.', false),
      (m1, 3, 'Proteção patrimonial dos sócios', 'Separação PF × PJ; holdings; bens de família.', false),
      (m1, 4, 'Checkpoint societário', 'Revisão dos documentos societários do módulo 1.', true),
      (m2, 5, 'Contratação segura: cargos e jornada', 'CLT, PJ, autônomos, tosadores e banhistas; jornadas e escalas.', false),
      (m2, 6, 'EPIs, NR e segurança do trabalho', 'Riscos biológicos, mordidas, ergonomia e prevenção de acidentes.', false),
      (m2, 7, 'Veterinário responsável técnico e CRMV', 'Vínculo do RT, atribuições, registros e responsabilidade compartilhada.', false),
      (m2, 8, 'Checkpoint trabalhista', 'Validação dos contratos e políticas do módulo 2.', true),
      (m3, 9, 'Termo de serviço com o tutor', 'Banho, tosa, hospedagem, day care, transporte: cláusulas obrigatórias.', false),
      (m3, 10, 'Responsabilidade por danos ao animal', 'Limitação, prova, seguro, conduta diante de acidentes e óbitos.', false),
      (m3, 11, 'Vendas, garantias e marketplace pet', 'Rações, medicamentos, brinquedos: garantia, troca, recall e venda online.', false),
      (m3, 12, 'Checkpoint consumerista', 'Revisão dos termos e fluxos de atendimento ao tutor.', true),
      (m4, 13, 'Licenças e alvarás', 'Sanitária municipal, ambiental, CRMV, bombeiros e CMVM.', false),
      (m4, 14, 'Medicamentos veterinários e biossegurança', 'Armazenamento, prescrição, descarte e controle de pragas.', false),
      (m4, 15, 'LGPD aplicada a pet shops', 'Dados do tutor, do animal, vídeo-monitoramento e marketing direto.', false),
      (m4, 16, 'Checkpoint final & plano de melhoria contínua', 'Consolidação da blindagem e roadmap de manutenção.', true);
  END $$;

  -- Seed configurações de indicação
  INSERT INTO public.referral_settings (id, discount_percent, active) VALUES (true, 10, true)
  ON CONFLICT (id) DO NOTHING;

  -- Compliance seeds — Food Service
  INSERT INTO public.compliance_items (vertical, title, description, weight, order_index, required)
  VALUES
    ('food-service', 'Cadastro sanitário em dia',           'Alvará sanitário válido e exposto no estabelecimento', 3, 1, true),
    ('food-service', 'Tabela nutricional / rotulagem',       'Cardápio com informações exigidas pelo Procon e Anvisa', 2, 2, true),
    ('food-service', 'Política de troca e devolução publicada', 'Disponível no app, site e cardápio físico', 2, 3, true),
    ('food-service', 'Termos de uso e LGPD no app/site',    'Aceite registrado e versão arquivada', 3, 4, true),
    ('food-service', 'Treinamento de equipe documentado',   'Lista de presença e conteúdo arquivado', 1, 5, true),
    ('food-service', 'Contrato com motoboys / entregadores','Contrato assinado com cláusula de responsabilidade', 3, 6, true),
    ('food-service', 'Seguro de responsabilidade civil',    'Apólice ativa', 2, 7, true)
  ON CONFLICT DO NOTHING;

  -- Compliance seeds — Pet Shop
  INSERT INTO public.compliance_items (vertical, title, description, weight, order_index, required)
  VALUES
    ('pet-shop', 'Licença sanitária do pet shop',           'Documento ativo e visível ao público', 3, 1, true),
    ('pet-shop', 'Responsável técnico (veterinário) registrado', 'CRMV ativo e contrato', 3, 2, true),
    ('pet-shop', 'Termo de prestação de serviços (banho/tosa)', 'Modelo atualizado com cláusulas de risco', 3, 3, true),
    ('pet-shop', 'Política LGPD e termos do site/app',      'Aceite e versão arquivada', 2, 4, true),
    ('pet-shop', 'Treinamento de equipe sobre manejo animal','Registro de presença', 1, 5, true),
    ('pet-shop', 'Contrato com fornecedores de ração/medicamentos', 'Cláusulas de responsabilidade', 2, 6, true),
    ('pet-shop', 'Seguro de responsabilidade civil',        'Apólice ativa', 2, 7, true)
  ON CONFLICT DO NOTHING;
