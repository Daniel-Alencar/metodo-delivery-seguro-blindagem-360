import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ResetPasswordInput = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  newPassword: z.string().min(6),
});

/**
 * Resets user password via Admin API (service role), bypassing email templates.
 * Uses admin.updateUserById to set the new password directly.
 */
export const adminResetPassword = createServerFn({ method: "POST" })
  .inputValidator((input) => ResetPasswordInput.parse(input))
  .handler(async ({ data }) => {
    // Find user by email
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const user = listData?.users?.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase()
    );

    if (!user) {
      // Don't reveal if email exists or not for security
      return { ok: true };
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: data.newPassword,
    });

    if (error) {
      console.error("[admin-reset-password] error:", error);
      throw new Error("Não foi possível redefinir a senha. Tente novamente.");
    }

    return { ok: true };
  });
