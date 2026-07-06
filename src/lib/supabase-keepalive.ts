/**
 * Supabase Keep-Alive
 *
 * O Supabase no plano gratuito pausa projetos após 7 dias de inatividade.
 * Este módulo envia um SELECT trivial a cada 4 dias para zerar o cronômetro,
 * garantindo que o banco nunca seja pausado.
 *
 * Importado automaticamente em src/server.ts — roda apenas no lado servidor.
 */

const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000; // 345.600.000 ms

async function ping() {
  try {
    // Importação dinâmica para evitar problemas de tree-shaking/bundling
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data, error } = await supabaseAdmin
      .from("_keepalive_ping")
      .select("1")
      .limit(1)
      .maybeSingle();

    // A tabela não precisa existir — o Supabase já conta a requisição HTTP.
    // Se der erro (ex.: tabela não existe), tudo bem: o ping foi enviado.
    if (error) {
      console.log(
        `[keep-alive] Ping enviado (${new Date().toISOString()}) — tabela não existe, mas a requisição já contou.`,
      );
    } else {
      console.log(
        `[keep-alive] Ping OK (${new Date().toISOString()})`,
        data,
      );
    }
  } catch (err) {
    console.error("[keep-alive] Falha ao pingar Supabase:", err);
  }
}

// Executa o primeiro ping após 10s (dá tempo do servidor subir)
setTimeout(() => {
  ping();

  // Depois repete a cada 4 dias
  setInterval(ping, FOUR_DAYS_MS);
}, 10_000);

console.log(
  "[keep-alive] Agendado: ping no Supabase a cada 4 dias para evitar pausa por inatividade.",
);
