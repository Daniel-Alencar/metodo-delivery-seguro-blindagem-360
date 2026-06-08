-- Limpa mp_plan_id de todos os planos para forçar recriação no Mercado Pago.
-- Isso resolve o erro "The template with id undefined does not exist" causado
-- por IDs de planos inválidos ou criados em ambiente diferente (sandbox vs prod).
UPDATE public.plans SET mp_plan_id = NULL;
