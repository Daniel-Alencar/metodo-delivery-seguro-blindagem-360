CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _email text := lower(coalesce(NEW.email, ''));
  _vertical text := coalesce(nullif(NEW.raw_user_meta_data->>'vertical', ''), 'food-service');
BEGIN
  IF _vertical NOT IN ('food-service', 'pet-shop') THEN
    _vertical := 'food-service';
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    company_name,
    phone,
    cpf,
    cnpj,
    accepted_terms_at,
    accepted_lgpd_at,
    marketing_consent
  ) VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'full_name', ''),
    coalesce(NEW.raw_user_meta_data->>'company_name', ''),
    coalesce(NEW.raw_user_meta_data->>'phone', ''),
    nullif(regexp_replace(coalesce(NEW.raw_user_meta_data->>'cpf', ''), '\\D', '', 'g'), ''),
    nullif(regexp_replace(coalesce(NEW.raw_user_meta_data->>'cnpj', ''), '\\D', '', 'g'), ''),
    CASE WHEN lower(coalesce(NEW.raw_user_meta_data->>'accepted_terms', 'false')) = 'true' THEN now() ELSE NULL END,
    CASE WHEN lower(coalesce(NEW.raw_user_meta_data->>'accepted_lgpd', 'false')) = 'true' THEN now() ELSE NULL END,
    lower(coalesce(NEW.raw_user_meta_data->>'marketing_consent', 'false')) = 'true'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    company_name = EXCLUDED.company_name,
    phone = EXCLUDED.phone,
    cpf = EXCLUDED.cpf,
    cnpj = EXCLUDED.cnpj,
    accepted_terms_at = EXCLUDED.accepted_terms_at,
    accepted_lgpd_at = EXCLUDED.accepted_lgpd_at,
    marketing_consent = EXCLUDED.marketing_consent,
    updated_at = now();

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
$function$;