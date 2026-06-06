-- Adiciona 'once' como valor válido do billing_interval (plano-a usa este valor)
ALTER TABLE public.plans
  DROP CONSTRAINT IF EXISTS plans_billing_interval_check;

ALTER TABLE public.plans
  ADD CONSTRAINT plans_billing_interval_check
  CHECK (billing_interval IN ('monthly', 'one_time', 'once'));

-- Garante que as colunas de Mercado Pago existam (caso a migration anterior falhou)
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS mp_payment_id text,
  ADD COLUMN IF NOT EXISTS mp_preference_id text,
  ADD COLUMN IF NOT EXISTS mp_preapproval_id text;

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS mp_plan_id text;

-- Insere Plano A e Plano B se ainda não existirem
INSERT INTO public.plans (code, name, description, amount_cents, billing_interval, currency, discount_percent, vertical, active)
VALUES (
  'plano-a',
  'Consultoria Blindagem 360°',
  'Acesso completo às 16 aulas, documentos relacionados e consultoria. Pagamento único.',
  49700,
  'once',
  'BRL',
  0,
  'all',
  true
)
ON CONFLICT (code) DO UPDATE SET
  amount_cents = EXCLUDED.amount_cents,
  billing_interval = EXCLUDED.billing_interval,
  active = EXCLUDED.active;

INSERT INTO public.plans (code, name, description, amount_cents, billing_interval, currency, discount_percent, vertical, active)
VALUES (
  'plano-b',
  'Acompanhamento Mensal',
  'Acesso às aulas, consultoria e acompanhamento personalizado com orientações constantes. Mensalidade.',
  9700,
  'monthly',
  'BRL',
  0,
  'all',
  true
)
ON CONFLICT (code) DO UPDATE SET
  amount_cents = EXCLUDED.amount_cents,
  billing_interval = EXCLUDED.billing_interval,
  active = EXCLUDED.active;
