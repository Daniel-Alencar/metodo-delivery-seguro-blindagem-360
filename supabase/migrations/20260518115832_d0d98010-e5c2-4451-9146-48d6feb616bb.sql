
-- =========================================================
-- 1) SUPPORT TICKETS (substitui incidents para acompanhamento)
-- =========================================================
CREATE TYPE public.ticket_status AS ENUM ('open','answered','closed');

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

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY tickets_select ON public.support_tickets FOR SELECT USING (
  auth.uid() = user_id
  OR private.has_role(auth.uid(),'admin'::app_role)
  OR (private.has_role(auth.uid(),'mentor'::app_role) AND (mentor_id = auth.uid() OR mentor_id IS NULL))
);

CREATE POLICY tickets_insert_own ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY tickets_update_staff ON public.support_tickets FOR UPDATE USING (
  private.has_role(auth.uid(),'admin'::app_role)
  OR (private.has_role(auth.uid(),'mentor'::app_role) AND (mentor_id = auth.uid() OR mentor_id IS NULL))
);

CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Mensagens
CREATE TABLE public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE RESTRICT,
  author_id uuid NOT NULL,
  author_role text NOT NULL CHECK (author_role IN ('client','mentor','admin')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ticket_msgs_ticket ON public.support_ticket_messages(ticket_id);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY msgs_select ON public.support_ticket_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND (
        auth.uid() = t.user_id
        OR private.has_role(auth.uid(),'admin'::app_role)
        OR (private.has_role(auth.uid(),'mentor'::app_role) AND (t.mentor_id = auth.uid() OR t.mentor_id IS NULL))
      )
  )
);

CREATE POLICY msgs_insert ON public.support_ticket_messages FOR INSERT WITH CHECK (
  author_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_id
      AND (
        auth.uid() = t.user_id
        OR private.has_role(auth.uid(),'admin'::app_role)
        OR (private.has_role(auth.uid(),'mentor'::app_role) AND (t.mentor_id = auth.uid() OR t.mentor_id IS NULL))
      )
  )
);

-- =========================================================
-- 2) ENROLLMENT: mentor responsável
-- =========================================================
ALTER TABLE public.enrollments ADD COLUMN assigned_mentor_id uuid;
CREATE INDEX idx_enrollments_mentor ON public.enrollments(assigned_mentor_id);

-- Permitir mentor ver matrículas (já existe, mas a select policy atual cobre)
-- Já existe enrollments_select_own_or_admin que inclui mentor — OK.

-- =========================================================
-- 3) VERTICAL LEADS
-- =========================================================
CREATE TABLE public.vertical_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text NOT NULL CHECK (vertical IN ('estetica','hof','moda','food-service')),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_vertical ON public.vertical_leads(vertical);
CREATE INDEX idx_leads_created ON public.vertical_leads(created_at DESC);

ALTER TABLE public.vertical_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY leads_insert_anyone ON public.vertical_leads FOR INSERT WITH CHECK (true);
CREATE POLICY leads_select_admin ON public.vertical_leads FOR SELECT USING (
  private.has_role(auth.uid(),'admin'::app_role)
);

-- =========================================================
-- 4) FUNÇÕES
-- =========================================================

-- Abre chamado (cliente). Vincula mentor da matrícula se houver.
CREATE OR REPLACE FUNCTION public.open_support_ticket(_title text, _body text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _enrollment_id uuid;
  _mentor uuid;
  _ticket_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  SELECT id, assigned_mentor_id INTO _enrollment_id, _mentor
    FROM public.enrollments WHERE user_id = auth.uid()
    ORDER BY created_at DESC LIMIT 1;

  INSERT INTO public.support_tickets (user_id, enrollment_id, mentor_id, title, body, last_reply_at)
  VALUES (auth.uid(), _enrollment_id, _mentor, _title, _body, now())
  RETURNING id INTO _ticket_id;

  INSERT INTO public.support_ticket_messages (ticket_id, author_id, author_role, body)
  VALUES (_ticket_id, auth.uid(), 'client', _body);

  RETURN _ticket_id;
END $$;

-- Responde chamado
CREATE OR REPLACE FUNCTION public.reply_support_ticket(_ticket_id uuid, _body text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _role text;
  _t public.support_tickets%ROWTYPE;
BEGIN
  SELECT * INTO _t FROM public.support_tickets WHERE id = _ticket_id;
  IF _t.id IS NULL THEN RAISE EXCEPTION 'Chamado não encontrado'; END IF;

  IF private.has_role(auth.uid(),'admin'::app_role) THEN _role := 'admin';
  ELSIF private.has_role(auth.uid(),'mentor'::app_role) THEN _role := 'mentor';
  ELSIF _t.user_id = auth.uid() THEN _role := 'client';
  ELSE RAISE EXCEPTION 'Sem permissão'; END IF;

  INSERT INTO public.support_ticket_messages (ticket_id, author_id, author_role, body)
  VALUES (_ticket_id, auth.uid(), _role, _body);

  IF _role IN ('mentor','admin') THEN
    UPDATE public.support_tickets
       SET status = CASE WHEN status='closed' THEN 'closed'::ticket_status ELSE 'answered'::ticket_status END,
           answered_at = COALESCE(answered_at, now()),
           last_reply_at = now(),
           mentor_id = COALESCE(mentor_id, CASE WHEN _role='mentor' THEN auth.uid() ELSE NULL END)
     WHERE id = _ticket_id;
  ELSE
    UPDATE public.support_tickets
       SET status = CASE WHEN status='closed' THEN 'closed'::ticket_status ELSE 'open'::ticket_status END,
           last_reply_at = now()
     WHERE id = _ticket_id;
  END IF;
END $$;

-- Encerra chamado (mentor responsável ou admin)
CREATE OR REPLACE FUNCTION public.close_support_ticket(_ticket_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _t public.support_tickets%ROWTYPE;
BEGIN
  SELECT * INTO _t FROM public.support_tickets WHERE id = _ticket_id;
  IF _t.id IS NULL THEN RAISE EXCEPTION 'Chamado não encontrado'; END IF;
  IF NOT (private.has_role(auth.uid(),'admin'::app_role)
       OR (private.has_role(auth.uid(),'mentor'::app_role) AND (_t.mentor_id = auth.uid() OR _t.mentor_id IS NULL))) THEN
    RAISE EXCEPTION 'Sem permissão para encerrar';
  END IF;

  UPDATE public.support_tickets
     SET status='closed'::ticket_status, closed_at=now(), closed_by=auth.uid()
   WHERE id = _ticket_id;
END $$;

-- Conta chamados abertos visíveis ao staff (para o badge)
CREATE OR REPLACE FUNCTION public.count_open_tickets_for_staff()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public STABLE AS $$
DECLARE n int;
BEGIN
  IF private.has_role(auth.uid(),'admin'::app_role) THEN
    SELECT count(*) INTO n FROM public.support_tickets WHERE status IN ('open','answered');
  ELSIF private.has_role(auth.uid(),'mentor'::app_role) THEN
    SELECT count(*) INTO n FROM public.support_tickets
      WHERE status IN ('open','answered') AND (mentor_id = auth.uid() OR mentor_id IS NULL);
  ELSE n := 0; END IF;
  RETURN COALESCE(n,0);
END $$;

-- Encerrar aula da semana (mentor). Vincula mentor à matrícula se ainda não houver.
CREATE OR REPLACE FUNCTION public.close_week_class(_enrollment_id uuid, _week_id uuid, _notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _student uuid; _log_id uuid; _current_mentor uuid;
BEGIN
  IF NOT (private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'mentor'::app_role)) THEN
    RAISE EXCEPTION 'Apenas mentores podem encerrar aula';
  END IF;

  SELECT user_id, assigned_mentor_id INTO _student, _current_mentor
    FROM public.enrollments WHERE id = _enrollment_id;
  IF _student IS NULL THEN RAISE EXCEPTION 'Matrícula não encontrada'; END IF;

  -- Vincula mentor responsável se ainda vago e quem chama é mentor
  IF _current_mentor IS NULL AND private.has_role(auth.uid(),'mentor'::app_role) THEN
    UPDATE public.enrollments SET assigned_mentor_id = auth.uid() WHERE id = _enrollment_id;
  END IF;

  -- Marca semana como aprovada (registra quem e quando)
  INSERT INTO public.week_progress (enrollment_id, week_id, status, approved_at, approved_by, notes)
  VALUES (_enrollment_id, _week_id, 'approved'::week_status, now(), auth.uid(), _notes)
  ON CONFLICT DO NOTHING;

  UPDATE public.week_progress
     SET status='approved'::week_status, approved_at=COALESCE(approved_at, now()), approved_by=COALESCE(approved_by, auth.uid()), notes=COALESCE(_notes, notes)
   WHERE enrollment_id=_enrollment_id AND week_id=_week_id;

  -- Audit log
  INSERT INTO public.mentor_audit_log (mentor_id, student_id, action, week_id, enrollment_id, notes)
  VALUES (auth.uid(), _student, 'class_attended', _week_id, _enrollment_id, COALESCE(_notes,'Aula encerrada'))
  RETURNING id INTO _log_id;

  RETURN _log_id;
END $$;
