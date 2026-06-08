import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AdminSignupInput = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(6),
  full_name: z.string().min(1),
  company_name: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  cpf: z.string().min(11).max(11),
  cnpj: z.string().optional().default(""),
  vertical: z.string().optional().default("food-service"),
  marketing_consent: z.boolean().optional().default(false),
});

/**
 * Creates a user via Admin API (service role), bypassing email confirmation entirely.
 * The user is created with email_confirm = true, so no confirmation email is sent.
 */
export const adminCreateUser = createServerFn({ method: "POST" })
  .inputValidator((input) => AdminSignupInput.parse(input))
  .handler(async ({ data }) => {
    // Check if user already exists
    const { data: existingList } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const existing = existingList?.users?.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase()
    );
    if (existing) {
      throw new Error("Este e-mail já possui uma conta cadastrada. Use a página de login.");
    }

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // <-- Marks email as confirmed immediately, NO email sent
      user_metadata: {
        full_name: data.full_name,
        company_name: data.company_name,
        phone: data.phone,
        cpf: data.cpf,
        cnpj: data.cnpj,
        vertical: data.vertical,
        accepted_terms: true,
        accepted_lgpd: true,
        marketing_consent: data.marketing_consent,
      },
    });

    if (error) {
      console.error("[admin-signup] createUser error:", error);
      throw new Error(error.message);
    }

    return { userId: created.user.id, email: created.user.email };
  });
