-- ============ Settings (singleton) ============
CREATE TABLE public.referral_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  discount_percent integer NOT NULL DEFAULT 10 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.referral_settings (id, discount_percent, active) VALUES (true, 10, true);

ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY rs_select_all ON public.referral_settings FOR SELECT USING (true);
CREATE POLICY rs_admin_write ON public.referral_settings FOR ALL
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- ============ Per-user referral codes ============
CREATE TABLE public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY rc_select_own_or_staff ON public.referral_codes FOR SELECT USING (
  auth.uid() = user_id
  OR private.has_role(auth.uid(), 'admin'::app_role)
  OR private.has_role(auth.uid(), 'mentor'::app_role)
);

-- ============ Referrals ============
CREATE TYPE public.referral_status AS ENUM ('pending', 'converted', 'cancelled');

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

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY ref_select_own_or_staff ON public.referrals FOR SELECT USING (
  auth.uid() = referrer_id
  OR auth.uid() = referred_user_id
  OR private.has_role(auth.uid(), 'admin'::app_role)
  OR private.has_role(auth.uid(), 'mentor'::app_role)
);

-- ============ Extend audit enum ============
ALTER TYPE public.mentor_action ADD VALUE IF NOT EXISTS 'referral_discount_updated';
ALTER TYPE public.mentor_action ADD VALUE IF NOT EXISTS 'referral_created';
ALTER TYPE public.mentor_action ADD VALUE IF NOT EXISTS 'referral_converted';

-- ============ Functions ============
CREATE OR REPLACE FUNCTION public.get_referral_settings()
RETURNS TABLE(discount_percent integer, active boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT discount_percent, active FROM public.referral_settings WHERE id = true;
$$;

CREATE OR REPLACE FUNCTION public.get_or_create_my_referral_code()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _code text;
  _attempt int := 0;
  _candidate text;
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
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _referrer uuid;
  _discount integer;
  _active boolean;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _code IS NULL OR length(trim(_code)) = 0 THEN RAISE EXCEPTION 'Código inválido'; END IF;

  SELECT discount_percent, active INTO _discount, _active FROM public.referral_settings WHERE id = true;
  IF NOT _active THEN RAISE EXCEPTION 'Programa de indicações está inativo'; END IF;

  SELECT user_id INTO _referrer FROM public.referral_codes WHERE code = upper(trim(_code));
  IF _referrer IS NULL THEN RAISE EXCEPTION 'Código não encontrado'; END IF;
  IF _referrer = _uid THEN RAISE EXCEPTION 'Você não pode usar o próprio código'; END IF;

  -- Already used? return existing
  SELECT id INTO _id FROM public.referrals WHERE referred_user_id = _uid;
  IF _id IS NOT NULL THEN RETURN _id; END IF;

  INSERT INTO public.referrals (referrer_id, referred_user_id, code, discount_percent)
  VALUES (_referrer, _uid, upper(trim(_code)), _discount)
  RETURNING id INTO _id;

  INSERT INTO public.mentor_audit_log (mentor_id, student_id, action, notes, metadata)
  VALUES (_uid, _referrer, 'referral_created', 'Nova indicação registrada',
          jsonb_build_object('code', upper(trim(_code)), 'discount', _discount));

  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_referral_discount(_percent integer, _active boolean DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas super admin pode alterar o desconto de indicação';
  END IF;
  IF _percent < 0 OR _percent > 100 THEN RAISE EXCEPTION 'Percentual inválido'; END IF;

  UPDATE public.referral_settings
     SET discount_percent = _percent,
         active = COALESCE(_active, active),
         updated_by = auth.uid(),
         updated_at = now()
   WHERE id = true;

  INSERT INTO public.mentor_audit_log (mentor_id, action, notes, metadata)
  VALUES (auth.uid(), 'referral_discount_updated',
          format('Desconto de indicação atualizado para %s%%', _percent),
          jsonb_build_object('discount', _percent, 'active', _active));
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
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (private.has_role(auth.uid(), 'admin'::app_role)
       OR private.has_role(auth.uid(), 'mentor'::app_role)) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT r.id, r.created_at, r.status, r.discount_percent, r.converted_at,
         r.referrer_id, COALESCE(pr.full_name,'')::text, ur.email::text,
         r.referred_user_id, COALESCE(pd.full_name,'')::text, ud.email::text,
         r.enrollment_id, e.status::text
  FROM public.referrals r
  LEFT JOIN auth.users ur ON ur.id = r.referrer_id
  LEFT JOIN public.profiles pr ON pr.id = r.referrer_id
  LEFT JOIN auth.users ud ON ud.id = r.referred_user_id
  LEFT JOIN public.profiles pd ON pd.id = r.referred_user_id
  LEFT JOIN public.enrollments e ON e.id = r.enrollment_id
  ORDER BY r.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.my_referral_summary()
RETURNS TABLE(
  code text, discount_percent integer, active boolean,
  total_referrals bigint, converted_referrals bigint, pending_referrals bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
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

-- Trigger: when an enrollment becomes active, mark referral as converted
CREATE OR REPLACE FUNCTION public.trg_referral_convert_on_enrollment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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