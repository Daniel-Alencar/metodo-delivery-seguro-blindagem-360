import { createFileRoute } from "@tanstack/react-router";
import { Payment, PreApproval } from "mercadopago";
import { getMpClient } from "@/integrations/mercadopago/client.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type MpWebhookBody = {
  type?: string;
  data?: { id?: string };
  id?: number;
};

export const Route = createFileRoute("/api/mp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let body: MpWebhookBody = {};
        try {
          body = (await request.json()) as MpWebhookBody;
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const type = body.type;
        const dataId = body.data?.id;

        if (!type || !dataId) {
          return Response.json({ ok: true });
        }

        try {
          const mp = getMpClient();

          if (type === "payment") {
            // Plano A: pagamento único aprovado
            const paymentApi = new Payment(mp);
            const payment = await paymentApi.get({ id: dataId });

            if (payment.status === "approved" && payment.external_reference) {
              await handleApprovedPayment(
                payment.external_reference,
                String(payment.id ?? dataId),
              );
            }
          } else if (type === "subscription_preapproval") {
            // Plano B: assinatura ativada ou renovada
            const preApprovalApi = new PreApproval(mp);
            const sub = await preApprovalApi.get({ id: dataId });

            if (sub.status === "authorized" && sub.external_reference) {
              await handleApprovedSubscription(sub.external_reference, sub.id ?? dataId);
            }
          }
        } catch (err) {
          console.error("[mp-webhook] error processing event:", type, dataId, err);
          // Return 200 so MP doesn't retry — log and investigate separately
        }

        return Response.json({ ok: true });
      },

      GET: async () => Response.json({ ok: true, hint: "Mercado Pago webhook endpoint" }),
    },
  },
});

async function handleApprovedPayment(externalRef: string, paymentId: string) {
  const [userId, planId, vertical] = externalRef.split(":");
  if (!userId || !planId) return;

  // Acesso por 1 ano para pagamento único
  const paidUntil = new Date();
  paidUntil.setFullYear(paidUntil.getFullYear() + 1);

  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin.from("subscriptions").update({
      status: "active",
      mp_payment_id: paymentId,
      paid_until: paidUntil.toISOString(),
    }).eq("id", existing.id);
  } else {
    await supabaseAdmin.from("subscriptions").insert({
      user_id: userId,
      plan_id: planId,
      status: "active",
      current_month: 1,
      mp_payment_id: paymentId,
      paid_until: paidUntil.toISOString(),
    });
  }

  await activateEnrollment(userId, vertical ?? "food-service");
}

async function handleApprovedSubscription(externalRef: string, preapprovalId: string) {
  const [userId, planId, vertical] = externalRef.split(":");
  if (!userId || !planId) return;

  // Renova por mais 1 mês
  const paidUntil = new Date();
  paidUntil.setMonth(paidUntil.getMonth() + 1);

  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("id, current_month")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin.from("subscriptions").update({
      status: "active",
      mp_preapproval_id: preapprovalId,
      paid_until: paidUntil.toISOString(),
      current_month: (existing.current_month ?? 0) + 1,
    }).eq("id", existing.id);
  } else {
    await supabaseAdmin.from("subscriptions").insert({
      user_id: userId,
      plan_id: planId,
      status: "active",
      current_month: 1,
      mp_preapproval_id: preapprovalId,
      paid_until: paidUntil.toISOString(),
    });
  }

  await activateEnrollment(userId, vertical ?? "food-service");
}

async function activateEnrollment(userId: string, vertical: string) {
  const { data: enrollment } = await supabaseAdmin
    .from("enrollments")
    .select("id, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!enrollment) {
    await supabaseAdmin.from("enrollments").insert({
      user_id: userId,
      vertical,
      status: "active",
      started_at: new Date().toISOString(),
    });
  } else if (!["active", "graduated", "completed"].includes(enrollment.status)) {
    await supabaseAdmin.from("enrollments").update({
      status: "active",
      started_at: new Date().toISOString(),
    }).eq("id", enrollment.id);
  }
}
