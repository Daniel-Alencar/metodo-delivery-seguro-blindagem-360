import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { Preference, PreApprovalPlan } from 'mercadopago';
import { getMpClient } from '@/integrations/mercadopago/client.server';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const CreateCheckoutSchema = z.object({
  planCode: z.enum(['plano-a', 'plano-b']),
  vertical: z.string().optional().default('food-service'),
});

export const createMpCheckout = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => CreateCheckoutSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!user?.email) throw new Error('Usuário não encontrado.');

    const { data: plan } = await supabaseAdmin
      .from('plans')
      .select('*')
      .eq('code', data.planCode)
      .eq('active', true)
      .maybeSingle();
    if (!plan) throw new Error('Plano não encontrado.');

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    const siteUrl = (process.env.SITE_URL ?? 'https://blindagem360.com.br').replace(/\/$/, '');
    const mp = getMpClient();
    const externalRef = `${userId}:${plan.id}:${data.vertical}`;

    if (plan.billing_interval === 'once') {
      // Plano A: pagamento único via Checkout Pro
      const preferenceApi = new Preference(mp);
      const pref = await preferenceApi.create({
        body: {
          items: [{
            id: plan.id,
            title: plan.name,
            description: plan.description ?? '',
            quantity: 1,
            unit_price: plan.amount_cents / 100,
            currency_id: 'BRL',
          }],
          payer: {
            email: user.email,
            name: profile?.full_name ?? undefined,
          },
          back_urls: {
            success: `${siteUrl}/pagamento/sucesso`,
            failure: `${siteUrl}/pagamento/falhou`,
            pending: `${siteUrl}/pagamento/pendente`,
          },
          auto_return: 'approved',
          external_reference: externalRef,
          notification_url: `${siteUrl}/api/mp-webhook`,
          payment_methods: { installments: 12 },
        },
      });

      await upsertSubscription(userId, plan.id, {
        status: 'pending',
        mp_preference_id: pref.id ?? null,
        mp_payment_id: null,
        mp_preapproval_id: null,
      });

      return { checkoutUrl: pref.init_point! };

    } else {
      // Plano B: assinatura recorrente via PreApprovalPlan
      // O MP exige card_token_id para criar uma PreApproval via API.
      // O fluxo correto é redirecionar para o init_point do PreApprovalPlan,
      // onde o usuário preenche os dados do cartão no lado do Mercado Pago.
      const planApi = new PreApprovalPlan(mp);
      let mpPlanId = plan.mp_plan_id;
      let checkoutUrl: string;

      if (!mpPlanId) {
        const planRes = await planApi.create({
          body: {
            reason: plan.name,
            auto_recurring: {
              frequency: 1,
              frequency_type: 'months',
              transaction_amount: plan.amount_cents / 100,
              currency_id: 'BRL',
            },
            back_url: `${siteUrl}/pagamento/sucesso`,
            notification_url: `${siteUrl}/api/mp-webhook`,
            status: 'active',
          },
        });
        mpPlanId = planRes.id ?? null;
        checkoutUrl = planRes.init_point!;
        if (mpPlanId) {
          await supabaseAdmin.from('plans').update({ mp_plan_id: mpPlanId }).eq('id', plan.id);
        }
      } else {
        // Plano já existe: busca o init_point no MP
        const planData = await planApi.get({ id: mpPlanId });
        checkoutUrl = planData.init_point!;
      }

      if (!checkoutUrl) throw new Error('Não foi possível obter o link de assinatura.');

      await upsertSubscription(userId, plan.id, {
        status: 'pending',
        mp_preapproval_id: null,
        mp_preference_id: null,
        mp_payment_id: null,
      });

      return { checkoutUrl };
    }
  });

async function upsertSubscription(
  userId: string,
  planId: string,
  extra: {
    status: string;
    mp_preference_id: string | null;
    mp_payment_id: string | null;
    mp_preapproval_id: string | null;
    paid_until?: string | null;
    current_month?: number;
  },
) {
  const { data: existing } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from('subscriptions')
      .update({ plan_id: planId, ...extra })
      .eq('id', existing.id);
  } else {
    await supabaseAdmin
      .from('subscriptions')
      .insert({ user_id: userId, plan_id: planId, current_month: 0, ...extra });
  }
}
