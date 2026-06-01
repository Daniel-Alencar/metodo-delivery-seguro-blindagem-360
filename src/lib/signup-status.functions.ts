import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const EmailStatusInput = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
});

export const getSignupEmailStatus = createServerFn({ method: "POST" })
  .inputValidator((input) => EmailStatusInput.parse(input))
  .handler(async ({ data }) => {
    const targetEmail = data.email.toLowerCase();
    const perPage = 1000;

    for (let page = 1; page <= 10; page += 1) {
      const { data: usersPage, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error("Não foi possível verificar este e-mail agora.");

      const user = usersPage.users.find((u) => u.email?.toLowerCase() === targetEmail);
      if (user) {
        return {
          exists: true,
          confirmed: Boolean(user.email_confirmed_at),
          confirmationSentAt: user.confirmation_sent_at ?? null,
        };
      }

      if (usersPage.users.length < perPage) break;
    }

    return { exists: false, confirmed: false, confirmationSentAt: null };
  });