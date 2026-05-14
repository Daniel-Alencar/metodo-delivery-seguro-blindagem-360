ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_lgpd_at timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false;