CREATE TABLE IF NOT EXISTS public.plans (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE NOT NULL, name text NOT NULL, description text, vertical text NOT NULL DEFAULT 'food-service', billing_interval text NOT NULL CHECK (billing_interval IN ('monthly','one_time')), amount_cents integer NOT NULL, currency text NOT NULL DEFAULT 'BRL', discount_percent integer NOT NULL DEFAULT 0, stripe_price_id text, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY plans_read_all ON public.plans FOR SELECT USING (true);
CREATE POLICY plans_admin_write ON public.plans FOR ALL USING (private.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER plans_set_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.subscriptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, plan_id uuid NOT NULL REFERENCES public.plans(id), status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','past_due','canceled','completed')), current_month integer NOT NULL DEFAULT 0, paid_until timestamptz, stripe_customer_id text, stripe_subscription_id text, stripe_payment_intent_id text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subs_select_own_or_staff ON public.subscriptions FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(),'admin'::app_role) OR private.has_role(auth.uid(),'mentor'::app_role));
CREATE POLICY subs_admin_write ON public.subscriptions FOR ALL USING (private.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER subs_set_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.plans (code, name, description, billing_interval, amount_cents, discount_percent) VALUES ('food_monthly','Mensal — Método Delivery Seguro','Assinatura mensal. Cada mês liberado após confirmação do pagamento.','monthly',149700,0), ('food_full','À vista — Método Delivery Seguro (10% off)','4 meses pagos de uma vez com 10% de desconto. Libera todos os módulos.','one_time',538920,10) ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $fn$ BEGIN INSERT INTO public.profiles (id, full_name, company_name, phone) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.raw_user_meta_data->>'company_name',''), COALESCE(NEW.raw_user_meta_data->>'phone','')); IF lower(NEW.email) = 'glaubertgia@gmail.com' THEN INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'); ELSE INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cliente'); END IF; RETURN NEW; END; $fn$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();