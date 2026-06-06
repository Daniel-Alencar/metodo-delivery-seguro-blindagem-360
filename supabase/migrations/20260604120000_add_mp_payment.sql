-- Add Mercado Pago fields to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS mp_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_preference_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_preapproval_id TEXT;

-- Add Mercado Pago plan ID to plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS mp_plan_id TEXT;

-- Seed Plano A e Plano B
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE code = 'plano-a') THEN
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
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE code = 'plano-b') THEN
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
    );
  END IF;
END $$;
