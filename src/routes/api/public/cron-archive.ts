import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Daily cron endpoint. Archives enrollments whose 7-day grace period has expired.
 * Wire via pg_cron with: net.http_post(url:='https://.../api/public/cron-archive', headers:='{"apikey":"..."}'::jsonb, body:='{}'::jsonb)
 */
export const Route = createFileRoute("/api/public/cron-archive")({
  server: {
    handlers: {
      POST: async () => {
        const { data, error } = await supabaseAdmin.rpc("daily_archive_expired");
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }
        return Response.json({ ok: true, archived: data });
      },
      GET: async () => Response.json({ ok: true, hint: "POST to run" }),
    },
  },
});
